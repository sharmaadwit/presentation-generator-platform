#!/bin/bash

# Railway Setup Script for AI Presentation Generator Platform
# This script helps you set up the project for Railway deployment

set -e

echo "🚀 Setting up AI Presentation Generator Platform for Railway deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if git is initialized
if [ ! -d ".git" ]; then
    print_status "Initializing Git repository..."
    git init
    git branch -M main
    print_success "Git repository initialized"
else
    print_success "Git repository already initialized"
fi

# Check if all required files exist
print_status "Checking required files..."

required_files=(
    "package.json"
    "docker-compose.yml"
    "railway.json"
    "railway-compose.yml"
    "frontend/package.json"
    "backend/package.json"
    "ai-service/requirements.txt"
    "frontend/Dockerfile"
    "backend/Dockerfile"
    "ai-service/Dockerfile"
)

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        print_error "Required file missing: $file"
        exit 1
    fi
done

print_success "All required files present"

# Create .env.example if it doesn't exist
if [ ! -f ".env.example" ]; then
    print_status "Creating .env.example file..."
    cat > .env.example << EOF
# Database
POSTGRES_DB=presentation_generator
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password_here

# JWT Secret (generate a secure random string)
JWT_SECRET=your_super_secret_jwt_key_min_32_characters

# OpenAI API Key
OPENAI_API_KEY=sk-your-openai-api-key-here

# Service URLs (will be provided by Railway)
FRONTEND_URL=https://your-frontend.railway.app
BACKEND_URL=https://your-backend.railway.app
AI_SERVICE_URL=https://your-ai-service.railway.app
EOF
    print_success ".env.example created"
fi

# Create .gitignore if it doesn't exist
if [ ! -f ".gitignore" ]; then
    print_status "Creating .gitignore file..."
    cat > .gitignore << EOF
# Dependencies
node_modules/
*/node_modules/

# Environment variables
.env
.env.local
.env.production

# Build outputs
dist/
build/
*/dist/
*/build/

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# nyc test coverage
.nyc_output

# Dependency directories
jspm_packages/

# Optional npm cache directory
.npm

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# next.js build output
.next

# nuxt.js build output
.nuxt

# vuepress build output
.vuepress/dist

# Serverless directories
.serverless

# FuseBox cache
.fusebox/

# DynamoDB Local files
.dynamodb/

# TernJS port file
.tern-port

# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
env/
venv/
ENV/
env.bak/
venv.bak/

# Uploads
uploads/
*/uploads/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db
EOF
    print_success ".gitignore created"
fi

# Install root dependencies
print_status "Installing root dependencies..."
npm install

# Install frontend dependencies
print_status "Installing frontend dependencies..."
cd frontend
npm install
cd ..

# Install backend dependencies
print_status "Installing backend dependencies..."
cd backend
npm install
cd ..

# Install AI service dependencies
print_status "Installing AI service dependencies..."
cd ai-service
pip install -r requirements.txt
cd ..

print_success "All dependencies installed"

# Create upload directories
print_status "Creating upload directories..."
mkdir -p uploads
mkdir -p frontend/uploads
mkdir -p backend/uploads
mkdir -p ai-service/uploads
print_success "Upload directories created"

# Make scripts executable
print_status "Making scripts executable..."
chmod +x setup.sh
chmod +x setup-railway.sh
print_success "Scripts made executable"

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    print_warning "Railway CLI not found. Installing..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        brew install railway
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        curl -fsSL https://railway.app/install.sh | sh
    else
        print_error "Please install Railway CLI manually from https://docs.railway.app/develop/cli"
    fi
else
    print_success "Railway CLI found"
fi

print_success "Setup completed successfully!"

echo ""
echo "🎯 Next Steps:"
echo "1. Create a GitHub repository and push your code:"
echo "   git add ."
echo "   git commit -m 'Initial commit: AI presentation generator platform'"
echo "   git remote add origin https://github.com/YOUR_USERNAME/presentation-generator-platform.git"
echo "   git push -u origin main"
echo ""
echo "2. Go to Railway.app and create a new project:"
echo "   - Connect your GitHub repository"
echo "   - Railway will automatically detect the docker-compose.yml"
echo ""
echo "3. Set up environment variables in Railway:"
echo "   - Copy values from .env.example"
echo "   - Get your OpenAI API key from https://platform.openai.com/api-keys"
echo "   - Generate a secure JWT secret"
echo ""
echo "4. Deploy and get your URLs:"
echo "   - Railway will provide URLs for each service"
echo "   - Update environment variables with actual URLs"
echo ""
echo "5. Test your deployment:"
echo "   - Visit your frontend URL"
echo "   - Create an admin account"
echo "   - Upload your first presentation sources"
echo "   - Generate a test presentation"
echo ""
echo "📚 For detailed instructions, see QUICK_START_GUIDE.md"
echo ""
print_success "Ready for Railway deployment! 🚀"
