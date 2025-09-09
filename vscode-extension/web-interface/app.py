#!/usr/bin/env python3
"""
Web interface for Datenschutz VS Code Extension
Provides a simple web UI for the deployed extension
"""

import os
import sys
import json
import uuid
from datetime import datetime
from typing import Dict, List, Any

# Add the analyzer module to the path
sys.path.append('/app/analyzer')

from flask import Flask, render_template, request, jsonify, send_from_directory
from flask_cors import CORS

# Import the original analyzer components
from analyzer.backend.scanner import scan_project
from analyzer.backend.analysis import analyze_chunks
from analyzer.backend.fixer import apply_fix_for_issue
from analyzer.backend.logging_store import log_change, cleanup_old_logs

app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)

# Configuration
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# In-memory store for scan results
scan_results: Dict[str, Dict[str, Any]] = {}

@app.route('/')
def index():
    """Main web interface"""
    return render_template('index.html')

@app.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0",
        "model_backend": os.getenv("MODEL_BACKEND", "none")
    })

@app.route('/api/scan', methods=['POST'])
def scan():
    """Scan endpoint for web interface"""
    try:
        data = request.get_json() or {}
        target_path = data.get('path', os.getenv('DEFAULT_SCAN_PATH', '/workspace'))
        options = data.get('options', {})
        
        # Cleanup old logs
        retention_days = int(os.getenv('LOG_RETENTION_DAYS', '14'))
        cleanup_old_logs(retention_days)
        
        # Scan the project
        files = scan_project(
            base_path=target_path,
            include_exts=options.get('include_exts', ['.py', '.js', '.jsx', '.ts', '.tsx', '.sol']),
            max_file_mb=float(options.get('max_file_mb', 1.5)),
            chunk_max_lines=int(options.get('chunk_max_lines', 400)),
            chunk_overlap_lines=int(options.get('chunk_overlap_lines', 40)),
        )
        
        # Analyze the files
        issues = analyze_chunks(files, options)
        
        # Store results
        scan_id = str(uuid.uuid4())
        scan_results[scan_id] = {
            'id': scan_id,
            'timestamp': datetime.utcnow().isoformat(),
            'summary': {
                'num_files': len(files),
                'num_issues': len(issues),
            },
            'issues': issues
        }
        
        return jsonify({
            'scan_id': scan_id,
            'summary': {
                'num_files': len(files),
                'num_issues': len(issues),
            },
            'issues': issues
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/scan/<scan_id>')
def get_scan_results(scan_id: str):
    """Get scan results by ID"""
    if scan_id not in scan_results:
        return jsonify({'error': 'Scan not found'}), 404
    
    return jsonify(scan_results[scan_id])

@app.route('/api/scans')
def list_scans():
    """List all scans"""
    return jsonify({
        'scans': [
            {
                'id': scan_id,
                'timestamp': result['timestamp'],
                'summary': result['summary']
            }
            for scan_id, result in scan_results.items()
        ]
    })

@app.route('/api/fix', methods=['POST'])
def apply_fix():
    """Apply fix for an issue"""
    try:
        data = request.get_json() or {}
        issue = data.get('issue')
        
        if not issue:
            return jsonify({'error': 'No issue provided'}), 400
        
        result = apply_fix_for_issue(issue)
        
        if result.get('applied'):
            # Log the fix
            log_change(issue, result)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/config')
def get_config():
    """Get current configuration"""
    return jsonify({
        'model_backend': os.getenv('MODEL_BACKEND', 'none'),
        'model_path': os.getenv('MODEL_PATH', ''),
        'hf_model': os.getenv('HF_MODEL', ''),
        'default_scan_path': os.getenv('DEFAULT_SCAN_PATH', '/workspace'),
        'log_retention_days': int(os.getenv('LOG_RETENTION_DAYS', '14')),
        'llama_threads': int(os.getenv('LLAMA_THREADS', '4')),
        'hf_device_map': os.getenv('HF_DEVICE_MAP', 'auto'),
        'hf_load_in_8bit': os.getenv('HF_LOAD_IN_8BIT', 'true').lower() == 'true'
    })

@app.route('/api/stats')
def get_stats():
    """Get statistics about scans and issues"""
    total_scans = len(scan_results)
    total_issues = sum(len(result['issues']) for result in scan_results.values())
    
    # Count issues by severity
    severity_counts = {'critical': 0, 'high': 0, 'medium': 0, 'low': 0}
    for result in scan_results.values():
        for issue in result['issues']:
            severity = issue.get('severity', 'medium')
            if severity in severity_counts:
                severity_counts[severity] += 1
    
    return jsonify({
        'total_scans': total_scans,
        'total_issues': total_issues,
        'severity_counts': severity_counts,
        'last_scan': max([result['timestamp'] for result in scan_results.values()]) if scan_results else None
    })

@app.route('/api/workspace')
def get_workspace_info():
    """Get information about the workspace"""
    workspace_path = os.getenv('DEFAULT_SCAN_PATH', '/workspace')
    
    if not os.path.exists(workspace_path):
        return jsonify({'error': 'Workspace not found'}), 404
    
    try:
        # Count files by extension
        file_counts = {}
        total_size = 0
        
        for root, dirs, files in os.walk(workspace_path):
            for file in files:
                if file.startswith('.'):
                    continue
                
                ext = os.path.splitext(file)[1] or 'no_extension'
                file_counts[ext] = file_counts.get(ext, 0) + 1
                
                file_path = os.path.join(root, file)
                try:
                    total_size += os.path.getsize(file_path)
                except OSError:
                    pass
        
        return jsonify({
            'path': workspace_path,
            'file_counts': file_counts,
            'total_files': sum(file_counts.values()),
            'total_size_mb': round(total_size / (1024 * 1024), 2)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 8080))
    debug = os.getenv('DEBUG', 'false').lower() == 'true'
    
    print(f"Starting Datenschutz Web Interface on port {port}")
    print(f"Model Backend: {os.getenv('MODEL_BACKEND', 'none')}")
    print(f"Default Scan Path: {os.getenv('DEFAULT_SCAN_PATH', '/workspace')}")
    
    app.run(host='0.0.0.0', port=port, debug=debug)
