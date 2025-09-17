#!/bin/bash

# Production Startup Script for Presentation Generator Platform
echo "🚀 Starting Presentation Generator Platform in Production Mode..."

# Set environment variables
export NODE_ENV=production
export PORT=5000
export DATABASE_URL="postgresql://app_user:your_password@127.0.0.1:5432/presentation_generator"
export AWS_ACCESS_KEY_ID="YOUR_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="YOUR_SECRET_ACCESS_KEY"
export AWS_REGION="us-east-1"
export AWS_S3_BUCKET="adwit-test"
export AI_SERVICE_URL="http://localhost:8000"
export OPENAI_API_KEY="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"
export JWT_SECRET="cytIEJDvP86Iw1i2O1CsM8k8zHNehHTA0iUtQDse8pk"
export FRONTEND_URL="http://10.232.105.207:3000"

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        echo "⚠️  Port $port is already in use"
        return 1
    else
        echo "✅ Port $port is available"
        return 0
    fi
}

# Function to start service
start_service() {
    local service_name=$1
    local command=$2
    local port=$3
    
    echo "🔧 Starting $service_name..."
    
    if check_port $port; then
        eval "$command" &
        local pid=$!
        echo "✅ $service_name started with PID: $pid"
        echo $pid > "${service_name}.pid"
    else
        echo "❌ Failed to start $service_name - port $port is in use"
        return 1
    fi
}

# Create logs directory
mkdir -p logs

# Start AI Service
start_service "ai-service" "cd ai-service && . ai-venv/bin/activate && python3 -m uvicorn app:app --host 0.0.0.0 --port 8000" 8000

# Wait a moment for AI service to start
sleep 3

# Start Backend Service
start_service "backend" "cd backend && npm start" 5000

# Wait a moment for backend to start
sleep 3

# Start Frontend Service
start_service "frontend" "cd public && python3 -m http.server 3000" 3000

# Wait for all services to start
sleep 5

echo ""
echo "🎉 All services started successfully!"
echo ""
echo "📊 Service Status:"
echo "  Frontend:  http://10.232.105.207:3000"
echo "  Backend:   http://10.232.105.207:5000"
echo "  AI Service: http://10.232.105.207:8000"
echo ""
echo "🔧 To stop all services, run: ./stop-production.sh"
echo "📝 Logs are available in the logs/ directory"
echo ""

# Test services
echo "🧪 Testing services..."
curl -s http://localhost:3000 > /dev/null && echo "✅ Frontend is responding" || echo "❌ Frontend is not responding"
curl -s http://localhost:5000/health > /dev/null && echo "✅ Backend is responding" || echo "❌ Backend is not responding"
curl -s http://localhost:8000/health > /dev/null && echo "✅ AI Service is responding" || echo "❌ AI Service is not responding"

echo ""
echo "🚀 Production deployment complete!"
