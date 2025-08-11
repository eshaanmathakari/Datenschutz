# Contributing to Datenschutz

Thank you for your interest in contributing to Datenschutz! This guide will help you get started with contributing to our security-focused code analysis platform.

## 🚀 Quick Start

### Prerequisites

- Python 3.9+ 
- Docker and Docker Compose
- Git
- Node.js 18+ (for frontend development)

### Development Setup

1. **Fork and Clone**:
   ```bash
   git clone https://github.com/yourusername/Datenschutz.git
   cd Datenschutz
   ```

2. **Set up Python Environment**:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install --upgrade pip
   pip install -r analyzer/requirements.txt
   pip install -r requirements-dev.txt  # Development dependencies
   ```

3. **Set up Pre-commit Hooks**:
   ```bash
   pre-commit install
   ```

4. **Start Development Environment**:
   ```bash
   # Option 1: Local development
   export MODEL_BACKEND=none  # Or configure your preferred model
   python -m analyzer.backend.app
   
   # Option 2: Docker development
   docker-compose -f docker-compose.dev.yml up -d
   ```

5. **Verify Setup**:
   ```bash
   curl http://localhost:4001/health
   # Should return: {"status": "ok"}
   ```

## 📋 Development Guidelines

### Code Style

We use automated code formatting and linting:

```bash
# Format code
black analyzer/
isort analyzer/

# Lint code  
flake8 analyzer/
pylint analyzer/

# Type checking
mypy analyzer/

# Security linting
bandit -r analyzer/
```

### Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Format: <type>[optional scope]: <description>

feat: add CWE-89 SQL injection detection
fix: resolve false positive in hardcoded secret detection
docs: update security scanning documentation
test: add integration tests for vulnerability mapping
refactor: simplify vulnerability classification logic
```

**Types**:
- `feat`: New features
- `fix`: Bug fixes  
- `docs`: Documentation updates
- `test`: Test additions/modifications
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `security`: Security-related changes

### Branch Naming

```bash
# Feature branches
git checkout -b feat/add-cwe-mapping
git checkout -b fix/sql-injection-detection

# Security patches
git checkout -b security/fix-cve-2024-1234

# Documentation updates
git checkout -b docs/update-deployment-guide
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=analyzer --cov-report=html

# Run specific test categories
pytest -m unit           # Unit tests only
pytest -m integration    # Integration tests only
pytest -m security       # Security tests only

# Run tests for specific modules
pytest analyzer/backend/test_analysis.py
pytest analyzer/backend/test_vulnerability_mapping.py
```

### Writing Tests

#### Unit Tests
```python
# analyzer/backend/test_vulnerability_mapping.py
import pytest
from analyzer.backend.vulnerability_mapping import VulnerabilityMapper

class TestVulnerabilityMapper:
    def setup_method(self):
        self.mapper = VulnerabilityMapper()
    
    def test_classify_sql_injection(self):
        issue = {
            "title": "SQL injection vulnerability",
            "description": "Direct SQL query construction",
            "severity": "high"
        }
        
        result = self.mapper.classify_vulnerability("sql_injection", issue)
        
        assert result["cwe"]["id"] == "CWE-89"
        assert result["owasp_category"] == "A03:2021 - Injection"
        assert result["severity"] == "high"
```

#### Integration Tests
```python
# analyzer/backend/test_integration.py
import pytest
import requests
from analyzer.backend.app import create_app

@pytest.fixture
def client():
    app = create_app()
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_scan_endpoint(client):
    response = client.post('/scan', json={
        'path': '/test/path',
        'options': {'reasoning': 'medium'}
    })
    
    assert response.status_code == 200
    data = response.get_json()
    assert 'summary' in data
    assert 'issues' in data
```

### Test Data

Create test files in `tests/fixtures/`:

```python
# tests/fixtures/vulnerable_code.py
VULNERABLE_SQL = '''
def get_user(user_id):
    query = f"SELECT * FROM users WHERE id = {user_id}"
    return execute_query(query)
'''

SECURE_SQL = '''
def get_user(user_id):
    query = "SELECT * FROM users WHERE id = %s"
    return execute_query(query, (user_id,))
'''
```

## 🔒 Security Contributions

### Security Vulnerability Reports

If you find a security vulnerability:

1. **DO NOT** create a public issue
2. Email security@yourorganization.com
3. Include reproduction steps and impact assessment
4. We'll respond within 24 hours

### Security Feature Development

When contributing security features:

1. **Research thoroughly**: Understand the vulnerability pattern
2. **Map to standards**: Include CWE/CVE mappings
3. **Test extensively**: Include both positive and negative test cases
4. **Document clearly**: Explain detection logic and limitations

Example security feature:
```python
def detect_hardcoded_secrets(code_content: str) -> List[Dict[str, Any]]:
    """
    Detect hardcoded secrets in code.
    
    Maps to CWE-798: Use of Hard-coded Credentials
    OWASP A07:2021 - Identification and Authentication Failures
    """
    patterns = [
        r'password\s*=\s*["\'][^"\']+["\']',
        r'api_key\s*=\s*["\'][^"\']+["\']',
        r'secret\s*=\s*["\'][^"\']+["\']'
    ]
    
    findings = []
    for pattern in patterns:
        matches = re.finditer(pattern, code_content, re.IGNORECASE)
        for match in matches:
            findings.append({
                "type": "hardcoded_secret",
                "pattern": pattern,
                "line": code_content[:match.start()].count('\n') + 1,
                "cwe_id": "CWE-798"
            })
    
    return findings
```

## 📚 Documentation

### Code Documentation

Use Google-style docstrings:

```python
def analyze_chunks(chunks: List[Dict[str, str]], options: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Analyze code chunks for security vulnerabilities.
    
    Args:
        chunks: List of code chunks to analyze
        options: Analysis configuration options
        
    Returns:
        List of detected security issues with vulnerability mappings
        
    Raises:
        ModelProviderError: If the ML model fails to load
        AnalysisError: If chunk analysis fails
        
    Example:
        >>> chunks = [{"content": "SELECT * FROM users", "language": "sql"}]
        >>> options = {"reasoning": "medium", "temperature": 0.2}
        >>> issues = analyze_chunks(chunks, options)
        >>> print(len(issues))
        1
    """
```

### API Documentation

Update OpenAPI specs in `docs/api/`:

```yaml
# docs/api/openapi.yml
paths:
  /scan:
    post:
      summary: Scan code for security vulnerabilities
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                path:
                  type: string
                  description: Path to scan
                options:
                  type: object
                  properties:
                    reasoning:
                      type: string
                      enum: [low, medium, high]
```

## 🎯 Contribution Areas

### High-Priority Areas

1. **Vulnerability Detection Rules**:
   - Add new CWE patterns
   - Improve accuracy of existing detectors
   - Reduce false positives

2. **Language Support**:
   - Add support for new programming languages
   - Improve existing language parsers

3. **Machine Learning Models**:
   - Fine-tune models for better accuracy
   - Add domain-specific models

4. **Performance Optimization**:
   - Optimize large file processing
   - Improve memory usage
   - Parallel processing improvements

### Feature Requests

Check our [GitHub Issues](https://github.com/yourorg/Datenschutz/issues) for:
- 🆕 `good first issue` - Great for new contributors
- 🔒 `security` - Security-related improvements  
- 🚀 `enhancement` - New features
- 🐛 `bug` - Bug fixes needed
- 📚 `documentation` - Documentation improvements

## 📋 Pull Request Process

### Before Submitting

1. **Check existing issues** and PRs to avoid duplicates
2. **Create an issue** first for significant changes
3. **Follow code style** guidelines
4. **Add tests** for new functionality
5. **Update documentation** as needed

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature  
- [ ] Security improvement
- [ ] Documentation update
- [ ] Performance improvement

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Security tests added/updated
- [ ] Manual testing completed

## Security Review
- [ ] No new security vulnerabilities introduced
- [ ] Security-related changes reviewed by security team
- [ ] Follows secure coding practices

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests pass locally
```

### Review Process

1. **Automated Checks**: CI pipeline must pass
2. **Code Review**: At least one maintainer approval
3. **Security Review**: Required for security-related changes
4. **Testing**: All tests must pass
5. **Documentation**: Updates must be complete

## 🏆 Recognition

### Contributor Levels

- **Contributor**: Made one or more accepted contributions
- **Regular Contributor**: 5+ accepted PRs
- **Core Contributor**: 20+ PRs, active in discussions
- **Maintainer**: Trusted with review and merge permissions

### Hall of Fame

Outstanding contributors are recognized in:
- README.md contributors section
- Release notes
- Annual contributor awards
- Conference speaking opportunities

## 🆘 Getting Help

### Community Support

- **GitHub Discussions**: Ask questions and share ideas
- **Discord Server**: Real-time community chat
- **Stack Overflow**: Tag questions with `datenschutz`

### Maintainer Contact

- **General Questions**: discussions@yourorganization.com
- **Security Questions**: security@yourorganization.com
- **Partnership Inquiries**: partnerships@yourorganization.com

### Office Hours

Join our weekly office hours:
- **When**: Fridays 3-4 PM UTC
- **Where**: Discord voice channel
- **What**: Q&A, code review help, contribution guidance

## 📄 License

By contributing to Datenschutz, you agree that your contributions will be licensed under the [Apache License 2.0](LICENSE).

---

**Happy Contributing!** 🎉

Together, we're building a more secure software ecosystem. Every contribution, no matter how small, makes a difference.

---

**Last Updated**: December 2024  
**Version**: 1.0
