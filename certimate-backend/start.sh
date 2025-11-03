#!/bin/bash

# CertiMate Backend Startup Script

echo "🚀 Starting CertiMate Backend..."

# Run the server using venv's Python directly
./venv/bin/python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

