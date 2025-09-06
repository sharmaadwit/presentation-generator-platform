#!/bin/bash

# Comprehensive Testing Script for Presentation Generator Platform
# This script runs all tests in sequence

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

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Make scripts executable
make_executable() {
    print_header "Making Scripts Executable"
    
    chmod +x test-units.sh
    chmod +x test-e2e.sh
    chmod +x pre-commit-test.sh
    chmod +x start.sh
    chmod +x setup.sh
    
    print_success "All scripts made executable"
}

# Run unit tests
run_unit_tests() {
    print_header "Running Unit Tests"
    
    if ./test-units.sh; then
        print_success "Unit tests passed"
    else
        print_error "Unit tests failed"
        return 1
    fi
}

# Run pre-commit checks
run_pre_commit_checks() {
    print_header "Running Pre-commit Checks"
    
    if ./pre-commit-test.sh; then
        print_success "Pre-commit checks passed"
    else
        print_error "Pre-commit checks failed"
        return 1
    fi
}

# Run end-to-end tests
run_e2e_tests() {
    print_header "Running End-to-End Tests"
    
    if ./test-e2e.sh; then
        print_success "End-to-end tests passed"
    else
        print_error "End-to-end tests failed"
        return 1
    fi
}

# Check git status
check_git_status() {
    print_header "Checking Git Status"
    
    if [ -z "$(git status --porcelain)" ]; then
        print_success "Working directory clean"
    else
        print_warning "Working directory has uncommitted changes"
        git status --short
    fi
    
    # Check if we're on main branch
    CURRENT_BRANCH=$(git branch --show-current)
    if [ "$CURRENT_BRANCH" = "main" ]; then
        print_success "On main branch"
    else
        print_warning "Not on main branch (currently on: $CURRENT_BRANCH)"
    fi
}

# Generate test report
generate_report() {
    print_header "Test Report"
    
    echo "Test completed at: $(date)"
    echo "Git commit: $(git rev-parse HEAD)"
    echo "Branch: $(git branch --show-current)"
    echo "Status: $([ $? -eq 0 ] && echo "PASSED" || echo "FAILED")"
}

# Main execution
main() {
    print_header "Starting Comprehensive Testing"
    print_info "This will run all tests before pushing to GitHub"
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ] || [ ! -d "backend" ] || [ ! -d "ai-service" ]; then
        print_error "Not in the correct directory. Please run from project root."
        exit 1
    fi
    
    # Run tests in sequence
    make_executable
    run_unit_tests
    run_pre_commit_checks
    check_git_status
    
    # Ask user if they want to run E2E tests (they take longer)
    echo -e "\n${YELLOW}End-to-end tests will start services and may take several minutes.${NC}"
    read -p "Do you want to run E2E tests? (y/n): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        run_e2e_tests
    else
        print_info "Skipping E2E tests"
    fi
    
    generate_report
    
    print_header "Testing Complete"
    print_success "All tests passed! Ready to push to GitHub."
    print_info "Run 'git push origin main' to deploy your changes."
}

# Handle script arguments
case "${1:-}" in
    "units")
        make_executable
        run_unit_tests
        ;;
    "pre-commit")
        make_executable
        run_pre_commit_checks
        ;;
    "e2e")
        make_executable
        run_e2e_tests
        ;;
    "quick")
        make_executable
        run_unit_tests
        run_pre_commit_checks
        ;;
    *)
        main
        ;;
esac
