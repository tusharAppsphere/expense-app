# core/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Workspace, WorkspaceMember, Category, FinancialAccount, PaymentMethod, Transaction


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('email', 'first_name', 'last_name', 'is_staff', 'date_joined')
    search_fields = ('email', 'first_name', 'last_name')
    ordering = ('-date_joined',)
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Extra', {'fields': ('phone_number', 'avatar_initials')}),
    )


@admin.register(Workspace)
class WorkspaceAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner', 'created_at')
    search_fields = ('name', 'owner__email')


@admin.register(WorkspaceMember)
class WorkspaceMemberAdmin(admin.ModelAdmin):
    list_display = ('workspace', 'user', 'role', 'joined_at')
    list_filter = ('role',)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'icon', 'color', 'is_active')
    list_editable = ('is_active',)


@admin.register(FinancialAccount)
class FinancialAccountAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'balance', 'is_default', 'created_at')
    list_filter = ('is_default',)
    search_fields = ('name', 'user__email')


@admin.register(PaymentMethod)
class PaymentMethodAdmin(admin.ModelAdmin):
    list_display = ('account', 'type', 'label', 'is_default')
    list_filter = ('type',)
    search_fields = ('account__name', 'label')


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'amount', 'type', 'account', 'category', 'date', 'workspace')
    list_filter = ('type', 'account', 'category', 'date')
    search_fields = ('title', 'user__email', 'description')
    date_hierarchy = 'date'
    ordering = ('-date',)
