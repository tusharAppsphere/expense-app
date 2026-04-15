# core/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    RegisterView, LoginView, LogoutView, ProfileView,
    WorkspaceViewSet, CategoryViewSet,
    FinancialAccountViewSet, PaymentMethodViewSet, TransactionViewSet,
    SummaryView, CategoryStatsView, TimeseriesView,
)

router = DefaultRouter()
router.register(r'workspaces', WorkspaceViewSet, basename='workspace')
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'accounts', FinancialAccountViewSet, basename='account')
router.register(r'payment-methods', PaymentMethodViewSet, basename='payment-method')
router.register(r'transactions', TransactionViewSet, basename='transaction')

urlpatterns = [
    # Auth
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # User
    path('user/profile/', ProfileView.as_view(), name='profile'),

    # Statistics
    path('statistics/summary/', SummaryView.as_view(), name='stats-summary'),
    path('statistics/by-category/', CategoryStatsView.as_view(), name='stats-category'),
    path('statistics/timeseries/', TimeseriesView.as_view(), name='stats-timeseries'),

    # Router-registered viewsets
    path('', include(router.urls)),
]
