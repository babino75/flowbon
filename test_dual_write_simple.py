#!/usr/bin/env python3
"""
Simplified dual-write test using a persistent session
"""
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

BASE_URL = "http://localhost:8000"

# Create session with retry logic
session = requests.Session()
retries = Retry(total=3, backoff_factor=0.1, status_forcelist=[500, 502, 503, 504])
adapter = HTTPAdapter(max_retries=retries)
session.mount('http://', adapter)
session.mount('https://', adapter)

def test_login():
    """Test login and get token"""
    print("\n=== TEST: Authentication ===")
    response = session.post(
        f"{BASE_URL}/auth/login",
        json={"email": "admin@test.com", "password": "password1234"},
        timeout=10
    )
    if response.status_code == 200:
        token = response.json().get("access_token")
        print(f"✓ Login successful, token: {token[:50]}...")
        return token
    else:
        print(f"✗ Login failed: {response.status_code}")
        return None

def test_treasury_accounts(token):
    """List treasury accounts"""
    print("\n=== TEST: Get Treasury Accounts ===")
    headers = {"Authorization": f"Bearer {token}"}
    response = session.get(
        f"{BASE_URL}/treasury/accounts",
        headers=headers,
        timeout=10
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        accounts = response.json()
        print(f"✓ Found {len(accounts)} treasury account(s)")
        for acc in accounts:
            print(f"  - {acc.get('name')}: {acc.get('currency')}")
        return accounts
    else:
        print(f"Response: {response.text[:200]}")
        return []

def test_create_expense(token):
    """Create a test expense"""
    print("\n=== TEST: Create Expense ===")
    headers = {"Authorization": f"Bearer {token}"}
    expense_data = {
        "description": "Test Expense for Dual-Write",
        "amount": 10000,
        "category": "travel",
        "currency": "XOF"
    }
    response = session.post(
        f"{BASE_URL}/expenses",
        json=expense_data,
        headers=headers,
        timeout=10
    )
    print(f"Status: {response.status_code}")
    if response.status_code in [200, 201]:
        expense = response.json()
        print(f"✓ Created expense: {expense.get('id')}")
        return expense
    else:
        print(f"Response: {response.text[:300]}")
        return None

def main():
    print("=" * 60)
    print("Dual-Write Test Suite (Simplified)")
    print("=" * 60)
    
    try:
        # Step 1: Login
        token = test_login()
        if not token:
            print("✗ Cannot proceed without token")
            return
        
        # Step 2: Get treasury accounts
        accounts = test_treasury_accounts(token)
        
        # Step 3: Create an expense
        expense = test_create_expense(token)
        
    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
    
    print("\n" + "=" * 60)
    print("Test completed")
    print("=" * 60)

if __name__ == "__main__":
    main()
