# 🚀 Quick Start Guide

This guide will get your AI-powered presentation generator platform up and running on Railway in under 30 minutes.

## 📋 Prerequisites

- ✅ GitHub account
- ✅ Railway account (free tier available)
- ✅ OpenAI API key
- ✅ PostgreSQL database (Railway provides this)

## 🎯 Step-by-Step Setup

### Step 1: Create GitHub Repository

1. **Go to GitHub** and create a new repository
   - Repository name: `presentation-generator-platform`
   - Description: `AI-powered presentation generator with guardrailed sources`
   - Make it **Public** (required for Railway free tier)
   - Don't initialize with README (we already have one)

2. **Push your code to GitHub**
   ```bash
   # In your project directory
   git init
   git add .
   git commit -m "Initial commit: AI presentation generator platform"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/presentation-generator-platform.git
   git push -u origin main
   ```

### Step 2: Set Up Railway Project

1. **Go to Railway** (https://railway.app)
   - Sign up/Login with GitHub
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your `presentation-generator-platform` repository

2. **Configure Services**
   - Railway will detect the `docker-compose.yml` file
   - It will automatically create services for:
     - Frontend (React app)
     - Backend (Node.js API)
     - AI Service (Python FastAPI)
     - PostgreSQL database

### Step 3: Configure Environment Variables

1. **In Railway Dashboard**, go to your project
2. **Click on each service** and add environment variables:

#### Frontend Service:
```
REACT_APP_API_URL=https://your-backend-url.railway.app
REACT_APP_AI_SERVICE_URL=https://your-ai-service-url.railway.app
```

#### Backend Service:
```
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://username:password@host:port/database
JWT_SECRET=your-super-secret-jwt-key
OPENAI_API_KEY=your-openai-api-key
UPLOAD_DIR=/app/uploads
```

#### AI Service:
```
OPENAI_API_KEY=your-openai-api-key
BACKEND_URL=https://your-backend-url.railway.app
```

### Step 4: Get Your URLs

1. **After deployment**, Railway will provide URLs for each service:
   - Frontend: `https://your-frontend.railway.app`
   - Backend: `https://your-backend.railway.app`
   - AI Service: `https://your-ai-service.railway.app`

2. **Update environment variables** with the actual URLs

### Step 5: Initialize Database

1. **The database will be automatically created** by Railway
2. **Tables will be created** when the backend starts up
3. **No manual database setup required**

### Step 6: Test Your Deployment

1. **Visit your frontend URL**
2. **Create an admin account** (first user becomes admin)
3. **Upload your first presentation source**
4. **Generate a test presentation**

## 🔧 Detailed Setup Instructions

### GitHub Repository Setup

```bash
# 1. Initialize git repository
git init

# 2. Add all files
git add .

# 3. Create initial commit
git commit -m "Initial commit: AI presentation generator platform"

# 4. Set main branch
git branch -M main

# 5. Add remote origin (replace with your GitHub URL)
git remote add origin https://github.com/YOUR_USERNAME/presentation-generator-platform.git

# 6. Push to GitHub
git push -u origin main
```

### Railway Project Setup

1. **Go to Railway.app**
2. **Click "New Project"**
3. **Select "Deploy from GitHub repo"**
4. **Choose your repository**
5. **Railway will automatically detect the docker-compose.yml**

### Environment Variables Configuration

#### Frontend (.env.production):
```env
REACT_APP_API_URL=https://your-backend-url.railway.app
REACT_APP_AI_SERVICE_URL=https://your-ai-service-url.railway.app
```

#### Backend (.env.production):
```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://username:password@host:port/database
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
OPENAI_API_KEY=sk-your-openai-api-key
UPLOAD_DIR=/app/uploads
CORS_ORIGIN=https://your-frontend-url.railway.app
```

#### AI Service (.env.production):
```env
OPENAI_API_KEY=sk-your-openai-api-key
BACKEND_URL=https://your-backend-url.railway.app
```

## 🎯 First Steps After Deployment

### 1. Create Admin Account
- Visit your frontend URL
- Register the first account (automatically becomes admin)
- Login and access the admin dashboard

### 2. Upload Your First Sources
- Go to "Sources" section
- Upload 3-5 presentation files (.pptx, .ppt, .pdf)
- Fill in metadata (title, description, industry, tags)
- Approve the sources in admin dashboard

### 3. Test Presentation Generation
- Go to "Generate Presentation"
- Fill in the form:
  - Customer: "Test Customer"
  - Industry: Select from your uploaded sources
  - Use Case: "Product Demo"
  - Target Audience: "Decision Makers"
  - Length: "10-15 slides"
- Click "Generate Presentation"
- Download the generated PowerPoint file

### 4. Set Up Analytics
- Go to "Analytics" dashboard
- View metrics and usage patterns
- Monitor source performance

## 🔍 Troubleshooting

### Common Issues:

#### 1. Services Not Starting
- Check environment variables are set correctly
- Ensure all required variables are present
- Check Railway logs for errors

#### 2. Database Connection Issues
- Verify DATABASE_URL is correct
- Check if PostgreSQL service is running
- Ensure database credentials are valid

#### 3. Frontend Not Loading
- Check REACT_APP_API_URL is correct
- Verify backend service is running
- Check CORS settings

#### 4. AI Service Not Working
- Verify OPENAI_API_KEY is valid
- Check if OpenAI API has sufficient credits
- Ensure backend URL is correct

### Getting Help:

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

## 📊 Monitoring Your Deployment

### Railway Dashboard:
- **Services**: Monitor CPU, memory, and network usage
- **Logs**: View real-time logs for debugging
- **Metrics**: Track performance and usage

### Application Monitoring:
- **Admin Dashboard**: View user activity and source usage
- **Analytics**: Track presentation generation metrics
- **Source Management**: Monitor uploaded sources

## 🚀 Next Steps

Once your platform is running:

1. **Upload More Sources**: Add 20-50 presentation sources
2. **Train Your Team**: Show users how to generate presentations
3. **Monitor Usage**: Use analytics to optimize content
4. **Scale Up**: Upgrade Railway plan if needed

## 💡 Pro Tips

1. **Start Small**: Upload 5-10 high-quality sources first
2. **Test Thoroughly**: Generate presentations for different use cases
3. **Monitor Performance**: Watch Railway metrics and logs
4. **Backup Data**: Export important sources regularly
5. **Update Regularly**: Keep dependencies updated

---

**Ready to deploy? Let's get started! 🚀**

Follow these steps and you'll have your AI-powered presentation generator running in no time!
