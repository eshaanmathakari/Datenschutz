#!/bin/bash

# Datenschutz VS Code Extension - IAM User Setup Script

set -e

# Configuration
USER_NAME=${USER_NAME:-Datenschutz}
POLICY_NAME=${POLICY_NAME:-DatenschutzDeploymentPolicy}
AWS_REGION=${AWS_REGION:-us-east-1}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}Setting up IAM user and policies for Datenschutz deployment...${NC}"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Get current AWS account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
if [ -z "$AWS_ACCOUNT_ID" ]; then
    echo -e "${RED}Error: Could not get AWS account ID. Please check your AWS credentials.${NC}"
    exit 1
fi

echo -e "${YELLOW}AWS Account ID: ${AWS_ACCOUNT_ID}${NC}"
echo -e "${YELLOW}AWS Region: ${AWS_REGION}${NC}"
echo -e "${YELLOW}IAM User Name: ${USER_NAME}${NC}"

# Step 1: Create IAM policy
echo -e "${GREEN}Step 1: Creating IAM policy...${NC}"
aws iam create-policy \
    --policy-name ${POLICY_NAME} \
    --policy-document file://iam-setup.json \
    --description "Policy for Datenschutz VS Code Extension deployment" \
    --region ${AWS_REGION} 2>/dev/null || {
    echo -e "${YELLOW}Policy already exists, updating...${NC}"
    aws iam create-policy-version \
        --policy-arn arn:aws:iam::${AWS_ACCOUNT_ID}:policy/${POLICY_NAME} \
        --policy-document file://iam-setup.json \
        --set-as-default
}

# Step 2: Create IAM user
echo -e "${GREEN}Step 2: Creating IAM user...${NC}"
aws iam create-user --user-name ${USER_NAME} 2>/dev/null || {
    echo -e "${YELLOW}User already exists.${NC}"
}

# Step 3: Attach policy to user
echo -e "${GREEN}Step 3: Attaching policy to user...${NC}"
aws iam attach-user-policy \
    --user-name ${USER_NAME} \
    --policy-arn arn:aws:iam::${AWS_ACCOUNT_ID}:policy/${POLICY_NAME}

# Step 4: Create access keys
echo -e "${GREEN}Step 4: Creating access keys...${NC}"
ACCESS_KEY_OUTPUT=$(aws iam create-access-key --user-name ${USER_NAME} --output json)
ACCESS_KEY_ID=$(echo $ACCESS_KEY_OUTPUT | jq -r '.AccessKey.AccessKeyId')
SECRET_ACCESS_KEY=$(echo $ACCESS_KEY_OUTPUT | jq -r '.AccessKey.SecretAccessKey')

# Step 5: Save credentials to file
echo -e "${GREEN}Step 5: Saving credentials...${NC}"
cat > .aws-credentials << EOF
[default]
aws_access_key_id = ${ACCESS_KEY_ID}
aws_secret_access_key = ${SECRET_ACCESS_KEY}
region = ${AWS_REGION}
EOF

# Step 6: Create AWS config file
cat > .aws-config << EOF
[default]
region = ${AWS_REGION}
output = json
EOF

echo -e "${GREEN}IAM setup completed successfully!${NC}"
echo -e "${YELLOW}Access Key ID: ${ACCESS_KEY_ID}${NC}"
echo -e "${YELLOW}Secret Access Key: ${SECRET_ACCESS_KEY}${NC}"
echo -e "${YELLOW}Region: ${AWS_REGION}${NC}"

echo -e "${BLUE}Next steps:${NC}"
echo -e "1. Copy the credentials to your AWS config:"
echo -e "   ${YELLOW}cp .aws-credentials ~/.aws/credentials${NC}"
echo -e "   ${YELLOW}cp .aws-config ~/.aws/config${NC}"
echo -e ""
echo -e "2. Or set environment variables:"
echo -e "   ${YELLOW}export AWS_ACCESS_KEY_ID=${ACCESS_KEY_ID}${NC}"
echo -e "   ${YELLOW}export AWS_SECRET_ACCESS_KEY=${SECRET_ACCESS_KEY}${NC}"
echo -e "   ${YELLOW}export AWS_DEFAULT_REGION=${AWS_REGION}${NC}"
echo -e ""
echo -e "3. Test the credentials:"
echo -e "   ${YELLOW}aws sts get-caller-identity${NC}"
echo -e ""
echo -e "4. Run the infrastructure setup:"
echo -e "   ${YELLOW}./aws/setup-infrastructure.sh${NC}"

echo -e "${GREEN}Setup completed!${NC}"
