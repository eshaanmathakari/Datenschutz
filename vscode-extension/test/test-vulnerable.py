#!/usr/bin/env python3
"""
Test file with intentional security vulnerabilities for testing the extension.
"""

import os
import random
import hashlib
import sqlite3
from flask import Flask, request

app = Flask(__name__)

# Hardcoded secrets (should be detected)
password = "admin123"
api_key = "sk-1234567890abcdef"
secret_token = "my_secret_token_here"

def vulnerable_sql_query(user_id):
    """SQL injection vulnerability"""
    query = f"SELECT * FROM users WHERE id = {user_id}"
    return query

def vulnerable_command_execution(filename):
    """Command injection vulnerability"""
    os.system(f"cat {filename}")
    return "File read"

def weak_crypto_example():
    """Weak cryptographic algorithm"""
    password = "mypassword"
    hashed = hashlib.md5(password.encode()).hexdigest()
    return hashed

def insecure_random():
    """Insecure random number generation"""
    token = random.random()
    return token

def main():
    # Path traversal vulnerability
    user_input = "../../etc/passwd"
    with open(user_input, 'r') as f:
        content = f.read()
    
    # XSS-like vulnerability (if this were a web app)
    user_data = request.args.get('data', '')
    html = f"<div>{user_data}</div>"
    
    print("Test vulnerabilities created")

if __name__ == "__main__":
    main()

