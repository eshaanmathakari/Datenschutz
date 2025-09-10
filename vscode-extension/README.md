# Datenschutz Security Scanner - VS Code Extension

A powerful VS Code extension that provides AI-powered security vulnerability scanning with local LLM support. Built on top of the Datenschutz security analysis engine.

## Features

- **AI-Powered Analysis**: Uses local OpenAI-compatible LLMs for intelligent code analysis
- **Rule-Based Detection**: Comprehensive pattern matching for common vulnerabilities
- **Real-time Scanning**: Scan files and workspaces with instant feedback
- **Automatic Fixes**: Apply suggested fixes directly in VS Code
- **Multiple Language Support**: Python, JavaScript, TypeScript, Solidity, and more
- **Compliance Mapping**: Maps findings to CWE, OWASP, and compliance frameworks
- **Diagnostic Integration**: Shows security issues as VS Code diagnostics

## Installation

1. Install the extension from VS Code Marketplace (when published)
2. Or install from source:
   ```bash
   cd vscode-extension
   npm install
   npm run compile
   ```

## Configuration

### LLM Backend Setup

The extension supports three modes:

1. **Rule-based only** (default): Uses pattern matching without LLM
2. **llama.cpp**: For local GGUF model files
3. **Transformers**: For Hugging Face models

### Configure LLM Backend

1. Open VS Code settings (Cmd/Ctrl + ,)
2. Search for "datenschutz"
3. Set `modelBackend` to your preferred option:
   - `none`: Rule-based detection only
   - `llama_cpp`: For local GGUF files
   - `transformers`: For Hugging Face models

### LLM Model Setup

#### For llama.cpp (Recommended)
1. Download a GGUF model file (e.g., from Hugging Face)
2. Set `modelPath` to the full path of your .gguf file
3. Example models:
   - CodeLlama-7B-Instruct
   - WizardCoder-7B-V1.0
   - StarCoder-7B

#### For Transformers
1. Set `hfModel` to a Hugging Face model name
2. Example models:
   - `microsoft/CodeBERT-base`
   - `Salesforce/codet5-base`
   - `bigcode/starcoder`

### Python Dependencies

For LLM support, install the required Python packages:

```bash
pip install llama-cpp-python transformers torch accelerate
```

## Usage

### Commands

- **Scan Workspace**: `Cmd/Ctrl + Shift + P` → "Datenschutz: Scan Workspace"
- **Scan Current File**: `Cmd/Ctrl + Shift + P` → "Datenschutz: Scan Current File"
- **Apply Fix**: Right-click on a diagnostic → "Apply Fix"
- **Configure Model**: `Cmd/Ctrl + Shift + P` → "Datenschutz: Configure LLM Model"

### Status Bar

Click the shield icon in the status bar to quickly scan your workspace.

### Diagnostics

Security issues appear as VS Code diagnostics with:
- Severity levels (Error, Warning, Info)
- CWE classifications
- OWASP mappings
- Fix suggestions
- One-click fix application

## Configuration Options

| Setting | Default | Description |
|---------|---------|-------------|
| `modelBackend` | `none` | LLM backend to use |
| `modelPath` | `""` | Path to GGUF model file |
| `hfModel` | `""` | Hugging Face model name |
| `includeExtensions` | `[".py", ".js", ".ts", ".sol"]` | File extensions to scan |
| `maxFileSize` | `1.5` | Maximum file size in MB |
| `chunkMaxLines` | `400` | Lines per code chunk |
| `temperature` | `0.2` | LLM temperature |
| `enableRuleBased` | `true` | Enable rule-based detection |
| `autoScanOnSave` | `false` | Auto-scan on file save |

## Security Standards

The extension maps findings to:

- **CWE (Common Weakness Enumeration)**: Standard vulnerability classifications
- **OWASP Top 10**: Web application security risks
- **Compliance Frameworks**: PCI DSS, ISO 27001, NIST CSF, HIPAA

## Development

### Building from Source

```bash
git clone <repository>
cd vscode-extension
npm install
npm run compile
```

### Running in Development

1. Open the extension folder in VS Code
2. Press `F5` to launch a new Extension Development Host window
3. Test the extension in the new window

### Testing

```bash
npm test
```

## AWS Deployment

Deploy the extension to AWS ECS for cloud-based scanning:

```bash
# Setup infrastructure
./aws/setup-infrastructure.sh

# Deploy application
./aws/deploy.sh
```

## Troubleshooting

### Model Not Loading
- Ensure Python dependencies are installed
- Check model file path is correct
- Verify model file exists and is readable

### Slow Performance
- Reduce `chunkMaxLines` for faster processing
- Use smaller model files
- Enable rule-based detection as backup

### No Issues Found
- Check file extensions in configuration
- Verify files are under `maxFileSize` limit
- Enable rule-based detection for guaranteed results

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Acknowledgments

- Built on the Datenschutz security analysis engine
- Uses VS Code Extension API
- Integrates with local LLM models via Python
- Maps to standard security frameworks (CWE, OWASP)