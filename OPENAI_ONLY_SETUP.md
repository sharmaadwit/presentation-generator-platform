# 🤖 OpenAI-Only Setup Guide

This platform is now optimized to work exclusively with **OpenAI GPT models**. No other LLM providers are needed!

## 🔑 Required API Key

You only need **one API key**:
- **OpenAI API Key**: Get it from [OpenAI Platform](https://platform.openai.com/api-keys)

## ⚙️ Environment Variables

### Local Development (.env)
```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/presentation_generator

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here

# OpenAI API Key (REQUIRED)
OPENAI_API_KEY=sk-your_openai_api_key_here

# Service URLs
FRONTEND_URL=http://localhost:3000
AI_SERVICE_URL=http://localhost:8000
```

### Railway Deployment
```env
# Database (Railway provides this)
DATABASE_URL=postgresql://postgres:password@host:port/database

# JWT Configuration
JWT_SECRET=your_super_secure_jwt_secret_key_here

# OpenAI API Key (REQUIRED)
OPENAI_API_KEY=sk-your_openai_api_key_here

# Service URLs (update with your Railway URLs)
FRONTEND_URL=https://your-frontend-app.railway.app
AI_SERVICE_URL=https://your-ai-service.railway.app
REACT_APP_API_URL=https://your-backend-api.railway.app/api
REACT_APP_AI_SERVICE_URL=https://your-ai-service.railway.app
```

## 🚀 Quick Start

### 1. Get Your OpenAI API Key
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the key (starts with `sk-`)

### 2. Set Up Environment
```bash
# Copy environment template
cp env.example .env

# Edit .env and add your OpenAI API key
OPENAI_API_KEY=sk-your_actual_api_key_here
```

### 3. Install and Run
```bash
# Install all dependencies
./setup.sh

# Start all services
npm run dev
```

## 💰 Cost Optimization

### OpenAI Usage Patterns
- **GPT-4**: Used for slide analysis and content matching
- **Efficient Batching**: Multiple slides analyzed in single API calls
- **Smart Caching**: Avoids redundant API calls
- **Fallback Logic**: Graceful degradation when API is unavailable

### Estimated Costs
- **Slide Analysis**: ~$0.01-0.05 per presentation
- **Content Matching**: ~$0.02-0.10 per presentation
- **Monthly Usage**: $10-50 for moderate usage (100-500 presentations)

### Cost-Saving Tips
1. **Use GPT-3.5-turbo** for simple tasks (modify in code)
2. **Batch requests** when possible
3. **Cache results** to avoid re-processing
4. **Set usage limits** in OpenAI dashboard

## 🔧 Configuration Options

### Model Selection
You can modify the AI service to use different OpenAI models:

```python
# In ai-service/services/content_matcher.py
response = self.openai_client.chat.completions.create(
    model="gpt-4",  # Change to "gpt-3.5-turbo" for lower costs
    messages=[{"role": "user", "content": prompt}],
    temperature=0.3,
    max_tokens=1000
)
```

### API Rate Limits
- **Free Tier**: 3 requests per minute
- **Paid Tier**: 3,500 requests per minute
- **Rate Limiting**: Built-in retry logic with exponential backoff

## 🛠️ Troubleshooting

### Common Issues

#### 1. "OpenAI API Key not found"
```
Error: OPENAI_API_KEY not found. AI features will be disabled.
```
**Solution**: Check your .env file and ensure the API key is correctly set

#### 2. "Rate limit exceeded"
```
Error: Rate limit exceeded
```
**Solution**: Wait a few minutes or upgrade your OpenAI plan

#### 3. "Insufficient quota"
```
Error: Insufficient quota
```
**Solution**: Add payment method to your OpenAI account

#### 4. "Invalid API key"
```
Error: Invalid API key
```
**Solution**: Verify your API key is correct and active

### Debug Steps
1. **Check API Key**: Verify it starts with `sk-` and is active
2. **Test API Key**: Use OpenAI's playground to test
3. **Check Logs**: Look at AI service logs for specific errors
4. **Verify Environment**: Ensure variables are loaded correctly

## 📊 Monitoring Usage

### OpenAI Dashboard
1. Go to [OpenAI Usage Dashboard](https://platform.openai.com/usage)
2. Monitor your API usage
3. Set up billing alerts
4. Track costs by model

### Application Logs
The AI service logs all API calls:
```
INFO: OpenAI client initialized successfully
INFO: Analyzing 5 slides with OpenAI GPT-4
INFO: API call successful, processed 5 slides
```

## 🔒 Security Best Practices

### API Key Security
- **Never commit** API keys to Git
- **Use environment variables** only
- **Rotate keys** regularly
- **Monitor usage** for anomalies

### Cost Control
- **Set spending limits** in OpenAI dashboard
- **Monitor usage** daily
- **Use cheaper models** when appropriate
- **Implement caching** to reduce API calls

## 🎯 Production Recommendations

### For High Volume
- **Upgrade OpenAI plan** for higher rate limits
- **Implement caching** for repeated requests
- **Use batch processing** for multiple presentations
- **Monitor costs** closely

### For Cost Sensitivity
- **Use GPT-3.5-turbo** instead of GPT-4
- **Implement smart caching**
- **Optimize prompts** for efficiency
- **Set strict usage limits**

## 📞 Support

### OpenAI Support
- **Documentation**: https://platform.openai.com/docs
- **Community**: https://community.openai.com
- **Support**: https://help.openai.com

### Application Support
- Check logs for specific error messages
- Verify environment variables
- Test API key independently
- Review OpenAI usage dashboard

---

**You're all set! 🚀** 

With just your OpenAI API key, you have a fully functional AI-powered presentation generator that can analyze slides, match content, and create custom presentations using only approved sources.
