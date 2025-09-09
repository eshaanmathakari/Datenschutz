import * as vscode from 'vscode';
import { SecurityScanner } from './scanner';
import { DiagnosticProvider } from './diagnostics';
import { ModelProvider } from './modelProvider';
import { FixProvider } from './fixProvider';
import { ConfigurationManager } from './configuration';

let securityScanner: SecurityScanner;
let diagnosticProvider: DiagnosticProvider;
let fixProvider: FixProvider;
let configurationManager: ConfigurationManager;

export function activate(context: vscode.ExtensionContext) {
    console.log('Datenschutz Security Scanner extension is now active!');

    // Initialize components
    configurationManager = new ConfigurationManager();
    const modelProvider = new ModelProvider(configurationManager);
    securityScanner = new SecurityScanner(modelProvider, configurationManager);
    diagnosticProvider = new DiagnosticProvider();
    fixProvider = new FixProvider();

    // Register commands
    const scanWorkspaceCommand = vscode.commands.registerCommand('datenschutz.scanWorkspace', async () => {
        await scanWorkspace();
    });

    const scanFileCommand = vscode.commands.registerCommand('datenschutz.scanFile', async () => {
        await scanCurrentFile();
    });

    const applyFixCommand = vscode.commands.registerCommand('datenschutz.applyFix', async (issue: any) => {
        await applyFix(issue);
    });

    const configureModelCommand = vscode.commands.registerCommand('datenschutz.configureModel', async () => {
        await configureModel();
    });

    const showReportCommand = vscode.commands.registerCommand('datenschutz.showReport', async () => {
        await showReport();
    });

    // Register providers
    const diagnosticCollection = vscode.languages.createDiagnosticCollection('datenschutz');
    context.subscriptions.push(diagnosticCollection);

    // Auto-scan on file save (optional)
    const onSaveListener = vscode.workspace.onDidSaveTextDocument(async (document) => {
        const config = vscode.workspace.getConfiguration('datenschutz');
        if (config.get('autoScanOnSave', false) && isScannableFile(document)) {
            await scanDocument(document);
        }
    });

    // Register all subscriptions
    context.subscriptions.push(
        scanWorkspaceCommand,
        scanFileCommand,
        applyFixCommand,
        configureModelCommand,
        showReportCommand,
        onSaveListener,
        diagnosticCollection
    );

    // Initialize status bar
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = "$(shield) Datenschutz";
    statusBarItem.command = 'datenschutz.scanWorkspace';
    statusBarItem.tooltip = 'Click to scan workspace for security issues';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);
}

async function scanWorkspace() {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showWarningMessage('No workspace folder found');
        return;
    }

    try {
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Scanning workspace for security issues...",
            cancellable: true
        }, async (progress, token) => {
            const results = await securityScanner.scanWorkspace(workspaceFolder.uri.fsPath, progress, token);
            
            // Update diagnostics
            const diagnostics = diagnosticProvider.createDiagnostics(results);
            diagnosticProvider.updateDiagnostics(diagnostics);
            
            // Show summary
            const summary = generateSummary(results);
            vscode.window.showInformationMessage(summary);
        });
    } catch (error) {
        vscode.window.showErrorMessage(`Scan failed: ${error}`);
    }
}

async function scanCurrentFile() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage('No active editor found');
        return;
    }

    const document = editor.document;
    if (!isScannableFile(document)) {
        vscode.window.showWarningMessage('File type not supported for security scanning');
        return;
    }

    try {
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Scanning current file for security issues...",
            cancellable: false
        }, async (progress) => {
            const results = await securityScanner.scanFile(document.uri.fsPath, progress);
            
            // Update diagnostics for this file
            const diagnostics = diagnosticProvider.createDiagnostics(results);
            diagnosticProvider.updateDiagnostics(diagnostics);
            
            // Show summary
            if (results.length > 0) {
                const summary = `${results.length} security issue(s) found in ${document.fileName}`;
                vscode.window.showWarningMessage(summary);
            } else {
                vscode.window.showInformationMessage('No security issues found');
            }
        });
    } catch (error) {
        vscode.window.showErrorMessage(`Scan failed: ${error}`);
    }
}

async function scanDocument(document: vscode.TextDocument) {
    try {
        const results = await securityScanner.scanFile(document.uri.fsPath);
        const diagnostics = diagnosticProvider.createDiagnostics(results);
        diagnosticProvider.updateDiagnostics(diagnostics);
    } catch (error) {
        console.error('Auto-scan failed:', error);
    }
}

async function applyFix(issue: any) {
    try {
        const result = await fixProvider.applyFix(issue);
        if (result.success) {
            vscode.window.showInformationMessage('Fix applied successfully');
            // Re-scan the file to update diagnostics
            const document = vscode.workspace.textDocuments.find(doc => doc.uri.fsPath === issue.file_path);
            if (document) {
                await scanDocument(document);
            }
        } else {
            vscode.window.showErrorMessage(`Failed to apply fix: ${result.reason}`);
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Fix application failed: ${error}`);
    }
}

async function configureModel() {
    const modelBackend = await vscode.window.showQuickPick(
        ['none', 'llama_cpp', 'transformers'],
        { placeHolder: 'Select LLM backend' }
    );
    
    if (modelBackend) {
        const config = vscode.workspace.getConfiguration('datenschutz');
        await config.update('modelBackend', modelBackend, vscode.ConfigurationTarget.Global);
        
        if (modelBackend === 'llama_cpp') {
            const modelPath = await vscode.window.showInputBox({
                prompt: 'Enter path to model file (.gguf)',
                value: config.get('modelPath', '')
            });
            if (modelPath) {
                await config.update('modelPath', modelPath, vscode.ConfigurationTarget.Global);
            }
        } else if (modelBackend === 'transformers') {
            const hfModel = await vscode.window.showInputBox({
                prompt: 'Enter Hugging Face model name',
                value: config.get('hfModel', '')
            });
            if (hfModel) {
                await config.update('hfModel', hfModel, vscode.ConfigurationTarget.Global);
            }
        }
        
        vscode.window.showInformationMessage('Model configuration updated');
    }
}

async function showReport() {
    // This would show a detailed security report in a webview or new tab
    const panel = vscode.window.createWebviewPanel(
        'datenschutzReport',
        'Security Report',
        vscode.ViewColumn.One,
        {}
    );
    
    panel.webview.html = getWebviewContent();
}

function isScannableFile(document: vscode.TextDocument): boolean {
    const config = vscode.workspace.getConfiguration('datenschutz');
    const includeExtensions = config.get<string[]>('includeExtensions', ['.py', '.js', '.ts', '.sol']);
    
    const fileExtension = document.fileName.substring(document.fileName.lastIndexOf('.'));
    return includeExtensions.includes(fileExtension);
}

function generateSummary(results: any[]): string {
    if (results.length === 0) {
        return 'No security issues found';
    }
    
    const bySeverity = results.reduce((acc, issue) => {
        const severity = issue.severity || 'medium';
        acc[severity] = (acc[severity] || 0) + 1;
        return acc;
    }, {});
    
    const summary = Object.entries(bySeverity)
        .map(([severity, count]) => `${count} ${severity}`)
        .join(', ');
    
    return `${results.length} security issue(s) found: ${summary}`;
}

function getWebviewContent(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Security Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; }
        .issue { border: 1px solid #ddd; margin: 10px 0; padding: 15px; border-radius: 5px; }
        .critical { border-left: 5px solid #d73a49; }
        .high { border-left: 5px solid #f66a0a; }
        .medium { border-left: 5px solid #ffd33d; }
        .low { border-left: 5px solid #28a745; }
    </style>
</head>
<body>
    <h1>Security Report</h1>
    <p>Use the commands in VS Code to scan your workspace and view detailed results.</p>
</body>
</html>`;
}

export function deactivate() {
    // Cleanup
}

