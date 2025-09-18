#!/bin/bash

# Deploy Backend Service to AWS App Runner
# Replace YOUR_ACCOUNT_ID with your actual AWS Account ID

ACCOUNT_ID="YOUR_ACCOUNT_ID"
REGION="us-east-1"

echo "🚀 Deploying Backend Service to AWS App Runner..."

aws apprunner create-service \
  --service-name "presentation-generator-backend" \
  --source-configuration '{
    "CodeRepository": {
      "RepositoryUrl": "https://github.com/sharmaadwit/presentation-generator-platform",
      "SourceCodeVersion": {
        "Type": "BRANCH",
        "Value": "main"
      },
      "SourceDirectory": "backend"
    },
    "AutoDeploymentsEnabled": true
  }' \
  --instance-configuration '{
    "Cpu": "0.25 vCPU",
    "Memory": "0.5 GB",
    "InstanceRoleArn": "arn:aws:iam::'$ACCOUNT_ID':role/AppRunnerInstanceRole"
  }' \
  --auto-scaling-configuration-arn "arn:aws:apprunner:'$REGION':'$ACCOUNT_ID':autoscalingconfiguration/DefaultConfiguration/1/00000000000000000000000000000001" \
  --health-check-configuration '{
    "Protocol": "HTTP",
    "Path": "/health",
    "Interval": 10,
    "Timeout": 5,
    "HealthyThreshold": 1,
    "UnhealthyThreshold": 5
  }' \
  --environment-variables '{
    "NODE_ENV": "production",
    "PORT": "5000",
    "DATABASE_URL": "postgresql://app_user:your_password@your-rds-endpoint:5432/presentation_generator",
    "AWS_REGION": "us-east-1",
    "AWS_S3_BUCKET": "adwit-test",
    "JWT_SECRET": "cytIEJDvP86Iw1i2O1CsM8k8zHNehHTA0iUtQDse8pk",
    "AI_SERVICE_URL": "YOUR_AI_SERVICE_URL",
    "FRONTEND_URL": "YOUR_FRONTEND_URL"
  }'

echo "✅ Backend service deployment initiated!"
echo "📋 Check AWS Console for deployment status"
