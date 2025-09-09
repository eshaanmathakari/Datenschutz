#!/bin/bash

# Datenschutz VS Code Extension - AWS Deployment Script

set -e

# Configuration
AWS_REGION=${AWS_REGION:-us-east-1}
ECR_REPOSITORY=${ECR_REPOSITORY:-datenschutz-extension}
ECS_CLUSTER=${ECS_CLUSTER:-datenschutz-cluster}
ECS_SERVICE=${ECS_SERVICE:-datenschutz-service}
TASK_DEFINITION=${TASK_DEFINITION:-datenschutz-task}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Datenschutz VS Code Extension deployment to AWS...${NC}"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo -e "${RED}Error: Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Get AWS account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
if [ -z "$AWS_ACCOUNT_ID" ]; then
    echo -e "${RED}Error: Could not get AWS account ID. Please check your AWS credentials.${NC}"
    exit 1
fi

ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}"

echo -e "${YELLOW}AWS Account ID: ${AWS_ACCOUNT_ID}${NC}"
echo -e "${YELLOW}AWS Region: ${AWS_REGION}${NC}"
echo -e "${YELLOW}ECR Repository: ${ECR_REPOSITORY}${NC}"

# Step 1: Create ECR repository if it doesn't exist
echo -e "${GREEN}Step 1: Creating ECR repository...${NC}"
aws ecr describe-repositories --repository-names ${ECR_REPOSITORY} --region ${AWS_REGION} 2>/dev/null || {
    echo -e "${YELLOW}Creating ECR repository: ${ECR_REPOSITORY}${NC}"
    aws ecr create-repository --repository-name ${ECR_REPOSITORY} --region ${AWS_REGION}
}

# Step 2: Login to ECR
echo -e "${GREEN}Step 2: Logging in to ECR...${NC}"
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_URI}

# Step 3: Build Docker image
echo -e "${GREEN}Step 3: Building Docker image...${NC}"
docker build -t ${ECR_REPOSITORY}:latest .

# Step 4: Tag image for ECR
echo -e "${GREEN}Step 4: Tagging image for ECR...${NC}"
docker tag ${ECR_REPOSITORY}:latest ${ECR_URI}:latest
docker tag ${ECR_REPOSITORY}:latest ${ECR_URI}:$(date +%Y%m%d-%H%M%S)

# Step 5: Push image to ECR
echo -e "${GREEN}Step 5: Pushing image to ECR...${NC}"
docker push ${ECR_URI}:latest
docker push ${ECR_URI}:$(date +%Y%m%d-%H%M%S)

# Step 6: Create ECS cluster if it doesn't exist
echo -e "${GREEN}Step 6: Creating ECS cluster...${NC}"
aws ecs describe-clusters --clusters ${ECS_CLUSTER} --region ${AWS_REGION} 2>/dev/null || {
    echo -e "${YELLOW}Creating ECS cluster: ${ECS_CLUSTER}${NC}"
    aws ecs create-cluster --cluster-name ${ECS_CLUSTER} --region ${AWS_REGION}
}

# Step 7: Register task definition
echo -e "${GREEN}Step 7: Registering task definition...${NC}"
aws ecs register-task-definition \
    --cli-input-json file://aws/task-definition.json \
    --region ${AWS_REGION}

# Step 8: Create or update ECS service
echo -e "${GREEN}Step 8: Creating/updating ECS service...${NC}"
aws ecs describe-services --cluster ${ECS_CLUSTER} --services ${ECS_SERVICE} --region ${AWS_REGION} 2>/dev/null && {
    echo -e "${YELLOW}Updating existing ECS service...${NC}"
    aws ecs update-service \
        --cluster ${ECS_CLUSTER} \
        --service ${ECS_SERVICE} \
        --task-definition ${TASK_DEFINITION} \
        --region ${AWS_REGION}
} || {
    echo -e "${YELLOW}Creating new ECS service...${NC}"
    aws ecs create-service \
        --cluster ${ECS_CLUSTER} \
        --service-name ${ECS_SERVICE} \
        --task-definition ${TASK_DEFINITION} \
        --desired-count 1 \
        --launch-type FARGATE \
        --network-configuration "awsvpcConfiguration={subnets=[subnet-12345],securityGroups=[sg-12345],assignPublicIp=ENABLED}" \
        --region ${AWS_REGION}
}

# Step 9: Wait for service to be stable
echo -e "${GREEN}Step 9: Waiting for service to be stable...${NC}"
aws ecs wait services-stable --cluster ${ECS_CLUSTER} --services ${ECS_SERVICE} --region ${AWS_REGION}

echo -e "${GREEN}Deployment completed successfully!${NC}"
echo -e "${YELLOW}ECR Image URI: ${ECR_URI}:latest${NC}"
echo -e "${YELLOW}ECS Cluster: ${ECS_CLUSTER}${NC}"
echo -e "${YELLOW}ECS Service: ${ECS_SERVICE}${NC}"

# Get service endpoint
echo -e "${GREEN}Getting service endpoint...${NC}"
TASK_ARN=$(aws ecs list-tasks --cluster ${ECS_CLUSTER} --service-name ${ECS_SERVICE} --region ${AWS_REGION} --query 'taskArns[0]' --output text)
if [ "$TASK_ARN" != "None" ] && [ "$TASK_ARN" != "null" ]; then
    ENI_ID=$(aws ecs describe-tasks --cluster ${ECS_CLUSTER} --tasks ${TASK_ARN} --region ${AWS_REGION} --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value' --output text)
    PUBLIC_IP=$(aws ec2 describe-network-interfaces --network-interface-ids ${ENI_ID} --region ${AWS_REGION} --query 'NetworkInterfaces[0].Association.PublicIp' --output text)
    echo -e "${GREEN}Service is running at: http://${PUBLIC_IP}:4001${NC}"
fi
