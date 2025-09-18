#!/bin/bash

# Deploy AI Service to AWS App Runner
# Replace YOUR_ACCOUNT_ID with your actual AWS Account ID

ACCOUNT_ID="YOUR_ACCOUNT_ID"
REGION="us-east-1"

echo "🤖 Deploying AI Service to AWS App Runner..."

aws apprunner create-service \
  --service-name "presentation-generator-ai" \
  --source-configuration '{
    "CodeRepository": {
      "RepositoryUrl": "https://github.com/sharmaadwit/presentation-generator-platform",
      "SourceCodeVersion": {
        "Type": "BRANCH",
        "Value": "main"
      },
      "SourceDirectory": "ai-service"
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
    "PYTHONPATH": "/app",
    "PYTHONUNBUFFERED": "1",
    "AWS_REGION": "us-east-1",
    "AWS_S3_BUCKET": "adwit-test",
    "OPENAI_API_KEY": "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",
    "DATABASE_URL": "postgresql://app_user:your_password@your-rds-endpoint:5432/presentation_generator"
  }'

echo "✅ AI service deployment initiated!"
echo "📋 Check AWS Console for deployment status"
