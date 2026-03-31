# CampusTutor — Setup Guide (Sprint 1)

> **Last updated:** March 2026  
> **Tech stack:** Flask (Python 3) + Vite (React 18) + SQLite  
> **Team size:** 4 members (3 Windows, 1 Mac)

---

## Table of Contents

1. [Overview](#1-overview)
2. [What You Need Installed](#2-what-you-need-installed)
3. [Windows Setup (Step-by-Step)](#3-windows-setup)
4. [Mac Setup (Step-by-Step)](#4-mac-setup)
5. [Running the Project](#5-running-the-project)
6. [Seeding the Database](#6-seeding-the-database)
7. [Test Accounts](#7-test-accounts)
8. [OTP Verification (How It Works)](#8-otp-verification)
9. [Troubleshooting](#9-troubleshooting)
10. [Project Structure](#10-project-structure)

---

## 1. Overview

CampusTutor is a **Peer-to-Peer Tutoring Scheduling & Management System** for Habib University. The application has two parts that run simultaneously:

| Part | Technology | Port | Purpose |
|------|-----------|------|---------|
| **Backend** | Python + Flask | `5001` | API server, database, authentication |
| **Frontend** | React + Vite | `3000` | User interface (what you see in the browser) |

You need **BOTH** running at the same time for the app to work.

> **Why port 5001?** macOS reserves port 5000 for AirPlay. We use 5001 to avoid conflicts.

---

## 2. What You Need Installed

Everyone on the team must have:

- **Python 3.11+** — the programming language for the backend
- **Node.js 18+** — the runtime for the frontend build tool
- **npm** — comes with Node.js (the package manager)
- **VS Code** — our code editor

### Verify Your Installations

Open **Command Prompt** (Windows) or **Terminal** (Mac) and type:

```bash
python --version
```
Expected: `Python 3.11.x` or higher

```bash
node --version
```
Expected: `v18.x.x` or higher

```bash
npm --version
```
Expected: `9.x.x` or higher

If any of these fail, follow the installation steps below.

---

## 3. Windows Setup
 Install Node.js

1. Go to https://nodejs.org/
2. Click the green **"LTS"** button
3. Run the `.msi` installer → click **Next** through all screens
4. Verify:
   ```
   node --version
   npm --version
   ```

---

## 4. Mac Setup
 Install Node.js

1. Go to https://nodejs.org/
2. Download the **macOS Installer** (.pkg)
3. Open and follow the installation steps

---

## 5. Running the Project

### 5.1 Get the Code

Get the project folder from your team lead (via Git clone or ZIP file). It should be a folder called `campustutor`.

### 5.2 Open in VS Code

1. Open **VS Code**
2. Go to **File → Open Folder...**
3. Select the `campustutor` folder

### 5.3 Set Up the Backend (First Time Only)

Open a **new terminal** in VS Code: **Terminal → New Terminal** (or press `` Ctrl + ` ``)

Run these commands **one at a time**:

**Windows:**
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

**Mac:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**What each command does:**

| Command | What It Does |
|---------|-------------|
| `python -m venv venv` | Creates a virtual environment (isolated Python space) |
| `venv\Scripts\activate` / `source venv/bin/activate` | Activates the virtual environment |
| `pip install -r requirements.txt` | Installs all Python packages |

### 5.4 Seed the Database

Run this once to create demo data:

```bash
python seed.py
```

Expected output:
```
  ✅  Database seeded successfully!
```

### 5.5 Start the Backend

```bash
python app.py
```

Expected output:
```
 * Running on http://127.0.0.1:5001
 * Debugger is active!
```

> ⚠️ **DO NOT close this terminal.** The backend must keep running.

### 5.6 Set Up and Start the Frontend

Open **ANOTHER new terminal** in VS Code (click the `+` icon in the terminal panel).

```bash
cd frontend
npm install
npm run dev
```

Expected output:
```
  VITE v5.4.x  ready in 300 ms
  ➜  Local:   http://localhost:3000/
```

> ⚠️ **DO NOT close this terminal either.** The frontend must keep running.

### 5.7 Open the App

Open your browser and go to: **http://localhost:3000**

You should see the CampusTutor landing page.

---

## 6. Seeding the Database

Run `python seed.py` from the backend folder (with venv activated). This creates:

- 1 admin account
- 3 tutor accounts
- 6 student accounts
- Availability slots for the next 6 working days
- 7 pre-booked sessions

You only need to run it once. To **reset** the database, run it again — it wipes everything and starts fresh.

---

## 7. Test Accounts

| Role | Email | Password |
|------|-------|----------|
| **Admin** | `admin@campustutor.local` | `Admin1234` |
| **Tutor 1** | `ali.hassan@st.habib.edu.pk` | `Tutor1234` |
| **Tutor 2** | `sara.khan@st.habib.edu.pk` | `Tutor1234` |
| **Tutor 3** | `hamza.qureshi@st.habib.edu.pk` | `Tutor1234` |
| **Student 1** | `fatima.malik@st.habib.edu.pk` | `Student1234` |
| **Student 2** | `usman.ahmed@st.habib.edu.pk` | `Student1234` |
| **Student 3** | `zainab.raza@st.habib.edu.pk` | `Student1234` |
| **Student 4** | `omar.farooq@st.habib.edu.pk` | `Student1234` |
| **Student 5** | `ayesha.siddiqui@st.habib.edu.pk` | `Student1234` |
| **Student 6** | `bilal.sheikh@st.habib.edu.pk` | `Student1234` |

All seed accounts are **already verified** — you can log in immediately without an OTP.

---

## 8. OTP Verification

When a **new user registers**, the system sends a 4-digit OTP code to their Outlook email to verify they own the account.

### How the OTP flow works:

1. User clicks **"Sign Up"** and fills in their `@st.habib.edu.pk` email
2. A 4-digit code is sent to their **Outlook inbox** (check Spam/Junk too)
3. User enters the code on the verification page
4. Account is verified — they can now log in

### Forgot Password flow:

1. User clicks **"Forgot password?"** on the login page
2. Enters their email → a reset code is sent to their Outlook
3. User enters the 4-digit code + sets a new password
4. Redirected to login with the new password

### Email Setup (Gmail SMTP)

OTP emails are sent via Gmail SMTP. The `.env` file in the backend contains the credentials. If emails aren't being sent, make sure `.env` has valid Gmail App Password credentials. Ask the team lead for these.

---

## 9. Troubleshooting

### "python is not recognized" (Windows)
- Python was not added to PATH during installation
- Reinstall Python and **check the "Add to PATH" box**
- Or try: `py --version` instead of `python --version`

### "npm is not recognized" (Windows)
- Node.js was not installed correctly
- Reinstall from https://nodejs.org/

### "ModuleNotFoundError: No module named 'flask'"
- You forgot to activate the virtual environment
- Run: `venv\Scripts\activate` (Windows) or `source venv/bin/activate` (Mac)
- Then: `pip install -r requirements.txt`

### "EADDRINUSE: address already in use" (port 3000 or 5001)
- Another program is using that port
- **Windows:** `netstat -ano | findstr :5001` then `taskkill /PID <number> /F`
- **Mac:** `lsof -i :5001` then `kill -9 <PID>`

### Frontend loads but dashboards show errors
- The backend (Flask) is not running
- Make sure the backend terminal shows `Running on http://127.0.0.1:5001`
- Both terminals must be running at the same time

### Login fails with "Invalid email or password"
- Make sure you ran `python seed.py` to create the test accounts
- Check the password from the test accounts table above

### OTP not received in Outlook
- Check the **Spam/Junk** folder
- The code expires in 5 minutes — try clicking "Resend Code"
- Make sure the `.env` file has valid Gmail SMTP credentials

### CORS errors in browser console
- Make sure the Flask backend is running
- Don't open HTML files directly — always go to `http://localhost:3000`

---

## 10. Project Structure

```
campustutor/
├── SETUP.md                        ← This file
│
├── backend/
│   ├── app.py                     # Flask app factory (starts the server)
│   ├── models.py                  # Database models (User, Slot, Session)
│   ├── seed.py                    # Database seeder (demo data)
│   ├── requirements.txt           # Python packages
│   ├── env.example                # Environment variables template
│   ├── .env                       # Actual env vars (Gmail SMTP, JWT secret)
│   │
│   ├── routes/
│   │   ├── __init__.py            # Blueprint registration
│   │   ├── auth.py                # Login, Register, OTP, Password Reset
│   │   ├── tutors.py              # Browse tutors, Availability, Profile
│   │   ├── sessions.py            # Book, Cancel, View sessions
│   │   └── admin.py               # Admin stats, User management
│   │
│   └── instance/
│       └── campustutor.db         # SQLite database (created by seed.py)
│
└── frontend/
    ├── index.html                 # HTML entry point
    ├── package.json               # JavaScript packages
    ├── vite.config.js             # Vite config (proxy to backend)
    │
    └── src/
        ├── main.jsx               # React root mount
        ├── App.jsx                # Router (URL → page mapping)
        ├── api.js                 # API helper (axios with JWT)
        ├── index.css              # All CSS styles
        │
        ├── context/
        │   └── AuthContext.jsx     # Auth state (login/logout/user)
        │
        └── pages/
            ├── Landing.jsx         # Home page
            ├── Login.jsx           # Login form
            ├── Signup.jsx          # Registration form
            ├── Verify.jsx          # OTP verification (4 digits)
            ├── ForgotPassword.jsx  # Enter email for reset
            ├── ResetPassword.jsx   # Enter code + new password
            ├── StudentDashboard.jsx # Student interface
            ├── TutorDashboard.jsx   # Tutor interface
            └── AdminDashboard.jsx   # Admin interface
```

---

## Quick Reference: Commands to Run

Every time you want to work on the project, open **two terminals**:

**Terminal 1 — Backend:**
```
cd backend
venv\Scripts\activate          ← Windows
source venv/bin/activate       ← Mac
python seed.py                  ← Only first time (or to reset DB)
python app.py                   ← Starts on port 5001
```

**Terminal 2 — Frontend:**
```
cd frontend
npm install                     ← Only first time
npm run dev                     ← Starts on port 3000
```

Then open: **http://localhost:3000**

---

*Built by Group 04 — CS/CE 353/374 L1 — Spring 2026*
