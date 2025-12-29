# CertiMate

**Automated certificate generation for educators and event organizers**

Upload your design, add your list, and generate hundreds of personalized certificates instantly. Free forever, no signup required.

## Introduction

CertiMate is a simple tool that automates the boring work of creating and distributing certificates. It's designed for educators, event organizers, and anyone who needs to generate multiple certificates quickly.

I built this after watching a college event organizer spend hours manually creating certificates for 200+ participants. That weekend of frustration could have been avoided with automation.

## ✨ Why This Project Exists

A few months ago, I watched my college's event organizer spend hours manually creating and emailing certificates to 200+ participants. She was frustrated — it was boring, repetitive work that ate up her entire weekend.

That's when I thought: *"Why isn't this automated? Why should anyone spend hours doing something a computer can do in minutes?"*

So I built CertiMate — a free tool that lets you upload a template, add a CSV, and generate hundreds of personalized certificates instantly. It uses AI (OCR) to automatically detect where names should go in your design, so you don't have to manually position anything.

My goal is simple: **make automation accessible, elegant, and free — for everyone.**

## 🚀 What It Does

- **Template Upload**: Supports PDF and image formats (PNG, JPG, JPEG)
- **Smart Detection**: Uses OCR to automatically find name placement in your design
- **CSV Integration**: Upload a list of recipients with their details
- **Batch Generation**: Create hundreds of certificates in one go
- **Preview System**: See exactly how certificates will look before generating
- **Download All**: Get a ZIP file with all generated certificates
- **No Signup Required**: Start using immediately without creating an account

## 🧠 How It Works (High-Level)

1. **Upload Template**: You upload your certificate design (PDF or image)
2. **OCR Analysis**: The system scans your template to find text placeholders
3. **Upload Recipients**: Add a CSV file with names and other details
4. **Preview & Adjust**: See how names will be placed and make tweaks if needed
5. **Generate**: Click generate and download all certificates as a ZIP file

The AI handles the hard parts — detecting where names should go, matching fonts, and positioning everything correctly.

## 🏗️ Tech Stack

**Frontend**
- Next.js 16 with React 19
- TypeScript for type safety
- TailwindCSS for styling
- Framer Motion for animations
- Radix UI for accessible components

**Backend**
- FastAPI (Python) for the API
- Pillow for image processing
- Tesseract OCR for text detection
- pdf2image for PDF conversion
- Pandas for CSV handling

**Infrastructure**
- Docker for containerization
- Nginx for reverse proxy
- Vercel for frontend deployment

## 📂 Project Structure

```
CertiMate/
├── certimate-frontend/          # Next.js frontend application
│   ├── app/                     # App router pages
│   ├── components/              # Reusable UI components
│   ├── lib/                     # API clients and utilities
│   └── types/                   # TypeScript type definitions
├── certimate-backend/           # FastAPI backend application
│   ├── app/                     # Main application code
│   │   ├── routes/              # API endpoints
│   │   ├── services/            # Business logic
│   │   └── utils/               # Helper functions
│   ├── deployments/             # Docker and deployment configs
│   └── uploads/                 # File storage (runtime)
└── README.md                    # This file
```

## 🛠️ Getting Started

### Prerequisites
- Python 3.8+ and Node.js 18+
- Tesseract OCR installed on your system

### Local Setup

**Backend**
```bash
cd certimate-backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
./start.sh
```

**Frontend**
```bash
cd certimate-frontend
npm install
npm run dev
```

The backend will run on `http://localhost:8000` and frontend on `http://localhost:3000`.

### Docker Setup
```bash
cd certimate-backend/deployments
docker-compose up -d
```

## 👨‍💻 About the Builder

Hey, I'm Akshat. I build simple, free tools that automate boring work — starting with CertiMate.

I enjoy building tools like this because I believe automation should be accessible to everyone, not just big companies with expensive software. Watching someone spend hours on repetitive manual work frustrates me — it's a problem that technology can solve.

Building CertiMate taught me that the best solutions are often the simplest ones. Instead of building complex configuration systems, I focused on making the AI do the heavy lifting. The OCR approach means users don't need to learn complicated software — they just upload what they already have.

I believe automation should be free because it multiplies human potential. When we remove the boring, repetitive tasks, people can focus on what matters: teaching, organizing events, creating meaningful experiences.

## 🌱 Vision / Future

- **More Template Types**: Support for more certificate designs and layouts
- **Email Integration**: Automatic email delivery to recipients
- **Bulk Editing**: Better tools for adjusting multiple certificates at once
- **Template Library**: Pre-made templates for common use cases
- **API Access**: For developers to integrate CertiMate into their own tools

The goal remains the same: make automation beautiful, easy-to-use, and completely free.

## 🤝 Contributing

Contributions are welcome! Feel free to open issues for bugs or feature requests. If you'd like to contribute code:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License — feel free to use this project for your own needs.

---

Made with ❤️ by Akshat
