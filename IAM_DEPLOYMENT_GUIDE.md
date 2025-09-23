# IAM-Only Deployment Guide

This guide covers deploying the Presentation Generator Platform using IAM roles only (no AWS credentials required).

## 🏗️ Architecture

- **Backend**: Node.js/Express API server
- **AI Service**: Python/FastAPI AI processing service  
- **Frontend**: Static HTML/JavaScript interface
- **Database**: PostgreSQL for embeddings and metadata
- **Storage**: Amazon S3 (using IAM role)
- **Authentication**: IAM role-based (no access keys)

## 📋 Prerequisites

### Server Requirements
- Ubuntu 20.04+ or similar Linux distribution
- Node.js 18.x
- Python 3.13
- PostgreSQL 15
- Git

### AWS Resources
- S3 bucket: `adwit-test`
- IAM role with S3 permissions
- RDS PostgreSQL instance (optional)

## 🚀 Deployment Steps

### 1. Server Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Python 3.13
sudo apt install python3.13 python3.13-venv python3-pip -y

# Install PostgreSQL 15
sudo apt install postgresql-15 postgresql-client-15 -y

# Install Git
sudo apt install git -y
```

### 2. Database Setup
```bash
# Create database and user
sudo -u postgres psql
CREATE DATABASE presentation_generator;
CREATE USER app_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE presentation_generator TO app_user;
\q
```

### 3. Application Deployment
```bash
# Clone repository
git clone https://github.com/sharmaadwit/presentation-generator-platform.git
cd presentation-generator-platform

# Install backend dependencies
cd backend
npm install
npm run build
cd ..

# Install AI service dependencies
cd ai-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ..

# Configure environment
cp production.env .env
# Edit .env with your actual values
```

### 4. Environment Configuration
Update `production.env` with your values:
```bash
# Database
DATABASE_URL=postgresql://app_user:YOUR_ACTUAL_PASSWORD@127.0.0.1:5432/presentation_generator

# OpenAI (if you have an API key)
OPENAI_API_KEY=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

# JWT Secret (generate a new one)
JWT_SECRET=YOUR_SECURE_JWT_SECRET
```

### 5. Start Services
```bash
# Make scripts executable
chmod +x start-production.sh stop-production.sh

# Start all services
./start-production.sh
```

### 6. Verify Deployment
```bash
# Check service status
curl http://localhost:3000  # Frontend
curl http://localhost:5000/health  # Backend
curl http://localhost:8000/health  # AI Service

# Check logs
tail -f logs/*.log
```

## 🔧 Configuration

### S3 Configuration
The application uses IAM roles for S3 access. Ensure your server has an IAM role attached with these permissions:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::adwit-test/*"
    }
  ]
}
```

### Database Configuration
The application will create necessary tables on first run. No manual schema setup required.

## 🌐 Access

- **Frontend**: `http://your-server-ip:3000`
- **Backend API**: `http://your-server-ip:5000`
- **AI Service**: `http://your-server-ip:8000`

## 🔍 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check PostgreSQL is running: `sudo systemctl status postgresql`
   - Verify credentials in `production.env`
   - Check database exists: `psql -U app_user -d presentation_generator`

2. **S3 Access Denied**
   - Verify IAM role is attached to EC2 instance
   - Check S3 bucket permissions
   - Verify `AWS_REGION` and `AWS_S3_BUCKET` environment variables

3. **Services Not Starting**
   - Check logs: `tail -f logs/*.log`
   - Verify ports are available: `netstat -tln | grep -E "(3000|5000|8000)"`
   - Check dependencies: `npm list` and `pip list`

### Logs
- Backend logs: `logs/backend.log`
- AI Service logs: `logs/ai-service.log`
- Frontend logs: `logs/frontend.log`

## 🔄 Updates

To update the application:
```bash
# Pull latest changes
git pull origin main

# Rebuild backend
cd backend && npm run build && cd ..

# Restart services
./stop-production.sh
./start-production.sh
```

## 📊 Monitoring

### Health Checks
```bash
# Check all services
curl http://localhost:5000/health
curl http://localhost:8000/health

# Check database
psql -U app_user -d presentation_generator -c "SELECT 1;"
```

### Service Management
```bash
# Start services
./start-production.sh

# Stop services
./stop-production.sh

# Check running processes
ps aux | grep -E "(node|python|uvicorn)"
```

## 🔐 Security

- Uses IAM roles instead of access keys
- JWT-based authentication
- CORS properly configured
- Rate limiting enabled
- Input validation and sanitization

## 📝 Notes

- No AWS credentials required
- All AWS access through IAM roles
- Local storage fallback if S3 unavailable
- Database optional for basic functionality
- Designed for single-server deployment
