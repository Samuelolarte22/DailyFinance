#!/usr/bin/env python3
"""
Comprehensive Backend API Test Suite for StudentFinance Beta
Tests all API endpoints with authentication
"""

import requests
import json
import sys
from datetime import datetime
from typing import Dict, Any, Optional

class StudentFinanceAPITester:
    def __init__(self, base_url: str, session_token: str):
        self.base_url = base_url
        self.session_token = session_token
        self.headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {session_token}'
        }
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.created_items = {
            'transactions': [],
            'debts': [],
            'savings': []
        }

    def run_test(self, name: str, method: str, endpoint: str, expected_status: int, 
                 data: Optional[Dict] = None, description: str = "") -> tuple:
        """Run a single API test and track results"""
        url = f"{self.base_url}/api/{endpoint}"
        self.tests_run += 1
        
        print(f"\n🔍 Test {self.tests_run}: {name}")
        if description:
            print(f"   Description: {description}")
        print(f"   URL: {method} {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=self.headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=self.headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=self.headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=self.headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")

            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                status_icon = "✅"
                print(f"   {status_icon} PASSED - Status: {response.status_code}")
                
                try:
                    response_data = response.json()
                    if endpoint == "transactions" and method == "POST" and 'transaction_id' in response_data:
                        self.created_items['transactions'].append(response_data['transaction_id'])
                    elif endpoint == "debts" and method == "POST" and 'debt_id' in response_data:
                        self.created_items['debts'].append(response_data['debt_id'])
                    elif endpoint == "savings" and method == "POST" and 'goal_id' in response_data:
                        self.created_items['savings'].append(response_data['goal_id'])
                except:
                    response_data = {}
            else:
                status_icon = "❌"
                print(f"   {status_icon} FAILED - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error details: {error_detail}")
                except:
                    print(f"   Response text: {response.text[:200]}...")
                response_data = {}

            # Store test result
            result = {
                'name': name,
                'method': method,
                'endpoint': endpoint,
                'expected_status': expected_status,
                'actual_status': response.status_code,
                'success': success,
                'description': description
            }
            self.test_results.append(result)

            return success, response_data

        except Exception as e:
            print(f"   ❌ FAILED - Exception: {str(e)}")
            result = {
                'name': name,
                'method': method,
                'endpoint': endpoint,
                'expected_status': expected_status,
                'actual_status': 0,
                'success': False,
                'error': str(e),
                'description': description
            }
            self.test_results.append(result)
            return False, {}

    def test_health_check(self):
        """Test API health endpoint"""
        return self.run_test(
            "Health Check",
            "GET",
            "",
            200,
            description="Basic API health check endpoint"
        )

    def test_auth_me(self):
        """Test authenticated user endpoint"""
        return self.run_test(
            "Auth Me",
            "GET",
            "auth/me",
            200,
            description="Get current authenticated user data"
        )

    def test_dashboard(self):
        """Test dashboard summary endpoint"""
        return self.run_test(
            "Dashboard Summary",
            "GET",
            "dashboard",
            200,
            description="Get dashboard financial summary"
        )

    def test_transactions_crud(self):
        """Test complete CRUD operations for transactions"""
        print("\n📋 Testing Transaction CRUD Operations")
        
        # GET empty transactions
        success, data = self.run_test(
            "Get Transactions (Empty)",
            "GET",
            "transactions",
            200,
            description="Get user transactions (should be empty initially)"
        )
        
        # CREATE transaction - Income
        success, data = self.run_test(
            "Create Income Transaction",
            "POST",
            "transactions",
            200,
            data={
                "type": "income",
                "category": "Salario",
                "amount": 500000,
                "description": "Salario mensual"
            },
            description="Create income transaction"
        )
        
        # CREATE transaction - Expense  
        success, data = self.run_test(
            "Create Expense Transaction",
            "POST",
            "transactions",
            200,
            data={
                "type": "expense", 
                "category": "Alimentación",
                "amount": 150000,
                "description": "Gastos de comida"
            },
            description="Create expense transaction"
        )
        
        # GET updated transactions
        success, data = self.run_test(
            "Get Transactions (With Data)",
            "GET",
            "transactions",
            200,
            description="Get transactions after creating some"
        )
        
        # DELETE transaction if we have any
        if self.created_items['transactions']:
            txn_id = self.created_items['transactions'][0]
            success, data = self.run_test(
                "Delete Transaction",
                "DELETE",
                f"transactions/{txn_id}",
                200,
                description=f"Delete transaction {txn_id}"
            )

    def test_debts_crud(self):
        """Test complete CRUD operations for debts"""
        print("\n💳 Testing Debt CRUD Operations")
        
        # GET empty debts
        success, data = self.run_test(
            "Get Debts (Empty)",
            "GET",
            "debts",
            200,
            description="Get user debts (should be empty initially)"
        )
        
        # CREATE debt
        success, data = self.run_test(
            "Create Debt",
            "POST",
            "debts",
            200,
            data={
                "name": "Préstamo universitario",
                "total_amount": 2000000,
                "current_amount": 1500000,
                "interest_rate": 12.5,
                "due_date": "2025-12-31"
            },
            description="Create a student loan debt"
        )
        
        # GET updated debts
        success, data = self.run_test(
            "Get Debts (With Data)",
            "GET",
            "debts",
            200,
            description="Get debts after creating one"
        )
        
        # PAY debt if we have any
        if self.created_items['debts']:
            debt_id = self.created_items['debts'][0]
            success, data = self.run_test(
                "Pay Debt",
                "PUT",
                f"debts/{debt_id}/pay",
                200,
                data={"amount": 100000},
                description=f"Make payment on debt {debt_id}"
            )
        
        # DELETE debt if we have any
        if self.created_items['debts']:
            debt_id = self.created_items['debts'][0]
            success, data = self.run_test(
                "Delete Debt",
                "DELETE",
                f"debts/{debt_id}",
                200,
                description=f"Delete debt {debt_id}"
            )

    def test_savings_crud(self):
        """Test complete CRUD operations for savings goals"""
        print("\n🎯 Testing Savings CRUD Operations")
        
        # GET empty savings
        success, data = self.run_test(
            "Get Savings Goals (Empty)",
            "GET",
            "savings",
            200,
            description="Get user savings goals (should be empty initially)"
        )
        
        # CREATE savings goal
        success, data = self.run_test(
            "Create Savings Goal",
            "POST",
            "savings",
            200,
            data={
                "name": "Viaje de graduación",
                "target_amount": 800000,
                "current_amount": 100000,
                "deadline": "2025-06-30"
            },
            description="Create a graduation trip savings goal"
        )
        
        # GET updated savings
        success, data = self.run_test(
            "Get Savings Goals (With Data)",
            "GET",
            "savings",
            200,
            description="Get savings goals after creating one"
        )
        
        # CONTRIBUTE to savings if we have any
        if self.created_items['savings']:
            goal_id = self.created_items['savings'][0]
            success, data = self.run_test(
                "Contribute to Savings",
                "PUT",
                f"savings/{goal_id}/contribute",
                200,
                data={"amount": 50000},
                description=f"Make contribution to goal {goal_id}"
            )
        
        # DELETE savings goal if we have any
        if self.created_items['savings']:
            goal_id = self.created_items['savings'][0]
            success, data = self.run_test(
                "Delete Savings Goal",
                "DELETE",
                f"savings/{goal_id}",
                200,
                description=f"Delete savings goal {goal_id}"
            )

    def test_survey(self):
        """Test diagnostic survey endpoints"""
        print("\n📊 Testing Survey Operations")
        
        # GET survey (might not exist)
        success, data = self.run_test(
            "Get Survey Data",
            "GET",
            "survey",
            200,
            description="Get user's diagnostic survey data"
        )
        
        # POST survey
        success, data = self.run_test(
            "Submit Survey",
            "POST",
            "survey",
            200,
            data={
                "monthly_income": 800000,
                "monthly_expenses": 600000,
                "current_savings": 200000,
                "total_debt": 1000000,
                "financial_knowledge": 3,
                "main_financial_goal": "Reducir deudas",
                "biggest_challenge": "Control de gastos"
            },
            description="Submit diagnostic survey"
        )

    def test_reports(self):
        """Test financial reports endpoint"""
        return self.run_test(
            "Financial Reports",
            "GET",
            "reports",
            200,
            description="Get before/after financial comparison reports"
        )

    def run_all_tests(self):
        """Execute all API tests"""
        print("🚀 Starting StudentFinance API Test Suite")
        print(f"Backend URL: {self.base_url}")
        print(f"Session Token: {self.session_token[:20]}...")
        print("=" * 60)

        # Core API tests
        self.test_health_check()
        self.test_auth_me()
        self.test_dashboard()
        
        # CRUD operations
        self.test_transactions_crud()
        self.test_debts_crud()
        self.test_savings_crud()
        
        # Additional features
        self.test_survey()
        self.test_reports()
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed / self.tests_run * 100):.1f}%" if self.tests_run > 0 else "N/A")
        
        # Show failed tests
        failed_tests = [t for t in self.test_results if not t['success']]
        if failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"   • {test['name']}: Expected {test['expected_status']}, got {test.get('actual_status', 'Error')}")
        
        return self.tests_passed == self.tests_run

def main():
    # Configuration
    BASE_URL = "https://debt-manager-beta.preview.emergentagent.com"
    SESSION_TOKEN = "test_session_1772301122215"  # From MongoDB setup
    
    # Initialize tester
    tester = StudentFinanceAPITester(BASE_URL, SESSION_TOKEN)
    
    # Run all tests
    success = tester.run_all_tests()
    
    # Exit with proper code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()