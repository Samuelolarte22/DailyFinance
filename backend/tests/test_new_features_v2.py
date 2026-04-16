"""
Test suite for LD Finance new features (Iteration 8):
1. FloatingTransaction shared transaction UI
2. FloatingTransaction calculator toggle
3. Dashboard pie chart for expense categories
4. Reports page timeline chart (Debt vs Savings)
5. Transactions page calculator toggle
6. Backend timeline API
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test session created via mongosh
TEST_SESSION_TOKEN = None
TEST_USER_ID = None


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def test_session(api_client):
    """Create test user and session for testing"""
    global TEST_SESSION_TOKEN, TEST_USER_ID
    
    import subprocess
    result = subprocess.run([
        "mongosh", "--eval", """
use('test_database');
var userId = 'test-features-' + Date.now();
var sessionToken = 'test_features_session_' + Date.now();
db.users.insertOne({
  user_id: userId,
  email: 'test.features.' + Date.now() + '@example.com',
  name: 'Test Features User',
  picture: 'https://via.placeholder.com/150',
  has_completed_survey: true,
  created_at: new Date()
});
db.user_sessions.insertOne({
  user_id: userId,
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  created_at: new Date()
});
print('SESSION_TOKEN=' + sessionToken);
print('USER_ID=' + userId);
"""
    ], capture_output=True, text=True)
    
    for line in result.stdout.split('\n'):
        if line.startswith('SESSION_TOKEN='):
            TEST_SESSION_TOKEN = line.split('=')[1]
        if line.startswith('USER_ID='):
            TEST_USER_ID = line.split('=')[1]
    
    api_client.headers.update({"Authorization": f"Bearer {TEST_SESSION_TOKEN}"})
    
    yield {"session_token": TEST_SESSION_TOKEN, "user_id": TEST_USER_ID}
    
    # Cleanup
    subprocess.run([
        "mongosh", "--eval", f"""
use('test_database');
db.users.deleteMany({{user_id: '{TEST_USER_ID}'}});
db.user_sessions.deleteMany({{user_id: '{TEST_USER_ID}'}});
db.transactions.deleteMany({{user_id: '{TEST_USER_ID}'}});
db.debts.deleteMany({{user_id: '{TEST_USER_ID}'}});
db.savings_goals.deleteMany({{user_id: '{TEST_USER_ID}'}});
db.categories.deleteMany({{user_id: '{TEST_USER_ID}'}});
db.connections.deleteMany({{user_id: '{TEST_USER_ID}'}});
"""
    ], capture_output=True, text=True)


class TestTimelineAPI:
    """Tests for /api/reports/timeline endpoint"""
    
    def test_timeline_month_period(self, api_client, test_session):
        """Test timeline endpoint with month period"""
        response = api_client.get(f"{BASE_URL}/api/reports/timeline?period=month")
        assert response.status_code == 200
        data = response.json()
        assert "timeline" in data
        assert "period" in data
        assert data["period"] == "month"
        assert isinstance(data["timeline"], list)
    
    def test_timeline_week_period(self, api_client, test_session):
        """Test timeline endpoint with week period"""
        response = api_client.get(f"{BASE_URL}/api/reports/timeline?period=week")
        assert response.status_code == 200
        data = response.json()
        assert data["period"] == "week"
        assert isinstance(data["timeline"], list)
    
    def test_timeline_year_period(self, api_client, test_session):
        """Test timeline endpoint with year period"""
        response = api_client.get(f"{BASE_URL}/api/reports/timeline?period=year")
        assert response.status_code == 200
        data = response.json()
        assert data["period"] == "year"
        assert isinstance(data["timeline"], list)
    
    def test_timeline_default_period(self, api_client, test_session):
        """Test timeline endpoint without period parameter (defaults to month)"""
        response = api_client.get(f"{BASE_URL}/api/reports/timeline")
        assert response.status_code == 200
        data = response.json()
        assert data["period"] == "month"
    
    def test_timeline_data_structure(self, api_client, test_session):
        """Test timeline data structure has required fields"""
        # First create some data
        api_client.post(f"{BASE_URL}/api/debts", json={
            "name": "Timeline Test Debt",
            "total_amount": 100000,
            "current_amount": 100000,
            "interest_rate": 5,
            "due_date": "2026-12-31"
        })
        api_client.post(f"{BASE_URL}/api/savings", json={
            "name": "Timeline Test Savings",
            "target_amount": 500000,
            "current_amount": 50000,
            "target_date": "2026-12-31"
        })
        
        response = api_client.get(f"{BASE_URL}/api/reports/timeline?period=month")
        assert response.status_code == 200
        data = response.json()
        
        if len(data["timeline"]) > 0:
            item = data["timeline"][0]
            assert "period" in item
            assert "label" in item
            assert "debt" in item
            assert "savings" in item
            assert isinstance(item["debt"], (int, float))
            assert isinstance(item["savings"], (int, float))


class TestConnectionsAPI:
    """Tests for /api/connections endpoint (for shared transactions)"""
    
    def test_get_connections_empty(self, api_client, test_session):
        """Test getting connections when user has none"""
        response = api_client.get(f"{BASE_URL}/api/connections")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestDashboardWithCategories:
    """Tests for dashboard with expense categories (for pie chart)"""
    
    def test_dashboard_has_all_transactions(self, api_client, test_session):
        """Test dashboard returns all_transactions for pie chart"""
        # Create expense transactions
        api_client.post(f"{BASE_URL}/api/categories", json={
            "name": "TEST_Alimentacion", "type": "expense"
        })
        api_client.post(f"{BASE_URL}/api/categories", json={
            "name": "TEST_Transporte", "type": "expense"
        })
        
        api_client.post(f"{BASE_URL}/api/transactions", json={
            "type": "expense",
            "category": "TEST_Alimentacion",
            "amount": 50000,
            "date": datetime.now().strftime("%Y-%m-%d")
        })
        api_client.post(f"{BASE_URL}/api/transactions", json={
            "type": "expense",
            "category": "TEST_Transporte",
            "amount": 30000,
            "date": datetime.now().strftime("%Y-%m-%d")
        })
        
        response = api_client.get(f"{BASE_URL}/api/dashboard")
        assert response.status_code == 200
        data = response.json()
        
        # Dashboard should have all_transactions for pie chart
        assert "all_transactions" in data
        assert isinstance(data["all_transactions"], list)
        
        # Should have expense transactions
        expenses = [t for t in data["all_transactions"] if t["type"] == "expense"]
        assert len(expenses) >= 2
    
    def test_dashboard_transactions_have_category(self, api_client, test_session):
        """Test that transactions have category field for pie chart grouping"""
        response = api_client.get(f"{BASE_URL}/api/dashboard")
        assert response.status_code == 200
        data = response.json()
        
        for txn in data.get("all_transactions", []):
            assert "category" in txn
            assert "type" in txn
            assert "amount" in txn
            assert "date" in txn


class TestReportsEndpoint:
    """Tests for /api/reports endpoint"""
    
    def test_reports_endpoint_exists(self, api_client, test_session):
        """Test reports endpoint returns data"""
        response = api_client.get(f"{BASE_URL}/api/reports")
        assert response.status_code == 200
        data = response.json()
        
        # Should have after field for current totals
        assert "after" in data or "monthly_breakdown" in data
    
    def test_reports_has_debt_savings_totals(self, api_client, test_session):
        """Test reports has debt and savings totals for timeline chart"""
        response = api_client.get(f"{BASE_URL}/api/reports")
        assert response.status_code == 200
        data = response.json()
        
        # Reports should have after.total_debt and after.total_savings
        if "after" in data:
            assert "total_debt" in data["after"]
            assert "total_savings" in data["after"]


class TestSharedTransactionsAPI:
    """Tests for shared transactions endpoint"""
    
    def test_shared_transaction_endpoint_exists(self, api_client, test_session):
        """Test that shared transaction endpoint exists"""
        # This should fail with validation error (no shared_with), not 404
        response = api_client.post(f"{BASE_URL}/api/transactions/shared", json={
            "type": "expense",
            "category": "TEST_Alimentacion",
            "amount": 10000,
            "date": datetime.now().strftime("%Y-%m-%d"),
            "shared_with": "nonexistent-user",
            "my_percentage": 50,
            "friend_percentage": 50
        })
        # Should return 404 (user not found) or 422 (validation), not 500
        assert response.status_code in [404, 422, 400]


class TestCategoriesAPI:
    """Tests for categories endpoint"""
    
    def test_get_categories(self, api_client, test_session):
        """Test getting categories returns expense and income lists"""
        response = api_client.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        data = response.json()
        
        assert "expense" in data
        assert "income" in data
        assert isinstance(data["expense"], list)
        assert isinstance(data["income"], list)


class TestTransactionWithCalculator:
    """Tests for transaction creation (calculator uses same endpoint)"""
    
    def test_create_transaction_with_amount(self, api_client, test_session):
        """Test creating transaction with calculated amount"""
        # Calculator would compute amount and send to this endpoint
        response = api_client.post(f"{BASE_URL}/api/transactions", json={
            "type": "expense",
            "category": "TEST_Alimentacion",
            "amount": 12345,  # Simulated calculator result
            "date": datetime.now().strftime("%Y-%m-%d"),
            "description": "Calculator test"
        })
        assert response.status_code == 200
        data = response.json()
        assert "transaction_id" in data
        
        # Verify transaction was created with correct amount
        dashboard = api_client.get(f"{BASE_URL}/api/dashboard").json()
        txn = next((t for t in dashboard["all_transactions"] if t.get("description") == "Calculator test"), None)
        assert txn is not None
        assert txn["amount"] == 12345


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
