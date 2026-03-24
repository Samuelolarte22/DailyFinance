"""
Test suite for LD Finance V2.0 features:
1. Bank management endpoints
2. Social/connection endpoints
3. Document upload endpoints
4. Admin view/edit user endpoints
5. Budget comparison with budget_type param
6. Profile visibility toggle
"""

import pytest
import requests
import os
import uuid
from datetime import datetime, timezone, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# MongoDB direct access for test setup
from pymongo import MongoClient
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'test_database')
mongo_client = MongoClient(MONGO_URL)
db = mongo_client[DB_NAME]


class TestSetup:
    """Setup test users and sessions"""
    
    @staticmethod
    def create_test_user(prefix="TEST_"):
        """Create a test user directly in MongoDB"""
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        session_token = f"st_{uuid.uuid4().hex}"
        
        user = {
            "user_id": user_id,
            "email": f"{prefix}{uuid.uuid4().hex[:8]}@test.com",
            "name": f"{prefix}User",
            "picture": None,
            "has_completed_survey": True,
            "is_admin": False,
            "is_public": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        db.users.insert_one(user)
        
        session = {
            "user_id": user_id,
            "session_token": session_token,
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        db.user_sessions.insert_one(session)
        
        return user_id, session_token, user["email"]
    
    @staticmethod
    def create_admin_user(prefix="TEST_ADMIN_"):
        """Create an admin test user"""
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        session_token = f"st_{uuid.uuid4().hex}"
        
        user = {
            "user_id": user_id,
            "email": f"{prefix}{uuid.uuid4().hex[:8]}@test.com",
            "name": f"{prefix}Admin",
            "picture": None,
            "has_completed_survey": True,
            "is_admin": True,
            "is_public": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        db.users.insert_one(user)
        
        session = {
            "user_id": user_id,
            "session_token": session_token,
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        db.user_sessions.insert_one(session)
        
        return user_id, session_token, user["email"]
    
    @staticmethod
    def cleanup_test_data(user_id):
        """Clean up test data for a user"""
        db.users.delete_many({"user_id": user_id})
        db.user_sessions.delete_many({"user_id": user_id})
        db.banks.delete_many({"user_id": user_id})
        db.connections.delete_many({"$or": [{"from_user_id": user_id}, {"to_user_id": user_id}]})
        db.notifications.delete_many({"user_id": user_id})
        db.shared_transactions.delete_many({"$or": [{"creator_id": user_id}, {"shared_with_id": user_id}]})
        db.transactions.delete_many({"user_id": user_id})
        db.documents.delete_many({"user_id": user_id})
        db.debts.delete_many({"user_id": user_id})
        db.budgets.delete_many({"user_id": user_id})


# ============== BANK ENDPOINTS TESTS ==============

class TestBankEndpoints:
    """Test bank management endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.user_id, self.session_token, self.email = TestSetup.create_test_user("TEST_BANK_")
        self.headers = {"Authorization": f"Bearer {self.session_token}"}
        yield
        TestSetup.cleanup_test_data(self.user_id)
    
    def test_get_banks_empty(self):
        """GET /api/banks returns empty list for new user"""
        response = requests.get(f"{BASE_URL}/api/banks", headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert response.json() == []
        print("✓ GET /api/banks returns empty list for new user")
    
    def test_create_bank(self):
        """POST /api/banks creates a bank"""
        response = requests.post(
            f"{BASE_URL}/api/banks",
            json={"name": "Bancolombia"},
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "bank_id" in data
        assert data["message"] == "Banco agregado"
        print("✓ POST /api/banks creates a bank")
        
        # Verify bank was created
        get_response = requests.get(f"{BASE_URL}/api/banks", headers=self.headers)
        banks = get_response.json()
        assert len(banks) == 1
        assert banks[0]["name"] == "Bancolombia"
        print("✓ Bank persisted correctly")
    
    def test_delete_bank(self):
        """DELETE /api/banks/{bank_id} deletes bank"""
        # Create a bank first
        create_response = requests.post(
            f"{BASE_URL}/api/banks",
            json={"name": "Davivienda"},
            headers=self.headers
        )
        bank_id = create_response.json()["bank_id"]
        
        # Delete the bank
        delete_response = requests.delete(
            f"{BASE_URL}/api/banks/{bank_id}",
            headers=self.headers
        )
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}"
        assert delete_response.json()["message"] == "Banco eliminado"
        print("✓ DELETE /api/banks/{bank_id} deletes bank")
        
        # Verify bank was deleted
        get_response = requests.get(f"{BASE_URL}/api/banks", headers=self.headers)
        assert len(get_response.json()) == 0
        print("✓ Bank deletion verified")


# ============== PROFILE VISIBILITY TESTS ==============

class TestProfileVisibility:
    """Test profile visibility toggle"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.user_id, self.session_token, self.email = TestSetup.create_test_user("TEST_VIS_")
        self.headers = {"Authorization": f"Bearer {self.session_token}"}
        yield
        TestSetup.cleanup_test_data(self.user_id)
    
    def test_toggle_visibility(self):
        """PUT /api/profile/visibility toggles is_public"""
        # Initially is_public should be False
        response = requests.put(
            f"{BASE_URL}/api/profile/visibility",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["is_public"] == True
        print("✓ PUT /api/profile/visibility toggles to public")
        
        # Toggle back to private
        response2 = requests.put(
            f"{BASE_URL}/api/profile/visibility",
            headers=self.headers
        )
        assert response2.status_code == 200
        assert response2.json()["is_public"] == False
        print("✓ PUT /api/profile/visibility toggles back to private")


# ============== SOCIAL/CONNECTION TESTS ==============

class TestSocialFeatures:
    """Test social/connection endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        # Create two users for connection testing
        self.user1_id, self.user1_token, self.user1_email = TestSetup.create_test_user("TEST_SOCIAL1_")
        self.user2_id, self.user2_token, self.user2_email = TestSetup.create_test_user("TEST_SOCIAL2_")
        
        # Make user2 public so user1 can see them
        db.users.update_one({"user_id": self.user2_id}, {"$set": {"is_public": True}})
        
        self.headers1 = {"Authorization": f"Bearer {self.user1_token}"}
        self.headers2 = {"Authorization": f"Bearer {self.user2_token}"}
        yield
        TestSetup.cleanup_test_data(self.user1_id)
        TestSetup.cleanup_test_data(self.user2_id)
    
    def test_get_community_users(self):
        """GET /api/community/users returns users with connection status"""
        response = requests.get(f"{BASE_URL}/api/community/users", headers=self.headers1)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        users = response.json()
        assert isinstance(users, list)
        # Should see user2 since they are public
        user2_in_list = any(u["user_id"] == self.user2_id for u in users)
        assert user2_in_list, "Public user2 should be visible in community"
        print("✓ GET /api/community/users returns users with connection status")
    
    def test_send_connection_request(self):
        """POST /api/connections/request creates connection request with notification"""
        response = requests.post(
            f"{BASE_URL}/api/connections/request",
            json={"to_user_id": self.user2_id},
            headers=self.headers1
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "connection_id" in data
        print("✓ POST /api/connections/request creates connection request")
        
        # Verify notification was created for user2
        notifs = requests.get(f"{BASE_URL}/api/notifications", headers=self.headers2)
        assert notifs.status_code == 200
        notif_list = notifs.json()
        assert len(notif_list) > 0
        assert any(n["type"] == "connection_request" for n in notif_list)
        print("✓ Notification created for connection request")
    
    def test_accept_connection(self):
        """PUT /api/connections/{id}/accept accepts connection"""
        # Create connection request
        req_response = requests.post(
            f"{BASE_URL}/api/connections/request",
            json={"to_user_id": self.user2_id},
            headers=self.headers1
        )
        conn_id = req_response.json()["connection_id"]
        
        # Accept as user2
        accept_response = requests.put(
            f"{BASE_URL}/api/connections/{conn_id}/accept",
            headers=self.headers2
        )
        assert accept_response.status_code == 200, f"Expected 200, got {accept_response.status_code}: {accept_response.text}"
        assert accept_response.json()["message"] == "Conexion aceptada"
        print("✓ PUT /api/connections/{id}/accept accepts connection")
    
    def test_reject_connection(self):
        """PUT /api/connections/{id}/reject rejects connection"""
        # Create new users for this test
        user3_id, user3_token, _ = TestSetup.create_test_user("TEST_SOCIAL3_")
        user4_id, user4_token, _ = TestSetup.create_test_user("TEST_SOCIAL4_")
        db.users.update_one({"user_id": user4_id}, {"$set": {"is_public": True}})
        
        headers3 = {"Authorization": f"Bearer {user3_token}"}
        headers4 = {"Authorization": f"Bearer {user4_token}"}
        
        # Create connection request
        req_response = requests.post(
            f"{BASE_URL}/api/connections/request",
            json={"to_user_id": user4_id},
            headers=headers3
        )
        conn_id = req_response.json()["connection_id"]
        
        # Reject as user4
        reject_response = requests.put(
            f"{BASE_URL}/api/connections/{conn_id}/reject",
            headers=headers4
        )
        assert reject_response.status_code == 200, f"Expected 200, got {reject_response.status_code}: {reject_response.text}"
        assert reject_response.json()["message"] == "Solicitud rechazada"
        print("✓ PUT /api/connections/{id}/reject rejects connection")
        
        # Cleanup
        TestSetup.cleanup_test_data(user3_id)
        TestSetup.cleanup_test_data(user4_id)
    
    def test_get_connections(self):
        """GET /api/connections returns accepted friends"""
        # Create and accept connection
        req_response = requests.post(
            f"{BASE_URL}/api/connections/request",
            json={"to_user_id": self.user2_id},
            headers=self.headers1
        )
        conn_id = req_response.json()["connection_id"]
        requests.put(f"{BASE_URL}/api/connections/{conn_id}/accept", headers=self.headers2)
        
        # Get connections for user1
        response = requests.get(f"{BASE_URL}/api/connections", headers=self.headers1)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        friends = response.json()
        assert len(friends) > 0
        assert any(f["user_id"] == self.user2_id for f in friends)
        print("✓ GET /api/connections returns accepted friends")


# ============== NOTIFICATION TESTS ==============

class TestNotifications:
    """Test notification endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.user_id, self.session_token, self.email = TestSetup.create_test_user("TEST_NOTIF_")
        self.headers = {"Authorization": f"Bearer {self.session_token}"}
        yield
        TestSetup.cleanup_test_data(self.user_id)
    
    def test_get_notifications(self):
        """GET /api/notifications returns notifications"""
        response = requests.get(f"{BASE_URL}/api/notifications", headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert isinstance(response.json(), list)
        print("✓ GET /api/notifications returns notifications")
    
    def test_mark_notifications_read(self):
        """PUT /api/notifications/read marks all as read"""
        # Create a notification directly
        db.notifications.insert_one({
            "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
            "user_id": self.user_id,
            "type": "test",
            "message": "Test notification",
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        response = requests.put(f"{BASE_URL}/api/notifications/read", headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert response.json()["message"] == "Notificaciones marcadas como leidas"
        print("✓ PUT /api/notifications/read marks all as read")


# ============== SHARED TRANSACTION TESTS ==============

class TestSharedTransactions:
    """Test shared transaction endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        # Create two connected users
        self.user1_id, self.user1_token, _ = TestSetup.create_test_user("TEST_SHARED1_")
        self.user2_id, self.user2_token, _ = TestSetup.create_test_user("TEST_SHARED2_")
        
        self.headers1 = {"Authorization": f"Bearer {self.user1_token}"}
        self.headers2 = {"Authorization": f"Bearer {self.user2_token}"}
        
        # Make user2 public and create accepted connection
        db.users.update_one({"user_id": self.user2_id}, {"$set": {"is_public": True}})
        
        # Create and accept connection
        req_response = requests.post(
            f"{BASE_URL}/api/connections/request",
            json={"to_user_id": self.user2_id},
            headers=self.headers1
        )
        conn_id = req_response.json()["connection_id"]
        requests.put(f"{BASE_URL}/api/connections/{conn_id}/accept", headers=self.headers2)
        
        yield
        TestSetup.cleanup_test_data(self.user1_id)
        TestSetup.cleanup_test_data(self.user2_id)
    
    def test_create_shared_transaction(self):
        """POST /api/transactions/shared creates shared transaction with notification"""
        response = requests.post(
            f"{BASE_URL}/api/transactions/shared",
            json={
                "type": "expense",
                "category": "Alimentacion",
                "amount": 100000,
                "description": "Almuerzo compartido",
                "shared_with": self.user2_id,
                "my_percentage": 50,
                "friend_percentage": 50
            },
            headers=self.headers1
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "shared_id" in data
        print("✓ POST /api/transactions/shared creates shared transaction")
        
        # Verify notification was created for user2
        notifs = requests.get(f"{BASE_URL}/api/notifications", headers=self.headers2)
        notif_list = notifs.json()
        assert any(n["type"] == "shared_transaction" for n in notif_list)
        print("✓ Notification created for shared transaction")
    
    def test_accept_shared_transaction(self):
        """PUT /api/transactions/shared/{id}/accept creates friend's transaction"""
        # Create shared transaction
        create_response = requests.post(
            f"{BASE_URL}/api/transactions/shared",
            json={
                "type": "expense",
                "category": "Entretenimiento",
                "amount": 200000,
                "description": "Cine",
                "shared_with": self.user2_id,
                "my_percentage": 60,
                "friend_percentage": 40
            },
            headers=self.headers1
        )
        shared_id = create_response.json()["shared_id"]
        
        # Accept as user2
        accept_response = requests.put(
            f"{BASE_URL}/api/transactions/shared/{shared_id}/accept",
            headers=self.headers2
        )
        assert accept_response.status_code == 200, f"Expected 200, got {accept_response.status_code}: {accept_response.text}"
        assert accept_response.json()["message"] == "Transaccion aceptada"
        print("✓ PUT /api/transactions/shared/{id}/accept creates friend's transaction")
        
        # Verify transaction was created for user2
        txns = requests.get(f"{BASE_URL}/api/transactions", headers=self.headers2)
        txn_list = txns.json()
        assert any(t.get("shared_id") == shared_id for t in txn_list)
        print("✓ Friend's transaction created on accept")


# ============== BUDGET COMPARISON WITH BUDGET_TYPE TESTS ==============

class TestBudgetComparison:
    """Test budget comparison with budget_type param"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.user_id, self.session_token, self.email = TestSetup.create_test_user("TEST_BUDGET_")
        self.headers = {"Authorization": f"Bearer {self.session_token}"}
        yield
        TestSetup.cleanup_test_data(self.user_id)
    
    def test_income_budget_comparison(self):
        """GET /api/budgets/comparison?budget_type=income returns income comparison"""
        # Create an income budget
        requests.post(
            f"{BASE_URL}/api/budgets",
            json={"category": "Salario", "projected_amount": 5000000, "budget_type": "income"},
            headers=self.headers
        )
        
        # Create an income transaction
        requests.post(
            f"{BASE_URL}/api/transactions",
            json={"type": "income", "category": "Salario", "amount": 4500000},
            headers=self.headers
        )
        
        # Get income comparison
        response = requests.get(
            f"{BASE_URL}/api/budgets/comparison?budget_type=income",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        comparison = response.json()
        assert isinstance(comparison, list)
        
        # Find Salario in comparison
        salario = next((c for c in comparison if c["category"] == "Salario"), None)
        assert salario is not None
        assert salario["projected"] == 5000000
        assert salario["actual"] == 4500000
        print("✓ GET /api/budgets/comparison?budget_type=income returns income comparison")


# ============== DOCUMENT UPLOAD TESTS ==============

class TestDocumentEndpoints:
    """Test document upload endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.user_id, self.session_token, self.email = TestSetup.create_test_user("TEST_DOC_")
        self.headers = {"Authorization": f"Bearer {self.session_token}"}
        yield
        TestSetup.cleanup_test_data(self.user_id)
    
    def test_list_documents_empty(self):
        """GET /api/documents lists user documents (empty)"""
        response = requests.get(f"{BASE_URL}/api/documents", headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert response.json() == []
        print("✓ GET /api/documents lists user documents (empty)")
    
    def test_upload_document(self):
        """POST /api/documents/upload uploads file to object storage"""
        # Create a small test file
        test_content = b"Test document content for LD Finance"
        files = {"file": ("test_document.txt", test_content, "text/plain")}
        
        response = requests.post(
            f"{BASE_URL}/api/documents/upload",
            files=files,
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "file_id" in data
        assert data["filename"] == "test_document.txt"
        print("✓ POST /api/documents/upload uploads file to object storage")
        
        # Verify document appears in list
        list_response = requests.get(f"{BASE_URL}/api/documents", headers=self.headers)
        docs = list_response.json()
        assert len(docs) == 1
        assert docs[0]["original_filename"] == "test_document.txt"
        print("✓ Document appears in list after upload")


# ============== ADMIN ENDPOINTS TESTS ==============

class TestAdminEndpoints:
    """Test admin view/edit user endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        # Create admin user
        self.admin_id, self.admin_token, self.admin_email = TestSetup.create_admin_user("TEST_ADMIN_")
        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Create regular user to manage
        self.user_id, self.user_token, self.user_email = TestSetup.create_test_user("TEST_TARGET_")
        self.user_headers = {"Authorization": f"Bearer {self.user_token}"}
        
        yield
        TestSetup.cleanup_test_data(self.admin_id)
        TestSetup.cleanup_test_data(self.user_id)
    
    def test_admin_get_user_dashboard(self):
        """GET /api/admin/users/{id}/dashboard returns full user data"""
        response = requests.get(
            f"{BASE_URL}/api/admin/users/{self.user_id}/dashboard",
            headers=self.admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "user" in data
        assert "transactions" in data
        assert "debts" in data
        assert "savings" in data
        assert "summary" in data
        assert data["user"]["user_id"] == self.user_id
        print("✓ GET /api/admin/users/{id}/dashboard returns full user data")
    
    def test_admin_create_debt_for_user(self):
        """POST /api/admin/users/{id}/debts creates debt for user"""
        response = requests.post(
            f"{BASE_URL}/api/admin/users/{self.user_id}/debts",
            json={
                "name": "Admin Created Debt",
                "total_amount": 1000000,
                "current_amount": 1000000,
                "interest_rate": 15,
                "num_installments": 12
            },
            headers=self.admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "debt_id" in data
        print("✓ POST /api/admin/users/{id}/debts creates debt for user")
        
        # Verify debt appears in user's debts
        debts_response = requests.get(f"{BASE_URL}/api/debts", headers=self.user_headers)
        debts = debts_response.json()
        assert any(d["name"] == "Admin Created Debt" for d in debts)
        print("✓ Debt visible in user's account")
    
    def test_admin_update_transaction(self):
        """PUT /api/admin/users/{id}/transactions/{txn_id} updates transaction"""
        # Create a transaction for the user
        create_response = requests.post(
            f"{BASE_URL}/api/transactions",
            json={"type": "expense", "category": "Alimentacion", "amount": 50000},
            headers=self.user_headers
        )
        txn_id = create_response.json()["transaction_id"]
        
        # Admin updates the transaction
        update_response = requests.put(
            f"{BASE_URL}/api/admin/users/{self.user_id}/transactions/{txn_id}",
            json={"type": "expense", "category": "Transporte", "amount": 75000},
            headers=self.admin_headers
        )
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
        print("✓ PUT /api/admin/users/{id}/transactions/{txn_id} updates transaction")
        
        # Verify update
        txns = requests.get(f"{BASE_URL}/api/transactions", headers=self.user_headers)
        updated_txn = next((t for t in txns.json() if t["transaction_id"] == txn_id), None)
        assert updated_txn["category"] == "Transporte"
        assert updated_txn["amount"] == 75000
        print("✓ Transaction update verified")
    
    def test_admin_delete_user_debt(self):
        """DELETE /api/admin/users/{id}/debts/{debt_id} deletes user debt"""
        # Create a debt for the user
        create_response = requests.post(
            f"{BASE_URL}/api/admin/users/{self.user_id}/debts",
            json={
                "name": "Debt to Delete",
                "total_amount": 500000,
                "current_amount": 500000
            },
            headers=self.admin_headers
        )
        debt_id = create_response.json()["debt_id"]
        
        # Admin deletes the debt
        delete_response = requests.delete(
            f"{BASE_URL}/api/admin/users/{self.user_id}/debts/{debt_id}",
            headers=self.admin_headers
        )
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}: {delete_response.text}"
        print("✓ DELETE /api/admin/users/{id}/debts/{debt_id} deletes user debt")
        
        # Verify deletion
        debts = requests.get(f"{BASE_URL}/api/debts", headers=self.user_headers)
        assert not any(d["debt_id"] == debt_id for d in debts.json())
        print("✓ Debt deletion verified")
    
    def test_non_admin_cannot_access(self):
        """Non-admin user cannot access admin endpoints"""
        response = requests.get(
            f"{BASE_URL}/api/admin/users/{self.user_id}/dashboard",
            headers=self.user_headers
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Non-admin user cannot access admin endpoints")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
