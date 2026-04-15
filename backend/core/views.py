# core/views.py
from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db.models import Sum, Count, Q
from django.db.models.functions import TruncDate
from django.utils import timezone

from rest_framework import viewsets, status, generics, filters
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

from .models import Workspace, WorkspaceMember, Category, FinancialAccount, PaymentMethod, Transaction
from .serializers import (
    RegisterSerializer, UserSerializer,
    WorkspaceSerializer, WorkspaceMemberSerializer,
    CategorySerializer, FinancialAccountSerializer, PaymentMethodSerializer,
    TransactionSerializer,
)

User = get_user_model()


# ─── AUTH ────────────────────────────────────────────────────────
class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': UserSerializer(user).data,
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').lower().strip()
        password = request.data.get('password', '')

        if not email or not password:
            return Response({'detail': 'Email and password are required.'}, status=400)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'detail': 'Invalid credentials.'}, status=401)

        if not user.check_password(password):
            return Response({'detail': 'Invalid credentials.'}, status=401)

        if not user.is_active:
            return Response({'detail': 'Account is disabled.'}, status=401)

        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
        })


class LogoutView(APIView):
    def post(self, request):
        try:
            token = RefreshToken(request.data.get('refresh', ''))
            token.blacklist()
        except Exception:
            pass
        return Response({'detail': 'Logged out.'})


# ─── USER PROFILE ────────────────────────────────────────────────
class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


# ─── WORKSPACES ──────────────────────────────────────────────────
class WorkspaceViewSet(viewsets.ModelViewSet):
    serializer_class = WorkspaceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Workspace.objects.filter(
            Q(owner=user) | Q(members=user)
        ).distinct().prefetch_related('workspacemember_set')

    def perform_create(self, serializer):
        serializer.save()

    @action(detail=True, methods=['get'])
    def members(self, request, pk=None):
        workspace = self.get_object()
        memberships = WorkspaceMember.objects.filter(workspace=workspace).select_related('user')
        serializer = WorkspaceMemberSerializer(memberships, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='members/invite')
    def invite_member(self, request, pk=None):
        workspace = self.get_object()
        # Check requester is owner or admin
        requester = WorkspaceMember.objects.filter(workspace=workspace, user=request.user).first()
        if not requester or requester.role not in ('owner', 'admin'):
            return Response({'detail': 'You do not have permission to invite members.'}, status=403)

        email = request.data.get('email', '').lower().strip()
        if not email:
            return Response({'detail': 'Email is required.'}, status=400)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'detail': f'No user found with email {email}.'}, status=404)

        membership, created = WorkspaceMember.objects.get_or_create(
            workspace=workspace, user=user,
            defaults={'role': 'member'}
        )
        if not created:
            return Response({'detail': 'User is already a member.'}, status=400)

        serializer = WorkspaceMemberSerializer(membership)
        return Response(serializer.data, status=201)

    @action(detail=True, methods=['delete'], url_path='members/(?P<user_id>[^/.]+)')
    def remove_member(self, request, pk=None, user_id=None):
        workspace = self.get_object()
        requester = WorkspaceMember.objects.filter(workspace=workspace, user=request.user).first()
        if not requester or requester.role not in ('owner', 'admin'):
            return Response({'detail': 'You do not have permission to remove members.'}, status=403)
        WorkspaceMember.objects.filter(workspace=workspace, user_id=user_id).delete()
        return Response(status=204)


# ─── CATEGORIES ──────────────────────────────────────────────────
class CategoryViewSet(viewsets.ModelViewSet):
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Category.objects.filter(Q(user__isnull=True) | Q(user=user), is_active=True).distinct()


# ─── FINANCIAL ACCOUNTS & PAYMENT METHODS ───────────────────────
class FinancialAccountViewSet(viewsets.ModelViewSet):
    serializer_class = FinancialAccountSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return FinancialAccount.objects.filter(user=self.request.user).prefetch_related('payment_methods')


class PaymentMethodViewSet(viewsets.ModelViewSet):
    serializer_class = PaymentMethodSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return PaymentMethod.objects.filter(account__user=self.request.user)


# ─── TRANSACTIONS ────────────────────────────────────────────────
class TransactionViewSet(viewsets.ModelViewSet):
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'description', 'category__name']
    ordering_fields = ['date', 'amount', 'created_at']
    ordering = ['-date']

    def get_queryset(self):
        qs = Transaction.objects.filter(user=self.request.user).select_related(
            'category', 'workspace', 'account', 'payment_method'
        )
        # Filter by workspace
        workspace_id = self.request.query_params.get('workspace')
        if workspace_id:
            qs = qs.filter(workspace_id=workspace_id)

        # Filter by account
        account_id = self.request.query_params.get('account')
        if account_id:
            qs = qs.filter(account_id=account_id)

        # Filter by payment method
        pm_id = self.request.query_params.get('payment_method')
        if pm_id:
            qs = qs.filter(payment_method_id=pm_id)

        # Filter by type
        tx_type = self.request.query_params.get('type')
        if tx_type in ('expense', 'income'):
            qs = qs.filter(type=tx_type)

        # Filter by category
        category_id = self.request.query_params.get('category')
        if category_id:
            qs = qs.filter(category_id=category_id)

        # Date range
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)

        return qs

    def perform_create(self, serializer):
        serializer.save()


# ─── STATISTICS ──────────────────────────────────────────────────
class SummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Transaction.objects.filter(user=request.user)

        # Workspace filter
        workspace_id = request.query_params.get('workspace')
        if workspace_id:
            qs = qs.filter(workspace_id=workspace_id)

        # Date range (default: current month)
        today = date.today()
        date_from = request.query_params.get('date_from', today.replace(day=1).isoformat())
        date_to = request.query_params.get('date_to', today.isoformat())
        qs = qs.filter(date__gte=date_from, date__lte=date_to)

        expenses = qs.filter(type='expense').aggregate(total=Sum('amount'))['total'] or Decimal('0')
        income = qs.filter(type='income').aggregate(total=Sum('amount'))['total'] or Decimal('0')
        balance = income - expenses
        count = qs.count()

        return Response({
            'total_balance': balance,
            'total_expenses': expenses,
            'total_income': income,
            'transaction_count': count,
            'date_from': date_from,
            'date_to': date_to,
        })


class CategoryStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tx_type = request.query_params.get('type', 'expense')
        qs = Transaction.objects.filter(user=request.user, type=tx_type)

        workspace_id = request.query_params.get('workspace')
        if workspace_id:
            qs = qs.filter(workspace_id=workspace_id)

        today = date.today()
        date_from = request.query_params.get('date_from', today.replace(day=1).isoformat())
        date_to = request.query_params.get('date_to', today.isoformat())
        qs = qs.filter(date__gte=date_from, date__lte=date_to)

        total = qs.aggregate(total=Sum('amount'))['total'] or Decimal('0')

        by_cat = (
            qs.values('category__id', 'category__name')
            .annotate(amount=Sum('amount'), transaction_count=Count('id'))
            .order_by('-amount')
        )

        categories = []
        for item in by_cat:
            amt = item['amount'] or Decimal('0')
            categories.append({
                'category_id': item['category__id'],
                'category_name': item['category__name'] or 'Other',
                'amount': amt,
                'percentage': float(amt / total * 100) if total else 0,
                'transaction_count': item['transaction_count'],
            })

        return Response({
            'categories': categories,
            'total': total,
            'date_from': date_from,
            'date_to': date_to,
        })


class TimeseriesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tx_type = request.query_params.get('type', 'expense')
        qs = Transaction.objects.filter(user=request.user, type=tx_type)

        workspace_id = request.query_params.get('workspace')
        if workspace_id:
            qs = qs.filter(workspace_id=workspace_id)

        today = date.today()
        date_from = request.query_params.get('date_from', (today - timedelta(days=30)).isoformat())
        date_to = request.query_params.get('date_to', today.isoformat())
        qs = qs.filter(date__gte=date_from, date__lte=date_to)

        series = (
            qs.annotate(day=TruncDate('date'))
            .values('day')
            .annotate(amount=Sum('amount'))
            .order_by('day')
        )

        return Response([
            {'date': item['day'].isoformat(), 'amount': item['amount']}
            for item in series
        ])
