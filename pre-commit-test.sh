#!/bin/bash

# Pre-commit Testing Script
# This script runs before every git commit to ensure code quality

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Check if files are staged
check_staged_files() {
    print_header "Checking Staged Files"
    
    if [ -z "$(git diff --cached --name-only)" ]; then
        print_warning "No files staged for commit"
        exit 0
    fi
    
    STAGED_FILES=$(git diff --cached --name-only)
    print_info "Staged files:"
    echo "$STAGED_FILES"
}

# Check for common issues
check_common_issues() {
    print_header "Checking for Common Issues"
    
    # Check for console.log statements in production code
    if git diff --cached --name-only | grep -E '\.(ts|js)$' | xargs grep -l "console\.log" 2>/dev/null; then
        print_warning "Found console.log statements in staged files"
        print_info "Consider removing or replacing with proper logging"
    fi
    
    # Check for TODO comments
    if git diff --cached --name-only | xargs grep -l "TODO\|FIXME" 2>/dev/null; then
        print_warning "Found TODO/FIXME comments in staged files"
        print_info "Consider addressing these before committing"
    fi
    
    # Check for large files
    LARGE_FILES=$(git diff --cached --name-only | xargs ls -la 2>/dev/null | awk '$5 > 1000000 {print $9 " (" $5 " bytes)"}')
    if [ ! -z "$LARGE_FILES" ]; then
        print_warning "Found large files:"
        echo "$LARGE_FILES"
    fi
}

# Check TypeScript compilation
check_typescript() {
    print_header "Checking TypeScript Compilation"
    
    if [ -f "backend/tsconfig.json" ]; then
        cd backend
        if npm run build > /dev/null 2>&1; then
            print_success "TypeScript compilation successful"
        else
            print_error "TypeScript compilation failed"
            print_info "Run 'cd backend && npm run build' to see errors"
            cd ..
            return 1
        fi
        cd ..
    else
        print_info "No TypeScript project found"
    fi
}

# Check Python syntax
check_python() {
    print_header "Checking Python Syntax"
    
    if [ -d "ai-service" ]; then
        cd ai-service
        if python3 -m py_compile app.py 2>/dev/null; then
            print_success "Python syntax check passed"
        else
            print_error "Python syntax errors found"
            print_info "Run 'cd ai-service && python3 -m py_compile app.py' to see errors"
            cd ..
            return 1
        fi
        cd ..
    else
        print_info "No Python files found"
    fi
}

# Check for sensitive data
check_sensitive_data() {
    print_header "Checking for Sensitive Data"
    
    # Check for API keys
    if git diff --cached --name-only | xargs grep -l "sk-[a-zA-Z0-9]" 2>/dev/null; then
        print_error "Found potential API keys in staged files"
        print_info "Remove API keys before committing"
        return 1
    fi
    
    # Check for passwords
    if git diff --cached --name-only | xargs grep -l "password.*=" 2>/dev/null; then
        print_warning "Found potential passwords in staged files"
        print_info "Ensure no sensitive data is committed"
    fi
    
    # Check for database URLs with credentials
    if git diff --cached --name-only | xargs grep -l "postgresql://.*:.*@" 2>/dev/null; then
        print_warning "Found database URLs with credentials"
        print_info "Use environment variables for database credentials"
    fi
}

# Run linting if available
run_linting() {
    print_header "Running Linting"
    
    # Check if ESLint is available
    if [ -f "backend/package.json" ] && grep -q "eslint" backend/package.json; then
        cd backend
        if npm run lint > /dev/null 2>&1; then
            print_success "ESLint passed"
        else
            print_warning "ESLint found issues"
            print_info "Run 'cd backend && npm run lint' to see details"
        fi
        cd ..
    else
        print_info "No ESLint configuration found"
    fi
}

# Main execution
main() {
    print_header "Pre-commit Checks"
    
    check_staged_files
    check_common_issues
    check_typescript
    check_python
    check_sensitive_data
    run_linting
    
    print_header "Pre-commit Checks Complete"
    print_success "Ready to commit!"
}

main "$@"
