# core/management/commands/seed_data.py
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from core.models import Workspace, WorkspaceMember, Category, FinancialAccount, PaymentMethod, Transaction
from datetime import date, timedelta
import random

User = get_user_model()

# Category data with Ionicons strings as requested (emojis were showing as ?)
CATEGORIES = [
    {'name': 'Restaurant', 'icon': 'restaurant', 'color': '#FF6B6B'},
    {'name': 'Transportation', 'icon': 'car', 'color': '#4ECDC4'},
    {'name': 'Beauty & Medicine', 'icon': 'heart', 'color': '#FF8CC8'},
    {'name': 'Recreation & Entertainment', 'icon': 'happy', 'color': '#FFD166'},
    {'name': 'Food & Groceries', 'icon': 'nutrition', 'color': '#06D6A0'},
    {'name': 'Housing', 'icon': 'home', 'color': '#118AB2'},
    {'name': 'Insurance', 'icon': 'umbrella', 'color': '#7B68EE'},
    {'name': 'Utilities', 'icon': 'reader', 'color': '#F77F00'},
    {'name': 'IT equipment & software', 'icon': 'star', 'color': '#4B5EFC'},
    {'name': 'Office Supplies', 'icon': 'briefcase', 'color': '#9B5DE5'},
]

SAMPLE_TRANSACTIONS = [
    {'title': 'Laptops', 'amount': 65500.00, 'category': 'IT equipment & software'},
    {'title': 'Auto service', 'amount': 2500.00, 'category': 'Transportation'},
    {'title': 'Movie', 'amount': 1200.00, 'category': 'Recreation & Entertainment'},
    {'title': 'Urban Groceries', 'amount': 750.00, 'category': 'Food & Groceries'},
    {'title': 'New IT equipment', 'amount': 900.00, 'category': 'IT equipment & software'},
    {'title': 'Office supplies purchase', 'amount': 245.00, 'category': 'Office Supplies'},
    {'title': 'Restaurant lunch', 'amount': 850.00, 'category': 'Restaurant'},
    {'title': 'Monthly insurance', 'amount': 900.00, 'category': 'Insurance'},
    {'title': 'Electricity bill', 'amount': 1200.00, 'category': 'Utilities'},
    {'title': 'Gym membership', 'amount': 3000.00, 'category': 'Beauty & Medicine'},
    {'title': 'Uber ride', 'amount': 250.00, 'category': 'Transportation'},
]


class Command(BaseCommand):
    help = 'Seed the database with global categories (Ionicons) and demo user'

    def handle(self, *args, **options):
        # 1. Clear existing global categories
        Category.objects.filter(user=None).delete()

        # 2. Seed global categories
        self.stdout.write('Seeding global categories (with Ionicons names)...')
        cats = {}
        for cat_data in CATEGORIES:
            cat, created = Category.objects.get_or_create(
                name=cat_data['name'],
                user=None,
                defaults={'icon': cat_data['icon'], 'color': cat_data['color']}
            )
            cats[cat.name] = cat
            if created:
                self.stdout.write(f'  Created category: {cat.name} ({cat.icon})')

        # 3. Demo User
        user, created = User.objects.get_or_create(
            email='devon@example.com',
            defaults={
                'username': 'devon@example.com',
                'first_name': 'Devon',
                'last_name': 'Lane',
                'phone_number': '+91 9999999999',
            }
        )
        if created:
            user.set_password('password123')
            user.save()
            self.stdout.write('  Created user: devon@example.com / password123')
        
        # 4. Financial Accounts
        bank, _ = FinancialAccount.objects.get_or_create(
            user=user, name='HDFC Bank',
            defaults={'is_default': True}
        )
        upi, _ = PaymentMethod.objects.get_or_create(
            account=bank, type='upi', defaults={'label': 'My UPI', 'is_default': True}
        )

        ws1, _ = Workspace.objects.get_or_create(
            name="Personal Space", owner=user,
            defaults={'description': 'Main workspace'}
        )
        WorkspaceMember.objects.get_or_create(workspace=ws1, user=user, defaults={'role': 'owner'})

        # 5. Transactions
        Transaction.objects.get_or_create(
            user=user, title='Opening Balance', amount=150000.00,
            type='income', account=bank, payment_method=upi, date=date.today(),
            defaults={'category': None}
        )

        self.stdout.write(self.style.SUCCESS('✓ Seed complete with Ionicons strings!'))
