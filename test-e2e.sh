#!/bin/bash

# End-to-End Testing Script for Presentation Generator Platform
# This script tests the entire system locally before pushing to GitHub

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_PORT=5000
AI_SERVICE_PORT=8000
DATABASE_URL="postgresql://localhost:5432/presentation_generator"
TEST_USER_ID="00000000-0000-0000-0000-000000000001"
TEST_EMAIL="test@example.com"
TEST_PASSWORD="testpassword"

# Test results
TESTS_PASSED=0
TESTS_FAILED=0
TOTAL_TESTS=0

# Helper functions
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
    ((TESTS_PASSED++))
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
    ((TESTS_FAILED++))
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Test functions
test_database_connection() {
    print_header "Testing Database Connection"
    ((TOTAL_TESTS++))
    
    if psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
        print_success "Database connection successful"
    else
        print_error "Database connection failed"
        return 1
    fi
}

test_backend_startup() {
    print_header "Testing Backend Startup"
    ((TOTAL_TESTS++))
    
    # Start backend in background
    cd backend
    npm start > ../backend.log 2>&1 &
    BACKEND_PID=$!
    cd ..
    
    # Wait for backend to start
    sleep 10
    
    # Test health endpoint
    if curl -s http://localhost:$BACKEND_PORT/health > /dev/null; then
        print_success "Backend started successfully"
    else
        print_error "Backend failed to start"
        kill $BACKEND_PID 2>/dev/null || true
        return 1
    fi
}

test_ai_service_startup() {
    print_header "Testing AI Service Startup"
    ((TOTAL_TESTS++))
    
    # Start AI service in background
    cd ai-service
    python3 -m uvicorn app:app --host 0.0.0.0 --port $AI_SERVICE_PORT > ../ai-service.log 2>&1 &
    AI_PID=$!
    cd ..
    
    # Wait for AI service to start
    sleep 15
    
    # Test health endpoint
    if curl -s http://localhost:$AI_SERVICE_PORT/health > /dev/null; then
        print_success "AI service started successfully"
    else
        print_error "AI service failed to start"
        kill $AI_PID 2>/dev/null || true
        return 1
    fi
}

test_training_system() {
    print_header "Testing Training System"
    ((TOTAL_TESTS++))
    
    # Test training status endpoint
    TRAINING_STATUS=$(curl -s -H "Authorization: Bearer test-token" http://localhost:$BACKEND_PORT/api/training/status)
    
    if echo "$TRAINING_STATUS" | grep -q "totalFiles"; then
        print_success "Training status endpoint working"
        
        # Check if we have files to train
        TOTAL_FILES=$(echo "$TRAINING_STATUS" | grep -o '"totalFiles":[0-9]*' | cut -d':' -f2)
        if [ "$TOTAL_FILES" -gt 0 ]; then
            print_info "Found $TOTAL_FILES files available for training"
            
            # Test training start
            TRAINING_RESPONSE=$(curl -s -X POST -H "Authorization: Bearer test-token" http://localhost:$BACKEND_PORT/api/training/start)
            if echo "$TRAINING_RESPONSE" | grep -q "Training started"; then
                print_success "Training start endpoint working"
            else
                print_error "Training start failed"
                return 1
            fi
        else
            print_warning "No files available for training - skipping training test"
        fi
    else
        print_error "Training status endpoint failed"
        return 1
    fi
}

test_presentation_generation() {
    print_header "Testing Presentation Generation"
    ((TOTAL_TESTS++))
    
    # Test presentation generation
    PRESENTATION_DATA='{
        "useCase": "AI-powered customer service automation for banking",
        "customer": "Test Bank",
        "industry": "Banking",
        "targetAudience": "Bank executives",
        "presentationLength": "medium",
        "style": "professional",
        "additionalRequirements": "Focus on conversational AI, customer engagement, ROI metrics"
    }'
    
    GENERATION_RESPONSE=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer test-token" \
        -d "$PRESENTATION_DATA" \
        http://localhost:$BACKEND_PORT/api/presentations/generate)
    
    if echo "$GENERATION_RESPONSE" | grep -q "presentationId"; then
        print_success "Presentation generation started"
        
        # Extract presentation ID
        PRESENTATION_ID=$(echo "$GENERATION_RESPONSE" | grep -o '"presentationId":"[^"]*"' | cut -d'"' -f4)
        print_info "Presentation ID: $PRESENTATION_ID"
        
        # Wait for generation to complete (with timeout)
        print_info "Waiting for generation to complete..."
        for i in {1..30}; do
            PROGRESS_RESPONSE=$(curl -s -H "Authorization: Bearer test-token" http://localhost:$BACKEND_PORT/api/presentations/$PRESENTATION_ID/progress)
            
            if echo "$PROGRESS_RESPONSE" | grep -q '"stage":"completed"'; then
                print_success "Presentation generation completed"
                break
            elif echo "$PROGRESS_RESPONSE" | grep -q '"stage":"failed"'; then
                print_error "Presentation generation failed"
                return 1
            fi
            
            sleep 2
        done
        
        # Test download endpoint
        DOWNLOAD_RESPONSE=$(curl -s -H "Authorization: Bearer test-token" http://localhost:$BACKEND_PORT/api/presentations/$PRESENTATION_ID/download)
        if [ ${#DOWNLOAD_RESPONSE} -gt 100 ]; then
            print_success "Download endpoint working"
        else
            print_error "Download endpoint failed"
            return 1
        fi
    else
        print_error "Presentation generation failed"
        return 1
    fi
}

test_file_management() {
    print_header "Testing File Management"
    ((TOTAL_TESTS++))
    
    # Test file listing
    FILES_RESPONSE=$(curl -s -H "Authorization: Bearer test-token" http://localhost:$BACKEND_PORT/api/upload/files)
    
    if echo "$FILES_RESPONSE" | grep -q "files"; then
        print_success "File listing endpoint working"
    else
        print_error "File listing endpoint failed"
        return 1
    fi
}

test_api_endpoints() {
    print_header "Testing API Endpoints"
    ((TOTAL_TESTS++))
    
    # Test health endpoint
    if curl -s http://localhost:$BACKEND_PORT/health > /dev/null; then
        print_success "Backend health endpoint working"
    else
        print_error "Backend health endpoint failed"
        return 1
    fi
    
    # Test AI service health endpoint
    if curl -s http://localhost:$AI_SERVICE_PORT/health > /dev/null; then
        print_success "AI service health endpoint working"
    else
        print_error "AI service health endpoint failed"
        return 1
    fi
}

cleanup() {
    print_header "Cleaning Up"
    
    # Kill background processes
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
        print_info "Backend process killed"
    fi
    
    if [ ! -z "$AI_PID" ]; then
        kill $AI_PID 2>/dev/null || true
        print_info "AI service process killed"
    fi
    
    # Clean up log files
    rm -f backend.log ai-service.log
}

# Main execution
main() {
    print_header "Starting End-to-End Tests"
    print_info "Testing Presentation Generator Platform"
    print_info "Backend Port: $BACKEND_PORT"
    print_info "AI Service Port: $AI_SERVICE_PORT"
    print_info "Database: $DATABASE_URL"
    
    # Set up cleanup trap
    trap cleanup EXIT
    
    # Run tests
    test_database_connection || true
    test_backend_startup || true
    test_ai_service_startup || true
    test_api_endpoints || true
    test_training_system || true
    test_file_management || true
    test_presentation_generation || true
    
    # Print results
    print_header "Test Results"
    echo -e "Total Tests: $TOTAL_TESTS"
    echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
    echo -e "${RED}Failed: $TESTS_FAILED${NC}"
    
    if [ $TESTS_FAILED -eq 0 ]; then
        print_success "All tests passed! Ready to push to GitHub."
        exit 0
    else
        print_error "Some tests failed. Please fix issues before pushing."
        exit 1
    fi
}

# Run main function
main "$@"
