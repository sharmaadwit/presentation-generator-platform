#!/bin/bash

echo "🚀 AWS App Runner Deployment Setup"
echo "=================================="

# Check if required tools are installed
echo "🔍 Checking prerequisites..."

if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found. Please install it first:"
    echo "   https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
fi

if ! command -v git &> /dev/null; then
    echo "❌ Git not found. Please install it first."
    exit 1
fi

echo "✅ Prerequisites check passed"
echo ""

# Create environment file template
echo "📝 Creating environment configuration template..."

cat > .env.template << EOF
# AWS Configuration
AWS_REGION=us-east-1
AWS_S3_BUCKET=YOUR_S3_BUCKET_NAME

# Security
JWT_SECRET=YOUR_JWT_SECRET_KEY

# Service URLs (will be updated after deployment)
AI_SERVICE_URL=YOUR_AI_SERVICE_URL
FRONTEND_URL=YOUR_FRONTEND_URL

# OpenAI (optional)
OPENAI_API_KEY=YOUR_OPENAI_API_KEY
EOF

echo "✅ Created .env.template"
echo ""

# Create deployment checklist
echo "📋 Creating deployment checklist..."

cat > DEPLOYMENT_CHECKLIST.md << 'EOF'
# Deployment Checklist

## Pre-Deployment
- [ ] Replace placeholders in `backend/src/config/awsCredentials.json`
- [ ] Replace placeholders in `apprunner.yaml` 
- [ ] Replace placeholders in `ai-service/apprunner.yaml`
- [ ] Generate secure JWT secret
- [ ] Get OpenAI API key (optional)

## Deployment Order
1. [ ] Deploy AI Service (Python 3.13)
2. [ ] Deploy Backend Service (Node.js 18)
3. [ ] Deploy Frontend (Static HTML)
4. [ ] Update service URLs in configuration
5. [ ] Test all services

## Post-Deployment
- [ ] Test AI service health endpoint
- [ ] Test backend service health endpoint
- [ ] Test frontend loads correctly
- [ ] Test file upload to S3
- [ ] Verify CORS settings

## Database (Optional)
- [ ] Set up PostgreSQL (when ready)
- [ ] Update DATABASE_URL environment variable
- [ ] Test database connectivity
EOF

echo "✅ Created DEPLOYMENT_CHECKLIST.md"
echo ""

# Generate JWT secret
echo "🔐 Generating JWT secret..."

JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_urlsafe(32))" 2>/dev/null || echo "CHANGE_THIS_SECRET_KEY_$(date +%s)")

echo "Generated JWT secret: $JWT_SECRET"
echo ""

# Update apprunner.yaml with generated secret
echo "📝 Updating configuration files..."

# Update backend apprunner.yaml
sed -i.bak "s/YOUR_JWT_SECRET_KEY/$JWT_SECRET/g" apprunner.yaml

# Update AI service apprunner.yaml  
sed -i.bak "s/YOUR_JWT_SECRET_KEY/$JWT_SECRET/g" ai-service/apprunner.yaml

echo "✅ Updated configuration files with generated JWT secret"
echo ""

echo "🎯 Next Steps:"
echo "1. Replace 'YOUR_S3_BUCKET_NAME' with your actual bucket name"
echo "2. Replace 'YOUR_OPENAI_API_KEY' with your OpenAI key (optional)"
echo "3. Follow the DEPLOYMENT_CHECKLIST.md"
echo "4. Deploy services in order: AI → Backend → Frontend"
echo ""
echo "📚 See AWS_DEPLOYMENT_GUIDE.md for detailed instructions"
echo ""
echo "✅ Setup complete! Ready for deployment."
