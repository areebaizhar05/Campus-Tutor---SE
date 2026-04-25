# CampusTutor — Complete Setup Guide

> **Last updated:** April 2026  
> **Tech stack:** Flask (Python 3) + Vite (React 18) + SQLite  
> **Course:** CS/CE 353/374 L1 — Spring 2026

---

## Table of Contents

1. [Overview](#1-overview)
2. [What You Need Installed](#2-what-you-need-installed)
3. [Windows Setup](#3-windows-setup)
4. [Mac Setup](#4-mac-setup)
5. [Running the Project](#5-running-the-project)
6. [Seeding the Database](#6-seeding-the-database)
7. [Test Accounts](#7-test-accounts)
8. [OTP Verification (How It Works)](#8-otp-verification)
9. [Project Structure](#9-project-structure)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Overview

CampusTutor is a **Peer-to-Peer Tutoring Scheduling & Management System** for Habib University. The application has two parts that run simultaneously:

| Part | Technology | Port | Purpose |
|------|-----------|------|---------|
| **Backend** | Python + Flask | `5001` | API server, database, authentication, background scheduler |
| **Frontend** | React + Vite | `3000` | User interface (what you see in the browser) |

You need **BOTH** running at the same time for the app to work.

---

## 2. What You Need Installed

### All Team Members Need:
- **Python 3.11+** (the programming language for the backend)
- **Node.js 18+** (the runtime for the frontend build tool)
- **npm** (comes with Node.js — the package manager)
- **Git** (for version control)
- **A code editor** — We recommend **Visual Studio Code (VS Code)** (free): https://code.visualstudio.com/download

### Verify Your Installations

Open **Command Prompt** (Windows) or **Terminal** (Mac) and type:

```bash
python --version
```
Expected output: `Python 3.11.x` or higher

```bash
node --version
```
Expected output: `v18.x.x` or higher

```bash
npm --version
```
Expected output: `9.x.x` or higher

---

## 3. Windows Setup

### Step 3.1: Install Python 3

1. Go to: https://www.python.org/downloads/
2. Click the yellow **"Download Python 3.12.x"** button
3. **CRITICAL:** When the installer opens, check the box: ☑ **"Add python.exe to PATH"**
4. Click **"Install Now"**
5. Open a **new** Command Prompt and verify: `python --version`

### Step 3.2: Install Node.js

1. Go to: https://nodejs.org/
2. Click the green **"LTS"** button
3. Run the `.msi` installer, click Next through all screens
4. Open a **new** Command Prompt and verify: `node --version`

### Step 3.3: Install VS Code (Recommended)

1. Go to: https://code.visualstudio.com/download
2. Download the **Windows** version
3. Run the installer

---

## 4. Mac Setup

### Step 4.1: Install Python 3

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install python3
```

Or download from https://www.python.org/downloads/macos/

> **Note on Mac:** You may need to type `python3` instead of `python`.

### Step 4.2: Install Node.js

Download from https://nodejs.org/ (macOS Installer `.pkg`)

---

## 5. Running the Project

### Step 5.1: Get the Project Code

You should have a folder called `campustutor/` containing both `backend/` and `frontend/`.

### Step 5.2: Open the Project in VS Code

1. Open VS Code
2. Go to **File → Open Folder...**
3. Select the `campustutor` folder

### Step 5.3: Set Up the Backend (Terminal 1)

Open a **new terminal** inside VS Code (`Ctrl + ~`).

**Windows:**
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python seed.py
python app.py
```

**Mac:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python3 seed.py
python3 app.py
```

**Expected output:**
```
 * Running on http://127.0.0.1:5001
```

> **DO NOT close this terminal.** The backend must keep running.

### Step 5.4: Set Up the Frontend (Terminal 2)

Open **ANOTHER new terminal** inside VS Code (click the `+` icon in the terminal panel).

```bash
cd frontend
npm install
npm run dev
```

**Expected output:**
```
  VITE v5.4.x  ready in 300 ms
  ➜  Local:   http://localhost:3000/
```

> **DO NOT close this terminal either.**

### Step 5.5: Open the App

1. Open your browser
2. Go to: **http://localhost:3000**
3. You should see the CampusTutor landing page

**You now have TWO terminals open:**
- Terminal 1: Backend (port 5001)
- Terminal 2: Frontend (port 3000)

---

## 6. Seeding the Database

The seed script creates demo data. Run it once after setup:

```bash
cd backend
python seed.py
```

You'll see:
```
  ✅  Database seeded successfully!
  Admin      admin@campustutor.local    Admin1234
  Tutor 1    ali.hassan@st.habib.edu.pk   Tutor1234
  ...
```

To reset: just run `python seed.py` again — it wipes everything and starts fresh.

---

## 7. Test Accounts

| Role | Email | Password | Phone |
|------|-------|----------|-------|
| **Admin** | `admin@campustutor.local` | `Admin1234` | +923001234567 |
| **Tutor 1** | `ali.hassan@st.habib.edu.pk` | `Tutor1234` | +923001234568 |
| **Tutor 2** | `sara.khan@st.habib.edu.pk` | `Tutor1234` | +923001234569 |
| **Tutor 3** | `hamza.qureshi@st.habib.edu.pk` | `Tutor1234` | +923001234570 |
| **Student 1** | `fatima.malik@st.habib.edu.pk` | `Student1234` | +923001234571 |
| **Student 2** | `usman.ahmed@st.habib.edu.pk` | `Student1234` | +923001234572 |
| **Student 3** | `zainab.raza@st.habib.edu.pk` | `Student1234` | +923001234573 |
| **Student 4** | `omar.farooq@st.habib.edu.pk` | `Student1234` | +923001234574 |
| **Student 5** | `ayesha.siddiqui@st.habib.edu.pk` | `Student1234` | +923001234575 |
| **Student 6** | `bilal.sheikh@st.habib.edu.pk` | `Student1234` | +923001234576 |

All seed accounts are **already verified** — you can log in immediately without OTP.

---

## 8. OTP Verification

When a **NEW user registers**, a 4-digit OTP code is sent to verify their email. Without Mailtrap setup, the OTP is **printed to the Flask terminal** (Terminal 1).

1. Click "Sign Up"
2. Fill in: Full Name, Email, Phone (+92 prefix + 10 digits), Password, Role
3. Click "Create Account"
4. **Look at Terminal 1** — you'll see:
   ```
   OTP for your.name@st.habib.edu.pk
   Code    : 4827
   Purpose : verify
   ```
5. Enter that code on the verification page

---

## 9. Project Structure

```
campustutor/
├── backend/                          # Python Flask backend
│   ├── app.py                         # Flask app (port 5001), scheduler
│   ├── models.py                      # User, AvailabilitySlot, TutoringSession
│   ├── seed.py                        # Database seeder (demo data)
│   ├── requirements.txt               # Python packages
│   ├── env.example                    # Environment variables template
│   ├── .env                           # Your actual env vars (create from env.example)
│   ├── routes/                        # API route handlers
│   │   ├── __init__.py                # Package marker
│   │   ├── auth.py                    # Register, Login, OTP, Password Reset
│   │   ├── tutors.py                  # Browse tutors, Availability, Profile
│   │   ├── sessions.py                # Book, Cancel, Reschedule, Calendar
│   │   └── admin.py                   # Stats, User management
│   └── campustutor.db                 # SQLite database (created by seed.py)
│
├── frontend/                         # React + Vite frontend
│   ├── index.html                     # HTML entry point
│   ├── main.jsx                       # React root mount
│   ├── App.jsx                        # Router (React Router)
│   ├── api.js                         # API helper (fetch + JWT)
│   ├── index.css                      # Global CSS styles
│   ├── AuthContext.jsx                # Auth state management
│   ├── vite.config.js                 # Vite config (proxy to Flask)
│   ├── package.json                    # JavaScript packages
│   └── src/
│       └── pages/                     # React page components
│           ├── Landing.jsx             # Home page
│           ├── Login.jsx               # Login form
│           ├── Signup.jsx              # Registration form (with phone)
│           ├── Verify.jsx              # OTP verification
│           ├── ForgotPassword.jsx       # Password reset flow
│           ├── StudentDashboard.jsx     # Student interface
│           ├── TutorDashboard.jsx      # Tutor interface
│           └── AdminDashboard.jsx      # Admin interface
│
└── SETUP.md                           # This file!
```

---

## 10. Troubleshooting

### "python is not recognized" (Windows)
Reinstall Python and **check "Add to PATH"**. Or try: `py --version`

### "npm is not recognized"
Reinstall Node.js from https://nodejs.org/

### "ModuleNotFoundError: No module named 'flask'"
You forgot to activate the virtual environment. Run:
```bash
venv\Scripts\activate     # Windows
source venv/bin/activate  # Mac
```

### "EADDRINUSE: address already in use"
```bash
# Windows
netstat -ano | findstr :5001
taskkill /PID <number> /F

# Mac
lsof -i :5001
kill -9 <PID>
```

### Frontend loads but API calls fail
The Flask backend is not running. Make sure Terminal 1 is running `python app.py`.

### OTP not received / "Code has expired"
Check the **Flask terminal** for the OTP code. The code expires in 5 minutes.

### CORS errors
Make sure Flask is running AND Vite proxy is configured in `vite.config.js`.

---

## Quick Reference: Commands to Run

Every time you want to work on the project:

**Terminal 1 (Backend):**
```
cd backend
venv\Scripts\activate       ← Windows
source venv/bin/activate        ← Mac
python app.py                  ← Port 5001
```

**Terminal 2 (Frontend):**
```
cd frontend
npm install                     ← First time only
npm run dev                     ← Port 3000
```

Then open: **http://localhost:3000**

---

*Built by Group 04 — CS/CE 353/374 L1 — Spring 2026*
