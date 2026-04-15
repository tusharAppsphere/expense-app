import os
import sys

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "expense_backend.settings")

import django
django.setup()

from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()
user = User.objects.first()
if not user:
    print("No user found")
    sys.exit(0)

c = APIClient()
refresh = RefreshToken.for_user(user)
c.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

# Create Bank Account
res = c.post('/api/payment-methods/', {'type': 'bank', 'label': 'Test Bank'})
bank_id = res.json()['id']

# Create Income 500
c.post('/api/transactions/', {
    'title': 'Salary',
    'amount': 500,
    'type': 'income',
    'payment_method': bank_id,
    'date': '2026-04-14'
})

# Create Expense 600 (Should fail)
res2 = c.post('/api/transactions/', {
    'title': 'Rent',
    'amount': 600,
    'type': 'expense',
    'payment_method': bank_id,
    'date': '2026-04-14'
})
print(res2.status_code)
print(res2.json())

# Create Expense 400 (Should succeed)
res3 = c.post('/api/transactions/', {
    'title': 'Groceries',
    'amount': 400,
    'type': 'expense',
    'payment_method': bank_id,
    'date': '2026-04-14'
})
print(res3.status_code)

# Get final balance
res_bank = c.get('/api/payment-methods/')
for bank in res_bank.json()['results']:
    if bank['id'] == bank_id:
        print(f"Final Balance: {bank['balance']}")
