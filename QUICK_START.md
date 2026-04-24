# 🚀 Cloud-Tycoon Quick Start Guide

## ✅ What's Complete Now

✅ **Complete Backend** (Node.js + Express + MongoDB Atlas)  
✅ **Complete Frontend** (React + Tailwind CSS + Icons)  
✅ **Authentication System** (JWT + Password validation + Role-based access)  
✅ **Password Security** (Bcryptjs hashing + 5-requirement validation)  
✅ **Profile Page** (Shows Team ID & members)  
✅ **Registration** (With password strength indicators)  
✅ **Login** (With case-insensitive matching)  
✅ **All core features** (Questions, submissions, leaderboard, admin)  
✅ **Security** (Lockdown mode, fraud detection)  
✅ **Game logic** (Cascade system for Year 1→2→3)  
✅ **8 Year 1 sample questions** (Ready to test)  

**Status:** ~80% Complete - Authentication working, ready for full testing!

---

## ⚡ Get Running in 5 Minutes

### Terminal 1: Start Backend

```bash
cd backend
npm run dev
```

**Expected output:**
```
✓ Connected to MongoDB
🚀 Cloud-Tycoon Backend running on port 5000
```

### Terminal 2: Start Frontend

```bash
cd frontend
npm start
```

**Browser opens to http://localhost:3000**

---

## 📝 First Test: Register

1. Go to http://localhost:3000/register
2. Fill form:
   - **Member 1 (CTO):** Name = `Alice`, Password = `CloudTycoon@123`
   - **Member 2 (CFO):** Name = `Bob`, Password = `MyAWS#2024Game`
   - **Member 3 (PM):** Name = `Charlie`, Password = `VIT2026@Cloud$`
3. Click "Register Team"
4. See success: `Team ID: TT-2026-XXXX`
5. Copy the Team ID

---

## 🔐 Second Test: Login

1. Go to http://localhost:3000/login
2. Enter Team ID from registration
3. Select Role: `CTO`
4. Enter Name: `alice` (lowercase, but case-insensitive login works!)
5. Enter Password: `CloudTycoon@123`
6. Click Login
7. See Profile page with Team ID and members!

---

## ✨ Features to Test

**Password Visibility Toggle**
- Click eye icon in password field
- Password appears as text
- Click again to hide

**Case-Insensitive Login**
- Register: `Alice`
- Login: `alice`, `ALICE`, or `AlIcE` - all work!

**Password Requirements**
- Must have: 8+ chars, uppercase, lowercase, number, special char
- Example: `CloudTycoon@123` ✅
- Invalid: `password123` ❌

**Profile Page**
- Shows Team ID (click to copy)
- Shows all 3 members
- Your member highlighted
- Logout button

---

## 🔑 Important

### MongoDB Atlas Already Configured
Connection in `backend/.env`:
```
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname?retryWrites=true&w=majority
```

### JWT Secret
See `JWT_AND_AUTHENTICATION.md` for complete explanation.

Current (development):
```
cloud-tycoon-aws-learning-game-2026-super-secret-key-please-change-in-production-use-32-char-string
```

For production, generate new one:
```bash
openssl rand -hex 32
```

---

## 📖 More Information

- **Full Workflow:** See `COMPLETE_WORKFLOW_GUIDE.md`
- **JWT Explained:** See `JWT_AND_AUTHENTICATION.md`
- **Troubleshooting:** See `TROUBLESHOOTING.md`

---

## ✅ Pre-Flight Checklist
FRONTEND_URL=http://localhost:3000
```

### 5. Create Frontend `.env` File

**frontend/.env**
```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

### 6. Start Both Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
# Should see: "✓ Connected to MongoDB" and "🚀 Backend running on port 5000"
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
# Browser opens to http://localhost:3000
```

### 7. Test the Flow

1. Go to http://localhost:3000
2. Click "Register Your Team"
3. Fill in sample data:
   - Team Name: "TestTeam"
   - Members: Alice (CTO), Bob (CFO), Charlie (PM)
   - Passwords: any 4+ chars
4. Copy the Team ID
5. Go to Login page
6. Log in with Team ID, name, and password
7. Complete training and start Year 1 questions

---

## File Structure Overview

```
AWS_Event1/
├── backend/              # Node.js server
│   └── src/
│       ├── server.js     # Start here
│       ├── models/       # Database schemas
│       ├── routes/       # API endpoints
│       └── utils/        # Core logic
│
├── frontend/             # React app
│   └── src/
│       ├── App.js        # Main component
│       ├── pages/        # 8 page components
│       └── utils/        # API client, state
│
├── SETUP.md              # Full setup guide
├── IMPLEMENTATION_STATUS.md  # What's done, what's not
└── Plan/                 # Design documents
```

---

## Important Files to Know

| File | Purpose | Status |
|------|---------|--------|
| `backend/src/utils/cascadeLogic.js` | Year 1→2→3 logic | ✅ Done |
| `backend/src/utils/seedData.js` | Questions database | ⚠️ Add Years 2-3 |
| `backend/src/routes/submissions.js` | Scoring logic | ✅ Done |
| `frontend/src/pages/QuestionPage.js` | Lockdown + questions | ✅ Done |
| `frontend/src/components/LockdownMode.js` | Security features | ✅ Done |
| `frontend/src/pages/AdminDashboard.js` | Event monitoring | ✅ Done |

---

## What to Do Next

### Immediate (Next 1-2 hours)
- [ ] Get backend running locally (`npm run dev` in backend folder)
- [ ] Get frontend running locally (`npm start` in frontend folder)
- [ ] Test registration and login flow
- [ ] Verify Year 1 questions load and submit works

### Short Term (Next 1-2 days)
- [ ] Add Year 2 questions to `backend/src/utils/seedData.js` (18 questions)
- [ ] Add Year 3 questions to `backend/src/utils/seedData.js` (18 questions)
- [ ] Create cascade rules (Year 1→2 and Year 2→3 transformations)
- [ ] Create market events for each year
- [ ] Set up MongoDB Atlas (or local MongoDB)
- [ ] Deploy to production

### Medium Term (Before Event)
- [ ] Test with 10 real students - get feedback on questions
- [ ] Fix any bugs found during testing
- [ ] Train proctors on admin dashboard
- [ ] Do final load testing (60+ users)
- [ ] Set up backup/recovery procedure

---

## Key Concepts

### Cascade Logic
Year 1 decisions directly impact Year 2 starting company state. Example:
- If you downsize EC2 → Year 2 costs lower
- If you set up monitoring → Year 2 you catch problems earlier
- If you commit to 3-year RIs → Year 3 you're locked in

### Market Events
Random/predetermined events that affect teams based on preparedness:
- Year 1: Cost Shock Alert (teams with monitoring get small penalty, others get big penalty)
- Year 2: Customer cancellation (flexible teams recover faster)
- Year 3: Viral surge (prepared teams handle it, others crash)

### Scoring
Each role (CTO, CFO, PM) answers 6-8 questions per year. Questions are scored individually, then averaged per role per year.

**Final Score** = Cumulative profit across all 3 years. Leaderboard ranks by profit.

---

## Testing Checklist

- [ ] Can register a team (all 3 members)
- [ ] Can login as each role
- [ ] Can complete Year 1 questions (8 min timer, lockdown mode works)
- [ ] Submitting shows year-end report with cascade effects
- [ ] Can advance to Year 2 and Year 3
- [ ] Final results page shows cumulative profit
- [ ] Leaderboard shows all completed teams
- [ ] Admin dashboard shows live progress
- [ ] Copy-paste is blocked during questions
- [ ] Tab switching is detected and warned
- [ ] DevTools (F12) is blocked

---

## FAQ

**Q: Where's the admin password?**  
A: For now, anyone can access `/admin`. Add proper admin auth before production.

**Q: Can I change the 3 years to something else?**  
A: You could, but the design is built for 3. Better to keep it.

**Q: How do I add more questions?**  
A: Edit `backend/src/utils/seedData.js` and run `npm run seed`

**Q: What if the server crashes during the event?**  
A: Create a recovery plan (backup, manual scoring). See Phase 7 in IMPLEMENTATION_CHECKLIST.md

**Q: Can students retake a year?**  
A: Currently no. They advance automatically. Could add retry logic if needed.

---

## Useful Commands

```bash
# Backend
cd backend
npm run dev          # Start dev server with auto-reload
npm run seed         # Seed questions to MongoDB
npm test             # Run tests (when added)

# Frontend  
cd frontend
npm start            # Start dev server
npm run build        # Build for production
npm test             # Run tests (when added)
```

---

## Deployment Quick Links

- **Backend**: Deploy to [Heroku](https://heroku.com) or [Railway](https://railway.app)
- **Frontend**: Deploy to [Vercel](https://vercel.com) or [Netlify](https://netlify.com)
- **Database**: [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (free tier)

See SETUP.md for detailed deployment steps.

---

## Get Help

1. Check `SETUP.md` for detailed setup instructions
2. Check `IMPLEMENTATION_STATUS.md` for what's done and what's not
3. Check Plan documents for full requirements
4. Review code comments - they're detailed

---

**You're ready to go! Start the backend and frontend, then test the registration flow.**

Good luck! 🚀
