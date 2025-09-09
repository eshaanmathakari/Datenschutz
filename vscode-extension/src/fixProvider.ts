import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { SecurityIssue } from './scanner';

export interface FixResult {
    success: boolean;
    reason?: string;
    patch?: string;
}

export class FixProvider {
    private readonly FIX_LOG_DIR = 'fix_logs';

    async applyFix(issue: SecurityIssue): Promise<FixResult> {
        const fix = issue.fix;
        const filePath = issue.file_path;

        if (!fix) {
            return { success: false, reason: 'No fix available for this issue' };
        }

        if (!filePath) {
            return { success: false, reason: 'No file path specified' };
        }

        if (!fs.existsSync(filePath)) {
            return { success: false, reason: 'File not found' };
        }

        try {
            // Read current file content
            const content = fs.readFileSync(filePath, 'utf-8');
            
            // Check if the 'before' text exists in the file
            if (!content.includes(fix.before)) {
                return { 
                    success: false, 
                    reason: 'The code to be fixed was not found in the file. The file may have been modified.' 
                };
            }

            // Apply the fix by replacing the first occurrence
            const newContent = content.replace(fix.before, fix.after);

            // Create backup
            await this.createBackup(filePath, content);

            // Write the fixed content
            fs.writeFileSync(filePath, newContent, 'utf-8');

            // Log the fix
            await this.logFix(issue, fix);

            // Generate patch for display
            const patch = this.generatePatch(filePath, fix.before, fix.after);

            return { 
                success: true, 
                patch: patch 
            };

        } catch (error) {
            return { 
                success: false, 
                reason: `Error applying fix: ${error}` 
            };
        }
    }

    private async createBackup(filePath: string, content: string): Promise<void> {
        try {
            const backupDir = path.join(path.dirname(filePath), '.datenschutz_backups');
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const fileName = path.basename(filePath);
            const backupPath = path.join(backupDir, `${fileName}.${timestamp}.bak`);

            fs.writeFileSync(backupPath, content, 'utf-8');
        } catch (error) {
            console.warn('Failed to create backup:', error);
        }
    }

    private async logFix(issue: SecurityIssue, fix: any): Promise<void> {
        try {
            // Ensure log directory exists
            if (!fs.existsSync(this.FIX_LOG_DIR)) {
                fs.mkdirSync(this.FIX_LOG_DIR, { recursive: true });
            }

            const logEntry = {
                timestamp: new Date().toISOString(),
                issue: {
                    title: issue.title,
                    severity: issue.severity,
                    file_path: issue.file_path,
                    line: issue.line,
                    vulnerability_type: issue.vulnerability_type,
                    cwe_id: issue.cwe_id
                },
                fix: {
                    before: fix.before,
                    after: fix.after
                }
            };

            const logFile = path.join(this.FIX_LOG_DIR, `fix_${Date.now()}.json`);
            fs.writeFileSync(logFile, JSON.stringify(logEntry, null, 2), 'utf-8');
        } catch (error) {
            console.warn('Failed to log fix:', error);
        }
    }

    private generatePatch(filePath: string, before: string, after: string): string {
        const fileName = path.basename(filePath);
        return `--- ${fileName} (before)
+++ ${fileName} (after)
@@
${this.indentText(before)}
@@
${this.indentText(after)}`;
    }

    private indentText(text: string): string {
        return text.split('\n').map(line => `    ${line}`).join('\n');
    }

    async applyMultipleFixes(issues: SecurityIssue[]): Promise<{ applied: number; failed: number; results: FixResult[] }> {
        const results: FixResult[] = [];
        let applied = 0;
        let failed = 0;

        for (const issue of issues) {
            const result = await this.applyFix(issue);
            results.push(result);
            
            if (result.success) {
                applied++;
            } else {
                failed++;
            }
        }

        return { applied, failed, results };
    }

    async previewFix(issue: SecurityIssue): Promise<string> {
        const fix = issue.fix;
        if (!fix) {
            return 'No fix available for this issue';
        }

        return this.generatePatch(issue.file_path, fix.before, fix.after);
    }

    async undoLastFix(filePath: string): Promise<FixResult> {
        try {
            const backupDir = path.join(path.dirname(filePath), '.datenschutz_backups');
            if (!fs.existsSync(backupDir)) {
                return { success: false, reason: 'No backups found' };
            }

            // Find the most recent backup
            const backups = fs.readdirSync(backupDir)
                .filter(file => file.startsWith(path.basename(filePath)) && file.endsWith('.bak'))
                .sort()
                .reverse();

            if (backups.length === 0) {
                return { success: false, reason: 'No backups found for this file' };
            }

            const latestBackup = path.join(backupDir, backups[0]);
            const backupContent = fs.readFileSync(latestBackup, 'utf-8');
            
            fs.writeFileSync(filePath, backupContent, 'utf-8');
            
            return { success: true };
        } catch (error) {
            return { success: false, reason: `Error undoing fix: ${error}` };
        }
    }

    getAvailableFixes(issues: SecurityIssue[]): SecurityIssue[] {
        return issues.filter(issue => issue.fix !== null && issue.fix !== undefined);
    }

    async cleanupOldLogs(daysToKeep: number = 14): Promise<void> {
        try {
            if (!fs.existsSync(this.FIX_LOG_DIR)) {
                return;
            }

            const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
            const files = fs.readdirSync(this.FIX_LOG_DIR);

            for (const file of files) {
                const filePath = path.join(this.FIX_LOG_DIR, file);
                const stats = fs.statSync(filePath);
                
                if (stats.mtime.getTime() < cutoffTime) {
                    fs.unlinkSync(filePath);
                }
            }
        } catch (error) {
            console.warn('Failed to cleanup old logs:', error);
        }
    }
}

