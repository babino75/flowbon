#!/usr/bin/env python3
"""
Test script for dual-write treasury implementation.
Tests expense payment and advance disbursement with treasury account writes.
"""
import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000/api"

def get_auth_token():
    """Login and get auth token"""
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": "admin@test.com", "password": "password1234"}
    )
    if response.status_code != 200:
        print(f"Login failed: {response.status_code} - {response.text}")
        return None
    return response.json().get("access_token")

def test_expense_payment_dual_write():
    """Test that paying an expense creates both cash transaction and treasury transaction"""
    token = get_auth_token()
    if not token:
        print("✗ Failed to get auth token")
        return
    headers = {"Authorization": f"Bearer {token}"}
    
    print("\n=== TEST 1: Expense Payment Dual-Write ===")
    
    # Create a test expense
    expense_data = {
        "description": "Test Expense for Dual-Write",
        "amount": 10000,
        "category": "travel",
        "currency": "XOF"
    }
    
    exp_response = requests.post(
        f"{BASE_URL}/expenses",
        json=expense_data,
        headers=headers
    )
    expense = exp_response.json()
    print(f"✓ Created expense: {expense['id']} - Amount: {expense['amount']}")
    
    # Get company ID
    company_response = requests.get(
        f"{BASE_URL}/users/me",
        headers=headers
    )
    user = company_response.json()
    company_id = user.get("company_id")
    print(f"✓ Company ID: {company_id}")
    
    # List treasury accounts
    accounts_response = requests.get(
        f"{BASE_URL}/treasury/accounts",
        headers=headers
    )
    accounts = accounts_response.json()
    if not accounts:
        print("⚠ No treasury accounts found. Creating one...")
        # Create a treasury account
        account_data = {
            "name": "Main Treasury",
            "account_type": "cash",
            "company_id": company_id,
            "currency": "XOF",
            "description": "Main cash treasury account"
        }
        account_response = requests.post(
            f"{BASE_URL}/treasury/accounts",
            json=account_data,
            headers=headers
        )
        account = account_response.json()
        treasury_account_id = account.get("id")
    else:
        treasury_account_id = accounts[0]["id"]
    print(f"✓ Using treasury account: {treasury_account_id}")
    
    # Approve expense
    approve_response = requests.post(
        f"{BASE_URL}/expenses/{expense['id']}/approve",
        headers=headers
    )
    print(f"✓ Approved expense: {approve_response.json()['status']}")
    
    # Mark expense as paid with treasury account
    pay_response = requests.post(
        f"{BASE_URL}/expenses/{expense['id']}/pay",
        params={"treasury_account_id": treasury_account_id},
        headers=headers
    )
    
    if pay_response.status_code == 200:
        paid_expense = pay_response.json()
        print(f"✓ Marked expense as paid: {paid_expense['status']}")
        
        # Verify treasury transaction was created
        transactions_response = requests.get(
            f"{BASE_URL}/treasury/transactions",
            headers=headers
        )
        transactions = transactions_response.json()
        
        # Find transactions for this expense
        expense_transactions = [t for t in transactions if t.get("reference_id") == expense["id"]]
        if expense_transactions:
            print(f"✓ Treasury transaction created: {len(expense_transactions)} transaction(s)")
            for tx in expense_transactions:
                print(f"  - Type: {tx.get('transaction_type')}, Amount: {tx.get('amount')}")
        else:
            print("✗ No treasury transaction found for this expense")
    else:
        print(f"✗ Failed to mark expense as paid: {pay_response.json()}")

def test_advance_disbursement_dual_write():
    """Test that disbursing an advance creates both cash transaction and treasury transaction"""
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}
    
    print("\n=== TEST 2: Advance Disbursement Dual-Write ===")
    
    # Create a test advance
    advance_data = {
        "description": "Test Advance for Dual-Write",
        "amount": 50000,
        "currency": "XOF"
    }
    
    adv_response = requests.post(
        f"{BASE_URL}/advances",
        json=advance_data,
        headers=headers
    )
    advance = adv_response.json()
    print(f"✓ Created advance: {advance['id']} - Amount: {advance['amount']}")
    
    # Get treasury accounts
    accounts_response = requests.get(
        f"{BASE_URL}/treasury/accounts",
        headers=headers
    )
    accounts = accounts_response.json()
    if accounts:
        treasury_account_id = accounts[0]["id"]
    else:
        print("⚠ No treasury accounts available")
        return
    
    # Approve advance
    approve_response = requests.post(
        f"{BASE_URL}/advances/{advance['id']}/approve",
        headers=headers
    )
    print(f"✓ Approved advance: {approve_response.json()['status']}")
    
    # Disburse advance with treasury account
    disburse_response = requests.post(
        f"{BASE_URL}/advances/{advance['id']}/disburse",
        params={"treasury_account_id": treasury_account_id},
        headers=headers
    )
    
    if disburse_response.status_code == 200:
        disbursed_advance = disburse_response.json()
        print(f"✓ Disbursed advance: {disbursed_advance['status']}")
        
        # Verify treasury transaction was created
        transactions_response = requests.get(
            f"{BASE_URL}/treasury/transactions",
            headers=headers
        )
        transactions = transactions_response.json()
        
        # Find transactions for this advance
        advance_transactions = [t for t in transactions if t.get("reference_id") == advance["id"]]
        if advance_transactions:
            print(f"✓ Treasury transaction created: {len(advance_transactions)} transaction(s)")
            for tx in advance_transactions:
                print(f"  - Type: {tx.get('transaction_type')}, Amount: {tx.get('amount')}")
        else:
            print("✗ No treasury transaction found for this advance")
    else:
        print(f"✗ Failed to disburse advance: {disburse_response.json()}")

def main():
    print("Starting Dual-Write Test Suite")
    print("=" * 50)
    
    try:
        test_expense_payment_dual_write()
        test_advance_disbursement_dual_write()
    except Exception as e:
        print(f"\n✗ Error during testing: {e}")
        import traceback
        traceback.print_exc()
    
    print("\n" + "=" * 50)
    print("Test suite completed")

if __name__ == "__main__":
    main()
