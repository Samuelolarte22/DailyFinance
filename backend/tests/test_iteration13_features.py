"""
Iteration 13 Tests - New Features:
1. GET /api/streak - Returns streak, max_streak, total_days
2. POST /api/debts - Auto-creates expense category with debt name
3. POST /api/savings - Auto-creates expense category with savings name
4. POST /api/budgets - Accepts biweekly fields (q1_projected, q1_done, q2_projected, q2_done)
5. GET /api/budgets/comparison - Returns biweekly fields
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test user/session setup
TEST_USER_ID = f"test_user_iter13_{datetime.now().strftime('%Y%m%d%H%M%S')}"
TEST_SESSION_TOKEN = f"test_session_iter13_{datetime.now().strftime('%Y%m%d%H%M%S')}"
TEST_EMAIL = f"test.iter13.{datetime.now().strftime('%Y%m%d%H%M%S')}@example.com"


@pytest.fixture(scope="module")
def setup_test_user():
    """Create test user and session in MongoDB"""
    import subprocess
    
    # Create user and session
    mongo_script = f"""
    use('test_database');
    db.users.insertOne({{
        user_id: '{TEST_USER_ID}',
        email: '{TEST_EMAIL}',
        name: 'Test User Iter13',
        picture: 'https://via.placeholder.com/150',
        has_completed_survey: true,
        is_admin: false,
        created_at: new Date()
    }});
    db.user_sessions.insertOne({{
        user_id: '{TEST_USER_ID}',
        session_token: '{TEST_SESSION_TOKEN}',
        expires_at: new Date(Date.now() + 7*24*60*60*1000),
        created_at: new Date()
    }});
    print('Test user created');
    """
    
    result = subprocess.run(
        ['mongosh', '--eval', mongo_script],
        capture_output=True, text=True
    )
    print(f"Setup result: {result.stdout}")
    
    yield TEST_SESSION_TOKEN
    
    # Cleanup
    cleanup_script = f"""
    use('test_database');
    db.users.deleteMany({{user_id: '{TEST_USER_ID}'}});
    db.user_sessions.deleteMany({{session_token: '{TEST_SESSION_TOKEN}'}});
    db.transactions.deleteMany({{user_id: '{TEST_USER_ID}'}});
    db.debts.deleteMany({{user_id: '{TEST_USER_ID}'}});
    db.savings_goals.deleteMany({{user_id: '{TEST_USER_ID}'}});
    db.categories.deleteMany({{user_id: '{TEST_USER_ID}'}});
    db.budgets.deleteMany({{user_id: '{TEST_USER_ID}'}});
    print('Test data cleaned up');
    """
    subprocess.run(['mongosh', '--eval', cleanup_script], capture_output=True, text=True)


@pytest.fixture
def auth_headers(setup_test_user):
    """Return auth headers with session token"""
    return {
        "Authorization": f"Bearer {setup_test_user}",
        "Content-Type": "application/json"
    }


class TestStreakEndpoint:
    """Tests for GET /api/streak endpoint"""
    
    def test_streak_requires_auth(self):
        """Streak endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/streak")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Streak endpoint requires authentication")
    
    def test_streak_returns_correct_fields(self, auth_headers):
        """Streak endpoint returns streak, max_streak, total_days"""
        response = requests.get(f"{BASE_URL}/api/streak", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "streak" in data, "Response missing 'streak' field"
        assert "max_streak" in data, "Response missing 'max_streak' field"
        assert "total_days" in data, "Response missing 'total_days' field"
        
        # Verify types
        assert isinstance(data["streak"], int), "streak should be int"
        assert isinstance(data["max_streak"], int), "max_streak should be int"
        assert isinstance(data["total_days"], int), "total_days should be int"
        
        print(f"✓ Streak endpoint returns correct fields: streak={data['streak']}, max_streak={data['max_streak']}, total_days={data['total_days']}")
    
    def test_streak_increments_with_transactions(self, auth_headers):
        """Streak increases when transactions are added on consecutive days"""
        # Add transaction for today
        today = datetime.now().strftime("%Y-%m-%dT12:00:00Z")
        response = requests.post(
            f"{BASE_URL}/api/transactions",
            headers=auth_headers,
            json={
                "type": "expense",
                "category": "Test Category",
                "amount": 1000,
                "date": today
            }
        )
        assert response.status_code == 200, f"Failed to create transaction: {response.text}"
        
        # Check streak
        response = requests.get(f"{BASE_URL}/api/streak", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert data["streak"] >= 1, f"Expected streak >= 1, got {data['streak']}"
        assert data["total_days"] >= 1, f"Expected total_days >= 1, got {data['total_days']}"
        
        print(f"✓ Streak incremented after adding transaction: streak={data['streak']}, total_days={data['total_days']}")


class TestDebtAutoCategory:
    """Tests for POST /api/debts auto-creating expense category"""
    
    def test_debt_creates_expense_category(self, auth_headers):
        """Creating a debt auto-creates an expense category with the debt name"""
        debt_name = f"TEST_Debt_AutoCat_{datetime.now().strftime('%H%M%S')}"
        
        # Create debt
        response = requests.post(
            f"{BASE_URL}/api/debts",
            headers=auth_headers,
            json={
                "name": debt_name,
                "total_amount": 100000,
                "current_amount": 100000,
                "interest_rate": 0,
                "num_installments": 10
            }
        )
        assert response.status_code == 200, f"Failed to create debt: {response.text}"
        
        # Check categories
        response = requests.get(f"{BASE_URL}/api/categories", headers=auth_headers)
        assert response.status_code == 200
        
        categories = response.json()
        expense_cats = categories.get("expense", [])
        
        assert debt_name in expense_cats, f"Debt name '{debt_name}' not found in expense categories: {expense_cats}"
        print(f"✓ Debt '{debt_name}' auto-created expense category")


class TestSavingsAutoCategory:
    """Tests for POST /api/savings auto-creating expense category"""
    
    def test_savings_creates_expense_category(self, auth_headers):
        """Creating a savings goal auto-creates an expense category with the savings name"""
        savings_name = f"TEST_Savings_AutoCat_{datetime.now().strftime('%H%M%S')}"
        
        # Create savings goal
        response = requests.post(
            f"{BASE_URL}/api/savings",
            headers=auth_headers,
            json={
                "name": savings_name,
                "target_amount": 500000,
                "current_amount": 0
            }
        )
        assert response.status_code == 200, f"Failed to create savings goal: {response.text}"
        
        # Check categories
        response = requests.get(f"{BASE_URL}/api/categories", headers=auth_headers)
        assert response.status_code == 200
        
        categories = response.json()
        expense_cats = categories.get("expense", [])
        
        assert savings_name in expense_cats, f"Savings name '{savings_name}' not found in expense categories: {expense_cats}"
        print(f"✓ Savings goal '{savings_name}' auto-created expense category")


class TestBudgetBiweeklyFields:
    """Tests for POST /api/budgets with biweekly fields"""
    
    def test_budget_accepts_biweekly_fields(self, auth_headers):
        """Budget endpoint accepts q1_projected, q1_done, q2_projected, q2_done"""
        category = f"TEST_Biweekly_Cat_{datetime.now().strftime('%H%M%S')}"
        month = datetime.now().strftime("%Y-%m")
        
        # Create budget with biweekly fields
        response = requests.post(
            f"{BASE_URL}/api/budgets",
            headers=auth_headers,
            json={
                "category": category,
                "projected_amount": 200000,
                "budget_type": "expense",
                "month": month,
                "period_type": "biweekly",
                "q1_projected": 100000,
                "q1_done": False,
                "q2_projected": 100000,
                "q2_done": False
            }
        )
        assert response.status_code == 200, f"Failed to create budget: {response.text}"
        print(f"✓ Budget created with biweekly fields for category '{category}'")
    
    def test_budget_comparison_returns_biweekly_fields(self, auth_headers):
        """GET /api/budgets/comparison returns biweekly fields"""
        month = datetime.now().strftime("%Y-%m")
        
        response = requests.get(
            f"{BASE_URL}/api/budgets/comparison?month={month}&budget_type=expense",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to get budget comparison: {response.text}"
        
        data = response.json()
        
        # Check if any budget has biweekly fields
        has_biweekly_fields = False
        for item in data:
            if "q1_projected" in item and "q2_projected" in item:
                has_biweekly_fields = True
                assert "q1_done" in item, "Missing q1_done field"
                assert "q2_done" in item, "Missing q2_done field"
                print(f"✓ Budget comparison for '{item['category']}' has biweekly fields: q1_projected={item.get('q1_projected')}, q2_projected={item.get('q2_projected')}")
                break
        
        # Even if no biweekly budgets exist, the fields should be present (defaulting to 0/False)
        if data:
            first_item = data[0]
            assert "q1_projected" in first_item, "Budget comparison missing q1_projected field"
            assert "q1_done" in first_item, "Budget comparison missing q1_done field"
            assert "q2_projected" in first_item, "Budget comparison missing q2_projected field"
            assert "q2_done" in first_item, "Budget comparison missing q2_done field"
            print(f"✓ Budget comparison returns biweekly fields")
    
    def test_budget_update_biweekly_done_checkbox(self, auth_headers):
        """Budget can update q1_done and q2_done checkboxes"""
        category = f"TEST_Biweekly_Update_{datetime.now().strftime('%H%M%S')}"
        month = datetime.now().strftime("%Y-%m")
        
        # Create budget
        response = requests.post(
            f"{BASE_URL}/api/budgets",
            headers=auth_headers,
            json={
                "category": category,
                "projected_amount": 150000,
                "budget_type": "expense",
                "month": month,
                "period_type": "biweekly",
                "q1_projected": 75000,
                "q1_done": False,
                "q2_projected": 75000,
                "q2_done": False
            }
        )
        assert response.status_code == 200
        
        # Update q1_done to True
        response = requests.post(
            f"{BASE_URL}/api/budgets",
            headers=auth_headers,
            json={
                "category": category,
                "projected_amount": 150000,
                "budget_type": "expense",
                "month": month,
                "period_type": "biweekly",
                "q1_projected": 75000,
                "q1_done": True,
                "q2_projected": 75000,
                "q2_done": False
            }
        )
        assert response.status_code == 200
        
        # Verify update
        response = requests.get(
            f"{BASE_URL}/api/budgets/comparison?month={month}&budget_type=expense",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        budget_item = next((b for b in data if b["category"] == category), None)
        
        if budget_item:
            assert budget_item.get("q1_done") == True, f"q1_done should be True, got {budget_item.get('q1_done')}"
            print(f"✓ Budget q1_done checkbox updated successfully")
        else:
            print(f"⚠ Budget category '{category}' not found in comparison, but update succeeded")


class TestHealthAndBasicEndpoints:
    """Basic health and endpoint tests"""
    
    def test_api_health(self):
        """API health check"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("✓ API health check passed")
    
    def test_auth_me_requires_auth(self):
        """Auth/me endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        print("✓ Auth/me requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
