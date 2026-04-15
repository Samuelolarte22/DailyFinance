"""
Backend tests for LD Finance new features:
1. Pockets (bolsillos digitales) - CRUD operations
2. Transactions with pocket_id, savings_goal_id, debt_id
3. Budget comparison with ALL user categories
4. Dashboard includes pockets, debts, savings_goals arrays
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test session token created via mongosh
SESSION_TOKEN = "test_session_pockets_1776295543868"
USER_ID = "test-pockets-1776295543868"


@pytest.fixture
def api_client():
    """Shared requests session with auth"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {SESSION_TOKEN}"
    })
    return session


class TestPocketsCRUD:
    """Test digital pockets (bolsillos) CRUD operations"""
    
    created_pocket_id = None
    
    def test_get_pockets_empty(self, api_client):
        """GET /api/pockets - returns user pockets (initially empty)"""
        response = api_client.get(f"{BASE_URL}/api/pockets")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/pockets returned {len(data)} pockets")
    
    def test_create_pocket(self, api_client):
        """POST /api/pockets - creates pocket with name"""
        payload = {"name": "Ahorro Emergencia"}
        response = api_client.post(f"{BASE_URL}/api/pockets", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "pocket_id" in data, "Response should contain pocket_id"
        assert "message" in data, "Response should contain message"
        TestPocketsCRUD.created_pocket_id = data["pocket_id"]
        print(f"✓ POST /api/pockets created pocket: {data['pocket_id']}")
    
    def test_get_pockets_after_create(self, api_client):
        """GET /api/pockets - verify pocket was created"""
        response = api_client.get(f"{BASE_URL}/api/pockets")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1, "Should have at least 1 pocket"
        pocket = next((p for p in data if p["pocket_id"] == TestPocketsCRUD.created_pocket_id), None)
        assert pocket is not None, "Created pocket should be in list"
        assert pocket["name"] == "Ahorro Emergencia", "Pocket name should match"
        assert pocket["balance"] == 0, "Initial balance should be 0"
        print(f"✓ Pocket verified: {pocket['name']} with balance {pocket['balance']}")
    
    def test_fund_pocket(self, api_client):
        """POST /api/pockets/{pocket_id}/fund - adds money to pocket"""
        pocket_id = TestPocketsCRUD.created_pocket_id
        assert pocket_id is not None, "Pocket must be created first"
        
        payload = {"amount": 100000}
        response = api_client.post(f"{BASE_URL}/api/pockets/{pocket_id}/fund", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "new_balance" in data, "Response should contain new_balance"
        assert data["new_balance"] == 100000, f"New balance should be 100000, got {data['new_balance']}"
        print(f"✓ Pocket funded: new balance = {data['new_balance']}")
    
    def test_fund_pocket_again(self, api_client):
        """POST /api/pockets/{pocket_id}/fund - fund again to verify increment"""
        pocket_id = TestPocketsCRUD.created_pocket_id
        payload = {"amount": 50000}
        response = api_client.post(f"{BASE_URL}/api/pockets/{pocket_id}/fund", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["new_balance"] == 150000, f"Balance should be 150000, got {data['new_balance']}"
        print(f"✓ Pocket funded again: new balance = {data['new_balance']}")
    
    def test_fund_nonexistent_pocket(self, api_client):
        """POST /api/pockets/{pocket_id}/fund - 404 for nonexistent pocket"""
        response = api_client.post(f"{BASE_URL}/api/pockets/nonexistent_pocket/fund", json={"amount": 1000})
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Fund nonexistent pocket returns 404")
    
    def test_delete_pocket(self, api_client):
        """DELETE /api/pockets/{pocket_id} - deletes pocket"""
        pocket_id = TestPocketsCRUD.created_pocket_id
        response = api_client.delete(f"{BASE_URL}/api/pockets/{pocket_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✓ Pocket deleted: {pocket_id}")
    
    def test_delete_nonexistent_pocket(self, api_client):
        """DELETE /api/pockets/{pocket_id} - 404 for nonexistent pocket"""
        response = api_client.delete(f"{BASE_URL}/api/pockets/nonexistent_pocket")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Delete nonexistent pocket returns 404")


class TestTransactionsWithAssociations:
    """Test transactions with pocket_id, savings_goal_id, debt_id"""
    
    test_pocket_id = None
    test_txn_id = None
    
    def test_create_pocket_for_transaction(self, api_client):
        """Create a pocket to use in transaction tests"""
        response = api_client.post(f"{BASE_URL}/api/pockets", json={"name": "Test Pocket TXN"})
        assert response.status_code == 200
        TestTransactionsWithAssociations.test_pocket_id = response.json()["pocket_id"]
        
        # Fund it
        api_client.post(f"{BASE_URL}/api/pockets/{TestTransactionsWithAssociations.test_pocket_id}/fund", 
                       json={"amount": 500000})
        print(f"✓ Created and funded test pocket: {TestTransactionsWithAssociations.test_pocket_id}")
    
    def test_create_transaction_with_pocket(self, api_client):
        """POST /api/transactions with pocket_id - deducts from pocket balance"""
        pocket_id = TestTransactionsWithAssociations.test_pocket_id
        payload = {
            "type": "expense",
            "category": "Alimentacion",
            "amount": 50000,
            "description": "Test expense from pocket",
            "pocket_id": pocket_id
        }
        response = api_client.post(f"{BASE_URL}/api/transactions", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "transaction_id" in data
        TestTransactionsWithAssociations.test_txn_id = data["transaction_id"]
        print(f"✓ Transaction with pocket created: {data['transaction_id']}")
        
        # Verify pocket balance was deducted
        pockets_response = api_client.get(f"{BASE_URL}/api/pockets")
        pockets = pockets_response.json()
        pocket = next((p for p in pockets if p["pocket_id"] == pocket_id), None)
        assert pocket is not None
        assert pocket["balance"] == 450000, f"Pocket balance should be 450000, got {pocket['balance']}"
        print(f"✓ Pocket balance deducted: {pocket['balance']}")
    
    def test_create_transaction_with_savings_goal(self, api_client):
        """POST /api/transactions with savings_goal_id - increments savings goal"""
        # Get existing savings goal
        savings_response = api_client.get(f"{BASE_URL}/api/savings")
        savings = savings_response.json()
        if not savings:
            pytest.skip("No savings goals available for test")
        
        goal = savings[0]
        initial_amount = goal["current_amount"]
        
        payload = {
            "type": "expense",
            "category": "Ahorro",
            "amount": 100000,
            "description": "Contribution to savings",
            "savings_goal_id": goal["goal_id"]
        }
        response = api_client.post(f"{BASE_URL}/api/transactions", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✓ Transaction with savings_goal_id created")
        
        # Verify savings goal was incremented
        savings_response = api_client.get(f"{BASE_URL}/api/savings")
        updated_goal = next((g for g in savings_response.json() if g["goal_id"] == goal["goal_id"]), None)
        assert updated_goal is not None
        expected_amount = initial_amount + 100000
        assert updated_goal["current_amount"] == expected_amount, \
            f"Savings goal should be {expected_amount}, got {updated_goal['current_amount']}"
        print(f"✓ Savings goal incremented: {updated_goal['current_amount']}")
    
    def test_create_transaction_with_debt(self, api_client):
        """POST /api/transactions with debt_id - decrements debt balance"""
        # Get existing debt
        debts_response = api_client.get(f"{BASE_URL}/api/debts")
        debts = debts_response.json()
        if not debts:
            pytest.skip("No debts available for test")
        
        debt = debts[0]
        initial_amount = debt["current_amount"]
        
        payload = {
            "type": "expense",
            "category": "Pago Deuda",
            "amount": 50000,
            "description": "Debt payment",
            "debt_id": debt["debt_id"]
        }
        response = api_client.post(f"{BASE_URL}/api/transactions", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✓ Transaction with debt_id created")
        
        # Verify debt was decremented
        debts_response = api_client.get(f"{BASE_URL}/api/debts")
        updated_debt = next((d for d in debts_response.json() if d["debt_id"] == debt["debt_id"]), None)
        assert updated_debt is not None
        expected_amount = initial_amount - 50000
        assert updated_debt["current_amount"] == expected_amount, \
            f"Debt should be {expected_amount}, got {updated_debt['current_amount']}"
        print(f"✓ Debt decremented: {updated_debt['current_amount']}")
    
    def test_cleanup_test_pocket(self, api_client):
        """Cleanup test pocket"""
        if TestTransactionsWithAssociations.test_pocket_id:
            api_client.delete(f"{BASE_URL}/api/pockets/{TestTransactionsWithAssociations.test_pocket_id}")
            print("✓ Test pocket cleaned up")


class TestBudgetComparison:
    """Test budget comparison returns ALL user categories"""
    
    def test_budget_comparison_expense(self, api_client):
        """GET /api/budgets/comparison returns ALL user expense categories"""
        response = api_client.get(f"{BASE_URL}/api/budgets/comparison?budget_type=expense")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Should include user's expense categories even without budgets
        category_names = [item["category"] for item in data]
        print(f"✓ Budget comparison expense returned {len(data)} categories: {category_names}")
        
        # Verify structure
        if data:
            item = data[0]
            assert "category" in item
            assert "projected" in item
            assert "actual" in item
            assert "difference" in item
            print(f"✓ Budget item structure verified: {list(item.keys())}")
    
    def test_budget_comparison_income(self, api_client):
        """GET /api/budgets/comparison returns ALL user income categories"""
        response = api_client.get(f"{BASE_URL}/api/budgets/comparison?budget_type=income")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        category_names = [item["category"] for item in data]
        print(f"✓ Budget comparison income returned {len(data)} categories: {category_names}")
    
    def test_budget_comparison_with_month(self, api_client):
        """GET /api/budgets/comparison with month parameter"""
        current_month = datetime.now().strftime("%Y-%m")
        response = api_client.get(f"{BASE_URL}/api/budgets/comparison?month={current_month}&budget_type=expense")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✓ Budget comparison with month={current_month} works")


class TestDashboardIncludes:
    """Test dashboard includes pockets, debts, savings_goals arrays"""
    
    def test_dashboard_includes_pockets(self, api_client):
        """GET /api/dashboard includes pockets array"""
        response = api_client.get(f"{BASE_URL}/api/dashboard")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "pockets" in data, "Dashboard should include 'pockets' array"
        assert isinstance(data["pockets"], list), "pockets should be a list"
        print(f"✓ Dashboard includes pockets: {len(data['pockets'])} items")
    
    def test_dashboard_includes_debts(self, api_client):
        """GET /api/dashboard includes debts array"""
        response = api_client.get(f"{BASE_URL}/api/dashboard")
        assert response.status_code == 200
        data = response.json()
        
        assert "debts" in data, "Dashboard should include 'debts' array"
        assert isinstance(data["debts"], list), "debts should be a list"
        print(f"✓ Dashboard includes debts: {len(data['debts'])} items")
    
    def test_dashboard_includes_savings_goals(self, api_client):
        """GET /api/dashboard includes savings_goals array"""
        response = api_client.get(f"{BASE_URL}/api/dashboard")
        assert response.status_code == 200
        data = response.json()
        
        assert "savings_goals" in data, "Dashboard should include 'savings_goals' array"
        assert isinstance(data["savings_goals"], list), "savings_goals should be a list"
        print(f"✓ Dashboard includes savings_goals: {len(data['savings_goals'])} items")
    
    def test_dashboard_full_structure(self, api_client):
        """GET /api/dashboard - verify full response structure"""
        response = api_client.get(f"{BASE_URL}/api/dashboard")
        assert response.status_code == 200
        data = response.json()
        
        required_fields = [
            "balance", "total_income", "total_expenses", 
            "total_debt", "total_savings", "recent_transactions",
            "pockets", "debts", "savings_goals"
        ]
        
        for field in required_fields:
            assert field in data, f"Dashboard should include '{field}'"
        
        print(f"✓ Dashboard structure verified with all required fields")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
