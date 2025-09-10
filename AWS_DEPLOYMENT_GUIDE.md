# AWS App Runner Deployment Guide

## 🚀 Complete Setup Checklist

### ✅ What You Have
- **Server IP**: 10.232.105.207
- **IAM Access**: Configured
- **S3 Bucket**: Ready

### 🔧 What You Need to Configure

## 1. AWS Credentials Setup

### Option A: IAM Role (Recommended)
Your App Runner services will use IAM roles automatically.

### Option B: Environment Variables
Update these files with your actual values:

**Backend (`backend/src/config/awsCredentials.json`):**
```json
{
  "accessKeyId": "YOUR_ACTUAL_ACCESS_KEY",
  "secretAccessKey": "YOUR_ACTUAL_SECRET_KEY",
  "region": "us-east-1", 
  "bucketName": "YOUR_ACTUAL_BUCKET_NAME"
}
```

## 2. Environment Variables

### Backend Service (`apprunner.yaml`)
Replace these placeholders:
- `YOUR_S3_BUCKET_NAME` → Your actual S3 bucket name
- `YOUR_JWT_SECRET_KEY` → Generate a secure JWT secret
- `YOUR_AI_SERVICE_URL` → Will be provided after AI service deployment
- `YOUR_FRONTEND_URL` → Will be provided after frontend deployment

### AI Service (`ai-service/apprunner.yaml`)
Replace these placeholders:
- `YOUR_S3_BUCKET_NAME` → Your actual S3 bucket name
- `YOUR_OPENAI_API_KEY` → Your OpenAI API key

## 3. Deployment Steps

### Step 1: Deploy AI Service
1. Go to AWS App Runner Console
2. Create new service
3. Source: GitHub (connect your repo)
4. Configuration: Use `ai-service/apprunner.yaml`
5. Service name: `presentation-ai-service`

### Step 2: Deploy Backend Service
1. Create another App Runner service
2. Source: GitHub (same repo)
3. Configuration: Use `apprunner.yaml`
4. Service name: `presentation-backend-service`

### Step 3: Deploy Frontend
1. Upload `public/` folder to S3
2. Enable static website hosting
3. Or use AWS Amplify for easier setup

## 4. Service URLs

After deployment, you'll get URLs like:
- **AI Service**: `https://abc123.us-east-1.awsapprunner.com`
- **Backend Service**: `https://def456.us-east-1.awsapprunner.com`
- **Frontend**: `https://your-bucket.s3-website-us-east-1.amazonaws.com`

## 5. Update Configuration

Once you have the URLs, update:
1. `AI_SERVICE_URL` in backend `apprunner.yaml`
2. `FRONTEND_URL` in backend `apprunner.yaml`
3. API endpoints in frontend `public/js/app.js`

## 6. IAM Permissions Required

Your IAM role needs these permissions:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject", 
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::your-bucket-name",
        "arn:aws:s3:::your-bucket-name/*"
      ]
    }
  ]
}
```

## 7. Testing

### Test AI Service
```bash
curl https://your-ai-service-url/health
```

### Test Backend Service
```bash
curl https://your-backend-service-url/api/health
```

### Test Frontend
Visit your S3 website URL

## 8. Database (Optional for Now)

The app will work without a database for basic file operations. Database features will be disabled until you set up PostgreSQL.

## 🎯 Next Steps

1. **Replace placeholders** with your actual values
2. **Deploy AI service first** (it's independent)
3. **Deploy backend service** (depends on AI service URL)
4. **Deploy frontend** (depends on backend service URL)
5. **Test all services** are working
6. **Set up database later** when ready

## 📞 Need Help?

If you get stuck on any step, just let me know what error you're seeing and I'll help you fix it!
