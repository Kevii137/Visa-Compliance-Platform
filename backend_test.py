import requests
import sys
import json
from datetime import datetime

class ComplianceAPITester:
    def __init__(self, base_url="https://compliance-pulse-7.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tenant_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        
        result = {
            "test": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
        if details:
            print(f"    Details: {details}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}, Expected: {expected_status}"
            
            if not success:
                try:
                    error_data = response.json()
                    details += f", Response: {error_data}"
                except:
                    details += f", Response: {response.text[:200]}"
            
            self.log_test(name, success, details)
            
            if success:
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                return False, {}

        except Exception as e:
            self.log_test(name, False, f"Error: {str(e)}")
            return False, {}

    def test_auth_flow(self):
        """Test authentication flow"""
        print("\n🔐 Testing Authentication Flow...")
        
        # Test registration
        reg_data = {
            "email": "test@example.com",
            "password": "test123",
            "name": "Test User",
            "role": "compliance_officer"
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=reg_data
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response.get('user', {}).get('id')
            self.tenant_id = response.get('user', {}).get('tenant_id')
            print(f"    Registered user ID: {self.user_id}")
            print(f"    Tenant ID: {self.tenant_id}")
        
        # Test login
        login_data = {
            "email": "test@example.com",
            "password": "test123"
        }
        
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        if success and 'token' in response:
            self.token = response['token']
            print(f"    Login token received")
        
        # Test get current user
        self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )

    def test_dashboard_endpoints(self):
        """Test dashboard endpoints"""
        print("\n📊 Testing Dashboard Endpoints...")
        
        self.run_test(
            "Get Dashboard Stats",
            "GET",
            "dashboard/stats",
            200
        )
        
        self.run_test(
            "Get Risk Trends",
            "GET",
            "risk/trends?days=14",
            200
        )
        
        self.run_test(
            "Get Risk Heatmap",
            "GET",
            "risk/heatmap",
            200
        )

    def test_regulations_endpoints(self):
        """Test regulations endpoints"""
        print("\n📋 Testing Regulations Endpoints...")
        
        # Get regulations
        self.run_test(
            "Get All Regulations",
            "GET",
            "regulations",
            200
        )
        
        # Create regulation
        reg_data = {
            "name": "Test Regulation",
            "framework": "PCI_DSS",
            "description": "Test regulation for API testing",
            "version": "1.0"
        }
        
        success, response = self.run_test(
            "Create Regulation",
            "POST",
            "regulations",
            200,
            data=reg_data
        )
        
        regulation_id = None
        if success and 'id' in response:
            regulation_id = response['id']
        
        # Get specific regulation
        if regulation_id:
            self.run_test(
                "Get Specific Regulation",
                "GET",
                f"regulations/{regulation_id}",
                200
            )
        
        # Search regulations
        search_data = {"query": "Test"}
        self.run_test(
            "Search Regulations",
            "POST",
            "regulations/search",
            200,
            data=search_data
        )

    def test_controls_endpoints(self):
        """Test controls endpoints"""
        print("\n🛡️ Testing Controls Endpoints...")
        
        # Get controls
        self.run_test(
            "Get All Controls",
            "GET",
            "controls",
            200
        )
        
        # Create control
        control_data = {
            "name": "Test Control",
            "description": "Test control for API testing",
            "framework": "PCI_DSS",
            "regulation_id": "test-reg-id",
            "status": "active"
        }
        
        self.run_test(
            "Create Control",
            "POST",
            "controls",
            200,
            data=control_data
        )

    def test_incidents_endpoints(self):
        """Test incidents endpoints"""
        print("\n🚨 Testing Incidents Endpoints...")
        
        # Get incidents
        self.run_test(
            "Get All Incidents",
            "GET",
            "incidents",
            200
        )
        
        # Create incident
        incident_data = {
            "title": "Test Incident",
            "description": "Test incident for API testing",
            "severity": "medium",
            "framework": "PCI_DSS",
            "affected_systems": ["Test System"]
        }
        
        success, response = self.run_test(
            "Create Incident",
            "POST",
            "incidents",
            200,
            data=incident_data
        )
        
        incident_id = None
        if success and 'id' in response:
            incident_id = response['id']
        
        # Update incident status
        if incident_id:
            status_data = {"status": "in_progress"}
            self.run_test(
                "Update Incident Status",
                "PUT",
                f"incidents/{incident_id}/status",
                200,
                data=status_data
            )

    def test_alerts_endpoints(self):
        """Test alerts endpoints"""
        print("\n🔔 Testing Alerts Endpoints...")
        
        # Get alerts
        self.run_test(
            "Get All Alerts",
            "GET",
            "alerts",
            200
        )
        
        # Create alert
        alert_data = {
            "title": "Test Alert",
            "description": "Test alert for API testing",
            "severity": "medium",
            "source": "API Test",
            "framework": "PCI_DSS"
        }
        
        success, response = self.run_test(
            "Create Alert",
            "POST",
            "alerts",
            200,
            data=alert_data
        )
        
        alert_id = None
        if success and 'id' in response:
            alert_id = response['id']
        
        # Acknowledge alert
        if alert_id:
            self.run_test(
                "Acknowledge Alert",
                "PUT",
                f"alerts/{alert_id}/acknowledge",
                200
            )

    def test_agents_endpoints(self):
        """Test agent endpoints"""
        print("\n🤖 Testing Agent Endpoints...")
        
        # Get agent tasks
        self.run_test(
            "Get Agent Tasks",
            "GET",
            "agents/tasks",
            200
        )
        
        # Create agent task
        task_data = {
            "agent_type": "regulatory_discovery",
            "description": "Test agent task for API testing",
            "priority": 1
        }
        
        self.run_test(
            "Create Agent Task",
            "POST",
            "agents/tasks",
            200,
            data=task_data
        )
        
        # Get agent activity
        self.run_test(
            "Get Agent Activity",
            "GET",
            "agents/activity",
            200
        )

    def test_chat_endpoint(self):
        """Test chat assistant endpoint"""
        print("\n💬 Testing Chat Assistant...")
        
        chat_data = {
            "message": "What are the key requirements for PCI DSS compliance?",
            "context": "Testing chat functionality"
        }
        
        self.run_test(
            "Chat Assistant",
            "POST",
            "chat",
            200,
            data=chat_data
        )

    def test_evidence_endpoints(self):
        """Test evidence endpoints"""
        print("\n📄 Testing Evidence Endpoints...")
        
        # Get evidence packages
        self.run_test(
            "Get Evidence Packages",
            "GET",
            "evidence/packages",
            200
        )
        
        # Generate evidence package
        evidence_data = {
            "framework": "PCI_DSS",
            "period": "Q4 2024"
        }
        
        success, response = self.run_test(
            "Generate Evidence Package",
            "POST",
            "evidence/generate",
            200,
            data=evidence_data
        )
        
        package_id = None
        if success and 'package_id' in response:
            package_id = response['package_id']
        
        # Get specific evidence package
        if package_id:
            self.run_test(
                "Get Evidence Package",
                "GET",
                f"evidence/packages/{package_id}",
                200
            )

    def test_tenant_endpoints(self):
        """Test tenant endpoints"""
        print("\n🏢 Testing Tenant Endpoints...")
        
        # Get current tenant
        self.run_test(
            "Get Current Tenant",
            "GET",
            "tenants/current",
            200
        )

    def test_monitoring_endpoints(self):
        """Test monitoring endpoints"""
        print("\n📈 Testing Monitoring Endpoints...")
        
        # Get monitoring data
        self.run_test(
            "Get Monitoring Data",
            "GET",
            "monitoring/data",
            200
        )
        
        # Ingest monitoring data
        monitoring_data = {
            "type": "transaction",
            "records": [
                {
                    "transaction_id": "test-123",
                    "amount": 100.00,
                    "timestamp": datetime.now().isoformat()
                }
            ]
        }
        
        self.run_test(
            "Ingest Monitoring Data",
            "POST",
            "monitoring/ingest",
            200,
            data=monitoring_data
        )

    def test_documents_endpoints(self):
        """Test document endpoints"""
        print("\n📁 Testing Document Endpoints...")
        
        # Get documents
        self.run_test(
            "Get Documents",
            "GET",
            "documents",
            200
        )

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Compliance Platform API Tests")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)
        
        # Test authentication first
        self.test_auth_flow()
        
        if not self.token:
            print("❌ Authentication failed - stopping tests")
            return False
        
        # Test all endpoints
        self.test_dashboard_endpoints()
        self.test_regulations_endpoints()
        self.test_controls_endpoints()
        self.test_incidents_endpoints()
        self.test_alerts_endpoints()
        self.test_agents_endpoints()
        self.test_chat_endpoint()
        self.test_evidence_endpoints()
        self.test_tenant_endpoints()
        self.test_monitoring_endpoints()
        self.test_documents_endpoints()
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"📈 Success Rate: {success_rate:.1f}%")
        
        # Save detailed results
        with open('/app/backend_test_results.json', 'w') as f:
            json.dump({
                "summary": {
                    "total_tests": self.tests_run,
                    "passed_tests": self.tests_passed,
                    "success_rate": success_rate,
                    "timestamp": datetime.now().isoformat()
                },
                "results": self.test_results
            }, f, indent=2)
        
        return success_rate > 80

def main():
    tester = ComplianceAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())