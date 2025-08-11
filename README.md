# 🛡️ Datenschutz

[![CI](https://github.com/yourorg/Datenschutz/workflows/CI%20Pipeline/badge.svg)](https://github.com/yourorg/Datenschutz/actions/workflows/ci.yml)
[![Security Scan](https://github.com/yourorg/Datenschutz/workflows/CodeQL%20Security%20Scanning/badge.svg)](https://github.com/yourorg/Datenschutz/actions/workflows/code-scanning.yml)
[![Docker](https://img.shields.io/docker/pulls/yourorg/datenschutz-analyzer)](https://github.com/yourorg/Datenschutz/pkgs/container/datenschutz)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![OWASP](https://img.shields.io/badge/OWASP-Top%2010%20Compliant-green)](SECURITY.md)

**Advanced AI-Powered Security Code Analysis Platform**

Datenschutz is a comprehensive security analysis platform that leverages advanced language models to detect vulnerabilities, map them to industry standards (CWE/CVE, OWASP Top 10), and provide automated remediation suggestions. Built with enterprise-grade security and compliance in mind.

## ✨ Key Features

### 🔍 Advanced Vulnerability Detection
- **AI-Powered Analysis**: Leverages large language models for deep code understanding
- **Multi-Language Support**: Python, JavaScript, TypeScript, Solidity, and more
- **Real-time Scanning**: Fast, efficient analysis of large codebases
- **Smart Chunking**: Intelligent code segmentation for optimal analysis

### 🏛️ Standards Compliance
- **OWASP Top 10 (2021)**: Complete coverage of critical security risks
- **CWE Mapping**: Maps vulnerabilities to Common Weakness Enumeration
- **CVE Integration**: Links to known Common Vulnerabilities and Exposures
- **Compliance Frameworks**: PCI DSS, ISO 27001, NIST CSF, HIPAA support

### 🚀 Enterprise Ready
- **Containerized Deployment**: Docker and Kubernetes ready
- **Cloud Native**: Deploy to AWS, GCP, Azure with one click
- **CI/CD Integration**: GitHub Actions workflows included
- **Scalable Architecture**: Handle large enterprise codebases

### 🛠️ Developer Friendly
- **Automated Fixes**: AI-generated code remediation suggestions
- **IDE Integration**: Works with popular development environments
- **API-First**: RESTful API for integration with existing tools
- **Web Interface**: Intuitive UI for manual analysis

## 🚀 Quick Start

### Docker (Recommended)

```bash
# Pull and run the latest image
docker run -p 4001:4001 ghcr.io/yourorg/datenschutz:latest

# Or use docker-compose for full stack
curl -O https://raw.githubusercontent.com/yourorg/Datenschutz/main/docker-compose.yml
docker-compose up -d
```

### Local Development

```bash
# Clone the repository
git clone https://github.com/yourorg/Datenschutz.git
cd Datenschutz

# Set up Python environment
python3 -m venv .venv
source .venv/bin/activate
pip install -r analyzer/requirements.txt

# Configure model (optional)
export MODEL_BACKEND=transformers
export HF_MODEL=microsoft/DialoGPT-medium

# Run the application
python -m analyzer.backend.app
```

Visit `http://localhost:4001` to access the web interface.

## 📊 Vulnerability Coverage

| Security Category | CWE Examples | Detection Capability |
|------------------|--------------|---------------------|
| **Injection Attacks** | CWE-89, CWE-79, CWE-78 | ✅ SQL, XSS, Command Injection |
| **Broken Authentication** | CWE-798, CWE-287 | ✅ Hardcoded Secrets, Weak Auth |
| **Sensitive Data** | CWE-327, CWE-338 | ✅ Weak Crypto, Insecure Random |
| **Access Control** | CWE-22, CWE-284 | ✅ Path Traversal, Broken Access |
| **Security Misconfiguration** | CWE-611, CWE-776 | ✅ XXE, Resource Exhaustion |
| **Vulnerable Components** | CWE-120, CWE-502 | ✅ Buffer Overflow, Deserialization |
| **Logging & Monitoring** | CWE-778, CWE-532 | ✅ Insufficient Logging |
| **Server-Side Request Forgery** | CWE-918 | ✅ SSRF Detection |

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `MODEL_BACKEND` | AI model backend (`llama_cpp`, `transformers`, `none`) | `none` | No |
| `MODEL_PATH` | Path to local model file (for llama_cpp) | - | Conditional |
| `HF_MODEL` | HuggingFace model ID (for transformers) | - | Conditional |
| `DEFAULT_SCAN_PATH` | Default directory to scan | `/app` | No |
| `LOG_RETENTION_DAYS` | Log cleanup interval | `14` | No |
| `PORT` | Application port | `4001` | No |

### Model Configuration Examples

**Transformers (HuggingFace)**:
```bash
export MODEL_BACKEND=transformers
export HF_MODEL=microsoft/DialoGPT-medium
export HF_DEVICE_MAP=auto
export HF_LOAD_IN_8BIT=true
```

**LLaMA.cpp (Local)**:
```bash
export MODEL_BACKEND=llama_cpp
export MODEL_PATH=/path/to/model.gguf
export LLAMA_THREADS=6
```

## 🔌 API Reference

### Scan Endpoint

```bash
curl -X POST http://localhost:4001/scan \
  -H "Content-Type: application/json" \
  -d '{
    "path": "/path/to/code", 
    "options": {
      "reasoning": "medium",
      "temperature": 0.2,
      "include_exts": [".py", ".js", ".ts"],
      "max_file_mb": 1.5
    }
  }'
```

### Apply Fix Endpoint

```bash
curl -X POST http://localhost:4001/apply_fix \
  -H "Content-Type: application/json" \
  -d '{"issue_id": "uuid-here"}'
```

### Health Check

```bash
curl http://localhost:4001/health
# Returns: {"status": "ok"}
```

## ☁️ Cloud Deployment

Deploy to your preferred cloud platform with our pre-configured workflows:

### AWS Deployment
```bash
# Set up GitHub secrets: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
gh workflow run deploy-aws.yml -f environment=production
```

### Google Cloud Platform
```bash
# Set up GitHub secrets: GCP_PROJECT_ID, GCP_SA_KEY
gh workflow run deploy-gcp.yml -f environment=production
```

### Microsoft Azure
```bash
# Set up GitHub secrets: AZURE_CREDENTIALS, AZURE_REGISTRY_NAME
gh workflow run deploy-azure.yml -f environment=production
```

For detailed deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

## 🔒 Security Features

### Automated Security Scanning
- **CodeQL Analysis**: GitHub's semantic code analysis
- **Dependency Scanning**: Vulnerability detection in dependencies
- **Container Scanning**: Docker image security assessment
- **SAST Integration**: Static Application Security Testing

### Compliance Reporting
- **PCI DSS**: Payment card industry compliance support
- **ISO 27001**: Information security management standards
- **NIST CSF**: Cybersecurity framework alignment
- **HIPAA**: Healthcare data protection compliance

### Secure Development
- **Secure by Design**: Built with security best practices
- **Encrypted Communication**: TLS/SSL encryption in transit
- **Access Controls**: Role-based access management
- **Audit Logging**: Comprehensive security event logging

## 🧪 Testing

### Run Tests Locally

```bash
# Install test dependencies
pip install pytest pytest-cov pytest-mock

# Run unit tests
pytest analyzer/ -v

# Run with coverage
pytest --cov=analyzer --cov-report=html

# Run security tests
pytest -m security
```

### Integration Tests

```bash
# Start test environment
docker-compose -f docker-compose.test.yml up -d

# Run integration tests
pytest tests/integration/ -v

# Cleanup
docker-compose -f docker-compose.test.yml down
```

## 📚 Documentation

- [Security Policy](SECURITY.md) - Vulnerability reporting and security practices
- [Deployment Guide](DEPLOYMENT.md) - Cloud deployment instructions
- [Contributing Guide](CONTRIBUTING.md) - How to contribute to the project
- [API Documentation](docs/api/) - Complete API reference
- [Compliance Guide](docs/compliance/) - Standards and frameworks support

## 🤝 Contributing

We welcome contributions from the community! Whether you're:

- 🐛 Reporting bugs
- 💡 Suggesting features  
- 🔒 Improving security
- 📖 Writing documentation
- 🧪 Adding tests

Please read our [Contributing Guide](CONTRIBUTING.md) to get started.

### Quick Contribution Setup

```bash
# Fork and clone
git clone https://github.com/yourusername/Datenschutz.git
cd Datenschutz

# Set up development environment
python3 -m venv .venv
source .venv/bin/activate
pip install -r analyzer/requirements.txt
pip install -r requirements-dev.txt

# Install pre-commit hooks
pre-commit install

# Run tests
pytest

# Make your changes and create a PR!
```

## 🏆 Recognition

### Contributors

We're grateful to all contributors who help make Datenschutz better. See our [Contributors](https://github.com/yourorg/Datenschutz/graphs/contributors) page for the complete list.

### Security Researchers

Special thanks to security researchers who responsibly disclose vulnerabilities. See our [Security Policy](SECURITY.md) for reporting procedures.

## 📄 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Community Support
- [GitHub Discussions](https://github.com/yourorg/Datenschutz/discussions) - Ask questions and share ideas
- [Discord Server](https://discord.gg/datenschutz) - Real-time community chat
- [Stack Overflow](https://stackoverflow.com/questions/tagged/datenschutz) - Technical Q&A

### Enterprise Support
- [Commercial Support](mailto:enterprise@yourorganization.com) - Priority support and custom features
- [Training Services](mailto:training@yourorganization.com) - Security training and workshops
- [Consulting Services](mailto:consulting@yourorganization.com) - Security architecture consulting

---

<div align="center">

**🔐 Built for Security, Designed for Scale**

[Website](https://datenschutz.yourorg.com) • [Documentation](https://docs.datenschutz.yourorg.com) • [Blog](https://blog.datenschutz.yourorg.com)

</div>
