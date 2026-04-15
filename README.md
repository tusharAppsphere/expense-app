# 💰 Expense Manager — React Native + Django

A full-stack, **multitenant** expense tracking app.  
Frontend: **React Native (Expo)**  
Backend: **Django + Django REST Framework**

---

## 📁 Project Structure

```
ExpenseApp/
├── App.js                          ← Expo entry point
├── app.json                        ← Expo config
├── package.json
├── src/
│   ├── api/index.js                ← All API calls (axios)
│   ├── components/
│   │   ├── UI.js                   ← Shared components (Button, Input, BottomSheet, etc.)
│   │   └── BalanceCard.js          ← Blue gradient balance card
│   ├── constants/theme.js          ← Colors, fonts, sizes, shadows
│   ├── context/
│   │   ├── AuthContext.js          ← JWT auth state
│   │   └── WorkspaceContext.js     ← Active workspace state
│   ├── navigation/AppNavigator.js  ← Stack + Tab navigators
│   └── screens/
│       ├── OnboardingScreen.js     ← 3-slide carousel
│       ├── LoginScreen.js          ← Login + Register
│       ├── HomeScreen.js           ← Balance + recent transactions
│       ├── ExpenseScreen.js        ← Full expense list + search/filter
│       ├── AddExpenseScreen.js     ← Add/edit expense form
│       ├── StatisticsScreen.js     ← Donut chart + category list
│       ├── AccountScreen.js        ← Profile + workspaces + members
│       └── TransactionDetailScreen.js
└── backend/
    ├── manage.py
    ├── requirements.txt
    ├── expense_backend/
    │   ├── settings.py
    │   ├── urls.py
    │   └── wsgi.py
    └── core/
        ├── models.py               ← User, Workspace, Category, Transaction
        ├── serializers.py
        ├── views.py                ← All API views
        ├── urls.py                 ← All API routes
        ├── admin.py
        └── management/commands/
            └── seed_data.py        ← Demo data seeder
```

---

## 🚀 Backend Setup (Django)

### 1. Create virtual environment
```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
```

### 2. Install dependencies
```bash
pip install -r requirements.txt
```

### 3. Run migrations
```bash
python manage.py makemigrations
python manage.py migrate
```

### 4. Seed demo data
```bash
python manage.py seed_data
```
This creates:
- **Demo user**: `devon@example.com` / `password123`
- **2 workspaces**: Devon's workspace, Appsphere workspace
- **10 categories** (Restaurant, Transportation, etc.)
- **15 sample transactions**

### 5. Create superuser (for Django Admin)
```bash
python manage.py createsuperuser
```

### 6. Start the server
```bash
python manage.py runserver 0.0.0.0:8002
```

Django Admin: http://localhost:8002/admin  
API Base: http://localhost:8002/api/

---

## 📱 Frontend Setup (React Native / Expo)

### 1. Install dependencies
```bash
# From root ExpenseApp/ directory
npm install
```

### 2. Configure API URL

In `src/api/index.js`, set your Django server URL:

```js
// For iOS Simulator (Mac)
const BASE_URL = 'http://localhost:8002/api';

// For Android Emulator
const BASE_URL = 'http://10.0.2.2:8002/api';

// For physical device (replace with your machine's IP)
const BASE_URL = 'http://192.168.1.XXX:8002/api';
```

### 3. Start Expo
```bash
npx expo start
```

- Press `i` for iOS Simulator
- Press `a` for Android Emulator
- Scan QR code with Expo Go app on your phone

---

## 🌐 API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register/` | Register (returns JWT) |
| POST | `/api/auth/login/` | Login (returns JWT) |
| POST | `/api/auth/logout/` | Logout |
| POST | `/api/auth/token/refresh/` | Refresh JWT |

### User
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/user/profile/` | Get profile |
| PUT | `/api/user/profile/` | Update profile |

### Workspaces (Multitenancy)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/workspaces/` | List user's workspaces |
| POST | `/api/workspaces/` | Create workspace |
| GET | `/api/workspaces/:id/` | Get workspace |
| PUT | `/api/workspaces/:id/` | Update workspace |
| DELETE | `/api/workspaces/:id/` | Delete workspace |
| GET | `/api/workspaces/:id/members/` | List members |
| POST | `/api/workspaces/:id/members/invite/` | Invite member |
| DELETE | `/api/workspaces/:id/members/:userId/` | Remove member |

### Transactions
| Method | Endpoint | Params |
|--------|----------|--------|
| GET | `/api/transactions/` | `workspace`, `type`, `category`, `date_from`, `date_to`, `search` |
| POST | `/api/transactions/` | Create |
| GET | `/api/transactions/:id/` | Detail |
| PUT | `/api/transactions/:id/` | Update |
| DELETE | `/api/transactions/:id/` | Delete |

### Statistics
| Method | Endpoint | Params |
|--------|----------|--------|
| GET | `/api/statistics/summary/` | `workspace`, `date_from`, `date_to` |
| GET | `/api/statistics/by-category/` | `workspace`, `date_from`, `date_to` |
| GET | `/api/statistics/timeseries/` | `workspace`, `date_from`, `date_to` |

### Other
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/categories/` | All categories |
| GET | `/api/payment-methods/` | User's payment methods |

---

## 🏢 Multitenancy Model

- Every user can **own** or **join** multiple workspaces
- Transactions are **scoped to a workspace** (optional — can be personal)
- Each workspace has **members with roles**: `owner`, `admin`, `member`, `viewer`
- All API queries are automatically **filtered by `request.user`** — no cross-user data leakage
- Statistics endpoints accept a `?workspace=<id>` param to scope data

---

## 🎨 Design Reference

| Screen | File |
|--------|------|
| Onboarding (3 slides) | `OnboardingScreen.js` |
| Login / Register | `LoginScreen.js` |
| Home (balance + expenses) | `HomeScreen.js` |
| Expense list + search | `ExpenseScreen.js` |
| Add / Edit expense | `AddExpenseScreen.js` |
| Statistics (donut + list) | `StatisticsScreen.js` |
| Account + workspaces | `AccountScreen.js` |
| Transaction detail | `TransactionDetailScreen.js` |

**Color palette:**
- Primary blue: `#4B5EFC`
- Yellow accent: `#F5E642`
- Background: `#EEF1F8`
- Category icon bg: `#E8EAFE`

---

## 🔧 Production Checklist

- [ ] Change `SECRET_KEY` in `settings.py` to a random 50+ char string
- [ ] Set `DEBUG = False`
- [ ] Set `ALLOWED_HOSTS` to your domain
- [ ] Replace SQLite with PostgreSQL
- [ ] Set `CORS_ALLOW_ALL_ORIGINS = False` and configure `CORS_ALLOWED_ORIGINS`
- [ ] Use environment variables for secrets (python-dotenv)
- [ ] Serve with `gunicorn` behind nginx
- [ ] Set up HTTPS
