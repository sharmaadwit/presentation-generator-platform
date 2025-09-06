#!/bin/bash

# Unit Testing Script for Presentation Generator Platform
# This script tests individual components in isolation

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
DATABASE_URL="postgresql://localhost:5432/presentation_generator"

print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Test database schema
test_database_schema() {
    print_header "Testing Database Schema"
    
    # Check if all required tables exist
    TABLES=("users" "presentations" "slides" "presentation_sources" "source_slides" "slide_embeddings" "training_sessions" "training_progress")
    
    for table in "${TABLES[@]}"; do
        if psql "$DATABASE_URL" -c "SELECT 1 FROM $table LIMIT 1;" > /dev/null 2>&1; then
            print_success "Table $table exists"
        else
            print_error "Table $table missing"
        fi
    done
}

# Test backend dependencies
test_backend_dependencies() {
    print_header "Testing Backend Dependencies"
    
    cd backend
    
    # Check if node_modules exists
    if [ -d "node_modules" ]; then
        print_success "Node modules installed"
    else
        print_error "Node modules not installed - run 'npm install'"
        cd ..
        return 1
    fi
    
    # Check if TypeScript compiles
    if npm run build > /dev/null 2>&1; then
        print_success "TypeScript compilation successful"
    else
        print_error "TypeScript compilation failed"
        cd ..
        return 1
    fi
    
    cd ..
}

# Test AI service dependencies
test_ai_service_dependencies() {
    print_header "Testing AI Service Dependencies"
    
    cd ai-service
    
    # Check if virtual environment exists (if using one)
    if [ -d "venv" ]; then
        print_success "Virtual environment found"
        source venv/bin/activate
    fi
    
    # Check if required packages are installed
    REQUIRED_PACKAGES=("fastapi" "uvicorn" "python-pptx" "psycopg2-binary")
    
    for package in "${REQUIRED_PACKAGES[@]}"; do
        if python3 -c "import $package" > /dev/null 2>&1; then
            print_success "Package $package available"
        else
            print_error "Package $package missing"
        fi
    done
    
    cd ..
}

# Test environment variables
test_environment() {
    print_header "Testing Environment Variables"
    
    # Check if DATABASE_URL is set
    if [ ! -z "$DATABASE_URL" ]; then
        print_success "DATABASE_URL is set"
    else
        print_error "DATABASE_URL not set"
    fi
    
    # Check if we can connect to database
    if psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
        print_success "Database connection working"
    else
        print_error "Database connection failed"
    fi
}

# Test file permissions
test_file_permissions() {
    print_header "Testing File Permissions"
    
    # Check if start script is executable
    if [ -x "start.sh" ]; then
        print_success "start.sh is executable"
    else
        print_error "start.sh is not executable - run 'chmod +x start.sh'"
    fi
    
    # Check if test script is executable
    if [ -x "test-e2e.sh" ]; then
        print_success "test-e2e.sh is executable"
    else
        print_error "test-e2e.sh is not executable - run 'chmod +x test-e2e.sh'"
    fi
}

# Test configuration files
test_configuration() {
    print_header "Testing Configuration Files"
    
    # Check if package.json exists
    if [ -f "package.json" ]; then
        print_success "package.json exists"
    else
        print_error "package.json missing"
    fi
    
    # Check if railway.json exists
    if [ -f "railway.json" ]; then
        print_success "railway.json exists"
    else
        print_error "railway.json missing"
    fi
    
    # Check if backend package.json exists
    if [ -f "backend/package.json" ]; then
        print_success "backend/package.json exists"
    else
        print_error "backend/package.json missing"
    fi
    
    # Check if AI service requirements.txt exists
    if [ -f "ai-service/requirements.txt" ]; then
        print_success "ai-service/requirements.txt exists"
    else
        print_error "ai-service/requirements.txt missing"
    fi
}

# Main execution
main() {
    print_header "Starting Unit Tests"
    
    test_configuration
    test_file_permissions
    test_environment
    test_database_schema
    test_backend_dependencies
    test_ai_service_dependencies
    
    print_header "Unit Tests Complete"
    print_info "Run './test-e2e.sh' for full integration testing"
}

main "$@"
