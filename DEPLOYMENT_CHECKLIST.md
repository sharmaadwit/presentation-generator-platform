# ✅ Railway Deployment Checklist

Follow this checklist to deploy your AI Presentation Generator Platform to Railway.

## 📋 Pre-Deployment Checklist

### 1. GitHub Repository Setup
- [ ] Create GitHub repository: `presentation-generator-platform`
- [ ] Make repository **Public** (required for Railway free tier)
- [ ] Push all code to GitHub
- [ ] Verify all files are committed and pushed

### 2. Railway Account Setup
- [ ] Create Railway account at https://railway.app
- [ ] Connect GitHub account to Railway
- [ ] Verify account has access to your repository

### 3. OpenAI API Key
- [ ] Get OpenAI API key from https://platform.openai.com/api-keys
- [ ] Ensure API key has sufficient credits
- [ ] Test API key works (optional but recommended)

## 🚀 Deployment Steps

### Step 1: Create Railway Project
- [ ] Go to Railway dashboard
- [ ] Click "New Project"
- [ ] Select "Deploy from GitHub repo"
- [ ] Choose `presentation-generator-platform` repository
- [ ] Wait for Railway to detect services

### Step 2: Configure Services
Railway should automatically detect these services:
- [ ] **Frontend** (React app)
- [ ] **Backend** (Node.js API)
- [ ] **AI Service** (Python FastAPI)
- [ ] **PostgreSQL** (Database)

### Step 3: Set Environment Variables

#### Frontend Service:
- [ ] `REACT_APP_API_URL` = `https://your-backend-url.railway.app`
- [ ] `REACT_APP_AI_SERVICE_URL` = `https://your-ai-service-url.railway.app`

#### Backend Service:
- [ ] `NODE_ENV` = `production`
- [ ] `PORT` = `3001`
- [ ] `DATABASE_URL` = (provided by Railway PostgreSQL)
- [ ] `JWT_SECRET` = (generate secure 32+ character string)
- [ ] `OPENAI_API_KEY` = `sk-your-openai-api-key`
- [ ] `UPLOAD_DIR` = `/app/uploads`
- [ ] `CORS_ORIGIN` = `https://your-frontend-url.railway.app`
- [ ] `AI_SERVICE_URL` = `https://your-ai-service-url.railway.app`

#### AI Service:
- [ ] `OPENAI_API_KEY` = `sk-your-openai-api-key`
- [ ] `BACKEND_URL` = `https://your-backend-url.railway.app`
- [ ] `DATABASE_URL` = (same as backend)

#### PostgreSQL Service:
- [ ] `POSTGRES_DB` = `presentation_generator`
- [ ] `POSTGRES_USER` = `postgres`
- [ ] `POSTGRES_PASSWORD` = (generate secure password)

### Step 4: Deploy Services
- [ ] Click "Deploy" for each service
- [ ] Wait for all services to be "Live"
- [ ] Note down the generated URLs

### Step 5: Update Environment Variables
- [ ] Update `REACT_APP_API_URL` with actual backend URL
- [ ] Update `REACT_APP_AI_SERVICE_URL` with actual AI service URL
- [ ] Update `CORS_ORIGIN` with actual frontend URL
- [ ] Update `BACKEND_URL` with actual backend URL
- [ ] Redeploy services after URL updates

## 🧪 Testing Checklist

### 1. Service Health Checks
- [ ] Frontend loads without errors
- [ ] Backend health endpoint responds: `/health`
- [ ] AI service health endpoint responds: `/health`
- [ ] Database connection is working

### 2. User Registration & Authentication
- [ ] Can register new user account
- [ ] Can login with credentials
- [ ] First user becomes admin automatically
- [ ] JWT tokens are generated correctly

### 3. Source Upload & Management
- [ ] Can upload presentation files (.pptx, .ppt, .pdf)
- [ ] Files are stored correctly
- [ ] Metadata is saved to database
- [ ] Admin can approve/reject sources
- [ ] Sources appear in approved list

### 4. Presentation Generation
- [ ] Can fill out generation form
- [ ] AI service processes requests
- [ ] PowerPoint files are generated
- [ ] Files can be downloaded
- [ ] Generated presentations contain content

### 5. Analytics Dashboard
- [ ] Admin dashboard loads
- [ ] Metrics are displayed correctly
- [ ] Charts and graphs render
- [ ] Data updates in real-time

## 🔧 Troubleshooting Checklist

### Common Issues:

#### Services Won't Start
- [ ] Check all environment variables are set
- [ ] Verify environment variable names are correct
- [ ] Check Railway logs for error messages
- [ ] Ensure all required variables are present

#### Database Connection Issues
- [ ] Verify DATABASE_URL is correct
- [ ] Check PostgreSQL service is running
- [ ] Ensure database credentials are valid
- [ ] Check if database tables are created

#### Frontend Not Loading
- [ ] Check REACT_APP_API_URL is correct
- [ ] Verify backend service is running
- [ ] Check CORS settings
- [ ] Look for JavaScript errors in browser console

#### AI Service Not Working
- [ ] Verify OPENAI_API_KEY is valid
- [ ] Check OpenAI API has sufficient credits
- [ ] Ensure backend URL is correct
- [ ] Check AI service logs for errors

#### File Upload Issues
- [ ] Check UPLOAD_DIR is set correctly
- [ ] Verify file size limits
- [ ] Check file type restrictions
- [ ] Ensure upload directory exists

## 📊 Post-Deployment Checklist

### 1. Initial Setup
- [ ] Create admin account (first user)
- [ ] Upload 5-10 test presentation sources
- [ ] Approve all uploaded sources
- [ ] Generate test presentation

### 2. User Management
- [ ] Create additional user accounts
- [ ] Test user permissions
- [ ] Verify admin controls work
- [ ] Test user registration flow

### 3. Content Management
- [ ] Upload diverse presentation sources
- [ ] Test different industries and use cases
- [ ] Verify source approval workflow
- [ ] Test source search and filtering

### 4. Performance Monitoring
- [ ] Check Railway metrics dashboard
- [ ] Monitor CPU and memory usage
- [ ] Check response times
- [ ] Monitor error rates

### 5. Security Verification
- [ ] Verify HTTPS is enabled
- [ ] Check JWT token security
- [ ] Test file upload security
- [ ] Verify admin access controls

## 🎯 Success Criteria

Your deployment is successful when:
- [ ] All services are running and healthy
- [ ] Users can register and login
- [ ] Sources can be uploaded and approved
- [ ] Presentations can be generated successfully
- [ ] Analytics dashboard shows data
- [ ] No critical errors in logs
- [ ] Response times are acceptable (< 5 seconds)

## 📞 Getting Help

If you encounter issues:

1. **Check Railway Logs**:
   - Go to your service in Railway dashboard
   - Click "Logs" tab
   - Look for error messages

2. **Test API Endpoints**:
   - Use Postman or curl to test backend endpoints
   - Check if services are responding

3. **Verify Environment Variables**:
   - Ensure all required variables are set
   - Check for typos in variable names

4. **Check Service Dependencies**:
   - Ensure services start in correct order
   - Check health check endpoints

5. **Review Documentation**:
   - Check QUICK_START_GUIDE.md
   - Review Railway documentation
   - Check service-specific logs

## 🚀 Next Steps After Deployment

Once your platform is running:

1. **Upload More Sources**: Add 20-50 presentation sources
2. **Train Your Team**: Show users how to generate presentations
3. **Monitor Usage**: Use analytics to optimize content
4. **Scale Up**: Upgrade Railway plan if needed
5. **Backup Data**: Set up regular database backups

---

**Ready to deploy? Let's get started! 🚀**

Follow this checklist step by step and you'll have your AI-powered presentation generator running on Railway in no time!
