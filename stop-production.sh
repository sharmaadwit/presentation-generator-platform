#!/bin/bash

# Production Stop Script for Presentation Generator Platform
echo "🛑 Stopping Presentation Generator Platform..."

# Function to stop service
stop_service() {
    local service_name=$1
    local pid_file="${service_name}.pid"
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p $pid > /dev/null 2>&1; then
            echo "🛑 Stopping $service_name (PID: $pid)..."
            kill $pid
            sleep 2
            
            # Force kill if still running
            if ps -p $pid > /dev/null 2>&1; then
                echo "⚠️  Force killing $service_name..."
                kill -9 $pid
            fi
            
            echo "✅ $service_name stopped"
        else
            echo "ℹ️  $service_name was not running"
        fi
        rm -f "$pid_file"
    else
        echo "ℹ️  No PID file found for $service_name"
    fi
}

# Stop all services
stop_service "ai-service"
stop_service "backend"
stop_service "frontend"

# Kill any remaining processes on our ports
echo "🧹 Cleaning up remaining processes..."
pkill -f "uvicorn app:app" 2>/dev/null || true
pkill -f "npm start" 2>/dev/null || true
pkill -f "python3 -m http.server 3000" 2>/dev/null || true

echo "✅ All services stopped successfully!"
