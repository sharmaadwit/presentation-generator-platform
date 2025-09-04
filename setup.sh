#!/bin/bash

# Presentation Generator Platform Setup Script
echo "🚀 Setting up Presentation Generator Platform..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8+ first."
    exit 1
fi

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed. Please install PostgreSQL first."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install
cd ..

# Install AI service dependencies
echo "📦 Installing AI service dependencies..."
cd ai-service
pip install -r requirements.txt
cd ..

# Create environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating environment file..."
    cp env.example .env
    echo "⚠️  Please edit .env file with your configuration before running the application"
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p generated_presentations
mkdir -p uploads
mkdir -p logs

# Set up database
echo "🗄️  Setting up database..."
echo "Please create a PostgreSQL database named 'presentation_generator' and update the DATABASE_URL in .env file"

# Install Playwright browsers for web scraping
echo "🌐 Installing Playwright browsers..."
cd ai-service
python -m playwright install chromium
cd ..

echo "✅ Setup completed!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your configuration"
echo "2. Create PostgreSQL database: createdb presentation_generator"
echo "3. Start the services:"
echo "   - Frontend: cd frontend && npm start"
echo "   - Backend: cd backend && npm run dev"
echo "   - AI Service: cd ai-service && python app.py"
echo ""
echo "🌐 Access the application at http://localhost:3000"
