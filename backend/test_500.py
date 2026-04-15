import sys
import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "expense_backend.settings")
import django
django.setup()

from rest_framework.test import APIClient
c = APIClient()
from django.contrib.auth import get_user_model
User = get_user_model().objects.first()
if not User:
    print("No user")
    sys.exit(0)

from rest_framework_simplejwt.tokens import RefreshToken
refresh = RefreshToken.for_user(User)
c.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

try:
    res = c.get('/api/categories/')
    print("CATEGORIES:", res.status_code, res.content)
    res2 = c.get('/api/payment-methods/')
    print("PAYMENTS:", res2.status_code, res2.content)
except Exception as e:
    import traceback
    traceback.print_exc()
