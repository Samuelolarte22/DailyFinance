"""
Iteration 12 Tests - New Features:
- AI Financial Chat (POST /api/ai/chat)
- Pocket withdraw (POST /api/pockets/{id}/withdraw)
- Pocket edit balance (PUT /api/pockets/{id}/edit)
- Admin subscription tracking (PUT /api/admin/users/{id}/subscription, GET /api/admin/subscriptions)
- Admin send reminder email (POST /api/admin/send-reminder-email)
"""
import pytest
import requests
import os
from datetime import datetime, timezone, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://finanzas-dashboard-4.preview.emergentagent.com').rstrip('/')

# Test data storage
test_data = {}


@pytest.fixture(scope="module")
def test_session():
    """Create a test user and session for testing"""
    import subprocess
    
    # Create test user and session via mongosh
    timestamp = int(datetime.now().timestamp())
    user_id = f"test-user-iter12-{timestamp}"
    session_token = f"test_session_iter12_{timestamp}"
    email = f"test.iter12.{timestamp}@example.com"
    
    mongo_script = f"""
    use('test_database');
    db.users.insertOne({{
      user_id: '{user_id}',
      email: '{email}',
      name: 'Test User Iter12',
      picture: 'https://via.placeholder.com/150',
      has_completed_survey: true,
      is_admin: true,
      created_at: new Date()
    }});
    db.user_sessions.insertOne({{
      user_id: '{user_id}',
      session_token: '{session_token}',
      expires_at: new Date(Date.now() + 7*24*60*60*1000),
      created_at: new Date()
    }});
    print('Created test user: ' + '{user_id}');
    """
    
    result = subprocess.run(
        ['mongosh', '--eval', mongo_script],
        capture_output=True, text=True
    )
    print(f"MongoDB setup: {result.stdout}")
    if result.returncode != 0:
        print(f"MongoDB error: {result.stderr}")
    
    test_data['user_id'] = user_id
    test_data['session_token'] = session_token
    test_data['email'] = email
    
    yield {
        'user_id': user_id,
        'session_token': session_token,
        'email': email
    }
    
    # Cleanup
    cleanup_script = f"""
    use('test_database');
    db.users.deleteMany({{user_id: '{user_id}'}});
    db.user_sessions.deleteMany({{session_token: '{session_token}'}});
    db.pockets.deleteMany({{user_id: '{user_id}'}});
    db.transactions.deleteMany({{user_id: '{user_id}'}});
    print('Cleaned up test data');
    """
    subprocess.run(['mongosh', '--eval', cleanup_script], capture_output=True)


@pytest.fixture
def auth_headers(test_session):
    """Get auth headers for requests"""
    return {
        "Authorization": f"Bearer {test_session['session_token']}",
        "Content-Type": "application/json"
    }


class TestAIFinancialChat:
    """Test AI Financial Chat endpoint"""
    
    def test_ai_chat_requires_auth(self):
        """AI chat should require authentication"""
        response = requests.post(f"{BASE_URL}/api/ai/chat", json={
            "message": "Cuanto he gastado este mes?",
            "session_id": "test_session"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: AI chat requires authentication")
    
    def test_ai_chat_requires_message(self, auth_headers):
        """AI chat should require a message"""
        response = requests.post(f"{BASE_URL}/api/ai/chat", 
            headers=auth_headers,
            json={"session_id": "test_session"}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("PASS: AI chat requires message")
    
    def test_ai_chat_success(self, auth_headers):
        """AI chat should return a response"""
        response = requests.post(f"{BASE_URL}/api/ai/chat",
            headers=auth_headers,
            json={
                "message": "Hola, como estas?",
                "session_id": f"test_aichat_{datetime.now().timestamp()}"
            },
            timeout=30  # AI responses can take time
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "response" in data, "Response should contain 'response' field"
        assert "session_id" in data, "Response should contain 'session_id' field"
        assert len(data["response"]) > 0, "Response should not be empty"
        print(f"PASS: AI chat returned response: {data['response'][:100]}...")


class TestPocketWithdraw:
    """Test Pocket withdraw endpoint"""
    
    def test_pocket_withdraw_requires_auth(self):
        """Pocket withdraw should require authentication"""
        response = requests.post(f"{BASE_URL}/api/pockets/fake_id/withdraw", json={
            "amount": 100
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Pocket withdraw requires authentication")
    
    def test_pocket_withdraw_flow(self, auth_headers, test_session):
        """Test full pocket withdraw flow: create, fund, withdraw"""
        # Create a pocket
        create_response = requests.post(f"{BASE_URL}/api/pockets",
            headers=auth_headers,
            json={"name": "TEST_Withdraw_Pocket"}
        )
        assert create_response.status_code == 200, f"Failed to create pocket: {create_response.text}"
        pocket_id = create_response.json()["pocket_id"]
        test_data['pocket_id'] = pocket_id
        print(f"Created pocket: {pocket_id}")
        
        # Fund the pocket
        fund_response = requests.post(f"{BASE_URL}/api/pockets/{pocket_id}/fund",
            headers=auth_headers,
            json={"amount": 50000}
        )
        assert fund_response.status_code == 200, f"Failed to fund pocket: {fund_response.text}"
        print("Funded pocket with 50000")
        
        # Withdraw from pocket
        withdraw_response = requests.post(f"{BASE_URL}/api/pockets/{pocket_id}/withdraw",
            headers=auth_headers,
            json={"amount": 20000}
        )
        assert withdraw_response.status_code == 200, f"Failed to withdraw: {withdraw_response.text}"
        data = withdraw_response.json()
        assert "new_balance" in data, "Response should contain new_balance"
        assert data["new_balance"] == 30000, f"Expected balance 30000, got {data['new_balance']}"
        print(f"PASS: Withdrew 20000, new balance: {data['new_balance']}")
    
    def test_pocket_withdraw_insufficient_funds(self, auth_headers):
        """Withdraw should fail if insufficient funds"""
        pocket_id = test_data.get('pocket_id')
        if not pocket_id:
            pytest.skip("No pocket created")
        
        # Try to withdraw more than balance
        response = requests.post(f"{BASE_URL}/api/pockets/{pocket_id}/withdraw",
            headers=auth_headers,
            json={"amount": 100000}  # More than 30000 balance
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("PASS: Withdraw fails with insufficient funds")
    
    def test_pocket_withdraw_invalid_amount(self, auth_headers):
        """Withdraw should fail with invalid amount"""
        pocket_id = test_data.get('pocket_id')
        if not pocket_id:
            pytest.skip("No pocket created")
        
        response = requests.post(f"{BASE_URL}/api/pockets/{pocket_id}/withdraw",
            headers=auth_headers,
            json={"amount": -100}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("PASS: Withdraw fails with negative amount")


class TestPocketEdit:
    """Test Pocket edit balance endpoint"""
    
    def test_pocket_edit_requires_auth(self):
        """Pocket edit should require authentication"""
        response = requests.put(f"{BASE_URL}/api/pockets/fake_id/edit", json={
            "balance": 100
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Pocket edit requires authentication")
    
    def test_pocket_edit_balance(self, auth_headers):
        """Test editing pocket balance directly"""
        pocket_id = test_data.get('pocket_id')
        if not pocket_id:
            pytest.skip("No pocket created")
        
        # Set balance to specific amount
        response = requests.put(f"{BASE_URL}/api/pockets/{pocket_id}/edit",
            headers=auth_headers,
            json={"balance": 75000}
        )
        assert response.status_code == 200, f"Failed to edit pocket: {response.text}"
        print("PASS: Pocket balance edited to 75000")
        
        # Verify by getting pockets
        get_response = requests.get(f"{BASE_URL}/api/pockets", headers=auth_headers)
        assert get_response.status_code == 200
        pockets = get_response.json()
        pocket = next((p for p in pockets if p["pocket_id"] == pocket_id), None)
        assert pocket is not None, "Pocket not found"
        assert pocket["balance"] == 75000, f"Expected balance 75000, got {pocket['balance']}"
        print("PASS: Verified pocket balance is 75000")
    
    def test_pocket_edit_negative_balance_fails(self, auth_headers):
        """Editing pocket to negative balance should fail"""
        pocket_id = test_data.get('pocket_id')
        if not pocket_id:
            pytest.skip("No pocket created")
        
        response = requests.put(f"{BASE_URL}/api/pockets/{pocket_id}/edit",
            headers=auth_headers,
            json={"balance": -1000}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("PASS: Negative balance edit fails")


class TestAdminSubscription:
    """Test Admin subscription tracking endpoints"""
    
    def test_subscription_requires_admin(self, test_session):
        """Subscription endpoints should require admin"""
        # Create non-admin session
        import subprocess
        timestamp = int(datetime.now().timestamp())
        non_admin_token = f"non_admin_token_{timestamp}"
        non_admin_user_id = f"non_admin_user_{timestamp}"
        
        mongo_script = f"""
        use('test_database');
        db.users.insertOne({{
          user_id: '{non_admin_user_id}',
          email: 'nonadmin.{timestamp}@example.com',
          name: 'Non Admin User',
          is_admin: false,
          created_at: new Date()
        }});
        db.user_sessions.insertOne({{
          user_id: '{non_admin_user_id}',
          session_token: '{non_admin_token}',
          expires_at: new Date(Date.now() + 7*24*60*60*1000),
          created_at: new Date()
        }});
        """
        subprocess.run(['mongosh', '--eval', mongo_script], capture_output=True)
        
        headers = {
            "Authorization": f"Bearer {non_admin_token}",
            "Content-Type": "application/json"
        }
        
        response = requests.get(f"{BASE_URL}/api/admin/subscriptions", headers=headers)
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("PASS: Subscription endpoint requires admin")
        
        # Cleanup
        cleanup_script = f"""
        use('test_database');
        db.users.deleteMany({{user_id: '{non_admin_user_id}'}});
        db.user_sessions.deleteMany({{session_token: '{non_admin_token}'}});
        """
        subprocess.run(['mongosh', '--eval', cleanup_script], capture_output=True)
    
    def test_set_subscription_payment_day(self, auth_headers, test_session):
        """Test setting subscription payment day"""
        user_id = test_session['user_id']
        
        response = requests.put(f"{BASE_URL}/api/admin/users/{user_id}/subscription",
            headers=auth_headers,
            json={"payment_day": 15}
        )
        assert response.status_code == 200, f"Failed to set payment day: {response.text}"
        print("PASS: Set subscription payment day to 15")
    
    def test_confirm_subscription_payment(self, auth_headers, test_session):
        """Test confirming subscription payment"""
        user_id = test_session['user_id']
        
        response = requests.put(f"{BASE_URL}/api/admin/users/{user_id}/subscription",
            headers=auth_headers,
            json={"confirmed_payment": True}
        )
        assert response.status_code == 200, f"Failed to confirm payment: {response.text}"
        print("PASS: Confirmed subscription payment")
    
    def test_get_subscriptions(self, auth_headers):
        """Test getting all subscriptions"""
        response = requests.get(f"{BASE_URL}/api/admin/subscriptions", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get subscriptions: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"PASS: Got {len(data)} subscriptions")


class TestAdminSendReminderEmail:
    """Test Admin send reminder email endpoint"""
    
    def test_send_reminder_requires_admin(self):
        """Send reminder should require admin"""
        response = requests.post(f"{BASE_URL}/api/admin/send-reminder-email", json={
            "user_id": "fake_id",
            "type": "payment"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Send reminder requires authentication")
    
    def test_send_payment_reminder(self, auth_headers, test_session):
        """Test sending payment reminder email"""
        user_id = test_session['user_id']
        
        response = requests.post(f"{BASE_URL}/api/admin/send-reminder-email",
            headers=auth_headers,
            json={
                "user_id": user_id,
                "type": "payment"
            }
        )
        # Should succeed (email may or may not actually send depending on Resend config)
        assert response.status_code == 200, f"Failed to send reminder: {response.text}"
        data = response.json()
        assert "message" in data, "Response should contain message"
        print(f"PASS: Send payment reminder returned: {data}")
    
    def test_send_meeting_reminder_no_meetings(self, auth_headers, test_session):
        """Test sending meeting reminder when no meetings exist"""
        user_id = test_session['user_id']
        
        response = requests.post(f"{BASE_URL}/api/admin/send-reminder-email",
            headers=auth_headers,
            json={
                "user_id": user_id,
                "type": "meeting"
            }
        )
        # Should fail because no meetings scheduled
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("PASS: Meeting reminder fails when no meetings exist")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_pocket(self, auth_headers):
        """Delete test pocket"""
        pocket_id = test_data.get('pocket_id')
        if pocket_id:
            response = requests.delete(f"{BASE_URL}/api/pockets/{pocket_id}", headers=auth_headers)
            print(f"Cleanup pocket: {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
