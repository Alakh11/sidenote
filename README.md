# 💰 FinTrack

<div align="center">

  <a href="https://github.com/Alakh11/sidenote">
    <img src="https://readme-typing-svg.herokuapp.com?font=Fira+Code&pause=1000&color=3B82F6&center=true&vCenter=true&width=435&lines=Track+Income+%26+Expenses;Manage+Loans+%26+Debts;Visualize+Savings+Goals;Master+Your+Money" alt="Typing SVG" />
  </a>

  <p align="center">
    <strong>The Ultimate Personal Finance Manager built for the modern web.</strong>
    <br />
    Manage income, expenses, loans, debts, and savings goals with a beautiful UI.
  </p>

  <p align="center">
    <a href="https://alakh11.github.io/sidenote/">
      <img src="https://img.shields.io/badge/🔗_Live_Demo-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Live Demo" />
    </a>
    <a href="https://sidenote-q60v.onrender.com">
      <img src="https://img.shields.io/badge/🔌_API_Status-000000?style=for-the-badge&logo=render&logoColor=white" alt="API Status" />
    </a>
  </p>

  ![Version](https://img.shields.io/badge/version-2.0.0-blue.svg?cacheSeconds=2592000&style=flat-square)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
  ![Python](https://img.shields.io/badge/python-3.10+-blue.svg?style=flat-square)
  ![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6.svg?style=flat-square)
  ![Status](https://img.shields.io/badge/Maintained-Yes-green.svg)

</div>

---

## 📖 Overview

**FinTrack** is a robust, full-stack financial management application designed to give users complete control over their money. Unlike simple expense trackers, FinTrack offers advanced modules for **EMI Loan Tracking**, **Debt/Lending Management**, and **Visual Savings Goals**.

It features a modular **Python FastAPI** backend for high performance and a reactive **React + TanStack Router** frontend for a seamless, app-like experience.

---

## ✨ Key Features

### 🧩 Core Essentials
* **🔐 Secure Authentication:** Robust JWT-based auth with Google OAuth integration.
* **📊 Interactive Dashboard:** Real-time overview of Net Worth, recent activity, and financial health.
* **💸 Smart Transactions:** Add income/expenses with Payment Modes (UPI, Card, Cash) and custom notes.
* **🎨 Thematic UI:** Fully responsive design with persistent **Dark/Light Mode**.

### 🚀 Advanced Modules
* **🎯 Savings Goals:** Visual progress bars for dream purchases with "Add/Withdraw" transaction history.
* **📉 Loan Tracker:** Track EMI schedules, interest rates, tenure progress, and outstanding balances.
* **🤝 Debt Manager (Lending):** Keep track of money lent to friends/family with partial repayment history.
* **🛒 Budget Planner:** Set category-wise monthly limits with visual "Over Budget" alerts.
* **🔁 Recurring Bills:** Set it and forget it—manage subscriptions and regular payments automatically.

### ⚙️ Management & Settings
* **🛡️ Admin Panel:** "God Mode" for user management (View/Edit/Delete users, reset passwords, view system stats).
* **👤 Profile Settings:** Update avatars (supports Emojis & Google Photos), change passwords, and manage account details.
* **🏷️ Category Manager:** Create custom categories with a library of icons and colors.

---

## 🛠 Tech Stack

| **Frontend** | **Backend** | **Infrastructure** |
| :--- | :--- | :--- |
| ![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB) **React (Vite)** | ![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=flat&logo=fastapi) **FastAPI** | ![Render](https://img.shields.io/badge/Render-46E3B7?style=flat&logo=render&logoColor=white) **Render** |
| ![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white) **TypeScript** | ![Python](https://img.shields.io/badge/Python-3776AB?style=flat&logo=python&logoColor=white) **Python 3.10+** | ![MySQL](https://img.shields.io/badge/MySQL-00000F?style=flat&logo=mysql&logoColor=white) **MySQL (TiDB)** |
| ![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white) **Tailwind CSS** | ![Pydantic](https://img.shields.io/badge/Pydantic-E92063?style=flat&logo=pydantic&logoColor=white) **Pydantic** | ![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-222222?style=flat&logo=github&logoColor=white) **GH Pages** |
| 🛣️ **TanStack Router** | 🔐 **OAuth2 & JWT** | |
| 📉 **Recharts** | 🗄️ **MySQL Connector** | |

---

## 📂 Project Structure

The project uses a clean, modular architecture separating concerns for scalability.

```text
/sidenote
├── /client                 # React Frontend
│   ├── /src
│   │   ├── /components     # UI Components (Transations, Goals, Layout, etc.)
│   │   ├── /context        # Global State (Theme, Auth)
│   │   ├── /routes         # TanStack Router Definitions
│   │   ├── /assets         # Static Assets
│   │   └── main.tsx        # Entry Point
│   └── vite.config.ts
│
└── /server                 # FastAPI Backend
    ├── /routers            # Modular API Endpoints
    │   ├── admin.py        # Admin Control Panel Logic
    │   ├── analytics.py    # Data Aggregation & Charting
    │   ├── auth.py         # Login, Register, Profile Updates
    │   ├── features.py     # Logic for Loans, Goals, Debts
    │   └── transactions.py # Core Transaction & Budget Logic
    ├── database.py         # Database Connection Factory
    ├── main.py             # App Entry & Database Initialization
    ├── schemas.py          # Pydantic Data Models (Request/Response)
    ├── security.py         # JWT Token Generation & Hashing
    └── utils.py            # Helper Functions
```

## 🚀 Getting Started

Follow these steps to set up the project locally.

### 📋 Prerequisites

Before you begin, ensure you have the following installed:
* **Node.js** (v18+)
* **Python** (v3.10+)
* **Git**
* **MySQL Database** (Local or Cloud like PlanetScale/TiDB)

### 1. Clone the Repository

```bash
git clone [https://github.com/Alakh11/sidenote.git](https://github.com/Alakh11/sidenote.git)
cd sidenote
```

🤝 Contributing
Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are greatly appreciated.

Fork the Project

Create your Feature Branch 
```bash
git checkout -b feature/AmazingFeature
```

Commit your Changes 
```bash
git commit -m 'Add some AmazingFeature'
```

Push to the Branch 
```bash
git push origin feature/AmazingFeature
```

Open a Pull Request

📄 License
Distributed under the MIT License. See LICENSE for more information.

<div align="center"> <p>Made with ❤️ by <strong>Alakh Chaturvedi</strong></p>


<a href="https://github.com/Alakh11"> <img src="https://img.shields.io/github/followers/Alakh11" alt="GitHub" /> </a> </div>
