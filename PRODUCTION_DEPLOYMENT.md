# Production Deployment Guide

## 🚀 Complete Production Setup

This guide will help you deploy the Presentation Generator Platform to production with S3 storage, PostgreSQL database, and public URL access.

## 📋 Prerequisites

- ✅ AWS Server with public IP: `10.232.105.207`
- ✅ PostgreSQL 15 installed and running
- ✅ Node.js 18 installed
- ✅ Python 3.13 installed
- ✅ AWS S3 bucket: `adwit-test`
- ✅ AWS credentials (Access Key ID & Secret Access Key)

## 🔧 Step 1: Configure AWS S3

### Update S3 Credentials
```bash
# Edit the S3 credentials file
nano /home/test/presentation-generator-platform/backend/src/config/awsCredentials.json
```

Replace with your actual AWS credentials:
```json
{
  "accessKeyId": "AKIA...",
  "secretAccessKey": "your-secret-key...",
  "region": "us-east-1",
  "bucketName": "adwit-test"
}
```

### Rebuild Backend
```bash
cd /home/test/presentation-generator-platform/backend
npm run build
```

## 🗄️ Step 2: Configure PostgreSQL

### Set Database Connection
```bash
# Set environment variable
export DATABASE_URL="postgresql://app_user:your_password@127.0.0.1:5432/presentation_generator"

# Test database connection
psql -U app_user -d presentation_generator -h 127.0.0.1 -p 5432
```

## 🌐 Step 3: Configure Public Access

### Update Production Environment
```bash
# Edit production environment file
nano /home/test/presentation-generator-platform/production.env
```

Update with your actual credentials:
```bash
DATABASE_URL=postgresql://app_user:your_password@127.0.0.1:5432/presentation_generator
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

## 🚀 Step 4: Deploy Services

### Make Scripts Executable
```bash
chmod +x /home/test/presentation-generator-platform/start-production.sh
chmod +x /home/test/presentation-generator-platform/stop-production.sh
```

### Start All Services
```bash
cd /home/test/presentation-generator-platform
./start-production.sh
```

## 🌍 Step 5: Configure Public URL (Optional)

### Option A: Use Nginx (Recommended)
```bash
# Install nginx
sudo apt update
sudo apt install nginx

# Copy nginx configuration
sudo cp nginx.conf /etc/nginx/sites-available/presentation-generator
sudo ln -s /etc/nginx/sites-available/presentation-generator /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Option B: Use AWS App Runner
Deploy each service to AWS App Runner for automatic public URLs.

## 📊 Step 6: Verify Deployment

### Test All Services
```bash
# Test frontend
curl http://10.232.105.207:3000

# Test backend
curl http://10.232.105.207:5000/health

# Test AI service
curl http://10.232.105.207:8000/health
```

### Test Complete Workflow
1. Open browser: `http://10.232.105.207:3000`
2. Login as admin: `admin` / `letmein123`
3. Upload a PowerPoint file
4. Test training process
5. Generate new presentation

## 🔧 Step 7: Monitor Services

### Check Service Status
```bash
# Check running processes
ps aux | grep -E "(uvicorn|npm|python3)"

# Check port usage
netstat -tlnp | grep -E "(3000|5000|8000)"

# Check logs
tail -f logs/ai-service.log
tail -f logs/backend.log
tail -f logs/frontend.log
```

### Stop Services
```bash
./stop-production.sh
```

## 📁 Data Storage

### S3 Storage
- **Location**: `s3://adwit-test/`
- **Files**: All uploaded presentations (.pptx)
- **Access**: Via AWS S3 console or API

### PostgreSQL Database
- **Location**: `127.0.0.1:5432`
- **Database**: `presentation_generator`
- **Data**: User accounts, analytics, embeddings, metadata

### Local Storage (Fallback)
- **Location**: `/app/persistent-storage/`
- **Files**: Fallback when S3 is not available

## 🔒 Security Considerations

1. **Update Default Passwords**: Change admin password and JWT secret
2. **Enable HTTPS**: Use Let's Encrypt for SSL certificates
3. **Firewall**: Configure AWS Security Groups
4. **Database Security**: Use strong passwords and restrict access
5. **API Keys**: Rotate AWS and OpenAI keys regularly

## 🚨 Troubleshooting

### Common Issues
1. **Port Already in Use**: Stop existing services first
2. **Database Connection Failed**: Check PostgreSQL status
3. **S3 Upload Failed**: Verify AWS credentials
4. **CORS Errors**: Check CORS configuration

### Logs Location
- **AI Service**: `logs/ai-service.log`
- **Backend**: `logs/backend.log`
- **Frontend**: `logs/frontend.log`

## 📞 Support

For issues or questions:
1. Check logs for error messages
2. Verify all services are running
3. Test database and S3 connectivity
4. Check firewall and network settings

---

**🎉 Your Presentation Generator Platform is now ready for production use!**
