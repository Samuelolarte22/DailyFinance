"""
Test Admin Impersonation Feature
Tests for:
1. POST /api/admin/impersonate/{user_id} - Start impersonation
2. POST /api/admin/stop-impersonation - Stop impersonation
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin session token from database
ADMIN_SESSION_TOKEN = "5QW-_TLl0lcf_SXaSDjG-v3Q7Ym8P7bENWg4wcwuSbE"

class TestAdminImpersonation:
    """Test admin impersonation endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.admin_headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {ADMIN_SESSION_TOKEN}"
        }
    
    def test_admin_auth_works(self):
        """Verify admin authentication is working"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers=self.admin_headers
        )
        print(f"Auth response: {response.status_code}")
        assert response.status_code == 200
        data = response.json()
        assert data.get("is_admin") == True
        print(f"Admin user verified: {data.get('email')}")
    
    def test_get_users_list(self):
        """Get list of users to find a target for impersonation"""
        response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers=self.admin_headers
        )
        print(f"Users list response: {response.status_code}")
        assert response.status_code == 200
        users = response.json()
        assert len(users) > 0
        print(f"Found {len(users)} users")
        # Find a non-admin user for impersonation
        non_admin_users = [u for u in users if not u.get("is_admin")]
        if non_admin_users:
            print(f"Non-admin user available: {non_admin_users[0].get('user_id')}")
        return users
    
    def test_impersonate_user_success(self):
        """Test POST /api/admin/impersonate/{user_id} - should create impersonation session"""
        # First get a user to impersonate
        users_response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers=self.admin_headers
        )
        users = users_response.json()
        
        # Find a non-admin user or any user that's not the current admin
        target_user = None
        for u in users:
            if u.get("email") != "samuelolarte22@gmail.com":
                target_user = u
                break
        
        if not target_user:
            pytest.skip("No target user available for impersonation test")
        
        target_user_id = target_user.get("user_id")
        print(f"Attempting to impersonate user: {target_user_id}")
        
        # Test impersonation endpoint
        response = requests.post(
            f"{BASE_URL}/api/admin/impersonate/{target_user_id}",
            headers=self.admin_headers
        )
        print(f"Impersonate response: {response.status_code}")
        print(f"Response body: {response.text}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "impersonation_token" in data, "Response should contain impersonation_token"
        assert "user" in data, "Response should contain user info"
        assert data["user"]["user_id"] == target_user_id
        
        print(f"Impersonation token received: {data['impersonation_token'][:20]}...")
        print(f"Impersonated user: {data['user'].get('name')}")
        
        return data["impersonation_token"]
    
    def test_impersonate_nonexistent_user(self):
        """Test impersonation of non-existent user returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/admin/impersonate/nonexistent_user_12345",
            headers=self.admin_headers
        )
        print(f"Impersonate nonexistent user response: {response.status_code}")
        assert response.status_code == 404
    
    def test_stop_impersonation(self):
        """Test POST /api/admin/stop-impersonation - should delete impersonation session"""
        # First create an impersonation session
        users_response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers=self.admin_headers
        )
        users = users_response.json()
        
        target_user = None
        for u in users:
            if u.get("email") != "samuelolarte22@gmail.com":
                target_user = u
                break
        
        if not target_user:
            pytest.skip("No target user available for stop impersonation test")
        
        # Start impersonation
        imp_response = requests.post(
            f"{BASE_URL}/api/admin/impersonate/{target_user['user_id']}",
            headers=self.admin_headers
        )
        assert imp_response.status_code == 200
        imp_token = imp_response.json()["impersonation_token"]
        
        # Stop impersonation using the impersonation token
        stop_headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {imp_token}"
        }
        stop_response = requests.post(
            f"{BASE_URL}/api/admin/stop-impersonation",
            headers=stop_headers
        )
        print(f"Stop impersonation response: {stop_response.status_code}")
        print(f"Response body: {stop_response.text}")
        
        assert stop_response.status_code == 200
        data = stop_response.json()
        assert data.get("message") == "Impersonation ended"
        print("Impersonation stopped successfully")
    
    def test_non_admin_cannot_impersonate(self):
        """Test that non-admin users cannot use impersonation endpoint"""
        # Create a non-admin session for testing
        import subprocess
        result = subprocess.run([
            "mongosh", "--quiet", "--eval", """
            use('test_database');
            var nonAdminUser = db.users.findOne({is_admin: false});
            if (nonAdminUser) {
                var token = 'non_admin_test_' + Date.now();
                db.user_sessions.insertOne({
                    user_id: nonAdminUser.user_id,
                    session_token: token,
                    expires_at: new Date(Date.now() + 60*60*1000),
                    created_at: new Date()
                });
                print(token);
            } else {
                print('NO_USER');
            }
            """
        ], capture_output=True, text=True)
        
        non_admin_token = result.stdout.strip()
        if non_admin_token == "NO_USER" or not non_admin_token:
            pytest.skip("No non-admin user available")
        
        non_admin_headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {non_admin_token}"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/impersonate/user_62feeeca2cee",
            headers=non_admin_headers
        )
        print(f"Non-admin impersonate attempt: {response.status_code}")
        assert response.status_code == 403, "Non-admin should get 403 Forbidden"
        print("Non-admin correctly denied impersonation access")


class TestBudgetComparisonTabs:
    """Test budget comparison endpoint for Dashboard tabs feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {ADMIN_SESSION_TOKEN}"
        }
    
    def test_expense_budget_comparison(self):
        """Test GET /api/budgets/comparison with budget_type=expense"""
        response = requests.get(
            f"{BASE_URL}/api/budgets/comparison?budget_type=expense",
            headers=self.headers
        )
        print(f"Expense budget comparison: {response.status_code}")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Expense budget items: {len(data)}")
    
    def test_income_budget_comparison(self):
        """Test GET /api/budgets/comparison with budget_type=income"""
        response = requests.get(
            f"{BASE_URL}/api/budgets/comparison?budget_type=income",
            headers=self.headers
        )
        print(f"Income budget comparison: {response.status_code}")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Income budget items: {len(data)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
