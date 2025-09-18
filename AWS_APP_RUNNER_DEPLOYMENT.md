# AWS App Runner Deployment Guide

## 🚀 Deploy to AWS App Runner

This guide will help you deploy your Presentation Generator Platform to AWS App Runner for managed, scalable hosting.

## 📋 Prerequisites

- ✅ AWS Account with App Runner access
- ✅ AWS CLI configured (optional)
- ✅ GitHub repository: `https://github.com/sharmaadwit/presentation-generator-platform.git`
- ✅ RDS PostgreSQL database (or use your existing one)
- ✅ S3 bucket: `adwit-test`

## 🏗️ Architecture

```
Frontend (App Runner) → Backend (App Runner) → AI Service (App Runner)
                    ↓
                PostgreSQL (RDS)
                    ↓
                S3 Storage
```

## 🔧 Step 1: Deploy Backend Service

### 1.1 Create Backend App Runner Service
1. Go to AWS Console → App Runner
2. Click "Create service"
3. Choose "Source code repository"
4. Connect to GitHub: `sharmaadwit/presentation-generator-platform`
5. Choose branch: `main`
6. Set build configuration:
   - **Config file**: `backend-apprunner.yaml`
   - **Deploy trigger**: Manual (or Automatic)

### 1.2 Configure Environment Variables
Update these in the App Runner console:
```
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://app_user:your_password@your-rds-endpoint:5432/presentation_generator
AWS_REGION=us-east-1
AWS_S3_BUCKET=adwit-test
JWT_SECRET=cytIEJDvP86Iw1i2O1CsM8k8zHNehHTA0iUtQDse8pk
AI_SERVICE_URL=https://your-ai-service-url.us-east-1.awsapprunner.com
FRONTEND_URL=https://your-frontend-url.us-east-1.awsapprunner.com
```

### 1.3 Configure IAM Role
Create an IAM role with these permissions:
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

## 🤖 Step 2: Deploy AI Service

### 2.1 Create AI Service App Runner Service
1. Go to AWS Console → App Runner
2. Click "Create service"
3. Choose "Source code repository"
4. Connect to GitHub: `sharmaadwit/presentation-generator-platform`
5. Choose branch: `main`
6. Set build configuration:
   - **Config file**: `ai-service-apprunner.yaml`
   - **Deploy trigger**: Manual (or Automatic)

### 2.2 Configure Environment Variables
```
PYTHONPATH=/app
PYTHONUNBUFFERED=1
AWS_REGION=us-east-1
AWS_S3_BUCKET=adwit-test
OPENAI_API_KEY=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
DATABASE_URL=postgresql://app_user:your_password@your-rds-endpoint:5432/presentation_generator
```

## 🌐 Step 3: Deploy Frontend Service

### 3.1 Create Frontend App Runner Service
1. Go to AWS Console → App Runner
2. Click "Create service"
3. Choose "Source code repository"
4. Connect to GitHub: `sharmaadwit/presentation-generator-platform`
5. Choose branch: `main`
6. Set build configuration:
   - **Config file**: `frontend-apprunner.yaml`
   - **Deploy trigger**: Manual (or Automatic)

### 3.2 Configure Environment Variables
```
NODE_ENV=production
PORT=3000
```

## 🔗 Step 4: Update Service URLs

After all services are deployed, update the URLs:

### 4.1 Update Backend Configuration
1. Go to Backend App Runner service
2. Update environment variables:
   - `AI_SERVICE_URL` = Your AI service URL
   - `FRONTEND_URL` = Your frontend URL

### 4.2 Update Frontend Configuration
1. Go to your GitHub repository
2. Update `public/js/app.js`:
   ```javascript
   const API_BASE = 'https://your-backend-url.us-east-1.awsapprunner.com/api';
   const AI_SERVICE_BASE = 'https://your-ai-service-url.us-east-1.awsapprunner.com';
   ```

## 🧪 Step 5: Test Deployment

### 5.1 Test Each Service
```bash
# Test Frontend
curl https://your-frontend-url.us-east-1.awsapprunner.com

# Test Backend
curl https://your-backend-url.us-east-1.awsapprunner.com/health

# Test AI Service
curl https://your-ai-service-url.us-east-1.awsapprunner.com/health
```

### 5.2 Test Complete Workflow
1. Open frontend URL in browser
2. Login as admin: `admin` / `letmein123`
3. Upload a PowerPoint file
4. Test training process
5. Generate new presentation

## 📊 Step 6: Monitor Services

### 6.1 App Runner Console
- Monitor service health
- View logs
- Check metrics

### 6.2 CloudWatch Logs
- Backend logs: `/aws/apprunner/your-backend-service/application`
- AI Service logs: `/aws/apprunner/your-ai-service/application`
- Frontend logs: `/aws/apprunner/your-frontend-service/application`

## 🔧 Step 7: Custom Domain (Optional)

### 7.1 Configure Custom Domain
1. Go to App Runner service
2. Click "Custom domains"
3. Add your domain
4. Update DNS records

### 7.2 SSL Certificate
- App Runner automatically provides SSL certificates
- No additional configuration needed

## 💰 Cost Optimization

### 7.1 Auto Scaling
- Configure minimum and maximum instances
- Set CPU and memory thresholds

### 7.2 Environment Variables
- Use AWS Systems Manager Parameter Store for sensitive data
- Reduce environment variable size

## 🚨 Troubleshooting

### Common Issues
1. **Build Failures**: Check build logs in App Runner console
2. **Service Unavailable**: Verify environment variables
3. **Database Connection**: Check RDS security groups
4. **S3 Access**: Verify IAM role permissions

### Debug Commands
```bash
# Check service status
aws apprunner describe-service --service-arn your-service-arn

# View recent logs
aws logs tail /aws/apprunner/your-service/application --follow
```

## 📞 Support

For issues:
1. Check App Runner service logs
2. Verify environment variables
3. Test database connectivity
4. Check S3 permissions

---

**🎉 Your Presentation Generator Platform is now running on AWS App Runner!**

**Benefits:**
- ✅ Fully managed infrastructure
- ✅ Automatic scaling
- ✅ Built-in SSL certificates
- ✅ Public URLs for all services
- ✅ Integrated monitoring and logging
