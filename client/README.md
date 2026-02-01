# ⚛️ FinTrack Client

<div align="center">

  <a href="https://github.com/Alakh11/sidenote">
    <img src="https://readme-typing-svg.herokuapp.com?font=Fira+Code&pause=1000&color=6366f1&center=true&vCenter=true&width=435&lines=React+%2B+TypeScript+%2B+Vite;Beautiful+Soft+UI;Dark+Mode+Support;TanStack+Router" alt="Typing SVG" />
  </a>

  <br />

  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" />

  <br />
  <br />

  <p>
    The frontend of <strong>FinTrack</strong> is a high-performance Single Page Application (SPA) built for speed and aesthetics. It features a custom "Creamy Cake" <strong>Soft UI</strong>, fully integrated <strong>Dark Mode</strong>, and type-safe routing.
  </p>
</div>

---

## 📸 UI Previews

| **Dashboard (Light)** | **Dark Mode** |
|:---:|:---:|
| <img src="https://placehold.co/600x400/F3F4F6/333?text=Dashboard+UI" alt="Dashboard" width="100%"> | <img src="https://placehold.co/600x400/1e293b/FFF?text=Dark+Mode" alt="Dark Mode" width="100%"> |

---

## 🎨 Key Features

### 🖥️ User Interface
* **✨ Soft UI Aesthetic:** Custom Tailwind configuration using warm whites (`bg-stone-50`), deep blues (`indigo-600`), and soft, diffused shadows.
* **🌗 Theme Engine:** Seamless **Dark/Light Mode** switching with persistent state management.
* **📱 Fully Responsive:** Mobile-first architecture with a collapsible sidebar and touch-friendly navigation.

### 🧩 Core Modules
* **📊 Dashboard:** Real-time financial health overview, charts, and quick actions.
* **💳 Transactions:** Advanced data table with search, multi-filters (Date, Category, Mode), and inline editing.
* **🎯 Goals Tracker:** Visual progress bars for savings with "Add/Withdraw" history.
* **📉 Loan Manager:** EMI calculator, tenure tracking, and outstanding balance visualization.
* **🤝 Debt Tracker:** Manage money lent to friends/family with partial repayment tracking.
* **🛡️ Admin Panel:** Dedicated area for user management (View, Edit, Delete users).
* **⚙️ Settings:** Profile management, Emoji/URL avatar support, and password security.

---

## 🛠 Tech Stack

| Category | Technology | Description |
| :--- | :--- | :--- |
| **Build Tool** | **Vite** | Lightning-fast HMR and bundling. |
| **Routing** | **TanStack Router** | Next-gen type-safe routing and data loading. |
| **Styling** | **Tailwind CSS** | Utility-first styling with custom "Creamy" theme. |
| **Icons** | **Lucide React** | Consistent, crisp vector iconography. |
| **State/API** | **Axios & Hooks** | API communication with Interceptors for JWT auth. |
| **Visualization**| **Recharts** | Responsive charts for financial analytics. |
| **Utilities** | **Date-fns** | Modern date formatting and manipulation. |

---

## 📂 Folder Structure

```text
client/src/
├── 📁 assets/          # Static images (Logos, Placeholders)
├── 📁 components/      # Reusable UI Components
│   ├── 🛡️ Admin/       # Admin Panel Views
│   ├── 📊 Dashboard/   # Widgets & Stats
│   ├── 🎯 Goals/       # Goal Cards & History
│   ├── 🧩 Icons/       # Icon Helper (Emoji/Lucide Mapper)
│   ├── 💳 Transactions/# Transaction Tables & Filters
│   └── ...
├── 📁 context/         # Global State (ThemeContext, AuthContext)
├── 📁 routes/          # TanStack Router Definitions
│   ├── __root.tsx      # Root Layout (Sidebar Wrapper)
│   ├── index.tsx       # Auth/Landing Page
│   └── ...             # Protected Routes
├── 📄 types.ts         # TypeScript Interfaces
└── ⚡ main.tsx         # Entry Point

```

---

## ⚙️ Installation & Setup

### 1. Install Dependencies

```bash
npm install

```

### 2. Environment Setup (Optional)

If your backend is running on a port other than `10000`, create a `.env` file:

```env
VITE_API_URL=http://localhost:10000

```

### 3. Run Development Server

```bash
npm run dev

```

> The app will launch at `http://localhost:5173`.

### 4. Build for Production

```bash
npm run build

```

---

## 🖌️ Theme Customization

The design system is centralized in `tailwind.config.js`. To modify the palette:

```javascript
// tailwind.config.js
theme: {
  extend: {
    colors: {
      stone: {
        50: '#fafaf9', // Main Background (Light)
        900: '#1c1917', // Primary Text
      },
      slate: {
        950: '#020617', // Main Background (Dark)
      }
    }
  }
}

```
