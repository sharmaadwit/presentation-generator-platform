#!/bin/bash

# AI Service Startup Script
echo "Starting AI Service..."

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    echo "Activating virtual environment..."
    source venv/bin/activate
fi

# Check if required environment variables are set
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  WARNING: DATABASE_URL not set. AI service will start but database features may not work."
fi

if [ -z "$OPENAI_API_KEY" ]; then
    echo "⚠️  WARNING: OPENAI_API_KEY not set. AI features will be limited."
fi

# Start the AI service
echo "Starting FastAPI server on port 8000..."
python3 -m uvicorn app:app --host 0.0.0.0 --port 8000
