"""
Rule-based vulnerability detector for Datenschutz.
Provides immediate security scanning without requiring AI models.
"""

import re
import json
from typing import List, Dict, Any, Optional
from .vulnerability_mapping import enhance_issue_with_mapping


class RuleBasedDetector:
    """Rule-based vulnerability detection using pattern matching."""
    
    def __init__(self):
        self.patterns = {
            "sql_injection": [
                r"f\"SELECT.*\{.*\}.*FROM",  # f-string SQL queries
                r"f\"INSERT.*\{.*\}.*INTO",
                r"f\"UPDATE.*\{.*\}.*SET",
                r"f\"DELETE.*\{.*\}.*FROM",
                r"execute.*f\".*\{.*\}",  # execute with f-string
                r"cursor\.execute.*f\".*\{.*\}",  # cursor execute with f-string
                r"\.execute\(.*\+.*\+",  # string concatenation in execute
                r"f\".*SELECT.*\{.*\}",  # f-string with SELECT and variable
                r"f\".*INSERT.*\{.*\}",  # f-string with INSERT and variable
                r"f\".*UPDATE.*\{.*\}",  # f-string with UPDATE and variable
                r"f\".*DELETE.*\{.*\}",  # f-string with DELETE and variable
            ],
            "hardcoded_secrets": [
                r"password\s*=\s*[\"'][^\"']+[\"']",  # password = "secret"
                r"api_key\s*=\s*[\"'][^\"']+[\"']",  # api_key = "secret"
                r"secret\s*=\s*[\"'][^\"']+[\"']",  # secret = "value"
                r"token\s*=\s*[\"'][^\"']+[\"']",  # token = "value"
                r"key\s*=\s*[\"'][^\"']+[\"']",  # key = "value"
                r"sk-[a-zA-Z0-9]{48}",  # OpenAI-style keys
                r"AKIA[0-9A-Z]{16}",  # AWS access keys
                r"ghp_[a-zA-Z0-9]{36}",  # GitHub personal tokens
                r"gho_[a-zA-Z0-9]{36}",  # GitHub OAuth tokens
                r"ghu_[a-zA-Z0-9]{36}",  # GitHub user tokens
                r"ghs_[a-zA-Z0-9]{36}",  # GitHub session tokens
                r"ghr_[a-zA-Z0-9]{36}",  # GitHub refresh tokens
            ],
            "command_injection": [
                r"os\.system\(.*\+.*\+",  # os.system with concatenation
                r"subprocess\.run\(.*\+.*\+",  # subprocess with concatenation
                r"subprocess\.call\(.*\+.*\+",  # subprocess.call with concatenation
                r"subprocess\.Popen\(.*\+.*\+",  # subprocess.Popen with concatenation
                r"eval\(.*\+.*\+",  # eval with concatenation
                r"exec\(.*\+.*\+",  # exec with concatenation
            ],
            "path_traversal": [
                r"\.\.\/\.\.\/",  # ../../
                r"\.\.\\\.\.\\",  # ..\..\
                r"open\(.*\+.*\.\.",  # open with .. in path
                r"file\(.*\+.*\.\.",  # file with .. in path
            ],
            "weak_crypto": [
                r"hashlib\.md5\(",  # MD5 usage
                r"hashlib\.sha1\(",  # SHA1 usage
                r"import\s+md5",  # MD5 import
                r"import\s+sha",  # SHA import
                r"cryptography\.hazmat\.primitives\.hashes\.MD5",  # MD5 in cryptography
                r"cryptography\.hazmat\.primitives\.hashes\.SHA1",  # SHA1 in cryptography
            ],
            "insecure_random": [
                r"random\.random\(\)",  # random.random()
                r"random\.randint\(0,\s*100\)",  # predictable random
                r"random\.choice\(.*\)",  # random.choice for security
                r"random\.uniform\(.*\)",  # random.uniform for security
            ],
            "xss": [
                r"innerHTML\s*=\s*.*\+.*",  # innerHTML with concatenation
                r"document\.write\(.*\+.*\)",  # document.write with concatenation
                r"\.html\(.*\+.*\)",  # jQuery html with concatenation
                r"\.append\(.*\+.*\)",  # jQuery append with concatenation
            ],
            "buffer_overflow": [
                r"memcpy\(.*,\s*.*,\s*strlen\(.*\)\)",  # memcpy with strlen
                r"strcpy\(.*,\s*.*\)",  # strcpy without bounds checking
                r"strcat\(.*,\s*.*\)",  # strcat without bounds checking
            ],
            "insecure_deserialization": [
                r"pickle\.loads\(.*\)",  # pickle.loads
                r"pickle\.load\(.*\)",  # pickle.load
                r"yaml\.load\(.*\)",  # yaml.load
                # Note: json.loads is generally safe for internal use, but can be dangerous with untrusted input
                # We'll focus on the more dangerous deserialization methods
            ],
            "insufficient_logging": [
                r"#\s*TODO.*log",  # TODO comments about logging
                r"#\s*FIXME.*log",  # FIXME comments about logging
                r"pass\s*#.*log",  # pass statements with log comments
            ],
            "ssrf": [
                r"requests\.get\(.*\+.*\)",  # requests.get with concatenation
                r"urllib\.request\.urlopen\(.*\+.*\)",  # urllib with concatenation
                r"httpx\.get\(.*\+.*\)",  # httpx with concatenation
            ]
        }
        
        self.severity_mapping = {
            "sql_injection": "high",
            "hardcoded_secrets": "critical", 
            "command_injection": "critical",
            "path_traversal": "high",
            "weak_crypto": "high",
            "insecure_random": "medium",
            "xss": "medium",
            "buffer_overflow": "critical",
            "insecure_deserialization": "critical",
            "insufficient_logging": "low",
            "ssrf": "high"
        }
    
    def detect_vulnerabilities(self, file_path: str, content: str) -> List[Dict[str, Any]]:
        """Detect vulnerabilities in code content using rule-based patterns."""
        issues = []
        
        # Skip analysis for rule-based detector itself to avoid false positives
        if "rule_based_detector.py" in file_path:
            return issues
        
        # Add line numbers to content for better reporting
        lines = content.split('\n')
        
        for vuln_type, patterns in self.patterns.items():
            for pattern in patterns:
                matches = re.finditer(pattern, content, re.IGNORECASE | re.MULTILINE)
                for match in matches:
                    # Calculate line number
                    line_num = content[:match.start()].count('\n') + 1
                    
                    # Get the actual line content
                    if line_num <= len(lines):
                        line_content = lines[line_num - 1].strip()
                    else:
                        line_content = match.group(0)
                    
                    # Skip if this is a comment or docstring (not actual code)
                    if line_content.strip().startswith('#') or line_content.strip().startswith('"""') or line_content.strip().startswith("'''"):
                        continue
                    
                    # Create issue
                    issue = {
                        "title": self._get_title(vuln_type),
                        "description": self._get_description(vuln_type, line_content),
                        "severity": self.severity_mapping.get(vuln_type, "medium"),
                        "file_path": file_path,
                        "line": line_num,
                        "suggestion": self._get_suggestion(vuln_type),
                        "fix": self._get_fix(vuln_type, line_content),
                        "vulnerability_type": vuln_type
                    }
                    
                    # Enhance with vulnerability mapping
                    enhanced_issue = enhance_issue_with_mapping(issue)
                    issues.append(enhanced_issue)
        
        return issues
    
    def _get_title(self, vuln_type: str) -> str:
        """Get human-readable title for vulnerability type."""
        titles = {
            "sql_injection": "SQL Injection Vulnerability",
            "hardcoded_secrets": "Hardcoded Secret Detected",
            "command_injection": "Command Injection Vulnerability", 
            "path_traversal": "Path Traversal Vulnerability",
            "weak_crypto": "Weak Cryptographic Algorithm",
            "insecure_random": "Insecure Random Number Generation",
            "xss": "Cross-Site Scripting (XSS) Vulnerability",
            "buffer_overflow": "Buffer Overflow Vulnerability",
            "insecure_deserialization": "Insecure Deserialization",
            "insufficient_logging": "Insufficient Logging",
            "ssrf": "Server-Side Request Forgery (SSRF)"
        }
        return titles.get(vuln_type, f"{vuln_type.replace('_', ' ').title()} Vulnerability")
    
    def _get_description(self, vuln_type: str, line_content: str) -> str:
        """Get detailed description for vulnerability."""
        descriptions = {
            "sql_injection": f"Direct SQL query construction with user input detected: {line_content}",
            "hardcoded_secrets": f"Hardcoded secret found in code: {line_content}",
            "command_injection": f"Command execution with user input detected: {line_content}",
            "path_traversal": f"Potential path traversal vulnerability: {line_content}",
            "weak_crypto": f"Weak cryptographic algorithm usage: {line_content}",
            "insecure_random": f"Insecure random number generation: {line_content}",
            "xss": f"Potential XSS vulnerability: {line_content}",
            "buffer_overflow": f"Buffer overflow vulnerability: {line_content}",
            "insecure_deserialization": f"Insecure deserialization of untrusted data: {line_content}",
            "insufficient_logging": f"Insufficient logging for security events: {line_content}",
            "ssrf": f"Server-side request forgery vulnerability: {line_content}"
        }
        return descriptions.get(vuln_type, f"Security vulnerability detected: {line_content}")
    
    def _get_suggestion(self, vuln_type: str) -> str:
        """Get suggestion for fixing the vulnerability."""
        suggestions = {
            "sql_injection": "Use parameterized queries or ORM to prevent SQL injection",
            "hardcoded_secrets": "Use environment variables or secure secret management",
            "command_injection": "Avoid command execution with user input, use safer alternatives",
            "path_traversal": "Validate and sanitize file paths, use path.join()",
            "weak_crypto": "Use strong cryptographic algorithms (SHA-256, AES-256)",
            "insecure_random": "Use cryptographically secure random generators (secrets module)",
            "xss": "Sanitize user input and use proper output encoding",
            "buffer_overflow": "Use bounds checking and safe string functions",
            "insecure_deserialization": "Avoid deserializing untrusted data, use JSON schema validation",
            "insufficient_logging": "Implement comprehensive security event logging",
            "ssrf": "Validate and restrict URLs, use allowlist approach"
        }
        return suggestions.get(vuln_type, "Review and fix the security vulnerability")
    
    def _get_fix(self, vuln_type: str, line_content: str) -> Optional[Dict[str, str]]:
        """Get suggested fix for the vulnerability."""
        if vuln_type == "sql_injection":
            # Replace f-string SQL with parameterized query
            if "f\"" in line_content and "SELECT" in line_content:
                before = line_content
                after = line_content.replace("f\"", "\"").replace("{", "?").replace("}", "")
                return {"before": before, "after": after}
        
        elif vuln_type == "hardcoded_secrets":
            # Replace hardcoded secret with environment variable
            if "password" in line_content and "=" in line_content:
                before = line_content
                # Extract the variable name and value
                parts = line_content.split("=", 1)
                if len(parts) == 2:
                    var_name = parts[0].strip()
                    var_value = parts[1].strip()
                    after = f"{var_name} = os.getenv(\"{var_name.upper()}\", \"\")"
                    return {"before": before, "after": after}
        
        elif vuln_type == "insecure_random":
            # Replace random.random() with secrets.token_hex()
            if "random.random()" in line_content:
                before = line_content
                after = line_content.replace("random.random()", "secrets.token_hex(16)")
                return {"before": before, "after": after}
        
        return None


def analyze_with_rules(file_path: str, content: str) -> List[Dict[str, Any]]:
    """Analyze file content using rule-based detection."""
    detector = RuleBasedDetector()
    return detector.detect_vulnerabilities(file_path, content)
