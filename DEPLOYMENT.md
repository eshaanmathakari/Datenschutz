# Deployment Guide

This guide provides comprehensive instructions for deploying Datenschutz to various cloud platforms using our automated CI/CD pipelines.

## 🐳 Docker Deployment

### Local Development

```bash
# Clone the repository
git clone https://github.com/yourusername/Datenschutz.git
cd Datenschutz

# Build and run with Docker
docker build -t datenschutz .
docker run -p 4001:4001 datenschutz

# Or use docker-compose for full stack
docker-compose up -d
```

### Docker Compose Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env

# Start all services
docker-compose up -d

# Check logs
docker-compose logs -f datenschutz-analyzer
```

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Application port | 4001 | No |
| `MODEL_BACKEND` | LLM backend (llama_cpp/transformers/none) | none | No |
| `MODEL_PATH` | Path to model file (for llama_cpp) | - | Conditional |
| `HF_MODEL` | HuggingFace model ID | - | Conditional |
| `DEFAULT_SCAN_PATH` | Default scan directory | /app | No |
| `LOG_RETENTION_DAYS` | Log cleanup interval | 14 | No |

## ☁️ Cloud Deployment

### Prerequisites

Before deploying to any cloud platform, ensure you have:

1. **GitHub Repository Secrets** configured
2. **Cloud Provider Account** with appropriate permissions
3. **Container Registry** access
4. **Domain Name** (optional but recommended for production)

## 🔴 AWS Deployment

### Prerequisites

1. **AWS Account** with appropriate IAM permissions
2. **ECR Repository** for container images
3. **ECS Cluster** or **Fargate** service capability

### GitHub Repository Secrets

Configure the following secrets in your GitHub repository (`Settings > Secrets and variables > Actions`):

```bash
# AWS Credentials
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_ACCOUNT_ID=123456789012

# Model Configuration
MODEL_BACKEND=transformers
HF_MODEL=microsoft/DialoGPT-medium
```

### Deployment Steps

1. **Trigger Deployment**:
   ```bash
   # Via GitHub Actions UI
   # Go to Actions > Deploy to AWS > Run workflow
   
   # Or create a release
   git tag v1.0.0
   git push origin v1.0.0
   gh release create v1.0.0
   ```

2. **Infrastructure Setup**:
   ```bash
   # Create ECS cluster (if not exists)
   aws ecs create-cluster --cluster-name datenschutz-production
   
   # Create ECR repository
   aws ecr create-repository --repository-name datenschutz-analyzer
   
   # Create task execution role
   aws iam create-role --role-name ecsTaskExecutionRole --assume-role-policy-document file://trust-policy.json
   ```

3. **Verify Deployment**:
   ```bash
   # Check ECS service status
   aws ecs describe-services --cluster datenschutz-production --services datenschutz-analyzer
   
   # Get service URL
   aws elbv2 describe-load-balancers --names datenschutz-production-alb
   ```

### AWS Infrastructure Templates

```yaml
# cloudformation/ecs-cluster.yml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'ECS Cluster for Datenschutz'

Resources:
  ECSCluster:
    Type: AWS::ECS::Cluster
    Properties:
      ClusterName: !Sub 'datenschutz-${Environment}'
      
  ApplicationLoadBalancer:
    Type: AWS::ElasticLoadBalancingV2::LoadBalancer
    Properties:
      Name: !Sub 'datenschutz-${Environment}-alb'
      Scheme: internet-facing
      Type: application
      Subnets: !Ref PublicSubnets
```

## 🔵 Google Cloud Platform Deployment

### Prerequisites

1. **GCP Project** with billing enabled
2. **Service Account** with appropriate roles
3. **Cloud Run** and **Cloud SQL** APIs enabled

### GitHub Repository Secrets

```bash
# GCP Configuration
GCP_PROJECT_ID=your-project-id
GCP_SA_KEY={"type": "service_account", ...}  # Service account JSON

# Model Configuration
MODEL_BACKEND=transformers
HF_MODEL=microsoft/DialoGPT-medium
```

### Required GCP Roles

Your service account needs these roles:
- Cloud Run Admin
- Cloud SQL Admin
- Storage Admin
- Secret Manager Admin
- Cloud Build Editor

### Deployment Steps

1. **Enable APIs**:
   ```bash
   gcloud services enable run.googleapis.com
   gcloud services enable sql-component.googleapis.com
   gcloud services enable secretmanager.googleapis.com
   gcloud services enable cloudbuild.googleapis.com
   ```

2. **Create Service Account**:
   ```bash
   gcloud iam service-accounts create datenschutz-deployer \
     --display-name="Datenschutz Deployer"
   
   gcloud projects add-iam-policy-binding PROJECT_ID \
     --member="serviceAccount:datenschutz-deployer@PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/run.admin"
   ```

3. **Deploy via GitHub Actions**:
   ```bash
   # Trigger deployment
   gh workflow run deploy-gcp.yml -f environment=production -f region=us-central1
   ```

### GCP Terraform Configuration

```hcl
# terraform/gcp/main.tf
resource "google_cloud_run_service" "datenschutz" {
  name     = "datenschutz-analyzer"
  location = var.region

  template {
    spec {
      containers {
        image = var.container_image
        
        ports {
          container_port = 4001
        }
        
        env {
          name  = "PORT"
          value = "4001"
        }
        
        resources {
          limits = {
            cpu    = "1000m"
            memory = "1Gi"
          }
        }
      }
    }
  }
}
```

## 🔷 Microsoft Azure Deployment

### Prerequisites

1. **Azure Subscription** with resource group permissions
2. **Container Registry** (ACR) instance
3. **Service Principal** for GitHub Actions

### GitHub Repository Secrets

```bash
# Azure Credentials (Service Principal JSON)
AZURE_CREDENTIALS={
  "clientId": "your-client-id",
  "clientSecret": "your-client-secret",
  "subscriptionId": "your-subscription-id",
  "tenantId": "your-tenant-id"
}

# Container Registry
AZURE_REGISTRY_NAME=yourregistry

# Database Configuration
DB_PASSWORD=your-secure-password
ALERT_EMAIL=admin@yourcompany.com
```

### Service Principal Setup

```bash
# Create service principal
az ad sp create-for-rbac --name "datenschutz-deployer" \
  --role contributor \
  --scopes /subscriptions/YOUR_SUBSCRIPTION_ID \
  --sdk-auth
```

### Deployment Steps

1. **Create Resource Group**:
   ```bash
   az group create --name datenschutz-production --location "East US"
   ```

2. **Create Container Registry**:
   ```bash
   az acr create --resource-group datenschutz-production \
     --name yourregistry --sku Basic
   ```

3. **Deploy via GitHub Actions**:
   ```bash
   gh workflow run deploy-azure.yml -f environment=production -f region="East US"
   ```

### Azure Bicep Templates

```bicep
// bicep/container-app.bicep
param location string = resourceGroup().location
param containerAppName string = 'datenschutz-analyzer'

resource containerApp 'Microsoft.App/containerApps@2022-03-01' = {
  name: containerAppName
  location: location
  properties: {
    managedEnvironmentId: containerAppEnvironment.id
    configuration: {
      ingress: {
        external: true
        targetPort: 4001
      }
    }
    template: {
      containers: [
        {
          name: containerAppName
          image: 'yourregistry.azurecr.io/datenschutz-analyzer:latest'
          resources: {
            cpu: '0.5'
            memory: '1Gi'
          }
        }
      ]
    }
  }
}
```

## 🔧 Advanced Configuration

### SSL/TLS Setup

#### AWS Application Load Balancer
```bash
# Request certificate
aws acm request-certificate \
  --domain-name datenschutz.yourcompany.com \
  --validation-method DNS

# Attach to load balancer
aws elbv2 create-listener \
  --load-balancer-arn YOUR_ALB_ARN \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=YOUR_CERT_ARN
```

#### GCP Load Balancer
```bash
# Create managed SSL certificate
gcloud compute ssl-certificates create datenschutz-ssl \
  --domains=datenschutz.yourcompany.com

# Update Cloud Run service with custom domain
gcloud run domain-mappings create \
  --service datenschutz-analyzer \
  --domain datenschutz.yourcompany.com
```

#### Azure Application Gateway
```bash
# Create SSL certificate
az network application-gateway ssl-cert create \
  --gateway-name datenschutz-gateway \
  --resource-group datenschutz-production \
  --name datenschutz-ssl \
  --cert-file certificate.pfx
```

### Database Configuration

#### PostgreSQL Setup

**AWS RDS**:
```bash
aws rds create-db-instance \
  --db-instance-identifier datenschutz-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username datenschutz \
  --master-user-password YOUR_PASSWORD \
  --allocated-storage 20
```

**GCP Cloud SQL**:
```bash
gcloud sql instances create datenschutz-db \
  --database-version=POSTGRES_14 \
  --tier=db-f1-micro \
  --region=us-central1
```

**Azure Database**:
```bash
az postgres server create \
  --resource-group datenschutz-production \
  --name datenschutz-db \
  --admin-user datenschutz \
  --admin-password YOUR_PASSWORD \
  --sku-name B_Gen5_1
```

### Monitoring and Observability

#### Application Performance Monitoring

**AWS CloudWatch**:
```bash
# Create log group
aws logs create-log-group --log-group-name /ecs/datenschutz

# Create custom metrics
aws cloudwatch put-metric-data \
  --namespace "Datenschutz/Performance" \
  --metric-data MetricName=ResponseTime,Value=150,Unit=Milliseconds
```

**GCP Cloud Monitoring**:
```bash
# Enable monitoring
gcloud services enable monitoring.googleapis.com

# Create uptime check
gcloud alpha monitoring uptime create datenschutz-health \
  --resource-type=url \
  --resource-url=https://datenschutz.yourcompany.com/health
```

**Azure Application Insights**:
```bash
# Create Application Insights
az monitor app-insights component create \
  --app datenschutz-insights \
  --location "East US" \
  --resource-group datenschutz-production
```

## 🚨 Troubleshooting

### Common Issues

#### Deployment Failures

1. **Container Not Starting**:
   ```bash
   # Check container logs
   docker logs datenschutz-analyzer
   
   # Check resource limits
   docker stats datenschutz-analyzer
   ```

2. **Health Check Failures**:
   ```bash
   # Test health endpoint locally
   curl http://localhost:4001/health
   
   # Check application logs
   docker-compose logs datenschutz-analyzer
   ```

3. **Database Connection Issues**:
   ```bash
   # Test database connectivity
   docker exec -it datenschutz-analyzer psql -h db-host -U username -d dbname
   
   # Check network connectivity
   docker exec -it datenschutz-analyzer nc -zv db-host 5432
   ```

#### Performance Issues

1. **High Memory Usage**:
   ```bash
   # Monitor memory usage
   docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"
   
   # Adjust memory limits in docker-compose.yml
   mem_limit: 2g
   ```

2. **Slow Response Times**:
   ```bash
   # Enable performance profiling
   export FLASK_ENV=development
   export FLASK_DEBUG=True
   
   # Monitor application metrics
   curl http://localhost:4001/metrics
   ```

### Support

For additional support:

1. **Check Documentation**: Review this guide and the main README
2. **Search Issues**: Look for similar issues on GitHub
3. **Create Issue**: Open a new GitHub issue with deployment logs
4. **Community Support**: Join our community discussions

---

**Last Updated**: December 2024  
**Version**: 1.0
