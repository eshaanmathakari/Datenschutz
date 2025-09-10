#!/bin/bash

# Datenschutz VS Code Extension - AWS Infrastructure Setup Script (No EFS)

set -e

# Configuration
STACK_NAME=${STACK_NAME:-datenschutz-infrastructure}
AWS_REGION=${AWS_REGION:-us-east-1}
VPC_ID=${VPC_ID:-}
SUBNET_IDS=${SUBNET_IDS:-}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}Setting up AWS infrastructure for Datenschutz VS Code Extension (No EFS)...${NC}"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Get AWS account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
if [ -z "$AWS_ACCOUNT_ID" ]; then
    echo -e "${RED}Error: Could not get AWS account ID. Please check your AWS credentials.${NC}"
    exit 1
fi

echo -e "${YELLOW}AWS Account ID: ${AWS_ACCOUNT_ID}${NC}"
echo -e "${YELLOW}AWS Region: ${AWS_REGION}${NC}"
echo -e "${YELLOW}Stack Name: ${STACK_NAME}${NC}"

# If VPC_ID is not provided, get the default VPC
if [ -z "$VPC_ID" ]; then
    echo -e "${BLUE}Getting default VPC...${NC}"
    VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query 'Vpcs[0].VpcId' --output text --region ${AWS_REGION})
    if [ "$VPC_ID" = "None" ] || [ "$VPC_ID" = "null" ]; then
        echo -e "${RED}Error: No default VPC found. Please specify a VPC_ID.${NC}"
        exit 1
    fi
    echo -e "${YELLOW}Using default VPC: ${VPC_ID}${NC}"
fi

# If SUBNET_IDS is not provided, get subnets from the VPC
if [ -z "$SUBNET_IDS" ]; then
    echo -e "${BLUE}Getting subnets from VPC...${NC}"
    SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=${VPC_ID}" --query 'Subnets[].SubnetId' --output text --region ${AWS_REGION})
    if [ -z "$SUBNET_IDS" ]; then
        echo -e "${RED}Error: No subnets found in VPC ${VPC_ID}.${NC}"
        exit 1
    fi
    echo -e "${YELLOW}Using subnets: ${SUBNET_IDS}${NC}"
fi

# Convert subnet IDs to comma-separated format for CloudFormation
SUBNET_IDS_CSV=$(echo $SUBNET_IDS | tr ' ' ',')

# Step 1: Deploy CloudFormation stack
echo -e "${GREEN}Step 1: Deploying CloudFormation stack (No EFS)...${NC}"
aws cloudformation deploy \
    --template-file aws/cloudformation-no-efs.yaml \
    --stack-name ${STACK_NAME} \
    --parameter-overrides \
        VpcId=${VPC_ID} \
        SubnetIds="${SUBNET_IDS_CSV}" \
        ModelBackend=none \
        ModelPath="" \
        HfModel=microsoft/CodeBERT-base \
    --capabilities CAPABILITY_IAM \
    --region ${AWS_REGION}

# Step 2: Get stack outputs
echo -e "${GREEN}Step 2: Getting stack outputs...${NC}"
ECR_URI=$(aws cloudformation describe-stacks --stack-name ${STACK_NAME} --region ${AWS_REGION} --query 'Stacks[0].Outputs[?OutputKey==`ECRRepositoryURI`].OutputValue' --output text)
ECS_CLUSTER=$(aws cloudformation describe-stacks --stack-name ${STACK_NAME} --region ${AWS_REGION} --query 'Stacks[0].Outputs[?OutputKey==`ECSClusterName`].OutputValue' --output text)
ECS_SERVICE=$(aws cloudformation describe-stacks --stack-name ${STACK_NAME} --region ${AWS_REGION} --query 'Stacks[0].Outputs[?OutputKey==`ECSServiceName`].OutputValue' --output text)
ALB_DNS=$(aws cloudformation describe-stacks --stack-name ${STACK_NAME} --region ${AWS_REGION} --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' --output text)

echo -e "${GREEN}Infrastructure setup completed successfully!${NC}"
echo -e "${YELLOW}ECR Repository URI: ${ECR_URI}${NC}"
echo -e "${YELLOW}ECS Cluster: ${ECS_CLUSTER}${NC}"
echo -e "${YELLOW}ECS Service: ${ECS_SERVICE}${NC}"
echo -e "${YELLOW}Load Balancer DNS: ${ALB_DNS}${NC}"

# Step 3: Create environment file for deployment
echo -e "${GREEN}Step 3: Creating environment file...${NC}"
cat > .env << EOF
AWS_REGION=${AWS_REGION}
ECR_REPOSITORY=datenschutz-extension
ECS_CLUSTER=${ECS_CLUSTER}
ECS_SERVICE=${ECS_SERVICE}
TASK_DEFINITION=datenschutz-task
ALB_DNS=${ALB_DNS}
EOF

echo -e "${GREEN}Environment file created: .env${NC}"

# Step 4: Instructions for next steps
echo -e "${BLUE}Next steps:${NC}"
echo -e "1. Build and push your Docker image:"
echo -e "   ${YELLOW}docker build -t ${ECR_URI}:latest .${NC}"
echo -e "   ${YELLOW}aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_URI}${NC}"
echo -e "   ${YELLOW}docker push ${ECR_URI}:latest${NC}"
echo -e ""
echo -e "2. Deploy the application:"
echo -e "   ${YELLOW}./aws/deploy.sh${NC}"
echo -e ""
echo -e "3. Access your application:"
echo -e "   ${YELLOW}http://${ALB_DNS}${NC}"
echo -e ""
echo -e "4. Monitor the deployment:"
echo -e "   ${YELLOW}aws ecs describe-services --cluster ${ECS_CLUSTER} --services ${ECS_SERVICE} --region ${AWS_REGION}${NC}"

echo -e "${GREEN}Infrastructure setup completed!${NC}"
