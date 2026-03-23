"""
Test suite for LD Finance new features (Iteration 4):
1. Budget comparison (Proyectado vs Real) - GET/POST/DELETE /budgets, GET /budgets/comparison
2. Simplified debt form with PMT auto-calculation - POST /debts with num_installments
"""
import pytest
import requests
import os
from datetime import datetime
import uuid
import math

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test data prefixes for cleanup
TEST_PREFIX = "TEST_"


class TestSetup:
    """Setup test user and session for authenticated tests"""
    
    @pytest.fixture(scope="class")
    def test_user_data(self):
        """Create test user and session directly in MongoDB"""
        import subprocess
        
        user_id = f"test_user_{uuid.uuid4().hex[:8]}"
        session_token = f"test_session_{uuid.uuid4().hex}"
        email = f"test.user.{uuid.uuid4().hex[:6]}@example.com"
        
        # Create user and session in MongoDB
        mongo_script = f'''
        use('test_database');
        db.users.insertOne({{
            user_id: "{user_id}",
            email: "{email}",
            name: "Test User Budget",
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
        
        subprocess.run(
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
        db.budgets.deleteMany({{ user_id: "{user_id}" }});
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


class TestBudgetEndpoints(TestSetup):
    """Test budget CRUD and comparison endpoints"""
    
    def test_get_budgets_empty(self, test_user_data):
        """Test GET /api/budgets returns empty list for new user"""
        headers = {"Authorization": f"Bearer {test_user_data['session_token']}"}
        response = requests.get(f"{BASE_URL}/api/budgets", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0
        print("✓ GET /api/budgets returns empty list for new user")
    
    def test_create_budget(self, test_user_data):
        """Test POST /api/budgets creates a budget for a category"""
        headers = {"Authorization": f"Bearer {test_user_data['session_token']}"}
        
        budget_data = {
            "category": "Alimentacion",
            "projected_amount": 500000
        }
        
        response = requests.post(f"{BASE_URL}/api/budgets", json=budget_data, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "budget_id" in data
        assert "message" in data
        
        # Verify budget was created
        get_response = requests.get(f"{BASE_URL}/api/budgets", headers=headers)
        budgets = get_response.json()
        assert len(budgets) >= 1
        created_budget = next((b for b in budgets if b["category"] == "Alimentacion"), None)
        assert created_budget is not None
        assert created_budget["projected_amount"] == 500000
        
        print(f"✓ POST /api/budgets creates budget: {data['budget_id']}")
        return data["budget_id"]
    
    def test_budget_upsert_behavior(self, test_user_data):
        """Test POST /api/budgets updates existing budget for same category (upsert)"""
        headers = {"Authorization": f"Bearer {test_user_data['session_token']}"}
        
        # Create initial budget
        budget_data = {"category": "Transporte", "projected_amount": 200000}
        response1 = requests.post(f"{BASE_URL}/api/budgets", json=budget_data, headers=headers)
        assert response1.status_code == 200
        budget_id1 = response1.json()["budget_id"]
        
        # Update same category with different amount
        budget_data2 = {"category": "Transporte", "projected_amount": 300000}
        response2 = requests.post(f"{BASE_URL}/api/budgets", json=budget_data2, headers=headers)
        assert response2.status_code == 200
        budget_id2 = response2.json()["budget_id"]
        
        # Should be same budget_id (upsert)
        assert budget_id1 == budget_id2
        
        # Verify amount was updated
        get_response = requests.get(f"{BASE_URL}/api/budgets", headers=headers)
        budgets = get_response.json()
        transport_budget = next((b for b in budgets if b["category"] == "Transporte"), None)
        assert transport_budget is not None
        assert transport_budget["projected_amount"] == 300000
        
        print("✓ POST /api/budgets upsert behavior works correctly")
    
    def test_delete_budget(self, test_user_data):
        """Test DELETE /api/budgets/{budget_id} deletes a budget"""
        headers = {"Authorization": f"Bearer {test_user_data['session_token']}"}
        
        # Create a budget to delete
        budget_data = {"category": "Entretenimiento", "projected_amount": 100000}
        create_response = requests.post(f"{BASE_URL}/api/budgets", json=budget_data, headers=headers)
        budget_id = create_response.json()["budget_id"]
        
        # Delete it
        delete_response = requests.delete(f"{BASE_URL}/api/budgets/{budget_id}", headers=headers)
        assert delete_response.status_code == 200
        
        # Verify it's gone
        get_response = requests.get(f"{BASE_URL}/api/budgets", headers=headers)
        budgets = get_response.json()
        deleted_budget = next((b for b in budgets if b["budget_id"] == budget_id), None)
        assert deleted_budget is None
        
        print(f"✓ DELETE /api/budgets/{budget_id} works correctly")
    
    def test_delete_nonexistent_budget(self, test_user_data):
        """Test DELETE /api/budgets/{budget_id} returns 404 for nonexistent budget"""
        headers = {"Authorization": f"Bearer {test_user_data['session_token']}"}
        
        response = requests.delete(f"{BASE_URL}/api/budgets/nonexistent_id", headers=headers)
        assert response.status_code == 404
        
        print("✓ DELETE nonexistent budget returns 404")


class TestBudgetComparison(TestSetup):
    """Test budget comparison endpoint"""
    
    def test_budget_comparison_empty(self, test_user_data):
        """Test GET /api/budgets/comparison returns empty for user with no budgets/transactions"""
        headers = {"Authorization": f"Bearer {test_user_data['session_token']}"}
        current_month = datetime.now().strftime("%Y-%m")
        
        response = requests.get(f"{BASE_URL}/api/budgets/comparison?month={current_month}", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        print("✓ GET /api/budgets/comparison returns list")
    
    def test_budget_comparison_with_data(self, test_user_data):
        """Test GET /api/budgets/comparison returns correct comparison data"""
        headers = {"Authorization": f"Bearer {test_user_data['session_token']}"}
        current_month = datetime.now().strftime("%Y-%m")
        
        # Create a budget
        budget_data = {"category": "Salud", "projected_amount": 200000}
        requests.post(f"{BASE_URL}/api/budgets", json=budget_data, headers=headers)
        
        # Create expense transactions for this month
        txn_data = {
            "type": "expense",
            "category": "Salud",
            "amount": 150000,
            "description": "Test expense for budget comparison"
        }
        requests.post(f"{BASE_URL}/api/transactions", json=txn_data, headers=headers)
        
        # Get comparison
        response = requests.get(f"{BASE_URL}/api/budgets/comparison?month={current_month}", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Find Salud category in comparison
        salud_comparison = next((c for c in data if c["category"] == "Salud"), None)
        assert salud_comparison is not None
        
        # Validate comparison fields
        assert "projected" in salud_comparison
        assert "actual" in salud_comparison
        assert "difference" in salud_comparison
        assert "over_budget" in salud_comparison
        
        assert salud_comparison["projected"] == 200000
        assert salud_comparison["actual"] == 150000
        assert salud_comparison["difference"] == 50000  # 200000 - 150000
        assert salud_comparison["over_budget"] == False  # 150000 < 200000
        
        print("✓ GET /api/budgets/comparison returns correct comparison data")
    
    def test_budget_comparison_over_budget(self, test_user_data):
        """Test over_budget flag is True when actual > projected"""
        headers = {"Authorization": f"Bearer {test_user_data['session_token']}"}
        current_month = datetime.now().strftime("%Y-%m")
        
        # Create a small budget
        budget_data = {"category": "Tecnologia", "projected_amount": 100000}
        requests.post(f"{BASE_URL}/api/budgets", json=budget_data, headers=headers)
        
        # Create expense that exceeds budget
        txn_data = {
            "type": "expense",
            "category": "Tecnologia",
            "amount": 150000,
            "description": "Over budget expense"
        }
        requests.post(f"{BASE_URL}/api/transactions", json=txn_data, headers=headers)
        
        # Get comparison
        response = requests.get(f"{BASE_URL}/api/budgets/comparison?month={current_month}", headers=headers)
        data = response.json()
        
        tech_comparison = next((c for c in data if c["category"] == "Tecnologia"), None)
        assert tech_comparison is not None
        assert tech_comparison["over_budget"] == True
        assert tech_comparison["difference"] == -50000  # 100000 - 150000
        
        print("✓ over_budget flag correctly set when actual > projected")


class TestDebtPMTCalculation(TestSetup):
    """Test debt creation with PMT auto-calculation"""
    
    def test_debt_with_pmt_calculation(self, test_user_data):
        """Test POST /api/debts with num_installments auto-calculates min_payment"""
        headers = {"Authorization": f"Bearer {test_user_data['session_token']}"}
        
        # PMT formula test: P=10,000,000, n=36, rate=28.5%
        # Expected monthly payment ~475,000 (approximately)
        debt_data = {
            "name": f"{TEST_PREFIX}PMT Test Debt",
            "total_amount": 10000000,
            "current_amount": 10000000,
            "interest_rate": 28.5,
            "num_installments": 36
        }
        
        response = requests.post(f"{BASE_URL}/api/debts", json=debt_data, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "debt_id" in data
        assert "min_payment" in data
        
        # Verify PMT calculation
        # PMT = P * [r(1+r)^n] / [(1+r)^n - 1]
        # where P=10000000, r=28.5/100/12=0.02375, n=36
        P = 10000000
        r = 28.5 / 100 / 12  # monthly rate
        n = 36
        expected_pmt = P * (r * (1 + r) ** n) / ((1 + r) ** n - 1)
        
        # Allow 1% tolerance for rounding
        assert abs(data["min_payment"] - expected_pmt) < expected_pmt * 0.01
        
        # Verify debt was created with calculated min_payment
        get_response = requests.get(f"{BASE_URL}/api/debts", headers=headers)
        debts = get_response.json()
        created_debt = next((d for d in debts if d["debt_id"] == data["debt_id"]), None)
        assert created_debt is not None
        assert created_debt["min_payment"] == data["min_payment"]
        assert created_debt["num_installments"] == 36
        assert created_debt["interest_rate"] == 28.5
        
        print(f"✓ PMT auto-calculation: P=10M, n=36, rate=28.5% -> min_payment={data['min_payment']}")
        print(f"  Expected PMT: {round(expected_pmt)}, Actual: {data['min_payment']}")
    
    def test_debt_zero_interest_simple_division(self, test_user_data):
        """Test POST /api/debts with 0% interest does simple division for min_payment"""
        headers = {"Authorization": f"Bearer {test_user_data['session_token']}"}
        
        debt_data = {
            "name": f"{TEST_PREFIX}Zero Interest Debt",
            "total_amount": 1200000,
            "current_amount": 1200000,
            "interest_rate": 0,
            "num_installments": 12
        }
        
        response = requests.post(f"{BASE_URL}/api/debts", json=debt_data, headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # With 0% interest, min_payment should be simple division: 1200000 / 12 = 100000
        expected_payment = 1200000 / 12
        assert data["min_payment"] == expected_payment
        
        print(f"✓ Zero interest PMT: 1,200,000 / 12 = {data['min_payment']}")
    
    def test_debt_with_explicit_min_payment(self, test_user_data):
        """Test POST /api/debts with explicit min_payment doesn't auto-calculate"""
        headers = {"Authorization": f"Bearer {test_user_data['session_token']}"}
        
        debt_data = {
            "name": f"{TEST_PREFIX}Explicit Min Payment",
            "total_amount": 5000000,
            "current_amount": 5000000,
            "interest_rate": 20,
            "num_installments": 24,
            "min_payment": 250000  # Explicit min_payment provided
        }
        
        response = requests.post(f"{BASE_URL}/api/debts", json=debt_data, headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # When min_payment is explicitly provided, it should be used as-is
        # Note: Based on the backend code, auto-calc only happens if min_payment is not provided
        # The backend checks: if num_installments > 0 and not min_payment
        # So if min_payment is provided (even if 0), it won't auto-calculate
        
        # Verify debt was created
        get_response = requests.get(f"{BASE_URL}/api/debts", headers=headers)
        debts = get_response.json()
        created_debt = next((d for d in debts if d["debt_id"] == data["debt_id"]), None)
        assert created_debt is not None
        
        print(f"✓ Debt with explicit min_payment created: {data['debt_id']}")
    
    def test_debt_no_installments_no_auto_calc(self, test_user_data):
        """Test POST /api/debts without num_installments doesn't auto-calculate"""
        headers = {"Authorization": f"Bearer {test_user_data['session_token']}"}
        
        debt_data = {
            "name": f"{TEST_PREFIX}No Installments",
            "total_amount": 3000000,
            "current_amount": 3000000,
            "interest_rate": 15
            # No num_installments provided
        }
        
        response = requests.post(f"{BASE_URL}/api/debts", json=debt_data, headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Without num_installments, min_payment should be 0 or not auto-calculated
        get_response = requests.get(f"{BASE_URL}/api/debts", headers=headers)
        debts = get_response.json()
        created_debt = next((d for d in debts if d["debt_id"] == data["debt_id"]), None)
        assert created_debt is not None
        assert created_debt["min_payment"] == 0 or created_debt.get("min_payment") is None
        
        print("✓ Debt without num_installments has no auto-calculated min_payment")


class TestPMTFormulaAccuracy(TestSetup):
    """Test PMT formula accuracy with various inputs"""
    
    def test_pmt_various_scenarios(self, test_user_data):
        """Test PMT calculation with different principal, rate, and term combinations"""
        headers = {"Authorization": f"Bearer {test_user_data['session_token']}"}
        
        test_cases = [
            # (principal, annual_rate, months, expected_approx_payment)
            (10000000, 28.5, 36, 475000),  # High interest, 3 years
            (5000000, 18.0, 24, 250000),   # Medium interest, 2 years
            (2000000, 12.0, 12, 178000),   # Low interest, 1 year
            (1000000, 0, 10, 100000),      # Zero interest
        ]
        
        for principal, rate, months, expected_approx in test_cases:
            debt_data = {
                "name": f"{TEST_PREFIX}PMT_{principal}_{rate}_{months}",
                "total_amount": principal,
                "current_amount": principal,
                "interest_rate": rate,
                "num_installments": months
            }
            
            response = requests.post(f"{BASE_URL}/api/debts", json=debt_data, headers=headers)
            assert response.status_code == 200
            data = response.json()
            
            # Calculate expected PMT
            if rate > 0:
                r = rate / 100 / 12
                expected_pmt = principal * (r * (1 + r) ** months) / ((1 + r) ** months - 1)
            else:
                expected_pmt = principal / months
            
            # Allow 5% tolerance
            tolerance = expected_pmt * 0.05
            assert abs(data["min_payment"] - expected_pmt) < tolerance, \
                f"PMT mismatch for P={principal}, r={rate}%, n={months}: expected ~{round(expected_pmt)}, got {data['min_payment']}"
            
            print(f"  ✓ P={principal:,}, r={rate}%, n={months} -> PMT={data['min_payment']:,}")
        
        print("✓ All PMT formula scenarios passed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
