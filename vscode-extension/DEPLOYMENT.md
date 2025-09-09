# Datenschutz VS Code Extension - AWS Deployment Guide

This guide covers deploying the Datenschutz VS Code Extension to AWS using Docker containers, ECS Fargate, and CloudFormation.

## Prerequisites

### Required Tools
- [AWS CLI](https://aws.amazon.com/cli/) (v2.0+)
- [Docker](https://www.docker.com/) (v20.0+)
- [jq](https://stedolan.github.io/jq/) (for JSON processing)
- [Node.js](https://nodejs.org/) (v18+)
- [npm](https://www.npmjs.com/) (v8+)

### AWS Requirements
- AWS Account with appropriate permissions
- VPC with public subnets (or default VPC)
- IAM permissions for ECS, ECR, EFS, and CloudFormation

### Required AWS Permissions
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ecr:*",
                "ecs:*",
                "efs:*",
                "cloudformation:*",
                "iam:*",
                "logs:*",
                "elasticloadbalancing:*",
                "ec2:DescribeVpcs",
                "ec2:DescribeSubnets",
                "ec2:DescribeSecurityGroups",
                "ec2:DescribeNetworkInterfaces"
            ],
            "Resource": "*"
        }
    ]
}
```

## Quick Start

### 1. Clone and Setup
```bash
git clone <your-repo>
cd vscode-extension
npm install
npm run compile
```

### 2. Configure AWS
```bash
aws configure
# Enter your AWS Access Key ID, Secret Access Key, and region
```

### 3. Setup Infrastructure
```bash
./aws/setup-infrastructure.sh
```

### 4. Deploy Application
```bash
./aws/deploy.sh
```

## Detailed Deployment Steps

### Step 1: Infrastructure Setup

The infrastructure setup script creates all necessary AWS resources:

```bash
./aws/setup-infrastructure.sh
```

This script:
- Creates ECR repository for Docker images
- Sets up EFS file system for persistent storage
- Creates ECS cluster with Fargate
- Configures security groups and IAM roles
- Sets up Application Load Balancer
- Creates CloudWatch log groups

### Step 2: Build and Push Docker Image

```bash
# Build the Docker image
docker build -t datenschutz-extension:latest .

# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Tag and push image
docker tag datenschutz-extension:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/datenschutz-extension:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/datenschutz-extension:latest
```

### Step 3: Deploy to ECS

```bash
./aws/deploy.sh
```

This script:
- Builds and pushes the Docker image to ECR
- Registers the ECS task definition
- Creates or updates the ECS service
- Waits for the service to be stable

## Configuration Options

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MODEL_BACKEND` | `none` | LLM backend (none, llama_cpp, transformers) |
| `MODEL_PATH` | `` | Path to GGUF model file |
| `HF_MODEL` | `microsoft/CodeBERT-base` | Hugging Face model name |
| `DEFAULT_SCAN_PATH` | `/workspace` | Default directory to scan |
| `LOG_RETENTION_DAYS` | `14` | Log retention period |
| `LLAMA_THREADS` | `4` | Number of threads for llama.cpp |
| `HF_DEVICE_MAP` | `auto` | Device mapping for transformers |
| `HF_LOAD_IN_8BIT` | `true` | Load models in 8-bit mode |

### Model Configuration

#### For llama.cpp Backend
1. Download a GGUF model file (e.g., from Hugging Face)
2. Upload to EFS file system:
   ```bash
   # Mount EFS locally
   sudo mkdir -p /mnt/efs
   sudo mount -t efs <efs-id>:/ /mnt/efs
   
   # Copy model file
   sudo cp your-model.gguf /mnt/efs/models/
   ```
3. Update task definition with model path

#### For Transformers Backend
1. Set `HF_MODEL` environment variable
2. Models will be downloaded automatically on first run

## Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Application   │    │   Application    │    │   EFS File      │
│   Load Balancer │────│   Load Balancer  │────│   System        │
│   (Internet)    │    │   (Internal)     │    │   (Persistent)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                │
                       ┌──────────────────┐
                       │   ECS Fargate    │
                       │   Service        │
                       │                  │
                       │ ┌──────────────┐ │
                       │ │  Datenschutz │ │
                       │ │  Extension   │ │
                       │ │  Container   │ │
                       │ └──────────────┘ │
                       └──────────────────┘
                                │
                                │
                       ┌──────────────────┐
                       │   CloudWatch     │
                       │   Logs           │
                       └──────────────────┘
```

## Monitoring and Logging

### CloudWatch Logs
- Log group: `/ecs/datenschutz-extension`
- Retention: 14 days (configurable)
- Stream prefix: `ecs`

### Health Checks
- Container health check: Python import test
- ALB health check: HTTP GET `/health`
- Check interval: 30 seconds

### Monitoring Commands
```bash
# Check service status
aws ecs describe-services --cluster datenschutz-cluster --services datenschutz-service

# View logs
aws logs tail /ecs/datenschutz-extension --follow

# Check task health
aws ecs describe-tasks --cluster datenschutz-cluster --tasks <task-arn>
```

## Scaling and Performance

### Auto Scaling
The ECS service can be configured for auto-scaling:

```bash
# Create auto scaling target
aws application-autoscaling register-scalable-target \
    --service-namespace ecs \
    --resource-id service/datenschutz-cluster/datenschutz-service \
    --scalable-dimension ecs:service:DesiredCount \
    --min-capacity 1 \
    --max-capacity 10

# Create scaling policy
aws application-autoscaling put-scaling-policy \
    --service-namespace ecs \
    --resource-id service/datenschutz-cluster/datenschutz-service \
    --scalable-dimension ecs:service:DesiredCount \
    --policy-name datenschutz-scaling-policy \
    --policy-type TargetTrackingScaling \
    --target-tracking-scaling-policy-configuration file://scaling-policy.json
```

### Performance Tuning
- **CPU/Memory**: Adjust in task definition (current: 1024 CPU, 2048 MB memory)
- **Concurrency**: Increase desired count for more instances
- **EFS Performance**: Use provisioned throughput for high I/O

## Security Considerations

### Network Security
- Security groups restrict access to necessary ports only
- EFS access limited to ECS tasks
- ALB provides SSL termination (configure SSL certificate)

### IAM Security
- Least privilege principle applied
- Separate roles for task execution and task running
- No hardcoded credentials in containers

### Container Security
- Non-root user in containers
- Regular security scanning with Trivy
- Minimal base images (Python slim, Node Alpine)

## Troubleshooting

### Common Issues

#### Service Won't Start
```bash
# Check task definition
aws ecs describe-task-definition --task-definition datenschutz-task

# Check service events
aws ecs describe-services --cluster datenschutz-cluster --services datenschutz-service --query 'services[0].events'
```

#### Container Health Check Failing
```bash
# Check container logs
aws logs get-log-events --log-group-name /ecs/datenschutz-extension --log-stream-name <stream-name>

# Check task status
aws ecs describe-tasks --cluster datenschutz-cluster --tasks <task-arn>
```

#### EFS Mount Issues
```bash
# Check EFS file system status
aws efs describe-file-systems --file-system-id <efs-id>

# Check mount targets
aws efs describe-mount-targets --file-system-id <efs-id>
```

### Debug Commands
```bash
# Get service endpoint
aws ecs list-tasks --cluster datenschutz-cluster --service-name datenschutz-service
aws ecs describe-tasks --cluster datenschutz-cluster --tasks <task-arn>

# Check ALB health
aws elbv2 describe-target-health --target-group-arn <target-group-arn>

# View all resources
aws cloudformation describe-stack-resources --stack-name datenschutz-infrastructure
```

## Cost Optimization

### Resource Sizing
- Start with minimal resources and scale up as needed
- Use Spot instances for non-critical workloads
- Monitor CloudWatch metrics for right-sizing

### Storage Optimization
- EFS Standard storage class for most use cases
- EFS Infrequent Access for logs and backups
- Regular cleanup of old logs and temporary files

### Compute Optimization
- Use Fargate Spot for cost savings (up to 70% discount)
- Right-size CPU and memory based on actual usage
- Implement auto-scaling to handle traffic spikes

## CI/CD Integration

### GitHub Actions
The repository includes a GitHub Actions workflow for automated deployment:

1. **Test**: Runs linting, compilation, and tests
2. **Build**: Builds Docker image and pushes to ECR
3. **Deploy**: Updates ECS service with new image
4. **Security**: Runs Trivy security scans

### Required Secrets
Set these secrets in your GitHub repository:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

### Manual Deployment
```bash
# Trigger deployment manually
gh workflow run deploy.yml
```

## Backup and Recovery

### EFS Backups
```bash
# Create EFS backup
aws backup start-backup-job \
    --backup-vault-name datenschutz-backup-vault \
    --resource-arn arn:aws:elasticfilesystem:us-east-1:<account-id>:file-system/<efs-id> \
    --iam-role-arn arn:aws:iam::<account-id>:role/BackupRole
```

### Task Definition Backups
Task definitions are automatically versioned in ECS. To restore:
```bash
# List task definition revisions
aws ecs list-task-definitions --family-prefix datenschutz-task

# Update service to use previous revision
aws ecs update-service --cluster datenschutz-cluster --service datenschutz-service --task-definition datenschutz-task:REVISION
```

## Cleanup

To remove all resources:
```bash
# Delete ECS service
aws ecs update-service --cluster datenschutz-cluster --service datenschutz-service --desired-count 0
aws ecs delete-service --cluster datenschutz-cluster --service datenschutz-service

# Delete CloudFormation stack
aws cloudformation delete-stack --stack-name datenschutz-infrastructure

# Delete ECR repository
aws ecr delete-repository --repository-name datenschutz-extension --force
```

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review CloudWatch logs
3. Check AWS service health dashboard
4. Open an issue in the GitHub repository

## Additional Resources

- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [AWS ECR Documentation](https://docs.aws.amazon.com/ecr/)
- [AWS EFS Documentation](https://docs.aws.amazon.com/efs/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [VS Code Extension Development](https://code.visualstudio.com/api)
