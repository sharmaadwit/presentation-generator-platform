# 🚀 Railway Deployment Guide

This guide will help you deploy the Presentation Generator Platform to Railway using your GPT API keys.

## 📋 Prerequisites

- Railway account (free tier available)
- GPT API keys (OpenAI and/or Anthropic)
- Git repository with your code

## 🚀 Quick Deployment

### 1. Prepare Your Repository

Make sure your code is pushed to a Git repository (GitHub, GitLab, etc.).

### 2. Create Railway Projects

You'll need to create **3 separate Railway projects** for the different services:

#### Project 1: Database (PostgreSQL)
1. Go to [Railway](https://railway.app)
2. Click "New Project" → "Provision PostgreSQL"
3. Note down the `DATABASE_URL` from the Variables tab

#### Project 2: Backend API
1. Create new project → "Deploy from GitHub repo"
2. Select your repository
3. Set root directory to `backend`
4. Railway will auto-detect it's a Node.js project

#### Project 3: AI Service
1. Create new project → "Deploy from GitHub repo"
2. Select your repository
3. Set root directory to `ai-service`
4. Railway will auto-detect it's a Python project

#### Project 4: Frontend
1. Create new project → "Deploy from GitHub repo"
2. Select your repository
3. Set root directory to `frontend`
4. Railway will auto-detect it's a React project

### 3. Configure Environment Variables

For each project, add these environment variables:

#### Backend API Variables:
```env
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://postgres:password@host:port/database
JWT_SECRET=your_super_secure_jwt_secret_key_here
FRONTEND_URL=https://your-frontend-app.railway.app
AI_SERVICE_URL=https://your-ai-service.railway.app
```

#### AI Service Variables:
```env
DATABASE_URL=postgresql://postgres:password@host:port/database
OPENAI_API_KEY=sk-your_openai_api_key_here
PRESENTATION_OUTPUT_DIR=/app/generated_presentations
```

#### Frontend Variables:
```env
REACT_APP_API_URL=https://your-backend-api.railway.app/api
REACT_APP_AI_SERVICE_URL=https://your-ai-service.railway.app
```

### 4. Deploy Services

1. **Deploy Database first** - Wait for it to be ready
2. **Deploy Backend API** - It will connect to the database
3. **Deploy AI Service** - It will also connect to the database
4. **Deploy Frontend** - It will connect to the backend API

### 5. Update Service URLs

After deployment, update the environment variables with the actual Railway URLs:

1. Get the Railway URL for your backend API
2. Get the Railway URL for your AI service
3. Update the frontend environment variables with these URLs
4. Redeploy the frontend

## 🔧 Advanced Configuration

### Custom Domains

You can add custom domains in Railway:
1. Go to your project settings
2. Click "Domains"
3. Add your custom domain
4. Update DNS records as instructed

### Environment-Specific Settings

Create different environments for development and production:

```env
# Development
NODE_ENV=development
LOG_LEVEL=debug

# Production
NODE_ENV=production
LOG_LEVEL=info
```

### Resource Limits

Railway free tier includes:
- 500 hours of usage per month
- 1GB RAM per service
- 1GB disk space

For production, consider upgrading to:
- Pro plan ($5/month per service)
- More resources and better performance

## 📊 Monitoring and Logs

### View Logs
1. Go to your Railway project
2. Click on the service
3. View real-time logs in the "Logs" tab

### Health Checks
Each service includes health check endpoints:
- Backend: `https://your-backend.railway.app/health`
- AI Service: `https://your-ai-service.railway.app/health`
- Frontend: `https://your-frontend.railway.app/health`

### Metrics
Railway provides basic metrics:
- CPU usage
- Memory usage
- Network I/O
- Request count

## 🔒 Security Considerations

### Environment Variables
- Never commit API keys to Git
- Use Railway's environment variable system
- Rotate keys regularly

### Database Security
- Use strong passwords
- Enable SSL connections
- Regular backups

### API Security
- JWT tokens for authentication
- Rate limiting
- CORS configuration
- Input validation

## 🚨 Troubleshooting

### Common Issues

#### 1. Database Connection Failed
```
Error: connect ECONNREFUSED
```
**Solution**: Check DATABASE_URL format and ensure database is running

#### 2. AI Service Not Responding
```
Error: AI service unavailable
```
**Solution**: Check OPENAI_API_KEY and ANTHROPIC_API_KEY

#### 3. Frontend Build Failed
```
Error: Build failed
```
**Solution**: Check REACT_APP_* environment variables

#### 4. CORS Errors
```
Error: CORS policy
```
**Solution**: Update FRONTEND_URL in backend environment variables

### Debug Steps

1. **Check Logs**: Look at Railway logs for error messages
2. **Verify Environment Variables**: Ensure all required variables are set
3. **Test Health Endpoints**: Verify services are running
4. **Check Database**: Ensure database is accessible
5. **Verify API Keys**: Test API keys independently

### Getting Help

1. Railway Documentation: https://docs.railway.app
2. Railway Discord: https://discord.gg/railway
3. Check service logs for specific error messages

## 📈 Scaling

### Horizontal Scaling
- Railway automatically handles load balancing
- Add more instances if needed
- Monitor resource usage

### Vertical Scaling
- Upgrade to higher resource tiers
- Optimize code for better performance
- Use caching strategies

### Database Scaling
- Consider read replicas for heavy read workloads
- Implement connection pooling
- Monitor query performance

## 🔄 Updates and Maintenance

### Deploying Updates
1. Push changes to your Git repository
2. Railway automatically redeploys
3. Monitor logs for any issues

### Database Migrations
- Run migrations through the backend API
- Test in development first
- Backup before major changes

### Monitoring
- Set up alerts for critical errors
- Monitor resource usage
- Regular health checks

## 💰 Cost Optimization

### Free Tier Usage
- Monitor usage hours
- Optimize resource usage
- Use efficient algorithms

### Pro Tier Benefits
- Better performance
- More resources
- Priority support
- Custom domains

## 🎯 Production Checklist

- [ ] All environment variables configured
- [ ] Database properly set up
- [ ] API keys working
- [ ] Health checks passing
- [ ] Custom domain configured (if needed)
- [ ] SSL certificates working
- [ ] Monitoring set up
- [ ] Backup strategy in place
- [ ] Error handling implemented
- [ ] Performance optimized

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section
2. Review Railway documentation
3. Check service logs
4. Contact Railway support if needed

---

**Happy Deploying! 🚀**

Your Presentation Generator Platform should now be running on Railway with full AI capabilities using your GPT API keys.
