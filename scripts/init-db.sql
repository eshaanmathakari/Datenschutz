-- Database initialization script for Datenschutz
-- This script sets up the initial database schema for the security analysis platform

-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create schema for application tables
CREATE SCHEMA IF NOT EXISTS datenschutz;

-- Set search path
SET search_path = datenschutz, public;

-- Table for storing scan results
CREATE TABLE IF NOT EXISTS scan_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scan_id VARCHAR(255) NOT NULL,
    project_path TEXT NOT NULL,
    scan_options JSONB DEFAULT '{}',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'running',
    total_files INTEGER DEFAULT 0,
    total_issues INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for storing detected vulnerabilities
CREATE TABLE IF NOT EXISTS vulnerabilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scan_result_id UUID REFERENCES scan_results(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    line_number INTEGER,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    severity VARCHAR(50) NOT NULL,
    cwe_id VARCHAR(20),
    owasp_category VARCHAR(100),
    risk_score INTEGER DEFAULT 0,
    suggestion TEXT,
    fix_before TEXT,
    fix_after TEXT,
    vulnerability_type VARCHAR(100),
    compliance_impact JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for storing applied fixes
CREATE TABLE IF NOT EXISTS applied_fixes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vulnerability_id UUID REFERENCES vulnerabilities(id) ON DELETE CASCADE,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    applied_by VARCHAR(255),
    fix_content TEXT,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for storing compliance reports
CREATE TABLE IF NOT EXISTS compliance_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scan_result_id UUID REFERENCES scan_results(id) ON DELETE CASCADE,
    framework VARCHAR(100) NOT NULL, -- PCI_DSS, ISO_27001, NIST_CSF, HIPAA
    compliance_score DECIMAL(5,2),
    total_requirements INTEGER DEFAULT 0,
    met_requirements INTEGER DEFAULT 0,
    report_data JSONB DEFAULT '{}',
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for storing user sessions and audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL,
    user_id VARCHAR(255),
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    event_data JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_scan_results_scan_id ON scan_results(scan_id);
CREATE INDEX IF NOT EXISTS idx_scan_results_status ON scan_results(status);
CREATE INDEX IF NOT EXISTS idx_scan_results_created_at ON scan_results(created_at);

CREATE INDEX IF NOT EXISTS idx_vulnerabilities_scan_result_id ON vulnerabilities(scan_result_id);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_severity ON vulnerabilities(severity);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_cwe_id ON vulnerabilities(cwe_id);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_owasp_category ON vulnerabilities(owasp_category);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_file_path ON vulnerabilities(file_path);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_vulnerability_type ON vulnerabilities(vulnerability_type);

CREATE INDEX IF NOT EXISTS idx_applied_fixes_vulnerability_id ON applied_fixes(vulnerability_id);
CREATE INDEX IF NOT EXISTS idx_applied_fixes_applied_at ON applied_fixes(applied_at);

CREATE INDEX IF NOT EXISTS idx_compliance_reports_scan_result_id ON compliance_reports(scan_result_id);
CREATE INDEX IF NOT EXISTS idx_compliance_reports_framework ON compliance_reports(framework);

CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_scan_results_updated_at BEFORE UPDATE ON scan_results
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vulnerabilities_updated_at BEFORE UPDATE ON vulnerabilities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for development/testing
INSERT INTO scan_results (scan_id, project_path, scan_options, status, total_files, total_issues, completed_at)
VALUES 
    ('sample-scan-001', '/app/sample-project', '{"reasoning": "medium", "temperature": 0.2}', 'completed', 15, 5, NOW() - INTERVAL '1 hour'),
    ('sample-scan-002', '/app/test-project', '{"reasoning": "high", "temperature": 0.1}', 'completed', 8, 12, NOW() - INTERVAL '30 minutes')
ON CONFLICT DO NOTHING;

-- Insert sample vulnerabilities
INSERT INTO vulnerabilities (scan_result_id, file_path, line_number, title, description, severity, cwe_id, owasp_category, risk_score, vulnerability_type)
SELECT 
    sr.id,
    '/app/sample-project/app.py',
    42,
    'SQL Injection Vulnerability',
    'Direct SQL query construction with user input',
    'high',
    'CWE-89',
    'A03:2021 - Injection',
    75,
    'sql_injection'
FROM scan_results sr WHERE sr.scan_id = 'sample-scan-001'
ON CONFLICT DO NOTHING;

INSERT INTO vulnerabilities (scan_result_id, file_path, line_number, title, description, severity, cwe_id, owasp_category, risk_score, vulnerability_type)
SELECT 
    sr.id,
    '/app/sample-project/config.py',
    15,
    'Hardcoded Secret',
    'API key hardcoded in source code',
    'critical',
    'CWE-798',
    'A07:2021 - Identification and Authentication Failures',
    95,
    'hardcoded_secrets'
FROM scan_results sr WHERE sr.scan_id = 'sample-scan-001'
ON CONFLICT DO NOTHING;

-- Grant permissions
GRANT ALL PRIVILEGES ON SCHEMA datenschutz TO datenschutz;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA datenschutz TO datenschutz;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA datenschutz TO datenschutz;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA datenschutz TO datenschutz;
