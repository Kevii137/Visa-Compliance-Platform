"""
Seed script — populates compliance_db with demo data.
Run: python seed.py
"""
import asyncio, uuid, bcrypt
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path
from dotenv import load_dotenv
import os, socket

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name   = os.environ.get('DB_NAME', 'compliance_db')

def _make_client():
    host = mongo_url.split('//')[1].split('/')[0].split(':')[0]
    port_str = mongo_url.split('//')[1]
    port = int(port_str.split(':')[1].split('/')[0]) if ':' in port_str else 27017
    s = socket.socket(); s.settimeout(0.5)
    try:
        s.connect((host, port)); s.close()
        return AsyncIOMotorClient(mongo_url)
    except Exception:
        s.close()
        from mongomock_motor import AsyncMongoMockClient
        print("⚠️  MongoDB unreachable — seeding into in-memory mock (only useful if server uses same process)")
        return AsyncMongoMockClient()

def now(): return datetime.now(timezone.utc)
def ndays(n): return now() - timedelta(days=n)
def uid(): return str(uuid.uuid4())

TENANT = "tenant_visa_demo"

REGULATIONS = [
    {"id": uid(), "tenant_id": TENANT, "name": "PCI DSS v4.0.1", "framework": "PCI_DSS", "version": "4.0.1",
     "description": "Payment Card Industry Data Security Standard — protects cardholder data across all payment card transactions.",
     "source_url": "https://www.pcisecuritystandards.org", "sections": ["1","2","3","4","6","7","8","10","11","12"],
     "created_at": ndays(120).isoformat()},
    {"id": uid(), "tenant_id": TENANT, "name": "GDPR 2016/679", "framework": "GDPR", "version": "2016/679",
     "description": "General Data Protection Regulation — EU regulation on data protection and privacy for all individuals within the EU.",
     "source_url": "https://gdpr.eu", "sections": ["Art.5","Art.6","Art.17","Art.25","Art.32","Art.33","Art.34"],
     "created_at": ndays(110).isoformat()},
    {"id": uid(), "tenant_id": TENANT, "name": "CCPA 2018", "framework": "CCPA", "version": "2018",
     "description": "California Consumer Privacy Act — gives California consumers rights over their personal information.",
     "source_url": "https://oag.ca.gov/privacy/ccpa", "sections": ["1798.100","1798.105","1798.110","1798.115","1798.120"],
     "created_at": ndays(100).isoformat()},
    {"id": uid(), "tenant_id": TENANT, "name": "AML/KYC FATF Guidelines", "framework": "AML_KYC", "version": "2023",
     "description": "Anti-Money Laundering and Know-Your-Customer FATF Recommendations for financial institutions.",
     "source_url": "https://www.fatf-gafi.org", "sections": ["Rec.1","Rec.10","Rec.11","Rec.20","Rec.21"],
     "created_at": ndays(90).isoformat()},
    {"id": uid(), "tenant_id": TENANT, "name": "LGPD Lei 13.709/2018", "framework": "LGPD", "version": "2018",
     "description": "Lei Geral de Proteção de Dados — Brazilian data protection law modeled on GDPR.",
     "source_url": "https://www.planalto.gov.br", "sections": ["Art.6","Art.7","Art.11","Art.18","Art.46","Art.48"],
     "created_at": ndays(85).isoformat()},
]

def make_controls(reg_id, fw):
    base = [
        {"id": uid(), "tenant_id": TENANT, "regulation_id": reg_id, "framework": fw,
         "name": f"{fw} Control — Encryption at Rest", "description": "All sensitive data must be encrypted at rest using AES-256.",
         "status": "compliant", "risk_level": "low", "last_assessed": ndays(10).isoformat(), "created_at": ndays(60).isoformat()},
        {"id": uid(), "tenant_id": TENANT, "regulation_id": reg_id, "framework": fw,
         "name": f"{fw} Control — Access Control", "description": "Role-based access control enforced for all production systems.",
         "status": "compliant", "risk_level": "medium", "last_assessed": ndays(5).isoformat(), "created_at": ndays(55).isoformat()},
        {"id": uid(), "tenant_id": TENANT, "regulation_id": reg_id, "framework": fw,
         "name": f"{fw} Control — Audit Logging", "description": "All privileged operations must generate immutable audit logs.",
         "status": "partial", "risk_level": "high", "last_assessed": ndays(3).isoformat(), "created_at": ndays(50).isoformat()},
        {"id": uid(), "tenant_id": TENANT, "regulation_id": reg_id, "framework": fw,
         "name": f"{fw} Control — Data Retention", "description": "Data retention schedules enforced per regulatory requirement.",
         "status": "non_compliant", "risk_level": "critical", "last_assessed": ndays(1).isoformat(), "created_at": ndays(45).isoformat()},
    ]
    return base

ALERTS = [
    {"id": uid(), "tenant_id": TENANT, "title": "Unencrypted PII detected in transaction log", "description": "Credit card BIN numbers found in plaintext in transaction_logs.2026-06-08 without masking.", "severity": "critical", "framework": "PCI_DSS", "status": "open", "created_at": ndays(0).isoformat()},
    {"id": uid(), "tenant_id": TENANT, "title": "GDPR data deletion request overdue", "description": "Subject access removal for user EU-4821 is 14 days overdue. GDPR Art. 17 requires action within 30 days.", "severity": "high", "framework": "GDPR", "status": "open", "created_at": ndays(1).isoformat()},
    {"id": uid(), "tenant_id": TENANT, "title": "AML transaction threshold breach", "description": "3 transactions above $9,800 flagged as potential structuring. CTR filing required within 15 days.", "severity": "high", "framework": "AML_KYC", "status": "open", "created_at": ndays(2).isoformat()},
    {"id": uid(), "tenant_id": TENANT, "title": "Privileged access review overdue", "description": "Quarterly privileged access review for 12 admin accounts is 7 days overdue.", "severity": "medium", "framework": "PCI_DSS", "status": "acknowledged", "created_at": ndays(4).isoformat()},
    {"id": uid(), "tenant_id": TENANT, "title": "CCPA opt-out signal not honored", "description": "GPC signal from 847 California users not propagated to data broker API within 15 days.", "severity": "medium", "framework": "CCPA", "status": "open", "created_at": ndays(5).isoformat()},
    {"id": uid(), "tenant_id": TENANT, "title": "TLS 1.0 detected on payment endpoint", "description": "API gateway /v1/payments still negotiates TLS 1.0 with legacy POS devices. PCI DSS Req 4.2.1 violation.", "severity": "high", "framework": "PCI_DSS", "status": "resolved", "created_at": ndays(7).isoformat()},
]

INCIDENTS = [
    {"id": uid(), "tenant_id": TENANT, "title": "Potential insider data exfiltration", "description": "Employee DA-2291 downloaded 4.2 GB of customer PII records outside business hours. Behavioral analysis flagged anomalous access pattern.", "severity": "critical", "framework": "GDPR", "status": "open", "assigned_to": "security-team", "created_at": ndays(1).isoformat(), "updated_at": ndays(0).isoformat()},
    {"id": uid(), "tenant_id": TENANT, "title": "Third-party vendor data breach notification", "description": "Payment processor PartnerPay notified of breach affecting 12,000 shared cardholders. PCI DSS breach notification procedures activated.", "severity": "critical", "framework": "PCI_DSS", "status": "in_progress", "assigned_to": "compliance-team", "created_at": ndays(3).isoformat(), "updated_at": ndays(1).isoformat()},
    {"id": uid(), "tenant_id": TENANT, "title": "Cross-border data transfer without adequacy decision", "description": "Customer data transferred to new analytics vendor in India without DPA or Standard Contractual Clauses in place.", "severity": "high", "framework": "GDPR", "status": "open", "assigned_to": "legal-team", "created_at": ndays(6).isoformat(), "updated_at": ndays(5).isoformat()},
    {"id": uid(), "tenant_id": TENANT, "title": "AML alert — wire transfer structuring pattern", "description": "Account cluster AML-7721 shows 18 sub-threshold wire transfers over 3 days consistent with layering behavior.", "severity": "high", "framework": "AML_KYC", "status": "in_progress", "assigned_to": "aml-team", "created_at": ndays(10).isoformat(), "updated_at": ndays(8).isoformat()},
    {"id": uid(), "tenant_id": TENANT, "title": "CCPA consumer opt-out workflow failure", "description": "Technical failure in consent management platform caused 1,200 opt-out signals to be silently dropped over 48 hours.", "severity": "medium", "framework": "CCPA", "status": "resolved", "assigned_to": "engineering", "created_at": ndays(15).isoformat(), "updated_at": ndays(12).isoformat()},
]

def make_agent_tasks():
    tasks = [
        {"id": uid(), "tenant_id": TENANT, "agent_type": "regulatory_discovery", "title": "Scan FATF 2024 Guidance Updates",
         "description": "Monitor FATF plenary for new guidance on virtual asset service providers (VASPs) and crypto-asset reporting.",
         "status": "completed", "priority": "high", "result": {"findings": ["New VASP travel rule applies to transfers ≥$1000", "Crypto mixers now classified as high-risk entities"], "recommendations": ["Update AML screening lists", "Add VASP onboarding questionnaire"]},
         "created_at": ndays(5).isoformat(), "updated_at": ndays(4).isoformat()},
        {"id": uid(), "tenant_id": TENANT, "agent_type": "policy_mapping", "title": "Map GDPR Art.17 to Data Deletion Controls",
         "description": "Decompose GDPR right-to-erasure obligations into testable control requirements for automated deletion pipelines.",
         "status": "completed", "priority": "high", "result": {"gaps": ["No automated propagation to backup systems", "Third-party API deletion not confirmed"], "coverage": 72},
         "created_at": ndays(7).isoformat(), "updated_at": ndays(6).isoformat()},
        {"id": uid(), "tenant_id": TENANT, "agent_type": "monitoring_risk", "title": "Continuous PCI DSS Req 10 Log Monitoring",
         "description": "Real-time analysis of audit log completeness and integrity across all in-scope payment systems.",
         "status": "in_progress", "priority": "critical", "result": None,
         "created_at": ndays(1).isoformat(), "updated_at": ndays(0).isoformat()},
        {"id": uid(), "tenant_id": TENANT, "agent_type": "evidence_reporting", "title": "Generate Q2 PCI DSS Audit Package",
         "description": "Compile evidence package for upcoming QSA assessment: logs, screenshots, policy docs, and test results.",
         "status": "awaiting_approval", "priority": "high",
         "result": {"findings": ["Network segmentation validated", "All 12 cardholder data flows documented"], "evidence_count": 47},
         "created_at": ndays(2).isoformat(), "updated_at": ndays(1).isoformat()},
        {"id": uid(), "tenant_id": TENANT, "agent_type": "regulatory_discovery", "title": "DORA Compliance Gap Assessment",
         "description": "Assess gaps against EU Digital Operational Resilience Act (DORA) requirements effective Jan 2025.",
         "status": "pending", "priority": "high", "result": None,
         "created_at": ndays(0).isoformat(), "updated_at": ndays(0).isoformat()},
    ]
    return tasks

def make_agent_activities(agent_tasks):
    acts = []
    for t in agent_tasks[:4]:
        acts.append({"id": uid(), "tenant_id": TENANT, "agent_type": t["agent_type"],
                     "action": f"Processed task: {t['title']}", "status": t["status"],
                     "result_summary": ("2 findings, 2 recommendations" if t["agent_type"]=="regulatory_discovery"
                                        else "72% coverage, 2 gaps" if t["agent_type"]=="policy_mapping"
                                        else "47 evidence items compiled" if t["agent_type"]=="evidence_reporting"
                                        else "Monitoring active"),
                     "timestamp": t["updated_at"]})
    return acts

def make_risk_trends():
    import random
    random.seed(42)
    base = 78.0
    trends = []
    for i in range(14, 0, -1):
        base += random.uniform(-1.5, 2.2)
        base = max(70, min(95, base))
        trends.append({
            "id": uid(), "tenant_id": TENANT,
            "date": (now() - timedelta(days=i)).strftime("%Y-%m-%d"),
            "compliance_score": round(base, 2),
            "alerts": random.randint(2, 8),
            "incidents": random.randint(0, 3),
            "resolved": random.randint(1, 5),
        })
    return trends

def make_compliance_scores():
    data = [
        ("PCI_DSS", 84.2, "up", 3),
        ("GDPR",    76.8, "down", 5),
        ("CCPA",    88.1, "up", 1),
        ("AML_KYC", 91.4, "stable", 2),
        ("LGPD",    72.3, "down", 4),
    ]
    return [{"id": uid(), "tenant_id": TENANT, "framework": fw,
             "score": score, "trend": trend, "issues_count": issues,
             "updated_at": ndays(0).isoformat()} for fw, score, trend, issues in data]

def make_activities():
    return [
        {"id": uid(), "tenant_id": TENANT, "type": "alert_resolved", "description": "TLS 1.0 vulnerability on payment endpoint resolved", "created_at": ndays(0).isoformat()},
        {"id": uid(), "tenant_id": TENANT, "type": "control_assessed", "description": "PCI DSS network segmentation controls re-assessed", "created_at": ndays(1).isoformat()},
        {"id": uid(), "tenant_id": TENANT, "type": "incident_opened", "description": "New GDPR data exfiltration incident escalated to security team", "created_at": ndays(1).isoformat()},
        {"id": uid(), "tenant_id": TENANT, "type": "regulation_updated", "description": "AML/KYC FATF 2024 guidance ingested by Regulatory Discovery Agent", "created_at": ndays(2).isoformat()},
        {"id": uid(), "tenant_id": TENANT, "type": "evidence_generated", "description": "Q2 PCI DSS audit package (47 items) ready for QSA review", "created_at": ndays(2).isoformat()},
        {"id": uid(), "tenant_id": TENANT, "type": "alert_raised", "description": "Critical: Unencrypted PII in transaction log — auto-remediation initiated", "created_at": ndays(3).isoformat()},
    ]

async def seed():
    client = _make_client()
    db = client[db_name]

    # Hash admin password
    pw_hash = bcrypt.hashpw(b"admin123", bcrypt.gensalt()).decode()
    demo_user = {
        "id": uid(), "tenant_id": TENANT,
        "email": "admin@compliancepulse.demo",
        "name": "Demo Admin",
        "hashed_password": pw_hash,
        "role": "admin",
        "created_at": ndays(30).isoformat(),
    }

    # Clear existing demo data
    for col in ["users","regulations","controls","alerts","incidents","agent_tasks","agent_activities","risk_trends","compliance_scores","activities"]:
        await db[col].delete_many({"tenant_id": TENANT})

    # Insert
    await db.users.insert_one(demo_user)
    print(f"✅  User: admin@compliancepulse.demo / admin123")

    await db.regulations.insert_many(REGULATIONS)
    print(f"✅  {len(REGULATIONS)} regulations")

    controls = []
    for reg in REGULATIONS:
        controls.extend(make_controls(reg["id"], reg["framework"]))
    await db.controls.insert_many(controls)
    print(f"✅  {len(controls)} controls")

    # alerts need acknowledged field for the query in server.py
    for a in ALERTS:
        a["acknowledged"] = a["status"] in ("acknowledged", "resolved")
    await db.alerts.insert_many(ALERTS)
    print(f"✅  {len(ALERTS)} alerts")

    await db.incidents.insert_many(INCIDENTS)
    print(f"✅  {len(INCIDENTS)} incidents")

    tasks = make_agent_tasks()
    await db.agent_tasks.insert_many(tasks)
    agent_activities = make_agent_activities(tasks)
    await db.agent_activities.insert_many(agent_activities)
    print(f"✅  {len(tasks)} agent tasks, {len(agent_activities)} agent activities")

    trends = make_risk_trends()
    await db.risk_trends.insert_many(trends)
    print(f"✅  {len(trends)} risk trend data points")

    scores = make_compliance_scores()
    await db.compliance_scores.insert_many(scores)
    print(f"✅  {len(scores)} compliance scores")

    acts = make_activities()
    await db.activities.insert_many(acts)
    print(f"✅  {len(acts)} dashboard activities")

    print("\n🎉  Seed complete!")
    client.close()

if __name__ == "__main__":
    asyncio.run(seed())
