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
    sys.exit(0)

from rest_framework_simplejwt.tokens import RefreshToken
refresh = RefreshToken.for_user(User)
c.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

try:
    print("TXS:", c.get('/api/transactions/').status_code)
    print("SUMMARY:", c.get('/api/statistics/summary/').status_code)
    print("TIMESERIES:", c.get('/api/statistics/timeseries/?type=expense').status_code)
    print("CATEGORYSTATS:", c.get('/api/statistics/by-category/').status_code)
except Exception as e:
    import traceback
    traceback.print_exc()
