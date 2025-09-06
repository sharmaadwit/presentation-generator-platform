#!/bin/bash

# Start both backend and AI service
echo "Starting Backend Service..."
cd backend && npm start &
BACKEND_PID=$!

echo "Starting AI Service..."
cd ../ai-service && python app.py &
AI_PID=$!

# Wait for both services to start
sleep 5

echo "Services started:"
echo "Backend PID: $BACKEND_PID"
echo "AI Service PID: $AI_PID"

# Keep the script running and handle shutdown
trap 'kill $BACKEND_PID $AI_PID; exit' SIGTERM SIGINT
wait
