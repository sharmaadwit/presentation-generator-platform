# Testing Guide for Presentation Generator Platform

This document describes the comprehensive testing system for the Presentation Generator Platform.

## 🧪 Testing Scripts

### 1. `test-all.sh` - Comprehensive Testing
**Purpose:** Runs all tests in sequence before pushing to GitHub
**Usage:**
```bash
./test-all.sh
```

**What it does:**
- Makes all scripts executable
- Runs unit tests
- Runs pre-commit checks
- Checks git status
- Optionally runs end-to-end tests
- Generates test report

### 2. `test-units.sh` - Unit Testing
**Purpose:** Tests individual components in isolation
**Usage:**
```bash
./test-units.sh
```

**What it tests:**
- Database schema and connection
- Backend dependencies and compilation
- AI service dependencies
- Environment variables
- File permissions
- Configuration files

### 3. `test-e2e.sh` - End-to-End Testing
**Purpose:** Tests the entire system integration
**Usage:**
```bash
./test-e2e.sh
```

**What it tests:**
- Database connection
- Backend startup and health
- AI service startup and health
- Training system functionality
- Presentation generation
- File management
- API endpoints

### 4. `pre-commit-test.sh` - Pre-commit Checks
**Purpose:** Runs before every git commit to ensure code quality
**Usage:**
```bash
./pre-commit-test.sh
```

**What it checks:**
- Staged files
- Common issues (console.log, TODO comments)
- TypeScript compilation
- Python syntax
- Sensitive data detection
- Linting (if available)

## 🚀 Quick Start

### Run All Tests
```bash
./test-all.sh
```

### Run Specific Tests
```bash
# Unit tests only
./test-all.sh units

# Pre-commit checks only
./test-all.sh pre-commit

# End-to-end tests only
./test-all.sh e2e

# Quick tests (units + pre-commit)
./test-all.sh quick
```

## 📋 Prerequisites

### Required Software
- **Node.js** (v16 or higher)
- **Python 3** (v3.8 or higher)
- **PostgreSQL** (v12 or higher)
- **Git**

### Required Environment
- Database running on `postgresql://localhost:5432/presentation_generator`
- Backend port 3000 available
- AI service port 8000 available

### Setup Commands
```bash
# Install backend dependencies
cd backend && npm install && cd ..

# Install AI service dependencies
cd ai-service && pip install -r requirements.txt && cd ..

# Make scripts executable
chmod +x *.sh
```

## 🔧 Configuration

### Environment Variables
```bash
export DATABASE_URL="postgresql://localhost:5432/presentation_generator"
export BACKEND_PORT=3000
export AI_SERVICE_PORT=8000
```

### Test User
The tests use a dummy user with ID: `00000000-0000-0000-0000-000000000001`

## 📊 Test Results

### Success Indicators
- ✅ Green checkmarks indicate passed tests
- ❌ Red X marks indicate failed tests
- ⚠️ Yellow warnings indicate potential issues
- ℹ️ Blue info messages provide additional context

### Test Report
After running tests, you'll see:
- Total number of tests
- Number of passed tests
- Number of failed tests
- Overall status (PASSED/FAILED)

## 🐛 Troubleshooting

### Common Issues

#### Database Connection Failed
```bash
# Check if PostgreSQL is running
brew services start postgresql@14

# Create database if it doesn't exist
createdb presentation_generator
```

#### Port Already in Use
```bash
# Kill processes using the ports
lsof -ti:3000 | xargs kill -9
lsof -ti:8000 | xargs kill -9
```

#### Permission Denied
```bash
# Make scripts executable
chmod +x *.sh
```

#### Dependencies Missing
```bash
# Install backend dependencies
cd backend && npm install && cd ..

# Install AI service dependencies
cd ai-service && pip install -r requirements.txt && cd ..
```

## 🔄 Continuous Integration

### Pre-commit Hook
To automatically run tests before every commit:

```bash
# Copy pre-commit script to git hooks
cp pre-commit-test.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

### GitHub Actions (Future)
The testing system is designed to be easily integrated with GitHub Actions for automated testing on pull requests.

## 📝 Test Development

### Adding New Tests
1. Add test function to appropriate script
2. Follow naming convention: `test_<component>`
3. Use print_success/print_error for results
4. Return 0 for success, 1 for failure

### Test Categories
- **Unit Tests:** Individual components
- **Integration Tests:** Component interactions
- **End-to-End Tests:** Full system workflow
- **Pre-commit Tests:** Code quality checks

## 🎯 Best Practices

### Before Pushing
1. Run `./test-all.sh` to ensure everything works
2. Fix any failing tests
3. Commit with descriptive messages
4. Push to GitHub

### During Development
1. Run `./test-units.sh` for quick checks
2. Run `./test-e2e.sh` for full testing
3. Use `./pre-commit-test.sh` before commits

### Debugging
1. Check log files: `backend.log`, `ai-service.log`
2. Verify environment variables
3. Ensure all services are running
4. Check database connectivity

## 📞 Support

If you encounter issues with the testing system:
1. Check the troubleshooting section
2. Review log files for error messages
3. Ensure all prerequisites are met
4. Verify environment configuration
