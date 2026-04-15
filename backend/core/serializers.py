# core/serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Workspace, WorkspaceMember, Category, FinancialAccount, PaymentMethod, Transaction

User = get_user_model()


# ─── AUTH ────────────────────────────────────────────────────────
class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    name = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ('id', 'email', 'password', 'name', 'phone_number')
        extra_kwargs = {'phone_number': {'required': False}}

    def create(self, validated_data):
        name = validated_data.pop('name', '')
        password = validated_data.pop('password')
        parts = name.strip().split(' ', 1)
        first = parts[0] if parts else ''
        last = parts[1] if len(parts) > 1 else ''
        user = User(
            email=validated_data['email'],
            username=validated_data['email'],
            first_name=first,
            last_name=last,
            phone_number=validated_data.get('phone_number', ''),
        )
        user.set_password(password)
        user.save()
        # Auto-create a personal workspace
        ws = Workspace.objects.create(
            name=f"{first or 'My'}'s workspace",
            owner=user,
            description='Personal workspace'
        )
        WorkspaceMember.objects.create(workspace=ws, user=user, role='owner')
        return user


class UserSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    has_setup_completed = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'email', 'first_name', 'last_name', 'name', 'phone_number', 'avatar_initials', 'has_setup_completed')
        read_only_fields = ('id', 'email', 'name', 'avatar_initials')

    def get_name(self, obj):
        return obj.name

    def get_has_setup_completed(self, obj):
        # A user has completed setup if they have at least one financial account
        return obj.financial_accounts.exists()

    def update(self, instance, validated_data):
        instance.first_name = validated_data.get('first_name', instance.first_name)
        instance.last_name = validated_data.get('last_name', instance.last_name)
        instance.phone_number = validated_data.get('phone_number', instance.phone_number)
        instance.save()
        return instance


# ─── WORKSPACE ───────────────────────────────────────────────────
class WorkspaceMemberSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.SerializerMethodField()
    avatar_initials = serializers.CharField(source='user.avatar_initials', read_only=True)

    class Meta:
        model = WorkspaceMember
        fields = ('id', 'user', 'user_email', 'user_name', 'avatar_initials', 'role', 'joined_at')
        read_only_fields = ('id', 'user_email', 'user_name', 'avatar_initials', 'joined_at')

    def get_user_name(self, obj):
        return obj.user.name


class WorkspaceSerializer(serializers.ModelSerializer):
    member_count = serializers.SerializerMethodField()
    owner_name = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()

    class Meta:
        model = Workspace
        fields = ('id', 'name', 'description', 'owner', 'owner_name', 'member_count', 'role', 'created_at')
        read_only_fields = ('id', 'owner', 'owner_name', 'member_count', 'role', 'created_at')

    def get_member_count(self, obj):
        return obj.workspacemember_set.count()

    def get_owner_name(self, obj):
        return obj.owner.name

    def get_role(self, obj):
        request = self.context.get('request')
        if not request:
            return 'member'
        membership = obj.workspacemember_set.filter(user=request.user).first()
        return membership.role if membership else 'viewer'

    def create(self, validated_data):
        request = self.context['request']
        workspace = Workspace.objects.create(owner=request.user, **validated_data)
        WorkspaceMember.objects.create(workspace=workspace, user=request.user, role='owner')
        return workspace


# ─── CATEGORY ────────────────────────────────────────────────────
class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ('id', 'name', 'icon', 'color', 'user')
        read_only_fields = ('id', 'user')

    def create(self, validated_data):
        return Category.objects.create(user=self.context['request'].user, **validated_data)


# ─── FINANCIAL ACCOUNT & PAYMENT METHOD ─────────────────────────
class PaymentMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentMethod
        fields = ('id', 'account', 'type', 'label', 'is_default')


class FinancialAccountSerializer(serializers.ModelSerializer):
    balance = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    payment_methods = PaymentMethodSerializer(many=True, read_only=True)

    class Meta:
        model = FinancialAccount
        fields = ('id', 'name', 'is_default', 'balance', 'payment_methods', 'created_at')
        read_only_fields = ('id', 'balance', 'payment_methods', 'created_at')

    def create(self, validated_data):
        request = self.context.get('request')
        return FinancialAccount.objects.create(user=request.user, **validated_data)


# ─── TRANSACTION ─────────────────────────────────────────────────
class TransactionSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True, default='Other')
    category_icon = serializers.CharField(source='category.icon', read_only=True, default='star')
    category_color = serializers.CharField(source='category.color', read_only=True, default='#4B5EFC')
    workspace_name = serializers.CharField(source='workspace.name', read_only=True, default='Personal')
    account_name = serializers.CharField(source='account.name', read_only=True, default='None')
    payment_method_label = serializers.SerializerMethodField()

    class Meta:
        model = Transaction
        fields = (
            'id', 'title', 'amount', 'type', 'date', 'description',
            'category', 'category_name', 'category_icon', 'category_color',
            'account', 'account_name',
            'payment_method', 'payment_method_label',
            'workspace', 'workspace_name',
            'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'category_name', 'category_icon', 'category_color', 'workspace_name', 'account_name', 'payment_method_label', 'created_at', 'updated_at')

    def validate(self, data):
        request = self.context.get('request')

        # 1. Workspace access validation
        if request:
            workspace = data.get('workspace')
            if workspace and not workspace.members.filter(pk=request.user.pk).exists():
                raise serializers.ValidationError({'workspace': 'You do not belong to this workspace.'})

        # 2. Strict expense balance validation
        tx_type = data.get('type')
        if not tx_type and self.instance:
            tx_type = self.instance.type

        if tx_type == 'expense':
            account = data.get('account')
            if not account and self.instance:
                account = self.instance.account
            
            amount = data.get('amount')
            if amount is not None and account:
                available = account.balance
                # In update case, credit back the existing expense amount to available funds
                if self.instance and self.instance.type == 'expense' and self.instance.account == account:
                    available += self.instance.amount
                
                if available < amount:
                    raise serializers.ValidationError({
                        "amount": f"Insufficient funds in {account.name}. Available: ₹{available:,.2f}"
                    })
        return data

    def get_payment_method_label(self, obj):
        return obj.payment_method_label

    def create(self, validated_data):
        request = self.context.get('request')
        return Transaction.objects.create(user=request.user, **validated_data)


# ─── STATISTICS ──────────────────────────────────────────────────
class SummarySerializer(serializers.Serializer):
    total_balance = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_expenses = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_income = serializers.DecimalField(max_digits=14, decimal_places=2)
    transaction_count = serializers.IntegerField()
    date_from = serializers.DateField()
    date_to = serializers.DateField()


class CategoryStatsSerializer(serializers.Serializer):
    category_name = serializers.CharField()
    category_id = serializers.IntegerField()
    amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    percentage = serializers.FloatField()
    transaction_count = serializers.IntegerField()


class TimeseriesSerializer(serializers.Serializer):
    date = serializers.DateField()
    amount = serializers.DecimalField(max_digits=14, decimal_places=2)
