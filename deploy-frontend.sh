#!/bin/bash

# Deploy Frontend Service to AWS App Runner
# Replace YOUR_ACCOUNT_ID with your actual AWS Account ID

ACCOUNT_ID="YOUR_ACCOUNT_ID"
REGION="us-east-1"

echo "🌐 Deploying Frontend Service to AWS App Runner..."

aws apprunner create-service \
  --service-name "presentation-generator-frontend" \
  --source-configuration '{
    "CodeRepository": {
      "RepositoryUrl": "https://github.com/sharmaadwit/presentation-generator-platform",
      "SourceCodeVersion": {
        "Type": "BRANCH",
        "Value": "main"
      },
      "SourceDirectory": "public"
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
    "Path": "/",
    "Interval": 10,
    "Timeout": 5,
    "HealthyThreshold": 1,
    "UnhealthyThreshold": 5
  }' \
  --environment-variables '{
    "NODE_ENV": "production",
    "PORT": "3000"
  }'

echo "✅ Frontend service deployment initiated!"
echo "📋 Check AWS Console for deployment status"
