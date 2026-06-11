from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import json
import re
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection — fall back to in-memory mongomock when real MongoDB is unreachable
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'compliance_db')

def _make_client():
    import socket
    host = mongo_url.split('//')[1].split('/')[0].split(':')[0]
    port = int(mongo_url.split(':')[-1].split('/')[0]) if ':' in mongo_url.split('//')[1] else 27017
    s = socket.socket()
    s.settimeout(0.5)
    try:
        s.connect((host, port))
        s.close()
        return AsyncIOMotorClient(mongo_url), False
    except Exception:
        s.close()
        try:
            from mongomock_motor import AsyncMongoMockClient
            logging.getLogger(__name__).warning("MongoDB unreachable — using in-memory mongomock (data resets on restart)")
            return AsyncMongoMockClient(), True
        except ImportError:
            raise RuntimeError("MongoDB is not running and mongomock-motor is not installed. Run: pip install mongomock-motor")

client, _USING_MOCK_DB = _make_client()
db = client[db_name]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET_KEY', 'default-secret')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
JWT_EXPIRATION = int(os.environ.get('JWT_EXPIRATION_HOURS', '24'))

# App setup
app = FastAPI(title="CompliancePulse API", version="1.0.0")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============ ENUMS ============
class UserRole(str, Enum):
    ADMIN = "admin"
    COMPLIANCE_OFFICER = "compliance_officer"
    AUDITOR = "auditor"
    REGULATOR = "regulator"

class TaskStatus(str, Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    VERIFIED = "verified"
    CLOSED = "closed"

class AlertSeverity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class AgentType(str, Enum):
    REGULATORY_DISCOVERY = "regulatory_discovery"
    POLICY_MAPPING = "policy_mapping"
    MONITORING_RISK = "monitoring_risk"
    EVIDENCE_REPORTING = "evidence_reporting"

class ComplianceFramework(str, Enum):
    PCI_DSS = "PCI_DSS"
    GDPR = "GDPR"
    CCPA = "CCPA"
    LGPD = "LGPD"
    AML_KYC = "AML_KYC"

# ============ MODELS ============
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: UserRole = UserRole.COMPLIANCE_OFFICER
    tenant_id: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    role: UserRole
    tenant_id: str
    created_at: str

class TenantCreate(BaseModel):
    name: str
    industry: str = "Financial Services"

class TenantResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    industry: str
    compliance_score: float
    created_at: str

class RegulationCreate(BaseModel):
    name: str
    framework: ComplianceFramework
    description: str
    source_url: Optional[str] = None
    version: str = "1.0"

class RegulationResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    framework: str
    description: str
    source_url: Optional[str]
    version: str
    sections: List[Dict[str, Any]]
    tenant_id: str
    created_at: str

class ControlCreate(BaseModel):
    name: str
    description: str
    framework: ComplianceFramework
    regulation_id: str
    status: str = "active"

class ControlResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    description: str
    framework: str
    regulation_id: str
    status: str
    effectiveness: float
    tenant_id: str
    created_at: str

class PolicyCreate(BaseModel):
    name: str
    content: str
    framework: ComplianceFramework
    related_controls: List[str] = []

class PolicyResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    content: str
    framework: str
    related_controls: List[str]
    tenant_id: str
    created_at: str
    updated_at: str

class IncidentCreate(BaseModel):
    title: str
    description: str
    severity: AlertSeverity
    framework: ComplianceFramework
    affected_systems: List[str] = []

class IncidentResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    description: str
    severity: str
    framework: str
    status: str
    affected_systems: List[str]
    related_regulations: List[str]
    suggested_remediation: str
    tenant_id: str
    created_at: str

class AgentTaskCreate(BaseModel):
    agent_type: AgentType
    description: str
    priority: int = 1

class AgentTaskResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    agent_type: str
    description: str
    status: str
    priority: int
    result: Optional[Dict[str, Any]]
    tenant_id: str
    created_at: str
    completed_at: Optional[str]

class AlertCreate(BaseModel):
    title: str
    description: str
    severity: AlertSeverity
    source: str
    framework: Optional[ComplianceFramework] = None

class AlertResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    description: str
    severity: str
    source: str
    framework: Optional[str]
    acknowledged: bool
    tenant_id: str
    created_at: str

class ChatMessage(BaseModel):
    message: str
    context: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    sources: List[Dict[str, Any]]
    suggested_actions: List[str]

class HITLDecision(BaseModel):
    decision: str  # "approve" or "deny"
    reason: Optional[str] = None

class ComplianceScore(BaseModel):
    framework: str
    score: float
    trend: str
    issues_count: int

class DashboardStats(BaseModel):
    overall_score: float
    scores_by_framework: List[ComplianceScore]
    open_incidents: int
    active_alerts: int
    pending_tasks: int
    recent_activities: List[Dict[str, Any]]

# ============ AUTH HELPERS ============
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str, tenant_id: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "tenant_id": tenant_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ============ AUTH ROUTES ============
@api_router.post("/auth/register", response_model=dict)
async def register(user: UserCreate):
    existing = await db.users.find_one({"email": user.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create default tenant if not provided
    tenant_id = user.tenant_id
    if not tenant_id:
        tenant_doc = {
            "id": str(uuid.uuid4()),
            "name": f"{user.name}'s Organization",
            "industry": "Financial Services",
            "compliance_score": 75.0,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.tenants.insert_one(tenant_doc)
        tenant_id = tenant_doc["id"]
        # Seed compliance data for new tenant
        await seed_tenant_data(tenant_id)
    
    user_doc = {
        "id": str(uuid.uuid4()),
        "email": user.email,
        "password": hash_password(user.password),
        "name": user.name,
        "role": user.role.value,
        "tenant_id": tenant_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    token = create_token(user_doc["id"], tenant_id, user.role.value)
    return {"token": token, "user": {k: v for k, v in user_doc.items() if k != "password"}}

@api_router.post("/auth/login", response_model=dict)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"], user["tenant_id"], user["role"])
    return {"token": token, "user": {k: v for k, v in user.items() if k != "password"}}

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# ============ TENANT ROUTES ============
@api_router.get("/tenants/current", response_model=TenantResponse)
async def get_current_tenant(current_user: dict = Depends(get_current_user)):
    tenant = await db.tenants.find_one({"id": current_user["tenant_id"]}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return tenant

@api_router.put("/tenants/current", response_model=TenantResponse)
async def update_tenant(tenant_update: TenantCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    await db.tenants.update_one(
        {"id": current_user["tenant_id"]},
        {"$set": {"name": tenant_update.name, "industry": tenant_update.industry}}
    )
    tenant = await db.tenants.find_one({"id": current_user["tenant_id"]}, {"_id": 0})
    return tenant

# ============ DASHBOARD ROUTES ============
@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    tenant_id = current_user["tenant_id"]
    
    # Get compliance scores by framework
    scores = await db.compliance_scores.find({"tenant_id": tenant_id}, {"_id": 0}).to_list(100)
    if not scores:
        scores = [
            {"framework": "PCI_DSS", "score": 82.5, "trend": "up", "issues_count": 3},
            {"framework": "GDPR", "score": 78.0, "trend": "stable", "issues_count": 5},
            {"framework": "CCPA", "score": 85.0, "trend": "up", "issues_count": 2},
            {"framework": "LGPD", "score": 71.0, "trend": "down", "issues_count": 7},
            {"framework": "AML_KYC", "score": 88.5, "trend": "up", "issues_count": 1},
        ]
    
    open_incidents = await db.incidents.count_documents({"tenant_id": tenant_id, "status": {"$ne": "closed"}})
    active_alerts = await db.alerts.count_documents({"tenant_id": tenant_id, "acknowledged": False})
    pending_tasks = await db.agent_tasks.count_documents({"tenant_id": tenant_id, "status": {"$in": ["open", "in_progress"]}})
    
    activities = await db.activities.find({"tenant_id": tenant_id}, {"_id": 0}).sort("created_at", -1).to_list(10)
    
    overall_score = sum(s["score"] for s in scores) / len(scores) if scores else 0
    
    return DashboardStats(
        overall_score=round(overall_score, 1),
        scores_by_framework=[ComplianceScore(**s) for s in scores],
        open_incidents=open_incidents,
        active_alerts=active_alerts,
        pending_tasks=pending_tasks,
        recent_activities=activities
    )

# ============ REGULATIONS ROUTES ============
@api_router.get("/regulations", response_model=List[RegulationResponse])
async def get_regulations(framework: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {"tenant_id": current_user["tenant_id"]}
    if framework:
        query["framework"] = framework
    regulations = await db.regulations.find(query, {"_id": 0}).to_list(100)
    return regulations

@api_router.post("/regulations", response_model=RegulationResponse)
async def create_regulation(regulation: RegulationCreate, current_user: dict = Depends(get_current_user)):
    reg_doc = {
        "id": str(uuid.uuid4()),
        "name": regulation.name,
        "framework": regulation.framework.value,
        "description": regulation.description,
        "source_url": regulation.source_url,
        "version": regulation.version,
        "sections": [],
        "tenant_id": current_user["tenant_id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.regulations.insert_one(reg_doc)
    return {k: v for k, v in reg_doc.items() if k != "_id"}

@api_router.get("/regulations/{regulation_id}", response_model=RegulationResponse)
async def get_regulation(regulation_id: str, current_user: dict = Depends(get_current_user)):
    regulation = await db.regulations.find_one(
        {"id": regulation_id, "tenant_id": current_user["tenant_id"]}, {"_id": 0}
    )
    if not regulation:
        raise HTTPException(status_code=404, detail="Regulation not found")
    return regulation

@api_router.post("/regulations/search")
async def search_regulations(query: dict, current_user: dict = Depends(get_current_user)):
    search_text = query.get("query", "")
    regulations = await db.regulations.find(
        {"tenant_id": current_user["tenant_id"], "name": {"$regex": search_text, "$options": "i"}},
        {"_id": 0}
    ).to_list(50)
    return {"results": regulations, "count": len(regulations)}

# ============ CONTROLS ROUTES ============
@api_router.get("/controls", response_model=List[ControlResponse])
async def get_controls(framework: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {"tenant_id": current_user["tenant_id"]}
    if framework:
        query["framework"] = framework
    controls = await db.controls.find(query, {"_id": 0}).to_list(200)
    return controls

@api_router.post("/controls", response_model=ControlResponse)
async def create_control(control: ControlCreate, current_user: dict = Depends(get_current_user)):
    control_doc = {
        "id": str(uuid.uuid4()),
        "name": control.name,
        "description": control.description,
        "framework": control.framework.value,
        "regulation_id": control.regulation_id,
        "status": control.status,
        "effectiveness": 80.0,
        "tenant_id": current_user["tenant_id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.controls.insert_one(control_doc)
    return {k: v for k, v in control_doc.items() if k != "_id"}

# ============ POLICIES ROUTES ============
@api_router.get("/policies", response_model=List[PolicyResponse])
async def get_policies(framework: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {"tenant_id": current_user["tenant_id"]}
    if framework:
        query["framework"] = framework
    policies = await db.policies.find(query, {"_id": 0}).to_list(100)
    return policies

@api_router.post("/policies", response_model=PolicyResponse)
async def create_policy(policy: PolicyCreate, current_user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    policy_doc = {
        "id": str(uuid.uuid4()),
        "name": policy.name,
        "content": policy.content,
        "framework": policy.framework.value,
        "related_controls": policy.related_controls,
        "tenant_id": current_user["tenant_id"],
        "created_at": now,
        "updated_at": now
    }
    await db.policies.insert_one(policy_doc)
    return {k: v for k, v in policy_doc.items() if k != "_id"}

# ============ INCIDENTS ROUTES ============
@api_router.get("/incidents", response_model=List[IncidentResponse])
async def get_incidents(status: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {"tenant_id": current_user["tenant_id"]}
    if status:
        query["status"] = status
    incidents = await db.incidents.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return incidents

@api_router.post("/incidents", response_model=IncidentResponse)
async def create_incident(incident: IncidentCreate, current_user: dict = Depends(get_current_user)):
    incident_doc = {
        "id": str(uuid.uuid4()),
        "title": incident.title,
        "description": incident.description,
        "severity": incident.severity.value,
        "framework": incident.framework.value,
        "status": "open",
        "affected_systems": incident.affected_systems,
        "related_regulations": [],
        "suggested_remediation": "Review affected systems and implement necessary controls.",
        "tenant_id": current_user["tenant_id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.incidents.insert_one(incident_doc)
    
    # Log activity
    await log_activity(current_user["tenant_id"], "incident_created", f"New incident: {incident.title}")
    
    return {k: v for k, v in incident_doc.items() if k != "_id"}

@api_router.put("/incidents/{incident_id}/status")
async def update_incident_status(incident_id: str, status_update: dict, current_user: dict = Depends(get_current_user)):
    new_status = status_update.get("status", "open")
    result = await db.incidents.update_one(
        {"id": incident_id, "tenant_id": current_user["tenant_id"]},
        {"$set": {"status": new_status}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Incident not found")
    return {"message": "Status updated", "status": new_status}

# ============ ALERTS ROUTES ============
@api_router.get("/alerts", response_model=List[AlertResponse])
async def get_alerts(acknowledged: Optional[bool] = None, current_user: dict = Depends(get_current_user)):
    query = {"tenant_id": current_user["tenant_id"]}
    if acknowledged is not None:
        query["acknowledged"] = acknowledged
    alerts = await db.alerts.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return alerts

@api_router.post("/alerts", response_model=AlertResponse)
async def create_alert(alert: AlertCreate, current_user: dict = Depends(get_current_user)):
    alert_doc = {
        "id": str(uuid.uuid4()),
        "title": alert.title,
        "description": alert.description,
        "severity": alert.severity.value,
        "source": alert.source,
        "framework": alert.framework.value if alert.framework else None,
        "acknowledged": False,
        "tenant_id": current_user["tenant_id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.alerts.insert_one(alert_doc)
    return {k: v for k, v in alert_doc.items() if k != "_id"}

@api_router.put("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.alerts.update_one(
        {"id": alert_id, "tenant_id": current_user["tenant_id"]},
        {"$set": {"acknowledged": True}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"message": "Alert acknowledged"}

# ============ AGENT TASKS ROUTES ============
@api_router.get("/agents/tasks", response_model=List[AgentTaskResponse])
async def get_agent_tasks(status: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {"tenant_id": current_user["tenant_id"]}
    if status:
        query["status"] = status
    tasks = await db.agent_tasks.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return tasks

@api_router.post("/agents/tasks", response_model=AgentTaskResponse)
async def create_agent_task(task: AgentTaskCreate, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    task_doc = {
        "id": str(uuid.uuid4()),
        "agent_type": task.agent_type.value,
        "description": task.description,
        "status": "open",
        "priority": task.priority,
        "result": None,
        "tenant_id": current_user["tenant_id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None
    }
    await db.agent_tasks.insert_one(task_doc)
    
    # Queue background processing
    background_tasks.add_task(process_agent_task, task_doc["id"], current_user["tenant_id"])
    
    return {k: v for k, v in task_doc.items() if k != "_id"}

@api_router.get("/agents/activity")
async def get_agent_activity(current_user: dict = Depends(get_current_user)):
    activities = await db.agent_activities.find(
        {"tenant_id": current_user["tenant_id"]}, {"_id": 0}
    ).sort("timestamp", -1).to_list(50)
    return {"activities": activities}

@api_router.put("/agents/tasks/{task_id}/hitl")
async def hitl_decision(task_id: str, decision: HITLDecision, current_user: dict = Depends(get_current_user)):
    """Human-in-the-loop approval for high-risk agent actions"""
    task = await db.agent_tasks.find_one(
        {"id": task_id, "tenant_id": current_user["tenant_id"]}, {"_id": 0}
    )
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    new_status = "approved" if decision.decision == "approve" else "denied"
    await db.agent_tasks.update_one(
        {"id": task_id},
        {"$set": {
            "status": new_status,
            "hitl_decision": decision.decision,
            "hitl_reason": decision.reason,
            "hitl_by": current_user["user_id"],
            "hitl_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    await log_activity(
        current_user["tenant_id"],
        "hitl_decision",
        f"Task {task_id[:8]} {new_status} by reviewer: {decision.reason or 'No reason given'}"
    )
    return {"message": f"Task {new_status}", "task_id": task_id}

# ============ MONITORING DATA ROUTES ============
@api_router.post("/monitoring/ingest")
async def ingest_monitoring_data(data: dict, current_user: dict = Depends(get_current_user)):
    """Ingest transaction or log data for monitoring"""
    records = data.get("records", [])
    data_type = data.get("type", "transaction")
    
    for record in records:
        record["tenant_id"] = current_user["tenant_id"]
        record["ingested_at"] = datetime.now(timezone.utc).isoformat()
        record["data_type"] = data_type
    
    if records:
        await db.monitoring_data.insert_many(records)
    
    # Trigger analysis
    await analyze_monitoring_data(current_user["tenant_id"], records)
    
    return {"message": f"Ingested {len(records)} records", "type": data_type}

@api_router.get("/monitoring/data")
async def get_monitoring_data(data_type: Optional[str] = None, limit: int = 100, current_user: dict = Depends(get_current_user)):
    query = {"tenant_id": current_user["tenant_id"]}
    if data_type:
        query["data_type"] = data_type
    data = await db.monitoring_data.find(query, {"_id": 0}).sort("ingested_at", -1).to_list(limit)
    return {"data": data, "count": len(data)}

# ============ RISK ANALYTICS ROUTES ============
@api_router.get("/risk/heatmap")
async def get_risk_heatmap(current_user: dict = Depends(get_current_user)):
    """Get risk heatmap data by business unit and framework"""
    heatmap = await db.risk_heatmap.find({"tenant_id": current_user["tenant_id"]}, {"_id": 0}).to_list(100)
    if not heatmap:
        # Return mock data
        heatmap = [
            {"business_unit": "Card Processing", "framework": "PCI_DSS", "risk_level": 3, "issues": 5},
            {"business_unit": "Card Processing", "framework": "GDPR", "risk_level": 2, "issues": 2},
            {"business_unit": "Customer Data", "framework": "GDPR", "risk_level": 4, "issues": 8},
            {"business_unit": "Customer Data", "framework": "CCPA", "risk_level": 3, "issues": 4},
            {"business_unit": "Marketing", "framework": "GDPR", "risk_level": 2, "issues": 3},
            {"business_unit": "Marketing", "framework": "CCPA", "risk_level": 1, "issues": 1},
            {"business_unit": "AML Operations", "framework": "AML_KYC", "risk_level": 2, "issues": 3},
            {"business_unit": "Payments", "framework": "PCI_DSS", "risk_level": 3, "issues": 4},
            {"business_unit": "Payments", "framework": "LGPD", "risk_level": 4, "issues": 6},
        ]
    return {"heatmap": heatmap}

@api_router.get("/risk/trends")
async def get_risk_trends(days: int = 30, current_user: dict = Depends(get_current_user)):
    """Get risk trends over time"""
    trends = await db.risk_trends.find({"tenant_id": current_user["tenant_id"]}, {"_id": 0}).to_list(days)
    if not trends:
        # Generate mock trends
        import random
        base_date = datetime.now(timezone.utc)
        trends = []
        for i in range(days):
            date = (base_date - timedelta(days=days-i-1)).strftime("%Y-%m-%d")
            trends.append({
                "date": date,
                "alerts": random.randint(2, 15),
                "incidents": random.randint(0, 5),
                "resolved": random.randint(1, 8),
                "compliance_score": 70 + random.randint(0, 20)
            })
    return {"trends": trends}

# ============ CHAT ASSISTANT ROUTES ============
@api_router.post("/chat", response_model=ChatResponse)
async def chat_assistant(message: ChatMessage, current_user: dict = Depends(get_current_user)):
    """AI-powered compliance chat assistant"""
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="LLM API key not configured")
    
    # Get relevant context from regulations and controls
    regulations = await db.regulations.find({"tenant_id": current_user["tenant_id"]}, {"_id": 0, "name": 1, "framework": 1, "description": 1}).to_list(20)
    controls = await db.controls.find({"tenant_id": current_user["tenant_id"]}, {"_id": 0, "name": 1, "framework": 1, "status": 1}).to_list(20)
    incidents = await db.incidents.find({"tenant_id": current_user["tenant_id"], "status": {"$ne": "closed"}}, {"_id": 0}).to_list(10)
    
    context = f"""You are a compliance assistant for a financial services organization.
    
Available Regulations: {regulations}
Active Controls: {controls}
Open Incidents: {incidents}

User's additional context: {message.context or 'None provided'}"""

    try:
        chat = LlmChat(
            api_key=api_key,
            session_id=f"compliance-{current_user['user_id']}-{datetime.now().timestamp()}",
            system_message=context
        ).with_model("gemini", "gemini-3-flash-preview")
        
        user_msg = UserMessage(text=message.message)
        response = await chat.send_message(user_msg)
        
        # Parse response for sources and actions
        sources = []
        for reg in regulations[:3]:
            if reg["name"].lower() in message.message.lower() or reg["framework"].lower() in message.message.lower():
                sources.append({"type": "regulation", "name": reg["name"], "framework": reg["framework"]})
        
        suggested_actions = []
        if "gap" in message.message.lower():
            suggested_actions.append("Run gap analysis agent")
        if "audit" in message.message.lower() or "report" in message.message.lower():
            suggested_actions.append("Generate audit evidence package")
        if "pci" in message.message.lower():
            suggested_actions.append("Review PCI DSS controls")
        
        return ChatResponse(
            response=response,
            sources=sources,
            suggested_actions=suggested_actions if suggested_actions else ["Review compliance dashboard", "Check recent alerts"]
        )
    except Exception as e:
        logger.error(f"Chat error: {e}")
        return ChatResponse(
            response=f"I apologize, but I encountered an error processing your request. Please try again. Error: {str(e)}",
            sources=[],
            suggested_actions=["Check system status", "Contact support if issue persists"]
        )

# ============ EVIDENCE & REPORTS ROUTES ============
@api_router.get("/evidence/packages")
async def get_evidence_packages(current_user: dict = Depends(get_current_user)):
    packages = await db.evidence_packages.find({"tenant_id": current_user["tenant_id"]}, {"_id": 0}).to_list(50)
    return {"packages": packages}

@api_router.post("/evidence/generate")
async def generate_evidence_package(request: dict, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    """Generate audit evidence package"""
    framework = request.get("framework", "PCI_DSS")
    period = request.get("period", "Q4 2024")
    
    package_doc = {
        "id": str(uuid.uuid4()),
        "framework": framework,
        "period": period,
        "status": "generating",
        "tenant_id": current_user["tenant_id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "controls": [],
        "evidence": [],
        "findings": []
    }
    await db.evidence_packages.insert_one(package_doc)
    
    background_tasks.add_task(generate_evidence_package_async, package_doc["id"], current_user["tenant_id"], framework)
    
    return {"message": "Evidence package generation started", "package_id": package_doc["id"]}

@api_router.get("/evidence/packages/{package_id}")
async def get_evidence_package(package_id: str, current_user: dict = Depends(get_current_user)):
    package = await db.evidence_packages.find_one(
        {"id": package_id, "tenant_id": current_user["tenant_id"]}, {"_id": 0}
    )
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    return package

# ============ REGULATORY CONFLICTS ROUTES ============
@api_router.post("/regulations/analyze-conflicts")
async def analyze_regulatory_conflicts(current_user: dict = Depends(get_current_user)):
    """AI-powered detection of conflicting obligations across regulations"""
    regulations = await db.regulations.find(
        {"tenant_id": current_user["tenant_id"]}, {"_id": 0}
    ).to_list(20)

    if len(regulations) < 2:
        return {"conflicts": [], "total_conflicts": 0, "analysis_summary": "Add more regulations to detect conflicts."}

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="LLM API key not configured")

    system_msg = """You are an expert regulatory conflict analyzer for financial services compliance.
Analyze provided regulations and identify conflicting obligations.

Return ONLY valid JSON (no markdown):
{
  "conflicts": [
    {
      "id": "C001",
      "regulation_1": "regulation name",
      "framework_1": "PCI_DSS|GDPR|CCPA|LGPD|AML_KYC",
      "regulation_2": "regulation name",
      "framework_2": "PCI_DSS|GDPR|CCPA|LGPD|AML_KYC",
      "conflict_type": "direct_contradiction|overlap|ambiguity",
      "description": "clear conflict description",
      "example": "concrete real-world example",
      "resolution": "recommended harmonized approach",
      "jurisdiction_winner": "which regulation takes precedence and why",
      "action_required": "specific action for compliance team",
      "severity": "low|medium|high|critical"
    }
  ],
  "total_conflicts": 0,
  "critical_conflicts": 0,
  "analysis_summary": "brief overall summary"
}"""

    reg_list = [{"name": r["name"], "framework": r["framework"], "description": r["description"]} for r in regulations]
    user_msg = f"""Identify ALL conflicting obligations between these regulations:

{json.dumps(reg_list, indent=2)}

Focus on: GDPR vs AML/KYC data retention, CCPA vs financial record-keeping, cross-jurisdiction conflicts.
Return only valid JSON."""

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(
            api_key=api_key,
            session_id=f"conflicts-{current_user['tenant_id']}-{datetime.now().timestamp()}",
            system_message=system_msg
        ).with_model("gemini", "gemini-3-flash-preview")
        response_text = await chat.send_message(UserMessage(text=user_msg))
        result = extract_json_from_text(response_text)
        await db.conflict_analyses.update_one(
            {"tenant_id": current_user["tenant_id"]},
            {"$set": {"tenant_id": current_user["tenant_id"], "result": result, "analyzed_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True
        )
        return result
    except Exception as e:
        logger.error(f"Conflict analysis error: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@api_router.get("/regulations/conflicts")
async def get_cached_conflicts(current_user: dict = Depends(get_current_user)):
    """Get cached conflict analysis results"""
    cached = await db.conflict_analyses.find_one({"tenant_id": current_user["tenant_id"]}, {"_id": 0})
    if not cached:
        return {"conflicts": [], "total_conflicts": 0, "analysis_summary": "No analysis run yet. Use the Analyze button."}
    return cached["result"]

@api_router.post("/regulations/{regulation_id}/decompose")
async def decompose_regulation(regulation_id: str, current_user: dict = Depends(get_current_user)):
    """Decompose a regulation into atomic machine-readable requirements"""
    regulation = await db.regulations.find_one(
        {"id": regulation_id, "tenant_id": current_user["tenant_id"]}, {"_id": 0}
    )
    if not regulation:
        raise HTTPException(status_code=404, detail="Regulation not found")

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="LLM API key not configured")

    system_msg = """You are a regulatory requirements analyst.
Decompose regulations into atomic, machine-readable requirements (single testable obligations).

Return ONLY valid JSON (no markdown):
{
  "regulation_name": "string",
  "framework": "string",
  "atomic_requirements": [
    {
      "id": "REQ-001",
      "action": "what must be done (verb phrase)",
      "object": "what it applies to",
      "condition": "when/how it applies",
      "priority": "critical|high|medium|low",
      "data_types_affected": ["list of data types"],
      "verification_method": "how to verify compliance",
      "related_controls": ["suggested control names"]
    }
  ],
  "total_requirements": 0,
  "critical_count": 0
}"""

    user_msg = f"""Decompose this regulation into 6-10 atomic requirements:

Name: {regulation['name']}
Framework: {regulation['framework']}
Description: {regulation['description']}
Sections: {json.dumps(regulation.get('sections', []))}

Return valid JSON only."""

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(
            api_key=api_key,
            session_id=f"decompose-{regulation_id}-{datetime.now().timestamp()}",
            system_message=system_msg
        ).with_model("gemini", "gemini-3-flash-preview")
        response_text = await chat.send_message(UserMessage(text=user_msg))
        result = extract_json_from_text(response_text)
        await db.atomic_requirements.update_one(
            {"regulation_id": regulation_id, "tenant_id": current_user["tenant_id"]},
            {"$set": {"regulation_id": regulation_id, "tenant_id": current_user["tenant_id"], "result": result, "analyzed_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True
        )
        return result
    except Exception as e:
        logger.error(f"Decomposition error: {e}")
        raise HTTPException(status_code=500, detail=f"Decomposition failed: {str(e)}")

@api_router.get("/regulations/{regulation_id}/atomic-requirements")
async def get_atomic_requirements(regulation_id: str, current_user: dict = Depends(get_current_user)):
    """Get cached atomic requirements for a regulation"""
    cached = await db.atomic_requirements.find_one(
        {"regulation_id": regulation_id, "tenant_id": current_user["tenant_id"]}, {"_id": 0}
    )
    if not cached:
        return {"atomic_requirements": [], "total_requirements": 0, "message": "Not analyzed yet."}
    return cached["result"]

# ============ PREDICTIVE INSIGHTS ROUTES ============
@api_router.get("/insights")
async def get_predictive_insights(refresh: bool = False, current_user: dict = Depends(get_current_user)):
    """AI-generated predictive compliance insights"""
    tenant_id = current_user["tenant_id"]

    if not refresh:
        cached = await db.insights_cache.find_one({"tenant_id": tenant_id}, {"_id": 0})
        if cached:
            try:
                analyzed_at = datetime.fromisoformat(cached["analyzed_at"].replace('Z', '+00:00'))
                if (datetime.now(timezone.utc) - analyzed_at).seconds < 3600:
                    return cached["result"]
            except Exception:
                pass

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return _mock_insights()

    incidents = await db.incidents.find({"tenant_id": tenant_id}, {"_id": 0}).to_list(20)
    alerts = await db.alerts.find({"tenant_id": tenant_id, "acknowledged": False}, {"_id": 0}).to_list(20)
    controls = await db.controls.find({"tenant_id": tenant_id}, {"_id": 0, "name": 1, "effectiveness": 1, "framework": 1, "status": 1}).to_list(30)

    system_msg = """You are a predictive compliance intelligence system for financial services.
Analyze compliance posture and provide predictive insights.

Return ONLY valid JSON (no markdown):
{
  "risk_prediction": {
    "overall_trend": "improving|declining|stable",
    "predicted_score_next_30_days": 0,
    "confidence": 0,
    "key_drivers": []
  },
  "behavioral_insights": [
    {"type": "pre_crime|pattern|anomaly", "description": "insight", "risk_level": "low|medium|high|critical", "recommended_action": "action"}
  ],
  "systemic_risks": [
    {"risk": "description", "affected_frameworks": [], "probability": "low|medium|high", "impact": "low|medium|high|critical"}
  ],
  "quick_wins": [],
  "priority_actions": [
    {"action": "string", "impact": "high|medium|low", "effort": "high|medium|low", "framework": "string"}
  ],
  "three_specialist_signals": {
    "financial": {"risk_level": "low|medium|high|critical", "signals": [], "top_finding": "string"},
    "behavioral": {"risk_level": "low|medium|high|critical", "signals": [], "top_finding": "string"},
    "operational": {"risk_level": "low|medium|high|critical", "signals": [], "top_finding": "string"}
  }
}"""

    user_msg = f"""Generate predictive insights based on current compliance state:

Incidents ({len(incidents)}): {json.dumps([{k: v for k, v in i.items() if k in ['title','severity','framework','status']} for i in incidents[:10]])}
Active Alerts ({len(alerts)}): {json.dumps([{k: v for k, v in a.items() if k in ['title','severity','source']} for a in alerts[:10]])}
Controls: {json.dumps([{k: v for k, v in c.items() if k in ['name','effectiveness','framework','status']} for c in controls[:15]])}

Provide actionable predictive insights. Return valid JSON only."""

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(
            api_key=api_key,
            session_id=f"insights-{tenant_id}-{datetime.now().timestamp()}",
            system_message=system_msg
        ).with_model("gemini", "gemini-3-flash-preview")
        response_text = await chat.send_message(UserMessage(text=user_msg))
        result = extract_json_from_text(response_text)
        await db.insights_cache.update_one(
            {"tenant_id": tenant_id},
            {"$set": {"tenant_id": tenant_id, "result": result, "analyzed_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True
        )
        return result
    except Exception as e:
        logger.error(f"Insights error: {e}")
        return _mock_insights()

def _mock_insights():
    return {
        "risk_prediction": {"overall_trend": "improving", "predicted_score_next_30_days": 84.5, "confidence": 72, "key_drivers": ["PCI DSS controls improving", "GDPR incidents declining", "New AML monitoring active"]},
        "behavioral_insights": [
            {"type": "pattern", "description": "Spike in GDPR data export requests detected this week", "risk_level": "medium", "recommended_action": "Review data portability workflow and response timelines"},
            {"type": "anomaly", "description": "Access control effectiveness dropped 8% below threshold", "risk_level": "high", "recommended_action": "Audit access permissions immediately across Card Processing team"}
        ],
        "systemic_risks": [{"risk": "Outdated PCI DSS controls may not satisfy v4.0 requirements effective March 2025", "affected_frameworks": ["PCI_DSS"], "probability": "medium", "impact": "high"}],
        "quick_wins": ["Enable MFA for all admin accounts", "Complete pending GDPR data mapping", "Update privacy notices for CCPA compliance"],
        "priority_actions": [
            {"action": "Complete PCI DSS v4.0 gap assessment", "impact": "high", "effort": "medium", "framework": "PCI_DSS"},
            {"action": "Resolve 3 open GDPR access requests past SLA", "impact": "high", "effort": "low", "framework": "GDPR"},
            {"action": "Update AML transaction monitoring thresholds", "impact": "medium", "effort": "medium", "framework": "AML_KYC"}
        ],
        "three_specialist_signals": {
            "financial": {"risk_level": "medium", "signals": ["High-value transactions > $10K pending review", "2 flagged wash-pattern sequences"], "top_finding": "Multiple suspicious transaction patterns detected requiring AML review"},
            "behavioral": {"risk_level": "low", "signals": ["No insider trading signals detected", "Normal communication patterns"], "top_finding": "Behavioral risk within acceptable parameters"},
            "operational": {"risk_level": "high", "signals": ["Failed login spike from 3 IPs", "Data export volume 40% above baseline"], "top_finding": "Unusual data access patterns require immediate investigation"}
        }
    }

# ============ DOCUMENT UPLOAD ROUTES ============
@api_router.post("/documents/upload")
async def upload_document(file: UploadFile = File(...), framework: str = "PCI_DSS", current_user: dict = Depends(get_current_user)):
    """Upload regulatory documents for RAG processing"""
    content = await file.read()
    filename = file.filename or "unknown"
    
    doc_doc = {
        "id": str(uuid.uuid4()),
        "filename": filename,
        "framework": framework,
        "content_type": file.content_type,
        "size": len(content),
        "status": "processing",
        "tenant_id": current_user["tenant_id"],
        "uploaded_at": datetime.now(timezone.utc).isoformat()
    }
    await db.documents.insert_one(doc_doc)
    
    # Store raw content
    await db.document_contents.insert_one({
        "document_id": doc_doc["id"],
        "content": content.decode("utf-8", errors="ignore")[:50000]  # Limit for demo
    })
    
    return {"message": "Document uploaded", "document_id": doc_doc["id"], "filename": filename}

@api_router.get("/documents")
async def get_documents(current_user: dict = Depends(get_current_user)):
    docs = await db.documents.find({"tenant_id": current_user["tenant_id"]}, {"_id": 0}).to_list(100)
    return {"documents": docs}

# ============ HELPER FUNCTIONS ============
def extract_json_from_text(text: str) -> dict:
    """Extract JSON from LLM response that may include markdown fences"""
    match = re.search(r'```(?:json)?\s*(\{[\s\S]*?\})\s*```', text)
    if match:
        return json.loads(match.group(1))
    match = re.search(r'\{[\s\S]*\}', text)
    if match:
        return json.loads(match.group(0))
    raise ValueError("No JSON found in LLM response")

async def log_activity(tenant_id: str, activity_type: str, description: str):
    activity = {
        "id": str(uuid.uuid4()),
        "tenant_id": tenant_id,
        "type": activity_type,
        "description": description,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.activities.insert_one(activity)

async def process_agent_task(task_id: str, tenant_id: str):
    """AI-powered background agent task processing"""
    task = await db.agent_tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        return

    await db.agent_tasks.update_one({"id": task_id}, {"$set": {"status": "in_progress"}})

    agent_type = task["agent_type"]
    description = task["description"]

    api_key = os.environ.get("GEMINI_API_KEY")

    try:
        regulations = await db.regulations.find({"tenant_id": tenant_id}, {"_id": 0, "name": 1, "framework": 1, "description": 1, "version": 1}).to_list(20)
        controls = await db.controls.find({"tenant_id": tenant_id}, {"_id": 0, "name": 1, "framework": 1, "status": 1, "effectiveness": 1}).to_list(30)
        incidents = await db.incidents.find({"tenant_id": tenant_id, "status": {"$ne": "closed"}}, {"_id": 0, "title": 1, "severity": 1, "framework": 1, "description": 1}).to_list(10)
        alerts = await db.alerts.find({"tenant_id": tenant_id, "acknowledged": False}, {"_id": 0, "title": 1, "severity": 1, "source": 1}).to_list(10)

        if agent_type == "regulatory_discovery":
            system_msg = """You are the Regulatory Discovery (Ingestor) Agent in a PCI/PII compliance platform.
Role: Monitor and discover regulatory changes, new requirements, and compliance obligations.
Return ONLY valid JSON:
{
  "findings": ["list of discovered items"],
  "recommendations": ["list of urgent actions"],
  "regulatory_updates": [{"regulation": "name", "change": "description", "impact": "low|medium|high", "effective_date": "string"}],
  "priority_actions": ["urgent action 1", "urgent action 2"],
  "gaps_identified": [{"framework": "string", "gap": "description", "severity": "low|medium|high|critical"}],
  "confidence_score": 0
}"""
            user_msg = f"""Task: {description}

Regulatory context:
Regulations in system: {json.dumps([{k: v for k, v in r.items() if k in ['name','framework','description','version']} for r in regulations[:5]])}
Open Incidents: {json.dumps([{k: v for k, v in i.items() if k in ['title','severity','framework']} for i in incidents[:5]])}

Analyze for regulatory discovery findings. Return valid JSON."""

        elif agent_type == "policy_mapping":
            system_msg = """You are the Policy Mapping (Interpreter) Agent in a PCI/PII compliance platform.
Role: Map regulations to internal controls, calculate confidence scores, identify policy gaps.
Return ONLY valid JSON:
{
  "findings": ["mapping result 1", "mapping result 2"],
  "recommendations": ["improvement 1"],
  "mappings": [{"regulation": "name", "control": "name", "confidence": 0, "status": "mapped|gap|partial", "notes": "string"}],
  "gaps": [{"framework": "string", "gap_description": "string", "severity": "low|medium|high|critical", "affected_control": "string"}],
  "confidence_score": 0,
  "overall_mapping_coverage": 0
}"""
            user_msg = f"""Task: {description}

Regulations: {json.dumps([{k: v for k, v in r.items() if k in ['name','framework','description']} for r in regulations[:8]])}
Controls: {json.dumps([{k: v for k, v in c.items() if k in ['name','framework','status','effectiveness']} for c in controls[:12]])}

Map regulations to controls, score confidence, identify gaps. Return valid JSON."""

        elif agent_type == "monitoring_risk":
            system_msg = """You are the Monitoring & Risk (Auditor) Agent in a PCI/PII compliance platform.
You operate as three specialists:
- Financial: Detects transaction anomalies, wash transactions, smurfing
- Behavioral: Semantic analysis for insider trading, collusion, compliance risks
- Operations: System/access log anomalies, unauthorized access, data exfiltration

Return ONLY valid JSON:
{
  "findings": ["risk signal 1", "risk signal 2"],
  "recommendations": ["mitigation 1"],
  "risk_signals": [{"type": "financial|behavioral|operational", "signal": "description", "severity": "low|medium|high|critical", "evidence": "string"}],
  "cross_domain_correlations": [{"signals": ["s1","s2"], "combined_risk": "description", "severity": "string"}],
  "predictions": ["predicted future risk 1"],
  "confidence_score": 0
}"""
            user_msg = f"""Task: {description}

Current incidents: {json.dumps([{k: v for k, v in i.items() if k in ['title','severity','framework','description']} for i in incidents[:6]])}
Active alerts: {json.dumps([{k: v for k, v in a.items() if k in ['title','severity','source']} for a in alerts[:6]])}
Controls: {json.dumps([{k: v for k, v in c.items() if k in ['name','effectiveness','framework']} for c in controls[:5]])}

Analyze risk posture across financial, behavioral, and operational domains. Return valid JSON."""

        elif agent_type == "evidence_reporting":
            system_msg = """You are the Evidence & Reporting (Remediation Planner) Agent in a PCI/PII compliance platform.
Role: Assess evidence quality, identify audit gaps, generate remediation plans.
Return ONLY valid JSON:
{
  "findings": ["evidence finding 1"],
  "recommendations": ["remediation step 1"],
  "evidence_quality_score": 0,
  "gaps": [{"control": "name", "gap": "description", "severity": "low|medium|high|critical", "remediation": "specific action", "effort": "low|medium|high"}],
  "strengths": [{"area": "name", "description": "what is working well"}],
  "audit_readiness": "low|medium|high",
  "remediation_plan": [{"step": 1, "action": "string", "priority": "string", "timeline": "string"}],
  "confidence_score": 0
}"""
            user_msg = f"""Task: {description}

Controls assessment: {json.dumps([{k: v for k, v in c.items() if k in ['name','effectiveness','framework','status']} for c in controls[:12]])}
Regulations: {json.dumps([{k: v for k, v in r.items() if k in ['name','framework']} for r in regulations[:5]])}
Open incidents: {json.dumps([{k: v for k, v in i.items() if k in ['title','severity','framework']} for i in incidents[:5]])}

Generate comprehensive evidence assessment and remediation plan. Return valid JSON."""

        else:
            system_msg = "You are a compliance analysis agent. Analyze the given task and return findings as valid JSON with keys: findings, recommendations, confidence_score."
            user_msg = f"Task: {description}\nReturn JSON only."

        if api_key:
            from emergentintegrations.llm.chat import LlmChat, UserMessage
            chat = LlmChat(
                api_key=api_key,
                session_id=f"agent-{task_id}",
                system_message=system_msg
            ).with_model("gemini", "gemini-3-flash-preview")
            response_text = await chat.send_message(UserMessage(text=user_msg))
            try:
                result = extract_json_from_text(response_text)
            except (json.JSONDecodeError, ValueError):
                result = {"findings": [response_text[:400]], "recommendations": ["Review raw agent output"], "confidence_score": 40}
        else:
            result = {
                "findings": [f"[Demo] Completed {agent_type.replace('_',' ')} analysis for: {description}"],
                "recommendations": ["Configure LLM API key for real AI analysis"],
                "confidence_score": 0
            }

        result["agent_type"] = agent_type
        result["task_description"] = description

    except Exception as e:
        logger.error(f"Agent task error: {e}")
        result = {"findings": ["Processing error occurred"], "recommendations": ["Check system configuration"], "error": str(e), "confidence_score": 0}

    await db.agent_tasks.update_one(
        {"id": task_id},
        {"$set": {"status": "completed", "result": result, "completed_at": datetime.now(timezone.utc).isoformat()}}
    )

    findings_count = len(result.get("findings", []))
    rec_count = len(result.get("recommendations", []))
    await db.agent_activities.insert_one({
        "id": str(uuid.uuid4()),
        "tenant_id": tenant_id,
        "agent_type": agent_type,
        "action": f"Completed: {description[:60]}",
        "result_summary": f"{findings_count} findings, {rec_count} recommendations",
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    await log_activity(tenant_id, "agent_task_completed", f"{agent_type.replace('_',' ').title()} agent: {description[:60]}")

async def analyze_monitoring_data(tenant_id: str, records: List[dict]):
    """Analyze monitoring data for anomalies"""
    # Simple anomaly detection simulation
    for record in records:
        # Check for PII/PCI patterns
        content = str(record)
        if any(pattern in content.lower() for pattern in ["card", "ssn", "password", "credit"]):
            alert = {
                "id": str(uuid.uuid4()),
                "title": "Potential PII/PCI Data Exposure",
                "description": f"Sensitive data pattern detected in monitoring data",
                "severity": "high",
                "source": "Monitoring Agent",
                "framework": "PCI_DSS",
                "acknowledged": False,
                "tenant_id": tenant_id,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.alerts.insert_one(alert)

async def generate_evidence_package_async(package_id: str, tenant_id: str, framework: str):
    """AI-powered evidence package generation"""
    controls = await db.controls.find({"tenant_id": tenant_id, "framework": framework}, {"_id": 0}).to_list(50)
    incidents = await db.incidents.find({"tenant_id": tenant_id, "framework": framework}, {"_id": 0}).to_list(20)

    evidence = [
        {
            "control_id": c["id"],
            "control_name": c["name"],
            "status": c.get("status", "active"),
            "effectiveness": c.get("effectiveness", 80),
            "evidence_type": "automated_scan",
            "collected_at": datetime.now(timezone.utc).isoformat()
        }
        for c in controls
    ]

    api_key = os.environ.get("GEMINI_API_KEY")
    if api_key and controls:
        try:
            system_msg = """You are an audit evidence reporting agent.
Generate realistic compliance audit findings for an evidence package.
Return ONLY valid JSON:
{
  "findings": [
    {
      "type": "gap|improvement|strength|critical",
      "description": "specific finding description",
      "severity": "critical|high|medium|low",
      "affected_control": "control name or null",
      "remediation": "specific recommended action",
      "evidence_reference": "what evidence supports this finding"
    }
  ],
  "overall_assessment": "one paragraph summary",
  "audit_readiness_score": 0,
  "key_gaps": ["gap 1", "gap 2"],
  "strengths": ["strength 1"]
}"""
            user_msg = f"""Generate audit evidence findings for {framework}:

Controls ({len(controls)}): {json.dumps([{k: v for k, v in c.items() if k in ['name','status','effectiveness']} for c in controls[:10]])}
Incidents ({len(incidents)}): {json.dumps([{k: v for k, v in i.items() if k in ['title','severity','status']} for i in incidents[:5]])}

Generate 4-6 realistic audit findings. Return valid JSON."""

            from emergentintegrations.llm.chat import LlmChat, UserMessage
            chat = LlmChat(api_key=api_key, session_id=f"evidence-{package_id}", system_message=system_msg).with_model("gemini", "gemini-3-flash-preview")
            response_text = await chat.send_message(UserMessage(text=user_msg))
            ai_result = extract_json_from_text(response_text)
            findings = ai_result.get("findings", [])
        except Exception as e:
            logger.error(f"AI evidence generation error: {e}")
            findings = [
                {"type": "gap", "description": "Backup storage encryption not fully documented", "severity": "medium", "remediation": "Document and verify encryption for all backup systems"},
                {"type": "improvement", "description": "Access review cycle needs formal scheduling", "severity": "low", "remediation": "Establish quarterly access review cadence"}
            ]
    else:
        findings = [
            {"type": "gap", "description": "Backup storage encryption not fully documented", "severity": "medium", "remediation": "Document and verify encryption for all backup systems"},
            {"type": "improvement", "description": "Access review cycle needs formal scheduling", "severity": "low", "remediation": "Establish quarterly access review cadence"}
        ]

    await db.evidence_packages.update_one(
        {"id": package_id},
        {"$set": {
            "status": "completed",
            "controls": controls,
            "evidence": evidence,
            "findings": findings,
            "completed_at": datetime.now(timezone.utc).isoformat()
        }}
    )

async def seed_tenant_data(tenant_id: str):
    """Seed comprehensive demo data for a new tenant"""
    
    # Seed regulations
    regulations_data = [
        {"name": "PCI DSS v4.0", "framework": "PCI_DSS", "description": "Payment Card Industry Data Security Standard version 4.0", "version": "4.0"},
        {"name": "GDPR", "framework": "GDPR", "description": "General Data Protection Regulation - EU data privacy law", "version": "2016/679"},
        {"name": "CCPA", "framework": "CCPA", "description": "California Consumer Privacy Act", "version": "2020"},
        {"name": "LGPD", "framework": "LGPD", "description": "Lei Geral de Proteção de Dados - Brazil data protection", "version": "2020"},
        {"name": "AML/KYC Guidelines", "framework": "AML_KYC", "description": "Anti-Money Laundering and Know Your Customer requirements", "version": "2024"},
    ]
    
    for reg in regulations_data:
        reg["id"] = str(uuid.uuid4())
        reg["tenant_id"] = tenant_id
        reg["sections"] = [
            {"number": "1", "title": "Scope", "content": "Defines the scope of the regulation"},
            {"number": "2", "title": "Requirements", "content": "Core requirements and obligations"},
            {"number": "3", "title": "Controls", "content": "Required security controls"},
        ]
        reg["created_at"] = datetime.now(timezone.utc).isoformat()
        reg["source_url"] = None
    
    await db.regulations.insert_many(regulations_data)
    
    # Seed controls
    controls_data = [
        {"name": "Firewall Configuration", "framework": "PCI_DSS", "description": "Install and maintain network security controls"},
        {"name": "Data Encryption", "framework": "PCI_DSS", "description": "Encrypt transmission of cardholder data"},
        {"name": "Access Control", "framework": "PCI_DSS", "description": "Restrict access to cardholder data by business need"},
        {"name": "Data Subject Rights", "framework": "GDPR", "description": "Enable data subject access and deletion requests"},
        {"name": "Consent Management", "framework": "GDPR", "description": "Obtain and manage consent for data processing"},
        {"name": "Data Breach Notification", "framework": "GDPR", "description": "72-hour breach notification process"},
        {"name": "Consumer Opt-Out", "framework": "CCPA", "description": "Do Not Sell My Personal Information mechanism"},
        {"name": "Privacy Notice", "framework": "CCPA", "description": "Clear disclosure of data practices"},
        {"name": "Customer Identification", "framework": "AML_KYC", "description": "Verify customer identity before account opening"},
        {"name": "Transaction Monitoring", "framework": "AML_KYC", "description": "Monitor transactions for suspicious activity"},
        {"name": "Data Portability", "framework": "LGPD", "description": "Enable data portability for users"},
    ]
    
    for i, control in enumerate(controls_data):
        control["id"] = str(uuid.uuid4())
        control["tenant_id"] = tenant_id
        control["regulation_id"] = regulations_data[i % len(regulations_data)]["id"]
        control["status"] = "active"
        control["effectiveness"] = 70 + (i * 3) % 30
        control["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.controls.insert_many(controls_data)
    
    # Seed incidents
    incidents_data = [
        {"title": "Potential Card Data Exposure", "description": "Unencrypted card data found in application logs", "severity": "critical", "framework": "PCI_DSS", "status": "open"},
        {"title": "GDPR Access Request Delayed", "description": "Data subject request not fulfilled within 30 days", "severity": "high", "framework": "GDPR", "status": "in_progress"},
        {"title": "Missing Consent Records", "description": "Some marketing emails sent without documented consent", "severity": "medium", "framework": "CCPA", "status": "open"},
        {"title": "Suspicious Transaction Pattern", "description": "Multiple high-value transactions flagged for review", "severity": "high", "framework": "AML_KYC", "status": "verified"},
    ]
    
    for incident in incidents_data:
        incident["id"] = str(uuid.uuid4())
        incident["tenant_id"] = tenant_id
        incident["affected_systems"] = ["Payment Gateway", "Customer Database"]
        incident["related_regulations"] = []
        incident["suggested_remediation"] = "Review and implement additional security controls"
        incident["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.incidents.insert_many(incidents_data)
    
    # Seed alerts
    alerts_data = [
        {"title": "High Volume of Failed Access Attempts", "description": "50+ failed login attempts detected", "severity": "high", "source": "Access Monitor"},
        {"title": "New Regulatory Update Available", "description": "PCI DSS v4.0.1 released with clarifications", "severity": "medium", "source": "Regulatory Discovery Agent"},
        {"title": "Control Effectiveness Declining", "description": "Encryption control effectiveness dropped below threshold", "severity": "medium", "source": "Monitoring Agent"},
        {"title": "Data Export Request", "description": "New GDPR data export request received", "severity": "low", "source": "Customer Portal"},
    ]
    
    for alert in alerts_data:
        alert["id"] = str(uuid.uuid4())
        alert["tenant_id"] = tenant_id
        alert["framework"] = None
        alert["acknowledged"] = False
        alert["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.alerts.insert_many(alerts_data)
    
    # Seed agent activities
    agent_activities = [
        {"agent_type": "regulatory_discovery", "action": "Scanned PCI Security Council website for updates"},
        {"agent_type": "policy_mapping", "action": "Mapped 15 new controls to GDPR requirements"},
        {"agent_type": "monitoring_risk", "action": "Analyzed 1,234 transactions for anomalies"},
        {"agent_type": "evidence_reporting", "action": "Generated Q3 compliance evidence package"},
    ]
    
    for i, activity in enumerate(agent_activities):
        activity["id"] = str(uuid.uuid4())
        activity["tenant_id"] = tenant_id
        activity["timestamp"] = (datetime.now(timezone.utc) - timedelta(hours=i*2)).isoformat()
    
    await db.agent_activities.insert_many(agent_activities)
    
    # Seed recent activities
    activities = [
        {"type": "incident_created", "description": "New critical incident: Potential Card Data Exposure"},
        {"type": "control_updated", "description": "Encryption control effectiveness updated to 85%"},
        {"type": "regulation_added", "description": "Added PCI DSS v4.0 to regulatory library"},
        {"type": "task_completed", "description": "Gap analysis completed for GDPR"},
    ]
    
    for i, act in enumerate(activities):
        act["id"] = str(uuid.uuid4())
        act["tenant_id"] = tenant_id
        act["created_at"] = (datetime.now(timezone.utc) - timedelta(hours=i)).isoformat()
    
    await db.activities.insert_many(activities)
    
    logger.info(f"Seeded compliance data for tenant {tenant_id}")

# ============ MAIN APP SETUP ============
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def auto_seed_demo():
    """When using in-memory mock DB, seed a demo user + compliance data on startup."""
    if not _USING_MOCK_DB:
        return
    existing = await db.users.find_one({"email": "admin@compliancepulse.demo"})
    if existing:
        return
    demo_tenant = "tenant_visa_demo"
    pw_hash = bcrypt.hashpw(b"admin123", bcrypt.gensalt()).decode()
    await db.users.insert_one({
        "id": str(uuid.uuid4()), "tenant_id": demo_tenant,
        "email": "admin@compliancepulse.demo", "name": "Demo Admin",
        "password": pw_hash, "role": "admin",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    await seed_tenant_data(demo_tenant)
    logger.info("Auto-seeded demo data (in-memory mode)")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
