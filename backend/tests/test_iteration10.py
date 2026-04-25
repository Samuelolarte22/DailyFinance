"""
Test iteration 10 - New features:
1. Budget with month field (month-specific budgets)
2. Budget comparison endpoint with month filter
3. Edit savings goal current_amount
4. Edit debt current_amount
5. Reports endpoint with annual_overview and stacked_chart
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test user session - will be created in MongoDB
TEST_USER_ID = None
TEST_SESSION_TOKEN = None

@pytest.fixture(scope="module", autouse=True)
def setup_test_user():
    """Create test user and session in MongoDB for testing"""
    global TEST_USER_ID, TEST_SESSION_TOKEN
    import subprocess
    import time
    
    timestamp = int(time.time())
    TEST_USER_ID = f"test-user-iter10-{timestamp}"
    TEST_SESSION_TOKEN = f"test_session_iter10_{timestamp}"
    
    # Create test user and session in MongoDB
    mongo_script = f'''
    use('test_database');
    db.users.deleteMany({{user_id: /test-user-iter10/}});
    db.user_sessions.deleteMany({{session_token: /test_session_iter10/}});
    db.users.insertOne({{
      user_id: "{TEST_USER_ID}",
      email: "test.iter10.{timestamp}@example.com",
      name: "Test User Iter10",
      picture: "https://via.placeholder.com/150",
      has_completed_survey: true,
      is_admin: false,
      created_at: new Date()
    }});
    db.user_sessions.insertOne({{
      user_id: "{TEST_USER_ID}",
      session_token: "{TEST_SESSION_TOKEN}",
      expires_at: new Date(Date.now() + 7*24*60*60*1000),
      created_at: new Date()
    }});
    print("Test user created: {TEST_USER_ID}");
    '''
    
    result = subprocess.run(
        ['mongosh', '--eval', mongo_script],
        capture_output=True, text=True, timeout=30
    )
    print(f"MongoDB setup output: {result.stdout}")
    if result.returncode != 0:
        print(f"MongoDB setup error: {result.stderr}")
    
    yield
    
    # Cleanup
    cleanup_script = f'''
    use('test_database');
    db.users.deleteMany({{user_id: /test-user-iter10/}});
    db.user_sessions.deleteMany({{session_token: /test_session_iter10/}});
    db.budgets.deleteMany({{user_id: /test-user-iter10/}});
    db.savings_goals.deleteMany({{user_id: /test-user-iter10/}});
    db.debts.deleteMany({{user_id: /test-user-iter10/}});
    db.transactions.deleteMany({{user_id: /test-user-iter10/}});
    db.categories.deleteMany({{user_id: /test-user-iter10/}});
    print("Test data cleaned up");
    '''
    subprocess.run(['mongosh', '--eval', cleanup_script], capture_output=True, timeout=30)


@pytest.fixture
def auth_headers():
    """Return auth headers with test session token"""
    return {
        "Authorization": f"Bearer {TEST_SESSION_TOKEN}",
        "Content-Type": "application/json"
    }


class TestHealthCheck:
    """Basic health check"""
    
    def test_api_health(self):
        """Test API is running"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("API health check passed")


class TestBudgetWithMonth:
    """Test budget endpoints with month field"""
    
    def test_create_budget_with_month(self, auth_headers):
        """POST /api/budgets with month field creates month-specific budget"""
        payload = {
            "category": "TEST_Alimentacion",
            "projected_amount": 500000,
            "budget_type": "expense",
            "month": "2026-04"
        }
        response = requests.post(f"{BASE_URL}/api/budgets", json=payload, headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "budget_id" in data
        assert data.get("message") in ["Presupuesto creado", "Presupuesto actualizado"]
        print(f"Budget created with month: {data}")
    
    def test_create_budget_with_comment(self, auth_headers):
        """POST /api/budgets with comment and recurring flag"""
        payload = {
            "category": "TEST_Transporte",
            "projected_amount": 200000,
            "budget_type": "expense",
            "month": "2026-04",
            "comment": "Incluye gasolina y parqueadero",
            "comment_recurring": True
        }
        response = requests.post(f"{BASE_URL}/api/budgets", json=payload, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "budget_id" in data
        print(f"Budget with comment created: {data}")
    
    def test_create_income_budget_with_month(self, auth_headers):
        """POST /api/budgets for income type with month"""
        payload = {
            "category": "TEST_Salario",
            "projected_amount": 3000000,
            "budget_type": "income",
            "month": "2026-04"
        }
        response = requests.post(f"{BASE_URL}/api/budgets", json=payload, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "budget_id" in data
        print(f"Income budget created: {data}")
    
    def test_get_budget_comparison_with_month_filter(self, auth_headers):
        """GET /api/budgets/comparison?month=2026-04&budget_type=expense returns month-specific budgets"""
        response = requests.get(
            f"{BASE_URL}/api/budgets/comparison?month=2026-04&budget_type=expense",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Find our test budget
        test_budget = next((b for b in data if b["category"] == "TEST_Alimentacion"), None)
        if test_budget:
            assert test_budget["projected"] == 500000
            print(f"Found test budget in comparison: {test_budget}")
        else:
            print(f"Budget comparison returned {len(data)} items")
    
    def test_get_income_budget_comparison_with_month(self, auth_headers):
        """GET /api/budgets/comparison?month=2026-04&budget_type=income"""
        response = requests.get(
            f"{BASE_URL}/api/budgets/comparison?month=2026-04&budget_type=income",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        test_budget = next((b for b in data if b["category"] == "TEST_Salario"), None)
        if test_budget:
            assert test_budget["projected"] == 3000000
            print(f"Found income budget: {test_budget}")
    
    def test_budget_comparison_returns_comment(self, auth_headers):
        """Budget comparison should include comment field"""
        response = requests.get(
            f"{BASE_URL}/api/budgets/comparison?month=2026-04&budget_type=expense",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        test_budget = next((b for b in data if b["category"] == "TEST_Transporte"), None)
        if test_budget:
            assert "comment" in test_budget
            assert test_budget["comment"] == "Incluye gasolina y parqueadero"
            assert test_budget.get("comment_recurring") == True
            print(f"Budget with comment verified: {test_budget}")


class TestEditSavingsGoal:
    """Test PUT /api/savings/{goal_id}/edit endpoint"""
    
    def test_create_and_edit_savings_goal(self, auth_headers):
        """Create savings goal then edit current_amount"""
        # Create savings goal
        create_payload = {
            "name": "TEST_Vacaciones",
            "target_amount": 5000000,
            "current_amount": 1000000
        }
        create_response = requests.post(f"{BASE_URL}/api/savings", json=create_payload, headers=auth_headers)
        assert create_response.status_code == 200
        goal_id = create_response.json()["goal_id"]
        print(f"Created savings goal: {goal_id}")
        
        # Edit current_amount
        edit_payload = {"current_amount": 2500000}
        edit_response = requests.put(
            f"{BASE_URL}/api/savings/{goal_id}/edit",
            json=edit_payload,
            headers=auth_headers
        )
        assert edit_response.status_code == 200
        edit_data = edit_response.json()
        assert edit_data.get("current_amount") == 2500000
        print(f"Edited savings goal: {edit_data}")
        
        # Verify with GET
        get_response = requests.get(f"{BASE_URL}/api/savings", headers=auth_headers)
        assert get_response.status_code == 200
        goals = get_response.json()
        updated_goal = next((g for g in goals if g["goal_id"] == goal_id), None)
        assert updated_goal is not None
        assert updated_goal["current_amount"] == 2500000
        print(f"Verified savings goal update: {updated_goal}")
    
    def test_edit_savings_goal_not_found(self, auth_headers):
        """Edit non-existent savings goal returns 404"""
        edit_payload = {"current_amount": 1000}
        response = requests.put(
            f"{BASE_URL}/api/savings/nonexistent_goal_id/edit",
            json=edit_payload,
            headers=auth_headers
        )
        assert response.status_code == 404
        print("Edit non-existent savings goal correctly returns 404")
    
    def test_edit_savings_goal_missing_amount(self, auth_headers):
        """Edit savings goal without current_amount returns 400"""
        # First create a goal
        create_payload = {"name": "TEST_Emergency", "target_amount": 1000000}
        create_response = requests.post(f"{BASE_URL}/api/savings", json=create_payload, headers=auth_headers)
        goal_id = create_response.json()["goal_id"]
        
        # Try to edit without current_amount
        response = requests.put(
            f"{BASE_URL}/api/savings/{goal_id}/edit",
            json={},
            headers=auth_headers
        )
        assert response.status_code == 400
        print("Edit without current_amount correctly returns 400")


class TestEditDebt:
    """Test PUT /api/debts/{debt_id}/edit endpoint"""
    
    def test_create_and_edit_debt(self, auth_headers):
        """Create debt then edit current_amount"""
        # Create debt
        create_payload = {
            "name": "TEST_Tarjeta Credito",
            "total_amount": 10000000,
            "current_amount": 8000000,
            "interest_rate": 24.5
        }
        create_response = requests.post(f"{BASE_URL}/api/debts", json=create_payload, headers=auth_headers)
        assert create_response.status_code == 200
        debt_id = create_response.json()["debt_id"]
        print(f"Created debt: {debt_id}")
        
        # Edit current_amount
        edit_payload = {"current_amount": 6000000}
        edit_response = requests.put(
            f"{BASE_URL}/api/debts/{debt_id}/edit",
            json=edit_payload,
            headers=auth_headers
        )
        assert edit_response.status_code == 200
        edit_data = edit_response.json()
        assert edit_data.get("current_amount") == 6000000
        print(f"Edited debt: {edit_data}")
        
        # Verify with GET
        get_response = requests.get(f"{BASE_URL}/api/debts", headers=auth_headers)
        assert get_response.status_code == 200
        debts = get_response.json()
        updated_debt = next((d for d in debts if d["debt_id"] == debt_id), None)
        assert updated_debt is not None
        assert updated_debt["current_amount"] == 6000000
        print(f"Verified debt update: {updated_debt}")
    
    def test_edit_debt_not_found(self, auth_headers):
        """Edit non-existent debt returns 404"""
        edit_payload = {"current_amount": 1000}
        response = requests.put(
            f"{BASE_URL}/api/debts/nonexistent_debt_id/edit",
            json=edit_payload,
            headers=auth_headers
        )
        assert response.status_code == 404
        print("Edit non-existent debt correctly returns 404")
    
    def test_edit_debt_missing_amount(self, auth_headers):
        """Edit debt without current_amount returns 400"""
        # First create a debt
        create_payload = {"name": "TEST_Prestamo", "total_amount": 5000000, "current_amount": 5000000}
        create_response = requests.post(f"{BASE_URL}/api/debts", json=create_payload, headers=auth_headers)
        debt_id = create_response.json()["debt_id"]
        
        # Try to edit without current_amount
        response = requests.put(
            f"{BASE_URL}/api/debts/{debt_id}/edit",
            json={},
            headers=auth_headers
        )
        assert response.status_code == 400
        print("Edit without current_amount correctly returns 400")


class TestReportsEndpoint:
    """Test GET /api/reports returns annual_overview and stacked_chart"""
    
    def test_reports_returns_annual_overview(self, auth_headers):
        """GET /api/reports returns annual_overview array"""
        response = requests.get(f"{BASE_URL}/api/reports", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Check annual_overview exists and has correct structure
        assert "annual_overview" in data
        annual_overview = data["annual_overview"]
        assert isinstance(annual_overview, list)
        assert len(annual_overview) == 12  # 12 months
        
        # Check structure of first item
        first_month = annual_overview[0]
        assert "month" in first_month
        assert "label" in first_month
        assert "income" in first_month
        assert "expenses" in first_month
        assert "savings" in first_month
        assert "debts" in first_month
        assert "net" in first_month
        
        print(f"Annual overview has {len(annual_overview)} months")
        print(f"First month structure: {first_month}")
    
    def test_reports_returns_stacked_chart(self, auth_headers):
        """GET /api/reports returns stacked_chart array"""
        response = requests.get(f"{BASE_URL}/api/reports", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Check stacked_chart exists and has correct structure
        assert "stacked_chart" in data
        stacked_chart = data["stacked_chart"]
        assert isinstance(stacked_chart, list)
        assert len(stacked_chart) == 12  # 12 months
        
        # Check structure of first item
        first_item = stacked_chart[0]
        assert "label" in first_item
        assert "month" in first_item
        assert "income_pct" in first_item
        assert "expenses_pct" in first_item
        assert "savings_pct" in first_item
        assert "debts_pct" in first_item
        
        print(f"Stacked chart has {len(stacked_chart)} items")
        print(f"First item structure: {first_item}")
    
    def test_reports_annual_overview_months_are_correct(self, auth_headers):
        """Annual overview should have all 12 months of current year"""
        response = requests.get(f"{BASE_URL}/api/reports", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        annual_overview = data["annual_overview"]
        current_year = str(datetime.now().year)
        
        # Check all months are present
        months = [item["month"] for item in annual_overview]
        expected_months = [f"{current_year}-{str(m).zfill(2)}" for m in range(1, 13)]
        assert months == expected_months
        
        # Check labels are Spanish month names
        spanish_months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
        labels = [item["label"] for item in annual_overview]
        assert labels == spanish_months
        
        print(f"All 12 months present for year {current_year}")


class TestBudgetDefaultMonth:
    """Test budget defaults to current month when month not provided"""
    
    def test_budget_defaults_to_current_month(self, auth_headers):
        """POST /api/budgets without month uses current month"""
        current_month = datetime.now().strftime("%Y-%m")
        
        payload = {
            "category": "TEST_DefaultMonth",
            "projected_amount": 100000,
            "budget_type": "expense"
            # No month field
        }
        response = requests.post(f"{BASE_URL}/api/budgets", json=payload, headers=auth_headers)
        assert response.status_code == 200
        
        # Verify it was created for current month
        comparison_response = requests.get(
            f"{BASE_URL}/api/budgets/comparison?month={current_month}&budget_type=expense",
            headers=auth_headers
        )
        assert comparison_response.status_code == 200
        data = comparison_response.json()
        
        test_budget = next((b for b in data if b["category"] == "TEST_DefaultMonth"), None)
        assert test_budget is not None
        assert test_budget["projected"] == 100000
        print(f"Budget defaulted to current month {current_month}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
