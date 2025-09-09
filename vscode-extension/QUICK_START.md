# 🚀 Quick Start - Deploy Datenschutz VS Code Extension to AWS

## Prerequisites (5 minutes)

1. **Install required tools:**
   ```bash
   # AWS CLI
   curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
   unzip awscliv2.zip
   sudo ./aws/install
   
   # Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   
   # jq (for JSON processing)
   sudo apt-get install jq  # Ubuntu/Debian
   # or
   brew install jq          # macOS
   ```

2. **Configure AWS:**
   ```bash
   aws configure
   # Enter your AWS Access Key ID, Secret Access Key, and region (e.g., us-east-1)
   ```

## Deploy in 3 Steps (10 minutes)

### Step 1: Setup Infrastructure
```bash
cd vscode-extension
./aws/setup-infrastructure.sh
```
This creates all AWS resources (ECS, ECR, EFS, ALB, etc.)

### Step 2: Build and Deploy
```bash
./aws/deploy.sh
```
This builds the Docker image and deploys to ECS

### Step 3: Access Your Application
```bash
# Get the endpoint from the deployment output
# Or check the ALB DNS name in AWS Console
curl http://<your-alb-dns>/health
```

## What You Get

✅ **Fully deployed VS Code extension** running on AWS ECS Fargate  
✅ **Web interface** at `http://<your-alb-dns>`  
✅ **API endpoints** for scanning and fixing  
✅ **Persistent storage** with EFS  
✅ **Auto-scaling** and health checks  
✅ **Security scanning** with local LLM support  
✅ **CI/CD pipeline** with GitHub Actions  

## Configuration

### Model Setup (Optional)
To enable AI-powered scanning:

1. **For llama.cpp:**
   ```bash
   # Download a GGUF model
   wget https://huggingface.co/TheBloke/CodeLlama-7B-Instruct-GGUF/resolve/main/codellama-7b-instruct.Q4_K_M.gguf
   
   # Upload to EFS
   sudo mkdir -p /mnt/efs
   sudo mount -t efs <efs-id>:/ /mnt/efs
   sudo cp codellama-7b-instruct.Q4_K_M.gguf /mnt/efs/models/
   ```

2. **Update task definition:**
   ```bash
   # Edit aws/task-definition.json
   # Set MODEL_BACKEND to "llama_cpp"
   # Set MODEL_PATH to "/app/models/codellama-7b-instruct.Q4_K_M.gguf"
   ```

3. **Redeploy:**
   ```bash
   ./aws/deploy.sh
   ```

## Usage

### Web Interface
- Open `http://<your-alb-dns>` in your browser
- Click "Start Security Scan" to scan your workspace
- View results and apply fixes

### API Usage
```bash
# Health check
curl http://<your-alb-dns>/health

# Start scan
curl -X POST http://<your-alb-dns>/api/scan \
  -H "Content-Type: application/json" \
  -d '{"path": "/workspace", "options": {}}'

# Get scan results
curl http://<your-alb-dns>/api/scan/<scan-id>
```

### VS Code Extension
The extension can be installed in VS Code and configured to use the deployed backend:

1. Install the extension from the built `.vsix` file
2. Configure the API endpoint in VS Code settings
3. Use the extension commands to scan files

## Monitoring

### Check Service Status
```bash
aws ecs describe-services --cluster datenschutz-cluster --services datenschutz-service
```

### View Logs
```bash
aws logs tail /ecs/datenschutz-extension --follow
```

### Check Health
```bash
curl http://<your-alb-dns>/health
```

## Troubleshooting

### Service Won't Start
```bash
# Check task definition
aws ecs describe-task-definition --task-definition datenschutz-task

# Check service events
aws ecs describe-services --cluster datenschutz-cluster --services datenschutz-service --query 'services[0].events'
```

### Container Health Check Failing
```bash
# Check container logs
aws logs get-log-events --log-group-name /ecs/datenschutz-extension --log-stream-name <stream-name>
```

### Can't Access Web Interface
```bash
# Check ALB health
aws elbv2 describe-target-health --target-group-arn <target-group-arn>

# Check security groups
aws ec2 describe-security-groups --group-ids <security-group-id>
```

## Cost Optimization

### Right-size Resources
- Start with minimal resources (1024 CPU, 2048 MB memory)
- Monitor CloudWatch metrics and scale as needed
- Use Spot instances for non-critical workloads

### Storage Optimization
- EFS Standard storage for active data
- EFS Infrequent Access for logs and backups
- Regular cleanup of old logs

## Cleanup

To remove all resources and stop billing:
```bash
# Delete ECS service
aws ecs update-service --cluster datenschutz-cluster --service datenschutz-service --desired-count 0
aws ecs delete-service --cluster datenschutz-cluster --service datenschutz-service

# Delete CloudFormation stack
aws cloudformation delete-stack --stack-name datenschutz-infrastructure

# Delete ECR repository
aws ecr delete-repository --repository-name datenschutz-extension --force
```

## Next Steps

1. **Customize scanning rules** in the analyzer backend
2. **Add more language support** by extending the scanner
3. **Integrate with CI/CD** using the GitHub Actions workflow
4. **Set up monitoring** with CloudWatch alarms
5. **Configure SSL** for production use

## Support

- Check the [full deployment guide](DEPLOYMENT.md) for detailed information
- Review [troubleshooting section](DEPLOYMENT.md#troubleshooting) for common issues
- Open an issue in the GitHub repository for bugs or questions

---

**🎉 Congratulations!** You now have a fully deployed, AI-powered security scanner running on AWS!
