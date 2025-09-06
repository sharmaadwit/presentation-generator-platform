#!/bin/bash

# Start both backend and AI service
echo "Starting Backend Service..."
cd backend && npm start &
BACKEND_PID=$!

echo "Starting AI Service..."
cd ../ai-service && source venv/bin/activate && python3 -m uvicorn app:app --host 0.0.0.0 --port 8000 &
AI_PID=$!

# Wait for both services to start
sleep 15

echo "Services started:"
echo "Backend PID: $BACKEND_PID"
echo "AI Service PID: $AI_PID"

# Check if services are running
echo "Checking service status..."
ps aux | grep -E "(node|python|uvicorn)" | grep -v grep

# Test AI service health
echo "Testing AI service health..."
curl -f http://localhost:8000/health || echo "AI service health check failed"

# Keep the script running and handle shutdown
trap 'kill $BACKEND_PID $AI_PID; exit' SIGTERM SIGINT
wait
