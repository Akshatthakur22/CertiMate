# 🎓 CertiMate - Certificate Generation Platform

**Generate beautiful, personalized certificates in minutes!**

---

## 🚀 Quick Start

### 1. Start Backend
```bash
cd certimate-backend
./start.sh
```
Backend runs at: **http://localhost:8000**

### 2. Start Frontend
```bash
cd certimate-frontend
npm run dev
```
Frontend runs at: **http://localhost:3000**

### 3. Open Browser
```
http://localhost:3000
```

---

## 📖 Complete Documentation

- **Project Overview:** `PROJECT_OVERVIEW_COMPLETE.md` - Full system architecture
- **Frontend Guide:** `certimate-frontend/PROJECT_OVERVIEW.md` - Frontend details
- **Backend Guide:** `certimate-backend/README_START.md` - How to start backend

---

## 🎯 What This Does

**CertiMate** automatically generates personalized certificates from templates and CSV data.

### Workflow:
1. **Upload Template** - PNG/PDF with `{{NAME}}` placeholder
2. **Upload CSV** - List of participant names
3. **Generate** - System creates certificates automatically
4. **Download** - Get ZIP file with all certificates

---

## 🏗️ Project Structure

```
CertiMate/
├── certimate-backend/      # FastAPI - Certificate engine
│   ├── app/               # Backend code
│   ├── uploads/           # User files
│   └── logs/              # Audit logs
│
└── certimate-frontend/     # Next.js - User interface
    ├── app/               # Pages
    ├── components/        # UI components
    └── lib/               # API client
```

---

## ✨ Features

- ✅ Automatic placeholder detection
- ✅ Clean text replacement (no overlap)
- ✅ Batch generation (hundreds at once)
- ✅ Professional design
- ✅ ZIP file download
- ✅ No database needed
- ✅ Production ready

---

## 📚 For Developers

**Backend:** FastAPI + Python + PIL + Tesseract OCR  
**Frontend:** Next.js + TypeScript + TailwindCSS + Shadcn UI  
**Deployment:** Docker support included

---

## 🎉 Status: PRODUCTION READY

Your system is fully functional and ready to use!

Generate your first certificates now: http://localhost:3000/upload
