#!/bin/bash

# Setup IAM Role for App Runner
# Replace YOUR_ACCOUNT_ID with your actual AWS Account ID

ACCOUNT_ID="YOUR_ACCOUNT_ID"
REGION="us-east-1"

echo "🔧 Setting up IAM Role for App Runner..."

# Create trust policy
cat > apprunner-trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "build.apprunner.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create IAM role
aws iam create-role \
  --role-name AppRunnerInstanceRole \
  --assume-role-policy-document file://apprunner-trust-policy.json

# Attach S3 policy
aws iam attach-role-policy \
  --role-name AppRunnerInstanceRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess

# Attach RDS policy
aws iam attach-role-policy \
  --role-name AppRunnerInstanceRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonRDSFullAccess

echo "✅ IAM Role created successfully!"
echo "📋 Role ARN: arn:aws:iam::$ACCOUNT_ID:role/AppRunnerInstanceRole"

# Clean up
rm apprunner-trust-policy.json
