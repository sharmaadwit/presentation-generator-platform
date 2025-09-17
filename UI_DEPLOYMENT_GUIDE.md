# 🚀 AWS App Runner UI Deployment Guide

## **Prerequisites ✅**
- **AWS Account**: You have access
- **S3 Bucket**: `adwit-test` 
- **GitHub Repository**: `sharmaadwit/presentation-generator-platform`
- **Server IP**: 10.232.105.207 (for future reference)

## **Step 1: Deploy AI Service (Python 3.13)**

### **1.1 Open AWS App Runner Console**
1. Go to: https://console.aws.amazon.com/apprunner/
2. Click **"Create service"**

### **1.2 Configure Source**
1. **Source type**: Source code repository
2. **Connect to GitHub**: 
   - Click "Add new"
   - Authorize GitHub
   - Select: `sharmaadwit/presentation-generator-platform`
3. **Branch**: `main`
4. **Configuration file**: `ai-service/apprunner.yaml`

### **1.3 Configure Service**
1. **Service name**: `presentation-ai-service`
2. **Virtual CPU**: 0.25 vCPU
3. **Virtual memory**: 0.5 GB
4. **Environment variables**: (Already configured)
   - `AWS_REGION=us-east-1`
   - `AWS_S3_BUCKET=adwit-test`
   - `OPENAI_API_KEY=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`

### **1.4 Deploy**
1. Click **"Create & deploy"**
2. Wait 5-10 minutes
3. **Copy the Service URL** (e.g., `https://abc123.us-east-1.awsapprunner.com`)

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
2. Go to backend service → Configuration → Environment variables
3. Update `AI_SERVICE_URL` with your AI service URL
4. Click **"Save"** and **"Deploy"**

---

## **Step 3: Deploy Frontend (Static HTML)**

### **3.1 Upload to S3**
1. Go to: https://console.aws.amazon.com/s3/
2. Open bucket: `adwit-test`
3. Click **"Upload"**
4. Upload entire `public/` folder contents:
   - `index.html`
   - `js/` folder
   - All other files

### **3.2 Enable Static Website Hosting**
1. Go to bucket **"Properties"** tab
2. Scroll to **"Static website hosting"**
3. Click **"Edit"**
4. **Enable**: Static website hosting
5. **Index document**: `index.html`
6. **Error document**: `index.html`
7. Click **"Save changes"**

### **3.3 Get Website URL**
1. Go to **"Properties"** tab
2. Scroll to **"Static website hosting"**
3. **Copy the Bucket website endpoint** (e.g., `http://adwit-test.s3-website-us-east-1.amazonaws.com`)

---

## **Step 4: Update Service URLs**

### **4.1 Update Backend Configuration**
1. Go to backend service in App Runner
2. Click **"Configuration"** tab
3. Click **"Edit"** in Environment variables
4. Update:
   - `AI_SERVICE_URL` = Your AI service URL
   - `FRONTEND_URL` = Your S3 website URL
5. Click **"Save"** and **"Deploy"**

---

## **Step 5: Test Your Deployment**

### **5.1 Test AI Service**
Visit: `https://your-ai-service-url/health`
Should return: `{"status":"healthy","service":"presentation-generator-ai","version":"1.0.0"}`

### **5.2 Test Backend Service**
Visit: `https://your-backend-service-url/health`
Should return: `{"status":"OK","timestamp":"...","uptime":...}`

### **5.3 Test Frontend**
Visit: Your S3 website URL
Should see: Presentation Generator Platform interface

---

## **🎯 Your Service URLs Will Look Like:**
- **AI Service**: `https://abc123.us-east-1.awsapprunner.com`
- **Backend Service**: `https://def456.us-east-1.awsapprunner.com`
- **Frontend**: `http://adwit-test.s3-website-us-east-1.amazonaws.com`

## **📞 Need Help?**
If you encounter any issues:
1. Check the App Runner service logs
2. Verify environment variables are correct
3. Make sure S3 bucket permissions are set correctly

**Ready to start? Begin with Step 1! 🚀**
