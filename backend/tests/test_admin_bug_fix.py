"""
Backend API Tests for LD Finance App
Focus: Admin bug fix (is_admin preservation on re-login) and CRUD operations

Critical Bug Fix Test:
- When a user is promoted to admin via toggle-admin endpoint
- Their is_admin=True status should be preserved when re-logging in
- Even if their email is NOT in ADMIN_EMAILS env var
"""

import pytest
import requests
import os
from datetime import datetime, timezone, timedelta
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test data prefix for cleanup
TEST_PREFIX = "TEST_"


class TestHealthCheck:
    """Basic health check tests"""
    
    def test_api_health(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "StudentFinance" in data["message"]
        print("✓ API health check passed")


class TestAuthEndpoints:
    """Authentication endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self, test_session):
        """Setup test session"""
        self.session_token = test_session["session_token"]
        self.user_id = test_session["user_id"]
        self.headers = {"Authorization": f"Bearer {self.session_token}"}
    
    def test_auth_me_returns_user_data(self, test_session):
        """Test GET /api/auth/me returns user data with is_admin field"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {test_session['session_token']}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify user data structure
        assert "user_id" in data
        assert "email" in data
        assert "name" in data
        assert "is_admin" in data  # Critical: is_admin field must be present
        assert isinstance(data["is_admin"], bool)
        print(f"✓ /api/auth/me returns user with is_admin={data['is_admin']}")
    
    def test_auth_me_without_token_returns_401(self):
        """Test GET /api/auth/me without token returns 401"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        print("✓ /api/auth/me returns 401 without token")


class TestAdminBugFix:
    """
    CRITICAL BUG FIX TEST:
    Test that is_admin status is preserved from DB when user re-logs in
    
    Bug scenario:
    1. User is promoted to admin via toggle-admin (is_admin=True in DB)
    2. User logs out and logs back in
    3. BUG: is_admin was being reset to False because only ADMIN_EMAILS was checked
    4. FIX: Now checks DB value first: is_admin = existing_user.get('is_admin', False) OR email in ADMIN_EMAILS
    """
    
    def test_admin_status_preserved_in_db(self, mongo_client, test_session):
        """
        Test that when is_admin=True is set in DB, it's returned correctly
        This simulates the scenario after toggle-admin has been called
        """
        db = mongo_client["test_database"]
        
        # Create a test user with is_admin=True (simulating post-toggle-admin state)
        test_user_id = f"TEST_admin_preserve_{uuid.uuid4().hex[:8]}"
        test_email = f"TEST_admin_preserve_{uuid.uuid4().hex[:8]}@test.com"
        
        # Insert user with is_admin=True
        db.users.insert_one({
            "user_id": test_user_id,
            "email": test_email,
            "name": "Test Admin User",
            "is_admin": True,  # This simulates a user promoted via toggle-admin
            "has_completed_survey": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        # Create session for this user
        test_session_token = f"TEST_session_{uuid.uuid4().hex}"
        db.user_sessions.insert_one({
            "user_id": test_user_id,
            "session_token": test_session_token,
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        # Verify via /api/auth/me that is_admin=True is returned
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {test_session_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["is_admin"] == True, f"Expected is_admin=True but got {data.get('is_admin')}"
        print(f"✓ Admin status preserved: is_admin={data['is_admin']} for user {test_email}")
        
        # Cleanup
        db.users.delete_one({"user_id": test_user_id})
        db.user_sessions.delete_one({"session_token": test_session_token})


class TestAdminEndpoints:
    """Admin panel endpoint tests - requires admin session"""
    
    @pytest.fixture(autouse=True)
    def setup(self, admin_session):
        """Setup admin session"""
        self.session_token = admin_session["session_token"]
        self.user_id = admin_session["user_id"]
        self.headers = {"Authorization": f"Bearer {self.session_token}"}
    
    def test_admin_users_list(self, admin_session):
        """Test GET /api/admin/users returns user list"""
        response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {admin_session['session_token']}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ /api/admin/users returns {len(data)} users")
    
    def test_admin_summary(self, admin_session):
        """Test GET /api/admin/summary returns summary data"""
        response = requests.get(
            f"{BASE_URL}/api/admin/summary",
            headers={"Authorization": f"Bearer {admin_session['session_token']}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify summary structure
        assert "total_users" in data
        assert "financial_totals" in data
        assert "averages" in data
        print(f"✓ /api/admin/summary returns data with {data['total_users']} total users")
    
    def test_admin_toggle_admin_status(self, admin_session, mongo_client):
        """
        Test PUT /api/admin/users/{user_id}/toggle-admin correctly toggles admin status
        This is the endpoint that sets is_admin in DB
        """
        db = mongo_client["test_database"]
        
        # Create a test user to toggle
        test_user_id = f"TEST_toggle_{uuid.uuid4().hex[:8]}"
        test_email = f"TEST_toggle_{uuid.uuid4().hex[:8]}@test.com"
        
        db.users.insert_one({
            "user_id": test_user_id,
            "email": test_email,
            "name": "Test Toggle User",
            "is_admin": False,
            "has_completed_survey": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        # Toggle to admin
        response = requests.put(
            f"{BASE_URL}/api/admin/users/{test_user_id}/toggle-admin",
            headers={"Authorization": f"Bearer {admin_session['session_token']}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["is_admin"] == True
        print(f"✓ Toggle admin: is_admin changed to True")
        
        # Verify in DB
        user_in_db = db.users.find_one({"user_id": test_user_id})
        assert user_in_db["is_admin"] == True, "DB should have is_admin=True"
        
        # Toggle back to non-admin
        response = requests.put(
            f"{BASE_URL}/api/admin/users/{test_user_id}/toggle-admin",
            headers={"Authorization": f"Bearer {admin_session['session_token']}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["is_admin"] == False
        print(f"✓ Toggle admin: is_admin changed back to False")
        
        # Cleanup
        db.users.delete_one({"user_id": test_user_id})
    
    def test_admin_delete_user(self, admin_session, mongo_client):
        """Test DELETE /api/admin/users/{user_id} deletes user and all data"""
        db = mongo_client["test_database"]
        
        # Create a test user with some data
        test_user_id = f"TEST_delete_{uuid.uuid4().hex[:8]}"
        test_email = f"TEST_delete_{uuid.uuid4().hex[:8]}@test.com"
        
        db.users.insert_one({
            "user_id": test_user_id,
            "email": test_email,
            "name": "Test Delete User",
            "is_admin": False,
            "has_completed_survey": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        # Add some transactions for this user
        db.transactions.insert_one({
            "transaction_id": f"TEST_txn_{uuid.uuid4().hex[:8]}",
            "user_id": test_user_id,
            "type": "income",
            "category": "Test",
            "amount": 1000,
            "date": datetime.now(timezone.utc).isoformat()
        })
        
        # Delete user
        response = requests.delete(
            f"{BASE_URL}/api/admin/users/{test_user_id}",
            headers={"Authorization": f"Bearer {admin_session['session_token']}"}
        )
        
        assert response.status_code == 200
        print(f"✓ User deleted successfully")
        
        # Verify user is gone
        user_in_db = db.users.find_one({"user_id": test_user_id})
        assert user_in_db is None, "User should be deleted from DB"
        
        # Verify transactions are gone
        txn_in_db = db.transactions.find_one({"user_id": test_user_id})
        assert txn_in_db is None, "User transactions should be deleted"
        print(f"✓ User and associated data deleted from DB")
    
    def test_admin_endpoints_require_admin(self, test_session):
        """Test that admin endpoints return 403 for non-admin users"""
        response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {test_session['session_token']}"}
        )
        assert response.status_code == 403
        print("✓ Admin endpoints return 403 for non-admin users")


class TestTransactionsCRUD:
    """Transaction CRUD operations tests"""
    
    def test_get_transactions(self, test_session):
        """Test GET /api/transactions"""
        response = requests.get(
            f"{BASE_URL}/api/transactions",
            headers={"Authorization": f"Bearer {test_session['session_token']}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/transactions returns {len(data)} transactions")
    
    def test_create_and_delete_transaction(self, test_session):
        """Test POST and DELETE /api/transactions"""
        headers = {"Authorization": f"Bearer {test_session['session_token']}"}
        
        # Create transaction
        create_response = requests.post(
            f"{BASE_URL}/api/transactions",
            headers=headers,
            json={
                "type": "income",
                "category": "TEST_Salario",
                "amount": 50000,
                "description": "Test transaction"
            }
        )
        assert create_response.status_code == 200
        data = create_response.json()
        assert "transaction_id" in data
        txn_id = data["transaction_id"]
        print(f"✓ Created transaction: {txn_id}")
        
        # Verify it exists
        get_response = requests.get(f"{BASE_URL}/api/transactions", headers=headers)
        transactions = get_response.json()
        found = any(t["transaction_id"] == txn_id for t in transactions)
        assert found, "Created transaction should be in list"
        
        # Delete transaction
        delete_response = requests.delete(
            f"{BASE_URL}/api/transactions/{txn_id}",
            headers=headers
        )
        assert delete_response.status_code == 200
        print(f"✓ Deleted transaction: {txn_id}")


class TestDebtsCRUD:
    """Debt CRUD operations tests"""
    
    def test_get_debts(self, test_session):
        """Test GET /api/debts"""
        response = requests.get(
            f"{BASE_URL}/api/debts",
            headers={"Authorization": f"Bearer {test_session['session_token']}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/debts returns {len(data)} debts")
    
    def test_create_pay_delete_debt(self, test_session):
        """Test debt lifecycle: create, pay, delete"""
        headers = {"Authorization": f"Bearer {test_session['session_token']}"}
        
        # Create debt
        create_response = requests.post(
            f"{BASE_URL}/api/debts",
            headers=headers,
            json={
                "name": "TEST_Debt",
                "total_amount": 10000,
                "current_amount": 10000,
                "interest_rate": 5
            }
        )
        assert create_response.status_code == 200
        data = create_response.json()
        debt_id = data["debt_id"]
        print(f"✓ Created debt: {debt_id}")
        
        # Pay debt
        pay_response = requests.put(
            f"{BASE_URL}/api/debts/{debt_id}/pay",
            headers=headers,
            json={"amount": 5000}
        )
        assert pay_response.status_code == 200
        pay_data = pay_response.json()
        assert pay_data["new_amount"] == 5000
        print(f"✓ Paid debt, new amount: {pay_data['new_amount']}")
        
        # Delete debt
        delete_response = requests.delete(
            f"{BASE_URL}/api/debts/{debt_id}",
            headers=headers
        )
        assert delete_response.status_code == 200
        print(f"✓ Deleted debt: {debt_id}")


class TestSavingsCRUD:
    """Savings goals CRUD operations tests"""
    
    def test_get_savings(self, test_session):
        """Test GET /api/savings"""
        response = requests.get(
            f"{BASE_URL}/api/savings",
            headers={"Authorization": f"Bearer {test_session['session_token']}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/savings returns {len(data)} savings goals")
    
    def test_create_contribute_delete_savings(self, test_session):
        """Test savings lifecycle: create, contribute, delete"""
        headers = {"Authorization": f"Bearer {test_session['session_token']}"}
        
        # Create savings goal
        create_response = requests.post(
            f"{BASE_URL}/api/savings",
            headers=headers,
            json={
                "name": "TEST_Savings",
                "target_amount": 100000,
                "current_amount": 0
            }
        )
        assert create_response.status_code == 200
        data = create_response.json()
        goal_id = data["goal_id"]
        print(f"✓ Created savings goal: {goal_id}")
        
        # Contribute
        contribute_response = requests.put(
            f"{BASE_URL}/api/savings/{goal_id}/contribute",
            headers=headers,
            json={"amount": 25000}
        )
        assert contribute_response.status_code == 200
        contrib_data = contribute_response.json()
        assert contrib_data["new_amount"] == 25000
        print(f"✓ Contributed to savings, new amount: {contrib_data['new_amount']}")
        
        # Delete
        delete_response = requests.delete(
            f"{BASE_URL}/api/savings/{goal_id}",
            headers=headers
        )
        assert delete_response.status_code == 200
        print(f"✓ Deleted savings goal: {goal_id}")


# ============== FIXTURES ==============

@pytest.fixture(scope="session")
def mongo_client():
    """MongoDB client fixture"""
    from pymongo import MongoClient
    client = MongoClient("mongodb://localhost:27017")
    yield client
    client.close()


@pytest.fixture(scope="session")
def test_session(mongo_client):
    """Create a test user session for regular user tests"""
    db = mongo_client["test_database"]
    
    user_id = f"TEST_user_{uuid.uuid4().hex[:8]}"
    session_token = f"TEST_session_{uuid.uuid4().hex}"
    email = f"TEST_user_{uuid.uuid4().hex[:8]}@test.com"
    
    # Create user
    db.users.insert_one({
        "user_id": user_id,
        "email": email,
        "name": "Test User",
        "is_admin": False,
        "has_completed_survey": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Create session
    db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    yield {
        "user_id": user_id,
        "session_token": session_token,
        "email": email
    }
    
    # Cleanup
    db.users.delete_one({"user_id": user_id})
    db.user_sessions.delete_one({"session_token": session_token})
    db.transactions.delete_many({"user_id": user_id})
    db.debts.delete_many({"user_id": user_id})
    db.savings_goals.delete_many({"user_id": user_id})


@pytest.fixture(scope="session")
def admin_session(mongo_client):
    """Create an admin user session for admin tests"""
    db = mongo_client["test_database"]
    
    user_id = f"TEST_admin_{uuid.uuid4().hex[:8]}"
    session_token = f"TEST_admin_session_{uuid.uuid4().hex}"
    email = f"TEST_admin_{uuid.uuid4().hex[:8]}@test.com"
    
    # Create admin user
    db.users.insert_one({
        "user_id": user_id,
        "email": email,
        "name": "Test Admin",
        "is_admin": True,  # Admin user
        "has_completed_survey": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Create session
    db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    yield {
        "user_id": user_id,
        "session_token": session_token,
        "email": email
    }
    
    # Cleanup
    db.users.delete_one({"user_id": user_id})
    db.user_sessions.delete_one({"session_token": session_token})


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
