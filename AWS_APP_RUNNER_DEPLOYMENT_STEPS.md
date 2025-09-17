# 🚀 AWS App Runner Deployment Steps

## **Step 1: Deploy AI Service (Python 3.13)**

### **1.1 Go to AWS App Runner Console**
1. Open [AWS App Runner Console](https://console.aws.amazon.com/apprunner/)
2. Click **"Create service"**

### **1.2 Configure Source**
1. **Source type**: Source code repository
2. **Connect to GitHub**: 
   - Click "Add new"
   - Authorize GitHub
   - Select repository: `sharmaadwit/presentation-generator-platform`
3. **Branch**: `main`
4. **Configuration file**: `ai-service/apprunner.yaml`

### **1.3 Configure Service**
1. **Service name**: `presentation-ai-service`
2. **Virtual CPU**: 0.25 vCPU
3. **Virtual memory**: 0.5 GB
4. **Environment variables**: (Already configured in apprunner.yaml)
   - `AWS_REGION=us-east-1`
   - `AWS_S3_BUCKET=adwit-test`
   - `OPENAI_API_KEY=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`

### **1.4 Deploy**
1. Click **"Create & deploy"**
2. Wait for deployment (5-10 minutes)
3. Note the **Service URL** (e.g., `https://abc123.us-east-1.awsapprunner.com`)

---

## **Step 2: Deploy Backend Service (Node.js 18)**

### **2.1 Create Another Service**
1. Click **"Create service"** again
2. **Source type**: Source code repository
3. **Repository**: Same GitHub repo
4. **Configuration file**: `apprunner.yaml`

### **2.2 Configure Service**
1. **Service name**: `presentation-backend-service`
2. **Virtual CPU**: 0.25 vCPU
3. **Virtual memory**: 0.5 GB
4. **Environment variables**: (Already configured)
   - `AWS_REGION=us-east-1`
   - `AWS_S3_BUCKET=adwit-test`
   - `JWT_SECRET=cytIEJDvP86Iw1i2O1CsM8k8zHNehHTA0iUtQDse8pk`
   - `AI_SERVICE_URL=YOUR_AI_SERVICE_URL` (Update after Step 1)
   - `FRONTEND_URL=YOUR_FRONTEND_URL` (Update after Step 3)

### **2.3 Update AI Service URL**
1. After AI service deploys, copy its URL
2. Update `AI_SERVICE_URL` in backend configuration
3. Deploy backend service

---

## **Step 3: Deploy Frontend (Static HTML)**

### **3.1 Upload to S3**
1. Go to [S3 Console](https://console.aws.amazon.com/s3/)
2. Open bucket: `adwit-test`
3. Upload entire `public/` folder contents
4. Enable static website hosting

### **3.2 Configure Static Website**
1. **Index document**: `index.html`
2. **Error document**: `index.html`
3. Note the **Website URL** (e.g., `http://adwit-test.s3-website-us-east-1.amazonaws.com`)

---

## **Step 4: Update Service URLs**

### **4.1 Update Backend Configuration**
1. Go to backend service in App Runner
2. Update environment variables:
   - `AI_SERVICE_URL` = Your AI service URL
   - `FRONTEND_URL` = Your S3 website URL
3. Redeploy backend service

---

## **Step 5: Test Deployment**

### **5.1 Test AI Service**
```bash
curl https://your-ai-service-url/health
# Should return: {"status":"healthy","service":"presentation-generator-ai","version":"1.0.0"}
```

### **5.2 Test Backend Service**
```bash
curl https://your-backend-service-url/health
# Should return: {"status":"OK","timestamp":"...","uptime":...}
```

### **5.3 Test Frontend**
1. Visit your S3 website URL
2. Should see the presentation generator interface

---

## **🔧 Troubleshooting**

### **Common Issues:**
1. **Service won't start**: Check environment variables
2. **S3 access denied**: Verify IAM permissions
3. **CORS errors**: Check frontend URL configuration
4. **Database errors**: Expected (we skipped DB setup)

### **IAM Permissions Needed:**
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
        "arn:aws:s3:::adwit-test",
        "arn:aws:s3:::adwit-test/*"
      ]
    }
  ]
}
```

---

## **📞 Need Help?**

If you encounter any issues:
1. Check the App Runner service logs
2. Verify environment variables
3. Test each service individually
4. Let me know what error you're seeing!

**Ready to start? Begin with Step 1! 🚀**
