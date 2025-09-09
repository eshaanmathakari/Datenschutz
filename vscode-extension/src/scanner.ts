import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ModelProvider } from './modelProvider';
import { ConfigurationManager } from './configuration';

export interface SecurityIssue {
    id?: string;
    title: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    file_path: string;
    line?: number;
    column?: number;
    suggestion: string;
    fix?: {
        before: string;
        after: string;
    };
    vulnerability_type?: string;
    cwe_id?: string;
    owasp_category?: string;
    risk_score?: number;
    compliance_impact?: any[];
}

export interface ScanResult {
    issues: SecurityIssue[];
    summary: {
        num_files: number;
        num_issues: number;
        scan_duration: number;
    };
}

export class SecurityScanner {
    private modelProvider: ModelProvider;
    private configManager: ConfigurationManager;

    constructor(modelProvider: ModelProvider, configManager: ConfigurationManager) {
        this.modelProvider = modelProvider;
        this.configManager = configManager;
    }

    async scanWorkspace(workspacePath: string, progress?: vscode.Progress<any>, token?: vscode.CancellationToken): Promise<SecurityIssue[]> {
        const config = vscode.workspace.getConfiguration('datenschutz');
        const includeExtensions = config.get<string[]>('includeExtensions', ['.py', '.js', '.jsx', '.ts', '.tsx', '.sol']);
        const maxFileSize = config.get<number>('maxFileSize', 1.5) * 1024 * 1024; // Convert MB to bytes
        const chunkMaxLines = config.get<number>('chunkMaxLines', 400);

        const files = this.getScannableFiles(workspacePath, includeExtensions, maxFileSize);
        const allIssues: SecurityIssue[] = [];

        progress?.report({ message: `Found ${files.length} files to scan` });

        for (let i = 0; i < files.length; i++) {
            if (token?.isCancellationRequested) {
                break;
            }

            const file = files[i];
            progress?.report({ 
                message: `Scanning ${path.basename(file)}`,
                increment: (100 / files.length)
            });

            try {
                const issues = await this.scanFile(file);
                allIssues.push(...issues);
            } catch (error) {
                console.error(`Error scanning ${file}:`, error);
            }
        }

        return allIssues;
    }

    async scanFile(filePath: string, progress?: vscode.Progress<any>): Promise<SecurityIssue[]> {
        const config = vscode.workspace.getConfiguration('datenschutz');
        const chunkMaxLines = config.get<number>('chunkMaxLines', 400);
        const chunkOverlapLines = 40;

        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        const content = fs.readFileSync(filePath, 'utf-8');
        const language = this.getLanguageFromExtension(filePath);
        
        // Add line numbers to content
        const numberedContent = this.addLineNumbers(content);
        
        // Split into chunks
        const chunks = this.chunkByLines(numberedContent, chunkMaxLines, chunkOverlapLines);
        
        const allIssues: SecurityIssue[] = [];

        progress?.report({ message: `Analyzing ${path.basename(filePath)}` });

        for (const chunk of chunks) {
            if (progress) {
                progress.report({ message: `Processing chunk...` });
            }

            // Run rule-based detection first (always available)
            const ruleIssues = this.analyzeWithRules(filePath, chunk);
            allIssues.push(...ruleIssues);

            // Run LLM analysis if model is available
            if (this.modelProvider.isModelAvailable()) {
                try {
                    const llmIssues = await this.analyzeWithLLM(language, filePath, chunk);
                    allIssues.push(...llmIssues);
                } catch (error) {
                    console.error('LLM analysis failed:', error);
                }
            }
        }

        return allIssues;
    }

    private getScannableFiles(workspacePath: string, includeExtensions: string[], maxFileSize: number): string[] {
        const files: string[] = [];
        
        const scanDirectory = (dir: string) => {
            try {
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                
                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);
                    
                    if (entry.isDirectory()) {
                        // Skip common non-source directories
                        if (!['node_modules', '.git', '.vscode', '__pycache__', '.pytest_cache'].includes(entry.name)) {
                            scanDirectory(fullPath);
                        }
                    } else if (entry.isFile()) {
                        const ext = path.extname(entry.name);
                        if (includeExtensions.includes(ext)) {
                            try {
                                const stats = fs.statSync(fullPath);
                                if (stats.size <= maxFileSize) {
                                    files.push(fullPath);
                                }
                            } catch (error) {
                                // Skip files that can't be accessed
                                continue;
                            }
                        }
                    }
                }
            } catch (error) {
                // Skip directories that can't be accessed
                console.error(`Error scanning directory ${dir}:`, error);
            }
        };

        scanDirectory(workspacePath);
        return files;
    }

    private getLanguageFromExtension(filePath: string): string {
        const ext = path.extname(filePath).toLowerCase();
        const languageMap: { [key: string]: string } = {
            '.py': 'Python',
            '.js': 'JavaScript',
            '.jsx': 'JavaScript',
            '.ts': 'TypeScript',
            '.tsx': 'TypeScript',
            '.sol': 'Solidity',
            '.java': 'Java',
            '.c': 'C',
            '.cpp': 'C++',
            '.cs': 'C#',
            '.php': 'PHP',
            '.rb': 'Ruby',
            '.go': 'Go',
            '.rs': 'Rust'
        };
        return languageMap[ext] || 'Unknown';
    }

    private addLineNumbers(text: string): string {
        const lines = text.split('\n');
        return lines.map((line, index) => `${(index + 1).toString().padStart(5, '0')}: ${line}`).join('\n');
    }

    private chunkByLines(numberedText: string, maxLines: number, overlapLines: number): string[] {
        const lines = numberedText.split('\n');
        const chunks: string[] = [];
        let start = 0;
        const n = lines.length;

        while (start < n) {
            const end = Math.min(start + maxLines, n);
            const chunk = lines.slice(start, end).join('\n');
            chunks.push(chunk);
            
            if (end === n) break;
            start = Math.max(0, end - overlapLines);
        }

        return chunks;
    }

    private analyzeWithRules(filePath: string, content: string): SecurityIssue[] {
        // Rule-based detection patterns
        const patterns = {
            sql_injection: [
                /f["']SELECT.*\{.*\}.*FROM/gi,
                /f["']INSERT.*\{.*\}.*INTO/gi,
                /f["']UPDATE.*\{.*\}.*SET/gi,
                /f["']DELETE.*\{.*\}.*FROM/gi,
                /execute.*f["'].*\{.*\}/gi,
                /cursor\.execute.*f["'].*\{.*\}/gi
            ],
            hardcoded_secrets: [
                /password\s*=\s*["'][^"']+["']/gi,
                /api_key\s*=\s*["'][^"']+["']/gi,
                /secret\s*=\s*["'][^"']+["']/gi,
                /token\s*=\s*["'][^"']+["']/gi,
                /sk-[a-zA-Z0-9]{48}/g,
                /AKIA[0-9A-Z]{16}/g
            ],
            command_injection: [
                /os\.system\(.*\+.*\+/gi,
                /subprocess\.run\(.*\+.*\+/gi,
                /eval\(.*\+.*\+/gi,
                /exec\(.*\+.*\+/gi
            ],
            weak_crypto: [
                /hashlib\.md5\(/gi,
                /hashlib\.sha1\(/gi,
                /random\.random\(\)/gi
            ],
            xss: [
                /innerHTML\s*=\s*.*\+.*/gi,
                /document\.write\(.*\+.*\)/gi
            ]
        };

        const severityMap: { [key: string]: 'low' | 'medium' | 'high' | 'critical' } = {
            sql_injection: 'high',
            hardcoded_secrets: 'critical',
            command_injection: 'critical',
            weak_crypto: 'high',
            xss: 'medium'
        };

        const issues: SecurityIssue[] = [];
        const lines = content.split('\n');

        for (const [vulnType, vulnPatterns] of Object.entries(patterns)) {
            for (const pattern of vulnPatterns) {
                let match;
                while ((match = pattern.exec(content)) !== null) {
                    const lineNum = content.substring(0, match.index).split('\n').length;
                    const lineContent = lines[lineNum - 1] || '';

                    issues.push({
                        title: this.getVulnerabilityTitle(vulnType),
                        description: this.getVulnerabilityDescription(vulnType, lineContent),
                        severity: severityMap[vulnType] || 'medium',
                        file_path: filePath,
                        line: lineNum,
                        suggestion: this.getVulnerabilitySuggestion(vulnType),
                        vulnerability_type: vulnType
                    });
                }
            }
        }

        return issues;
    }

    private async analyzeWithLLM(language: string, filePath: string, chunk: string): Promise<SecurityIssue[]> {
        const prompt = this.buildPrompt(language, filePath, chunk);
        
        try {
            const response = await this.modelProvider.generate(prompt);
            return this.parseLLMResponse(response, filePath);
        } catch (error) {
            console.error('LLM analysis failed:', error);
            return [];
        }
    }

    private buildPrompt(language: string, filePath: string, codeChunk: string): string {
        return `Instructions:
You are an expert software security and bug-finding AI. Analyze the provided code for memory/resource leaks, logical errors, runtime errors, security vulnerabilities, and bad practices. 
Respond in strict JSON with an array under key 'issues'. Each issue is an object with keys: 
'title' (string), 'description' (string), 'severity' ('low'|'medium'|'high'|'critical'), 'file_path' (string), 'line' (int or null), 
'suggestion' (string), and 'fix' (object or null). If a fix is possible, set 'fix' with keys: 'before' (string), 'after' (string) representing the exact before/after snippet to replace.

Language: ${language}
File: ${filePath}
Code (with line numbers):
\`\`\`
${codeChunk}
\`\`\`
Output JSON only with keys {"issues": [...]} and no extra text.`;
    }

    private parseLLMResponse(response: string, filePath: string): SecurityIssue[] {
        try {
            // Extract JSON from response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                return [];
            }

            const data = JSON.parse(jsonMatch[0]);
            const issues = data.issues || [];

            return issues.map((issue: any) => ({
                title: issue.title || 'Security Issue',
                description: issue.description || '',
                severity: issue.severity || 'medium',
                file_path: filePath,
                line: issue.line || null,
                suggestion: issue.suggestion || '',
                fix: issue.fix || null,
                vulnerability_type: issue.vulnerability_type
            }));
        } catch (error) {
            console.error('Failed to parse LLM response:', error);
            return [];
        }
    }

    private getVulnerabilityTitle(vulnType: string): string {
        const titles: { [key: string]: string } = {
            sql_injection: 'SQL Injection Vulnerability',
            hardcoded_secrets: 'Hardcoded Secret Detected',
            command_injection: 'Command Injection Vulnerability',
            weak_crypto: 'Weak Cryptographic Algorithm',
            xss: 'Cross-Site Scripting (XSS) Vulnerability'
        };
        return titles[vulnType] || `${vulnType.replace('_', ' ')} Vulnerability`;
    }

    private getVulnerabilityDescription(vulnType: string, lineContent: string): string {
        const descriptions: { [key: string]: string } = {
            sql_injection: `Direct SQL query construction with user input detected: ${lineContent}`,
            hardcoded_secrets: `Hardcoded secret found in code: ${lineContent}`,
            command_injection: `Command execution with user input detected: ${lineContent}`,
            weak_crypto: `Weak cryptographic algorithm usage: ${lineContent}`,
            xss: `Potential XSS vulnerability: ${lineContent}`
        };
        return descriptions[vulnType] || `Security vulnerability detected: ${lineContent}`;
    }

    private getVulnerabilitySuggestion(vulnType: string): string {
        const suggestions: { [key: string]: string } = {
            sql_injection: 'Use parameterized queries or ORM to prevent SQL injection',
            hardcoded_secrets: 'Use environment variables or secure secret management',
            command_injection: 'Avoid command execution with user input, use safer alternatives',
            weak_crypto: 'Use strong cryptographic algorithms (SHA-256, AES-256)',
            xss: 'Sanitize user input and use proper output encoding'
        };
        return suggestions[vulnType] || 'Review and fix the security vulnerability';
    }
}

