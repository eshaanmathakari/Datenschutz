import * as vscode from 'vscode';
import { SecurityIssue } from './scanner';

export class DiagnosticProvider {
    private diagnosticCollection: vscode.DiagnosticCollection;

    constructor() {
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection('datenschutz');
    }

    createDiagnostics(issues: SecurityIssue[]): vscode.DiagnosticCollection {
        this.diagnosticCollection.clear();

        // Group issues by file
        const issuesByFile = new Map<string, SecurityIssue[]>();
        for (const issue of issues) {
            if (!issuesByFile.has(issue.file_path)) {
                issuesByFile.set(issue.file_path, []);
            }
            issuesByFile.get(issue.file_path)!.push(issue);
        }

        // Create diagnostics for each file
        for (const [filePath, fileIssues] of issuesByFile) {
            const diagnostics = this.createFileDiagnostics(filePath, fileIssues);
            if (diagnostics.length > 0) {
                this.diagnosticCollection.set(vscode.Uri.file(filePath), diagnostics);
            }
        }

        return this.diagnosticCollection;
    }

    private createFileDiagnostics(filePath: string, issues: SecurityIssue[]): vscode.Diagnostic[] {
        const diagnostics: vscode.Diagnostic[] = [];

        for (const issue of issues) {
            const diagnostic = this.createDiagnostic(issue);
            if (diagnostic) {
                diagnostics.push(diagnostic);
            }
        }

        return diagnostics;
    }

    private createDiagnostic(issue: SecurityIssue): vscode.Diagnostic | null {
        try {
            // Determine severity
            const severity = this.mapSeverity(issue.severity);

            // Determine position
            const position = this.getPosition(issue);

            // Create diagnostic message
            const message = this.createDiagnosticMessage(issue);

            // Create diagnostic
            const diagnostic = new vscode.Diagnostic(
                new vscode.Range(position, position),
                message,
                severity
            );

            // Add source and code
            diagnostic.source = 'datenschutz';
            diagnostic.code = issue.cwe_id || issue.vulnerability_type;

            // Add related information
            if (issue.suggestion) {
                diagnostic.relatedInformation = [
                    new vscode.DiagnosticRelatedInformation(
                        new vscode.Location(vscode.Uri.file(issue.file_path), position),
                        `Suggestion: ${issue.suggestion}`
                    )
                ];
            }

            // Add tags for quick actions
            diagnostic.tags = this.getDiagnosticTags(issue);

            // Store original issue data for fix actions
            (diagnostic as any).originalIssue = issue;

            return diagnostic;
        } catch (error) {
            console.error('Error creating diagnostic:', error);
            return null;
        }
    }

    private mapSeverity(severity: string): vscode.DiagnosticSeverity {
        switch (severity.toLowerCase()) {
            case 'critical':
                return vscode.DiagnosticSeverity.Error;
            case 'high':
                return vscode.DiagnosticSeverity.Error;
            case 'medium':
                return vscode.DiagnosticSeverity.Warning;
            case 'low':
                return vscode.DiagnosticSeverity.Information;
            default:
                return vscode.DiagnosticSeverity.Warning;
        }
    }

    private getPosition(issue: SecurityIssue): vscode.Position {
        const line = Math.max(0, (issue.line || 1) - 1); // Convert to 0-based
        const character = Math.max(0, (issue.column || 0) - 1); // Convert to 0-based
        return new vscode.Position(line, character);
    }

    private createDiagnosticMessage(issue: SecurityIssue): string {
        let message = issue.title;
        
        if (issue.description && issue.description !== issue.title) {
            message += `\n\n${issue.description}`;
        }

        // Add CWE information if available
        if (issue.cwe_id) {
            message += `\n\nCWE: ${issue.cwe_id}`;
        }

        // Add OWASP category if available
        if (issue.owasp_category) {
            message += `\nOWASP: ${issue.owasp_category}`;
        }

        // Add risk score if available
        if (issue.risk_score) {
            message += `\nRisk Score: ${issue.risk_score}/100`;
        }

        // Add fix suggestion if available
        if (issue.suggestion) {
            message += `\n\nFix: ${issue.suggestion}`;
        }

        return message;
    }

    private getDiagnosticTags(issue: SecurityIssue): vscode.DiagnosticTag[] {
        const tags: vscode.DiagnosticTag[] = [];

        // Add fixable tag if fix is available
        if (issue.fix) {
            tags.push(vscode.DiagnosticTag.Unnecessary);
        }

        return tags;
    }

    updateDiagnostics(diagnosticCollection: vscode.DiagnosticCollection): void {
        // Copy diagnostics from the provided collection
        this.diagnosticCollection.clear();
        
        for (const [uri, diagnostics] of diagnosticCollection) {
            this.diagnosticCollection.set(uri, diagnostics);
        }
    }

    clearDiagnostics(): void {
        this.diagnosticCollection.clear();
    }

    getDiagnosticCollection(): vscode.DiagnosticCollection {
        return this.diagnosticCollection;
    }

    // Helper method to get issues from diagnostics
    static getIssueFromDiagnostic(diagnostic: vscode.Diagnostic): SecurityIssue | null {
        return (diagnostic as any).originalIssue || null;
    }

    // Create a summary of all diagnostics
    createDiagnosticSummary(): { [severity: string]: number } {
        const summary: { [severity: string]: number } = {
            error: 0,
            warning: 0,
            information: 0
        };

        for (const [, diagnostics] of this.diagnosticCollection) {
            for (const diagnostic of diagnostics) {
                switch (diagnostic.severity) {
                    case vscode.DiagnosticSeverity.Error:
                        summary.error++;
                        break;
                    case vscode.DiagnosticSeverity.Warning:
                        summary.warning++;
                        break;
                    case vscode.DiagnosticSeverity.Information:
                        summary.information++;
                        break;
                }
            }
        }

        return summary;
    }
}

