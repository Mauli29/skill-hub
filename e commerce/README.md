# SkillHub – Full-Stack Freelancer Marketplace

A Fiverr/Freelancer-style marketplace built with **FastAPI + MySQL + Vanilla JS**.

---

## Project Structure

```
e commerce/
├── backend/          ← FastAPI Python backend
│   ├── main.py
│   ├── seed.py
│   ├── requirements.txt
│   ├── .env.example
│   └── app/
│       ├── models.py       (SQLAlchemy DB models)
│       ├── schemas.py      (Pydantic request/response schemas)
│       ├── database.py     (MySQL connection)
│       ├── utils/auth.py   (JWT helpers)
│       └── routers/        (API route handlers)
│           ├── auth.py
│           ├── users.py
│           ├── services.py
│           ├── orders.py
│           ├── messages.py
│           ├── reviews.py
│           ├── payments.py
│           └── admin.py
└── frontend/         ← Pure HTML/CSS/JS frontend
    ├── index.html
    ├── login.html / register.html
    ├── services.html / service-detail.html
    ├── freelancer-dashboard.html
    ├── client-dashboard.html
    ├── admin.html
    ├── profile.html / messages.html
    ├── css/
    │   ├── style.css
    │   └── dashboard.css
    └── js/
        ├── api.js / auth.js / payment.js
        ├── home.js / services.js
        ├── freelancer-dashboard.js
        └── client-dashboard.js
```

---

## Prerequisites

- Python 3.10+
- MySQL 8.0+
- A modern browser (Chrome, Edge, Firefox)

---

## Backend Setup

### 1. Create a MySQL database

```sql
CREATE DATABASE skillhub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Configure environment variables

```bash
# In backend/ folder, copy the example file
copy .env.example .env
```

Edit `.env`:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=YOUR_MYSQL_PASSWORD
DB_NAME=skillhub

SECRET_KEY=replace_with_a_random_64_char_string
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXX
RAZORPAY_KEY_SECRET=XXXXXXXXXXXXXXXX

UPLOAD_DIR=static/uploads
MAX_UPLOAD_SIZE_MB=5
```

### 3. Install Python dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 4. Create tables and seed data

```bash
python seed.py
```

This creates all DB tables and inserts:
- 10 default service categories
- Admin user: `admin@skillhub.com` / `admin123`

### 5. Start the backend server

```bash
python main.py
```

Or:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

API will be available at: `http://localhost:8000`  
Swagger docs: `http://localhost:8000/docs`

---

## Frontend Setup

The frontend is **pure HTML/CSS/JS** — no build step required.

Open `frontend/index.html` in your browser.

> **Recommended**: Use VS Code's **Live Server** extension for hot-reload.  
> Right-click `index.html` → Open with Live Server

Or serve it with Python:
```bash
cd frontend
python -m http.server 5500
```
Then visit `http://localhost:5500`

---

## Pages

| Page | URL | Access |
|------|-----|--------|
| Homepage | `index.html` | Public |
| Browse Services | `services.html` | Public |
| Service Detail | `service-detail.html?id=1` | Public |
| Login | `login.html` | Public |
| Register | `register.html` | Public |
| Freelancer Dashboard | `freelancer-dashboard.html` | Freelancer |
| Client Dashboard | `client-dashboard.html` | Client |
| Profile | `profile.html?id=1` | Public |
| My Profile | `profile.html?self=1` | Logged in |
| Messages | `messages.html` | Logged in |
| Admin Panel | `admin.html` | Admin |

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/users/me` | My profile |
| PUT | `/api/users/me` | Update profile |
| POST | `/api/users/me/avatar` | Upload avatar |
| GET | `/api/services` | List/search services |
| POST | `/api/services` | Create service (freelancer) |
| PUT | `/api/services/{id}` | Update service |
| DELETE | `/api/services/{id}` | Delete service |
| POST | `/api/services/{id}/image` | Upload service image |
| GET | `/api/services/my/listings` | My services |
| POST | `/api/orders` | Place order |
| GET | `/api/orders/my` | My orders |
| PUT | `/api/orders/{id}/status` | Update order status |
| GET | `/api/orders/stats/freelancer` | Freelancer stats |
| GET | `/api/orders/stats/client` | Client stats |
| POST | `/api/payments/create-order` | Create Razorpay order |
| POST | `/api/payments/verify` | Verify payment |
| GET | `/api/messages/inbox` | Message inbox |
| GET | `/api/messages/conversation/{id}` | Get conversation |
| POST | `/api/messages` | Send message |
| GET | `/api/reviews/service/{id}` | Service reviews |
| POST | `/api/reviews` | Create review |
| GET | `/api/admin/stats` | Platform stats (admin) |
| GET | `/api/admin/users` | All users (admin) |
| PUT | `/api/admin/users/{id}/toggle` | Ban/unban user (admin) |
| GET | `/api/admin/services` | All services (admin) |
| DELETE | `/api/admin/services/{id}` | Delete service (admin) |
| POST | `/api/admin/seed-categories` | Seed categories (admin) |

---

## Razorpay Integration

1. Sign up at [razorpay.com](https://razorpay.com)
2. Go to Settings → API Keys → Generate Test Key
3. Add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` to `.env`

Payment flow:
1. Client clicks "Hire Now" → Order created in DB
2. Backend creates Razorpay order → returns `razorpay_order_id`
3. Frontend opens Razorpay checkout popup
4. On success, frontend calls `/api/payments/verify`
5. Backend verifies HMAC signature → marks order as `active`

---

## Default Admin Credentials

After running `seed.py`:

```
Email:    admin@skillhub.com
Password: admin123
```

**Change this password in production!**

---

## Troubleshooting

**CORS error in browser:**
- Make sure backend is running on `http://localhost:8000`
- Backend has CORS `allow_origins=["*"]` (already set)

**Cannot connect to MySQL:**
- Check credentials in `.env`
- Make sure MySQL service is running

**Images not showing:**
- Make sure `static/uploads` folder exists inside `backend/`
- Check the backend server is running (images are served from it)

**Razorpay test mode:**
- Use test card: `4111 1111 1111 1111`, any future expiry, any CVV

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Backend | Python 3.11, FastAPI, SQLAlchemy |
| Database | MySQL 8.0 |
| Auth | JWT (python-jose) + bcrypt |
| Payments | Razorpay |
| Frontend | HTML5, CSS3, Vanilla JS (ES Modules) |
| Image Storage | Local disk (static/uploads) |
