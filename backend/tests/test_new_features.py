"""
Test suite for LD Finance new features:
1. Snowball debt calculation endpoint
2. Custom categories (admin CRUD + user-specific)
3. Advisor messages/chat system
4. Debt model with min_payment field
"""
import pytest
import requests
import os
from datetime import datetime, timedelta
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test data prefixes for cleanup
TEST_PREFIX = "TEST_"

class TestSetup:
    """Setup test user and session for authenticated tests"""
    
    @pytest.fixture(scope="class")
    def test_user_data(self):
        """Create test user and session directly in MongoDB"""
        import subprocess
        import json
        
        user_id = f"test_user_{uuid.uuid4().hex[:8]}"
        session_token = f"test_session_{uuid.uuid4().hex}"
        email = f"test.user.{uuid.uuid4().hex[:6]}@example.com"
        
        # Create user and session in MongoDB
        mongo_script = f'''
        use('test_database');
        db.users.insertOne({{
            user_id: "{user_id}",
            email: "{email}",
            name: "Test User",
            picture: null,
            has_completed_survey: true,
            is_admin: false,
            created_at: new Date()
        }});
        db.user_sessions.insertOne({{
            user_id: "{user_id}",
            session_token: "{session_token}",
            expires_at: new Date(Date.now() + 7*24*60*60*1000),
            created_at: new Date()
        }});
        '''
        
        result = subprocess.run(
            ['mongosh', '--quiet', '--eval', mongo_script],
            capture_output=True, text=True
        )
        
        yield {
            "user_id": user_id,
            "session_token": session_token,
            "email": email
        }
        
        # Cleanup
        cleanup_script = f'''
        use('test_database');
        db.users.deleteOne({{ user_id: "{user_id}" }});
        db.user_sessions.deleteMany({{ user_id: "{user_id}" }});
        db.debts.deleteMany({{ user_id: "{user_id}" }});
        db.transactions.deleteMany({{ user_id: "{user_id}" }});
        db.advisor_messages.deleteMany({{ user_id: "{user_id}" }});
        db.categories.deleteMany({{ user_id: "{user_id}" }});
        '''
        subprocess.run(['mongosh', '--quiet', '--eval', cleanup_script], capture_output=True)

    @pytest.fixture(scope="class")
    def admin_user_data(self):
        """Create admin test user and session"""
        import subprocess
        
        user_id = f"admin_user_{uuid.uuid4().hex[:8]}"
        session_token = f"admin_session_{uuid.uuid4().hex}"
        email = f"admin.test.{uuid.uuid4().hex[:6]}@example.com"
        
        mongo_script = f'''
        use('test_database');
        db.users.insertOne({{
            user_id: "{user_id}",
            email: "{email}",
            name: "Admin Test User",
            picture: null,
            has_completed_survey: true,
            is_admin: true,
            created_at: new Date()
        }});
        db.user_sessions.insertOne({{
            user_id: "{user_id}",
            session_token: "{session_token}",
            expires_at: new Date(Date.now() + 7*24*60*60*1000),
            created_at: new Date()
        }});
        '''
        
        result = subprocess.run(
            ['mongosh', '--quiet', '--eval', mongo_script],
            capture_output=True, text=True
        )
        
        yield {
            "user_id": user_id,
            "session_token": session_token,
            "email": email
        }
        
        # Cleanup
        cleanup_script = f'''
        use('test_database');
        db.users.deleteOne({{ user_id: "{user_id}" }});
        db.user_sessions.deleteMany({{ user_id: "{user_id}" }});
        db.categories.deleteMany({{ user_id: null, name: /^{TEST_PREFIX}/ }});
        db.advisor_messages.deleteMany({{ sender_id: "{user_id}" }});
        '''
        subprocess.run(['mongosh', '--quiet', '--eval', cleanup_script], capture_output=True)


class TestHealthCheck:
    """Basic API health check"""
    
    def test_api_health(self):
        """Test API is running"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✓ API health check passed")


class TestDebtSnowball(TestSetup):
    """Test snowball debt calculation endpoint"""
    
    def test_snowball_empty_debts(self, test_user_data):
        """Test snowball endpoint with no debts returns empty schedule"""
        headers = {"Authorization": f"Bearer {test_user_data['session_token']}"}
        response = requests.get(f"{BASE_URL}/api/debts/snowball", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "debts" in data
        assert "schedule" in data
        assert "total_debt" in data
        assert "total_min_payment" in data
        assert "months_to_payoff" in data
        assert data["debts"] == []
        assert data["schedule"] == []
        print("✓ Snowball empty debts test passed")
    
    def test_create_debt_with_min_payment(self, test_user_data):
        """Test creating debt with min_payment field"""
        headers = {"Authorization": f"Bearer {test_user_data['session_token']}"}
        
        debt_data = {
            "name": f"{TEST_PREFIX}Credit Card",
            "total_amount": 1000000,
            "current_amount": 800000,
            "interest_rate": 24.0,
            "min_payment": 50000,
            "due_date": "2026-06-15"
        }
        
        response = requests.post(f"{BASE_URL}/api/debts", json=debt_data, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "debt_id" in data
        print(f"✓ Created debt with min_payment: {data['debt_id']}")
        return data["debt_id"]
    
    def test_snowball_with_debts(self, test_user_data):
        """Test snowball calculation with multiple debts"""
        headers = {"Authorization": f"Bearer {test_user_data['session_token']}"}
        
        # Create multiple debts
        debts = [
            {"name": f"{TEST_PREFIX}Small Debt", "total_amount": 200000, "current_amount": 150000, "interest_rate": 12, "min_payment": 20000},
            {"name": f"{TEST_PREFIX}Medium Debt", "total_amount": 500000, "current_amount": 400000, "interest_rate": 18, "min_payment": 40000},
            {"name": f"{TEST_PREFIX}Large Debt", "total_amount": 1000000, "current_amount": 900000, "interest_rate": 24, "min_payment": 60000},
        ]
        
        for debt in debts:
            response = requests.post(f"{BASE_URL}/api/debts", json=debt, headers=headers)
            assert response.status_code == 200
        
        # Get snowball calculation
        response = requests.get(f"{BASE_URL}/api/debts/snowball", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Validate response structure
        assert len(data["debts"]) >= 3
        assert data["total_debt"] > 0
        assert data["total_min_payment"] > 0
        assert data["months_to_payoff"] > 0
        assert len(data["schedule"]) > 0
        
        # Validate debts are sorted by current_amount (smallest first - snowball method)
        debt_balances = [d["balance"] for d in data["debts"]]
        assert debt_balances == sorted(debt_balances), "Debts should be sorted by balance ascending"
        
        # Validate schedule structure
        first_month = data["schedule"][0]
        assert "month" in first_month
        assert first_month["month"] == 1
        
        print(f"✓ Snowball calculation passed - {data['months_to_payoff']} months to payoff")
        print(f"  Total debt: {data['total_debt']}, Total min payment: {data['total_min_payment']}")


class TestCategories(TestSetup):
    """Test category endpoints"""
    
    def test_get_categories_returns_defaults(self, test_user_data):
        """Test GET /api/categories returns default income and expense categories"""
        headers = {"Authorization": f"Bearer {test_user_data['session_token']}"}
        response = requests.get(f"{BASE_URL}/api/categories", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "income" in data
        assert "expense" in data
        assert "custom" in data
        
        # Check default categories exist
        assert "Salario" in data["income"]
        assert "Alimentacion" in data["expense"]
        
        print(f"✓ Categories endpoint returned {len(data['income'])} income, {len(data['expense'])} expense categories")
    
    def test_admin_create_global_category(self, admin_user_data):
        """Test POST /api/admin/categories creates global category"""
        headers = {"Authorization": f"Bearer {admin_user_data['session_token']}"}
        
        cat_data = {
            "name": f"{TEST_PREFIX}Custom Expense",
            "type": "expense"
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/categories", json=cat_data, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "category_id" in data
        
        print(f"✓ Admin created global category: {data['category_id']}")
        return data["category_id"]
    
    def test_admin_delete_category(self, admin_user_data):
        """Test DELETE /api/admin/categories/{category_id}"""
        headers = {"Authorization": f"Bearer {admin_user_data['session_token']}"}
        
        # First create a category
        cat_data = {"name": f"{TEST_PREFIX}ToDelete", "type": "income"}
        create_response = requests.post(f"{BASE_URL}/api/admin/categories", json=cat_data, headers=headers)
        assert create_response.status_code == 200
        cat_id = create_response.json()["category_id"]
        
        # Delete it
        delete_response = requests.delete(f"{BASE_URL}/api/admin/categories/{cat_id}", headers=headers)
        assert delete_response.status_code == 200
        
        print(f"✓ Admin deleted category: {cat_id}")
    
    def test_admin_create_user_specific_category(self, admin_user_data, test_user_data):
        """Test POST /api/admin/users/{user_id}/categories creates user-specific category"""
        headers = {"Authorization": f"Bearer {admin_user_data['session_token']}"}
        user_id = test_user_data["user_id"]
        
        cat_data = {
            "name": f"{TEST_PREFIX}User Specific",
            "type": "expense"
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/users/{user_id}/categories", json=cat_data, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "category_id" in data
        
        print(f"✓ Admin created user-specific category for {user_id}")
    
    def test_non_admin_cannot_create_category(self, test_user_data):
        """Test non-admin users cannot create categories"""
        headers = {"Authorization": f"Bearer {test_user_data['session_token']}"}
        
        cat_data = {"name": "Unauthorized Category", "type": "expense"}
        response = requests.post(f"{BASE_URL}/api/admin/categories", json=cat_data, headers=headers)
        
        assert response.status_code == 403
        print("✓ Non-admin correctly blocked from creating categories")


class TestAdvisorMessages(TestSetup):
    """Test advisor message/chat endpoints"""
    
    def test_get_messages_empty(self, test_user_data):
        """Test GET /api/messages returns empty for new user"""
        headers = {"Authorization": f"Bearer {test_user_data['session_token']}"}
        current_month = datetime.now().strftime("%Y-%m")
        
        response = requests.get(f"{BASE_URL}/api/messages?month={current_month}", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print("✓ Messages endpoint returns list")
    
    def test_create_message(self, test_user_data):
        """Test POST /api/messages creates a message"""
        headers = {"Authorization": f"Bearer {test_user_data['session_token']}"}
        current_month = datetime.now().strftime("%Y-%m")
        
        msg_data = {
            "content": f"{TEST_PREFIX}Test message from user",
            "is_task": False,
            "month": current_month
        }
        
        response = requests.post(f"{BASE_URL}/api/messages", json=msg_data, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "message_id" in data
        
        print(f"✓ User created message: {data['message_id']}")
        return data["message_id"]
    
    def test_create_task_message(self, test_user_data):
        """Test POST /api/messages with is_task=True"""
        headers = {"Authorization": f"Bearer {test_user_data['session_token']}"}
        current_month = datetime.now().strftime("%Y-%m")
        
        msg_data = {
            "content": f"{TEST_PREFIX}Test task from user",
            "is_task": True,
            "month": current_month
        }
        
        response = requests.post(f"{BASE_URL}/api/messages", json=msg_data, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "message_id" in data
        
        print(f"✓ User created task message: {data['message_id']}")
        return data["message_id"]
    
    def test_toggle_task_completion(self, test_user_data):
        """Test PUT /api/messages/{message_id}/complete toggles completion"""
        headers = {"Authorization": f"Bearer {test_user_data['session_token']}"}
        current_month = datetime.now().strftime("%Y-%m")
        
        # Create a task
        msg_data = {"content": f"{TEST_PREFIX}Task to toggle", "is_task": True, "month": current_month}
        create_response = requests.post(f"{BASE_URL}/api/messages", json=msg_data, headers=headers)
        msg_id = create_response.json()["message_id"]
        
        # Toggle completion
        toggle_response = requests.put(f"{BASE_URL}/api/messages/{msg_id}/complete", headers=headers)
        assert toggle_response.status_code == 200
        data = toggle_response.json()
        assert "is_completed" in data
        assert data["is_completed"] == True
        
        # Toggle again
        toggle_response2 = requests.put(f"{BASE_URL}/api/messages/{msg_id}/complete", headers=headers)
        assert toggle_response2.status_code == 200
        data2 = toggle_response2.json()
        assert data2["is_completed"] == False
        
        print(f"✓ Task completion toggle works correctly")
    
    def test_admin_get_user_messages(self, admin_user_data, test_user_data):
        """Test GET /api/admin/users/{user_id}/messages"""
        headers = {"Authorization": f"Bearer {admin_user_data['session_token']}"}
        user_id = test_user_data["user_id"]
        current_month = datetime.now().strftime("%Y-%m")
        
        response = requests.get(f"{BASE_URL}/api/admin/users/{user_id}/messages?month={current_month}", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        print(f"✓ Admin retrieved {len(data)} messages for user")
    
    def test_admin_send_message_to_user(self, admin_user_data, test_user_data):
        """Test POST /api/admin/users/{user_id}/messages"""
        headers = {"Authorization": f"Bearer {admin_user_data['session_token']}"}
        user_id = test_user_data["user_id"]
        current_month = datetime.now().strftime("%Y-%m")
        
        msg_data = {
            "content": f"{TEST_PREFIX}Message from advisor",
            "is_task": True,
            "month": current_month
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/users/{user_id}/messages", json=msg_data, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "message_id" in data
        
        print(f"✓ Admin sent message to user: {data['message_id']}")
    
    def test_messages_filtered_by_month(self, test_user_data):
        """Test messages are correctly filtered by month"""
        headers = {"Authorization": f"Bearer {test_user_data['session_token']}"}
        
        # Create message for current month
        current_month = datetime.now().strftime("%Y-%m")
        msg_data = {"content": f"{TEST_PREFIX}Current month msg", "is_task": False, "month": current_month}
        requests.post(f"{BASE_URL}/api/messages", json=msg_data, headers=headers)
        
        # Create message for different month
        other_month = "2025-01"
        msg_data2 = {"content": f"{TEST_PREFIX}Other month msg", "is_task": False, "month": other_month}
        requests.post(f"{BASE_URL}/api/messages", json=msg_data2, headers=headers)
        
        # Get current month messages
        response = requests.get(f"{BASE_URL}/api/messages?month={current_month}", headers=headers)
        assert response.status_code == 200
        current_msgs = response.json()
        
        # Get other month messages
        response2 = requests.get(f"{BASE_URL}/api/messages?month={other_month}", headers=headers)
        assert response2.status_code == 200
        other_msgs = response2.json()
        
        # Verify filtering works
        current_contents = [m["content"] for m in current_msgs]
        other_contents = [m["content"] for m in other_msgs]
        
        assert any(f"{TEST_PREFIX}Current month msg" in c for c in current_contents)
        assert any(f"{TEST_PREFIX}Other month msg" in c for c in other_contents)
        
        print("✓ Messages correctly filtered by month")


class TestDebtCRUD(TestSetup):
    """Test debt CRUD with new min_payment field"""
    
    def test_create_debt_full_fields(self, test_user_data):
        """Test creating debt with all fields including min_payment and interest_rate"""
        headers = {"Authorization": f"Bearer {test_user_data['session_token']}"}
        
        debt_data = {
            "name": f"{TEST_PREFIX}Full Debt",
            "total_amount": 2000000,
            "current_amount": 1500000,
            "interest_rate": 18.5,
            "min_payment": 75000,
            "due_date": "2026-12-31"
        }
        
        response = requests.post(f"{BASE_URL}/api/debts", json=debt_data, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "debt_id" in data
        
        # Verify debt was created with correct fields
        get_response = requests.get(f"{BASE_URL}/api/debts", headers=headers)
        debts = get_response.json()
        created_debt = next((d for d in debts if d["debt_id"] == data["debt_id"]), None)
        
        assert created_debt is not None
        assert created_debt["min_payment"] == 75000
        assert created_debt["interest_rate"] == 18.5
        
        print(f"✓ Debt created with all fields: min_payment={created_debt['min_payment']}, interest_rate={created_debt['interest_rate']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
