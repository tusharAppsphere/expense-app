# core/models.py
from django.db import models
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    """Extended user with phone number and workspace support."""
    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=20, blank=True)
    avatar_initials = models.CharField(max_length=3, blank=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def save(self, *args, **kwargs):
        if not self.username:
            self.username = self.email
        if not self.avatar_initials:
            parts = (self.first_name or self.email).split()
            self.avatar_initials = ''.join(p[0].upper() for p in parts[:2])
        super().save(*args, **kwargs)

    def __str__(self):
        return self.email

    @property
    def name(self):
        full = f"{self.first_name} {self.last_name}".strip()
        return full or self.email


class Workspace(models.Model):
    """Multitenancy unit. Each user can belong to many workspaces."""
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    owner = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='owned_workspaces'
    )
    members = models.ManyToManyField(
        User, through='WorkspaceMember', related_name='workspaces', blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} (owner: {self.owner.email})"


class WorkspaceMember(models.Model):
    """Through model for workspace membership with role."""
    ROLE_CHOICES = [
        ('owner', 'Owner'),
        ('admin', 'Admin'),
        ('member', 'Member'),
        ('viewer', 'Viewer'),
    ]
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='member')
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('workspace', 'user')

    def __str__(self):
        return f"{self.user.email} in {self.workspace.name} ({self.role})"


class Category(models.Model):
    """Expense categories — global if user is None, else per-user."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='categories')
    name = models.CharField(max_length=100)
    icon = models.CharField(max_length=50, default='star')
    color = models.CharField(max_length=20, default='#4B5EFC')
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name_plural = 'categories'
        ordering = ['name']

    def __str__(self):
        return self.name


class FinancialAccount(models.Model):
    """Top-level bank entity (e.g. HDFC, Chase, Cash)."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='financial_accounts')
    name = models.CharField(max_length=100)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-is_default', 'name']

    def __str__(self):
        return f"{self.name} ({self.user.email})"

    @property
    def balance(self):
        from decimal import Decimal
        from django.db.models import Sum
        incomes = self.transactions.filter(type='income').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        expenses = self.transactions.filter(type='expense').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        return incomes - expenses


class PaymentMethod(models.Model):
    """Payment methods linked to an account (UPI, Debit Card, etc)."""
    TYPE_CHOICES = [
        ('upi', 'UPI'),
        ('cash', 'Cash'),
        ('debit_card', 'Debit Card'),
        ('credit_card', 'Credit Card'),
        ('bank_transfer', 'Bank Transfer'),
    ]
    account = models.ForeignKey(FinancialAccount, on_delete=models.CASCADE, related_name='payment_methods')
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='upi')
    label = models.CharField(max_length=100, blank=True)
    is_default = models.BooleanField(default=False)

    class Meta:
        ordering = ['-is_default', 'type']

    def __str__(self):
        return f"{self.label or self.type} in {self.account.name}"


class Transaction(models.Model):
    """Core model — every expense or income entry."""
    TYPE_CHOICES = [
        ('expense', 'Expense'),
        ('income', 'Income'),
    ]
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='transactions'
    )
    workspace = models.ForeignKey(
        Workspace, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='transactions'
    )
    title = models.CharField(max_length=200)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    type = models.CharField(max_length=10, choices=TYPE_CHOICES, default='expense')
    category = models.ForeignKey(
        Category, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='transactions'
    )
    # Linked to Account (for balance) and Payment Method (for identification)
    account = models.ForeignKey(
        FinancialAccount, on_delete=models.CASCADE, related_name='transactions',
        null=True  # Temporary for migration if needed, but we will wipe DB
    )
    payment_method = models.ForeignKey(
        PaymentMethod, on_delete=models.SET_NULL,
        null=True, blank=True
    )
    date = models.DateField()
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"{self.title} — {self.amount} ({self.date})"

    @property
    def category_name(self):
        return self.category.name if self.category else 'Other'

    @property
    def workspace_name(self):
        return self.workspace.name if self.workspace else 'Personal'

    @property
    def account_name(self):
        return self.account.name if self.account else 'None'

    @property
    def payment_method_label(self):
        if self.payment_method:
            return self.payment_method.label or self.payment_method.type
        return 'None'
