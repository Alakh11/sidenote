# ⚡ SideNote Backend

<div align="center">

  <a href="https://github.com/Alakh11/sidenote">
    <img src="https://readme-typing-svg.herokuapp.com?font=Fira+Code&pause=1000&color=10B981&center=true&vCenter=true&width=435&lines=FastAPI+%2B+Python+3.10;Modular+Router+Architecture;JWT+Authentication;MySQL+Database+Integration" alt="Typing SVG" />
  </a>

  <br />

  <img src="https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi" />
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white" />
  <img src="https://img.shields.io/badge/Pydantic-E92063?style=for-the-badge&logo=pydantic&logoColor=white" />

  <br />
  <br />

  <p>
    The backend of <strong>SideNote</strong> is a high-performance, asynchronous REST API built with <strong>FastAPI</strong>. It handles complex financial logic, secure authentication, and real-time data aggregation.
  </p>
  
  <h3>
    <a href="https://sidenote-7o2d.onrender.com/docs">📚 Swagger UI Docs</a>
    <span> | </span>
    <a href="https://sidenote-7o2d.onrender.com/redoc">📘 ReDoc</a>
  </h3>
</div>

---

## 🚀 Key Features

### 🔒 Security & Auth
* **JWT Authentication:** Secure stateless authentication using `python-jose`.
* **Password Hashing:** Industry-standard `bcrypt` hashing via `passlib`.
* **Role-Based Access:** Dedicated Admin middleware (`require_admin`) for user management.
* **CORS Middleware:** Configured for secure cross-origin requests from the frontend.

### 💾 Data Management
* **Modular Architecture:** Logic split into specialized routers (`auth`, `transactions`, `features`, `admin`).
* **Complex Aggregation:** Raw SQL queries optimized for analytics (Category-wise spending, Monthly trends).
* **Database Resilience:** robust connection handling with `mysql-connector-python`.

### ⚡ API Capabilities
* **Transaction Management:** CRUD operations for Income/Expenses with filtering.
* **Financial Features:** Logic for Loans (EMI Calc), Savings Goals, and Debts.
* **Analytics Engine:** Endpoints for Pie Charts, Bar Graphs, and Spending Predictions.
* **Admin Controls:** Endpoints to view system stats and manage user data.

---

## 🛠 Tech Stack

| Component | Library | Purpose |
| :--- | :--- | :--- |
| **Framework** | **FastAPI** | High-performance async web framework. |
| **Server** | **Uvicorn** | ASGI server for production deployment. |
| **Database** | **MySQL Connector** | Connecting to TiDB/MySQL databases. |
| **Validation** | **Pydantic** | Data validation and settings management. |
| **Auth** | **Python-Jose** | Generating and verifying JWT tokens. |
| **Hashing** | **Passlib** | Secure password hashing (Bcrypt). |
| **Env Vars** | **Python-Dotenv** | Managing environment variables. |

---

## 📂 Folder Structure

The backend follows a **Modular Router** pattern to keep code clean and scalable.

```text
server/
├── 📁 routers/          # API Route Definitions
│   ├── 🛡️ admin.py        # Admin-only endpoints
│   ├── 📊 analytics.py    # Dashboard & Charts logic
│   ├── 🔐 auth.py         # Login, Register, Profile
│   ├── 🧩 features.py     # Goals, Loans, Debts
│   └── 💳 transactions.py # Core Transaction CRUD
├── 📄 database.py         # DB Connection Logic
├── ⚡ main.py             # Entry Point & App Config
├── 📝 schemas.py          # Pydantic Models (Request/Response)
├── 🔒 security.py         # JWT & Hashing Utils
├── 🛠️ utils.py            # Helper Functions (Interest Calc, etc.)
└── 📦 requirements.txt    # Dependency List

```

---

## ⚙️ Installation & Setup

### 1. Create Virtual Environment

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Mac/Linux
python3 -m venv venv
source venv/bin/activate

```

### 2. Install Dependencies

```bash
pip install -r requirements.txt

```

### 3. Configure Environment Variables

Create a `.env` file in the `server/` root directory:

```env
# Database Credentials
DB_HOST=your_db_host
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=finance_tracker
DB_PORT=4000

# Security (Generate a random string)
SECRET_KEY=your_super_secret_key_here
ALGORITHM=HS256

```

### 4. Run the Server

```bash
python main.py

```

> The API will be live at `http://localhost:10000`.

---

## 📖 API Documentation

FastAPI automatically generates interactive API documentation. Once the server is running, visit:

* **Swagger UI:** `http://localhost:10000/docs` - Test endpoints directly in the browser.
* **ReDoc:** `http://localhost:10000/redoc` - Alternative documentation view.

---

## 🛣️ Main Endpoints Overview

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/auth/register` | Register a new user (Auto-creates default categories). |
| `POST` | `/auth/login` | Login and receive Access Token. |
| `GET` | `/dashboard/{email}` | Get summarized stats for the dashboard widgets. |
| `GET` | `/transactions/all/{email}` | Fetch transactions with filters (Date, Amount, Category). |
| `POST` | `/goals` | Create a new savings goal. |
| `POST` | `/loans` | Add a loan entry (Auto-calculates EMI). |
| `GET` | `/admin/users` | (Admin Only) View all registered users. |

---

## 🚀 Deployment

The app is configured to run easily on platforms like **Render** or **Railway**.

**Start Command:**

```bash
uvicorn main:app --host 0.0.0.0 --port 10000

```
