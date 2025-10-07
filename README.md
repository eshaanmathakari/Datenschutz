# 🛡️ Datenschutz

**AI-Powered Security Code Analysis Platform**

Datenschutz is a comprehensive security analysis platform that detects vulnerabilities in your code, maps them to industry standards (CWE/CVE, OWASP Top 10), and provides automated remediation suggestions.

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](docker-compose.yml)

## ✨ What is Datenschutz?

Datenschutz automatically scans your code for security vulnerabilities and provides:

- **🔍 Vulnerability Detection**: Finds SQL injection, XSS, hardcoded secrets, and more
- **🏛️ Standards Compliance**: Maps issues to OWASP Top 10, CWE, and compliance frameworks
- **🤖 AI-Powered Analysis**: Uses advanced language models for deep code understanding
- **🔧 Automated Fixes**: Provides one-click remediation suggestions
- **🌐 Web Interface**: Beautiful, modern UI for easy scanning and results review
- **📊 Multi-Language Support**: Python, JavaScript, TypeScript, Java, Go, and Solidity

## 🚀 How to Use

### 1. Install and Run

```bash
# Clone the repository
git clone https://github.com/eshaanmathakari/datenschutz.git
cd datenschutz

# Set up Python environment
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r analyzer/requirements.txt

# Run the application
python -m analyzer.backend.app
```

### 2. Open Web Interface

Visit `http://localhost:4003` in your browser to access the modern web interface.

### 3. Scan Your Code

1. **Enter a path** to scan (directory or single file)
2. **Choose analysis depth** (Fast/Medium/Thorough)
3. **Select file types** (Python, Web, All, or Custom)
4. **Click "Start Security Scan"**
5. **Review results** in beautiful issue cards
6. **Apply fixes** with one click (when available)

### Docker (Alternative)

```bash
# Build and run with Docker
docker build -t datenschutz .
docker run -p 4003:4003 -v $(pwd):/scan datenschutz
```

## 🔍 What Vulnerabilities Does It Find?

Datenschutz detects common security issues including:

- **SQL Injection** - Unsafe database queries
- **Cross-Site Scripting (XSS)** - Client-side code injection
- **Hardcoded Secrets** - Passwords, API keys, tokens in code
- **Command Injection** - Unsafe system command execution
- **Path Traversal** - Directory traversal vulnerabilities
- **Weak Cryptography** - MD5, SHA1, weak random generation
- **Insecure Deserialization** - Unsafe object deserialization
- **Buffer Overflows** - Memory safety issues
- **Server-Side Request Forgery (SSRF)** - Unsafe external requests

Each vulnerability is mapped to industry standards like **OWASP Top 10**, **CWE**, and compliance frameworks.

## ⚙️ Configuration

### Basic Settings

Set these environment variables to customize Datenschutz:

```bash
# Application settings
export PORT=4003                    # Web interface port
export DEFAULT_SCAN_PATH=./src      # Default scan directory
export LOG_RETENTION_DAYS=14        # Log cleanup interval

# AI Model settings (optional - works without AI models too)
export MODEL_BACKEND=none           # Options: none, transformers, llama_cpp
export HF_MODEL=microsoft/CodeBERT-base  # HuggingFace model
export MODEL_PATH=/path/to/model.gguf    # Local model file
```

### API Usage

```bash
# Scan a directory
curl -X POST http://localhost:4003/scan \
  -H "Content-Type: application/json" \
  -d '{"path": "./my-code", "options": {"reasoning": "medium"}}'

# Apply a fix
curl -X POST http://localhost:4003/apply_fix \
  -H "Content-Type: application/json" \
  -d '{"issue_id": "issue-uuid-here"}'
```

## 🤝 Contributing

We welcome contributions! Here's how to get started:

```bash
# Fork and clone the repository
git clone https://github.com/eshaanmathakari/datenschutz.git
cd datenschutz

# Set up development environment
python3 -m venv .venv
source .venv/bin/activate
pip install -r analyzer/requirements.txt
pip install -r requirements-dev.txt

# Make your changes and create a pull request!
```

### Development

```bash
# Run tests
pytest analyzer/ -v

# Run with coverage
pytest --cov=analyzer --cov-report=html

# Start development server
python -m analyzer.backend.app
```

## 📄 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**🔐 Built for Security, Designed for Scale**

**Datenschutz** - AI-Powered Security Code Analysis

</div>
