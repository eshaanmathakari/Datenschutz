import * as vscode from 'vscode';

export interface DatenschutzConfiguration {
    modelBackend: 'none' | 'llama_cpp' | 'transformers';
    modelPath: string;
    hfModel: string;
    includeExtensions: string[];
    maxFileSize: number;
    chunkMaxLines: number;
    chunkOverlapLines: number;
    temperature: number;
    maxNewTokens: number;
    enableRuleBased: boolean;
    autoScanOnSave: boolean;
    logRetentionDays: number;
    llamaThreads: number;
    hfDeviceMap: string;
    hfLoadIn8bit: boolean;
}

export class ConfigurationManager {
    private config: vscode.WorkspaceConfiguration;

    constructor() {
        this.config = vscode.workspace.getConfiguration('datenschutz');
    }

    getConfiguration(): DatenschutzConfiguration {
        return {
            modelBackend: this.config.get('modelBackend', 'none'),
            modelPath: this.config.get('modelPath', ''),
            hfModel: this.config.get('hfModel', ''),
            includeExtensions: this.config.get('includeExtensions', ['.py', '.js', '.jsx', '.ts', '.tsx', '.sol']),
            maxFileSize: this.config.get('maxFileSize', 1.5),
            chunkMaxLines: this.config.get('chunkMaxLines', 400),
            chunkOverlapLines: this.config.get('chunkOverlapLines', 40),
            temperature: this.config.get('temperature', 0.2),
            maxNewTokens: this.config.get('maxNewTokens', 1200),
            enableRuleBased: this.config.get('enableRuleBased', true),
            autoScanOnSave: this.config.get('autoScanOnSave', false),
            logRetentionDays: this.config.get('logRetentionDays', 14),
            llamaThreads: this.config.get('llamaThreads', 6),
            hfDeviceMap: this.config.get('hfDeviceMap', 'auto'),
            hfLoadIn8bit: this.config.get('hfLoadIn8bit', true)
        };
    }

    async updateConfiguration(updates: Partial<DatenschutzConfiguration>, target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Workspace): Promise<void> {
        for (const [key, value] of Object.entries(updates)) {
            await this.config.update(key, value, target);
        }
    }

    getModelBackend(): string {
        return this.config.get('modelBackend', 'none');
    }

    getModelPath(): string {
        return this.config.get('modelPath', '');
    }

    getHfModel(): string {
        return this.config.get('hfModel', '');
    }

    getIncludeExtensions(): string[] {
        return this.config.get('includeExtensions', ['.py', '.js', '.jsx', '.ts', '.tsx', '.sol']);
    }

    getMaxFileSize(): number {
        return this.config.get('maxFileSize', 1.5);
    }

    getChunkMaxLines(): number {
        return this.config.get('chunkMaxLines', 400);
    }

    getTemperature(): number {
        return this.config.get('temperature', 0.2);
    }

    isRuleBasedEnabled(): boolean {
        return this.config.get('enableRuleBased', true);
    }

    isAutoScanOnSaveEnabled(): boolean {
        return this.config.get('autoScanOnSave', false);
    }

    getLogRetentionDays(): number {
        return this.config.get('logRetentionDays', 14);
    }

    // Validation methods
    validateModelConfiguration(): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];
        const modelBackend = this.getModelBackend();

        if (modelBackend === 'none') {
            return { isValid: true, errors: [] };
        }

        if (modelBackend === 'llama_cpp') {
            const modelPath = this.getModelPath();
            if (!modelPath) {
                errors.push('Model path is required for llama_cpp backend');
            } else if (!require('fs').existsSync(modelPath)) {
                errors.push('Model file does not exist: ' + modelPath);
            }
        } else if (modelBackend === 'transformers') {
            const hfModel = this.getHfModel();
            if (!hfModel) {
                errors.push('Hugging Face model name is required for transformers backend');
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    validateFileExtensions(extensions: string[]): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];
        
        for (const ext of extensions) {
            if (!ext.startsWith('.')) {
                errors.push(`Extension must start with '.': ${ext}`);
            }
            if (ext.length < 2) {
                errors.push(`Extension too short: ${ext}`);
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    validateNumericValue(value: number, min: number, max: number, name: string): { isValid: boolean; error?: string } {
        if (isNaN(value)) {
            return { isValid: false, error: `${name} must be a number` };
        }
        if (value < min || value > max) {
            return { isValid: false, error: `${name} must be between ${min} and ${max}` };
        }
        return { isValid: true };
    }

    // Configuration presets
    getPresets(): { [key: string]: Partial<DatenschutzConfiguration> } {
        return {
            'development': {
                maxFileSize: 0.5,
                chunkMaxLines: 200,
                temperature: 0.1,
                enableRuleBased: true,
                autoScanOnSave: true
            },
            'production': {
                maxFileSize: 2.0,
                chunkMaxLines: 500,
                temperature: 0.3,
                enableRuleBased: true,
                autoScanOnSave: false
            },
            'security-audit': {
                maxFileSize: 5.0,
                chunkMaxLines: 1000,
                temperature: 0.0,
                enableRuleBased: true,
                autoScanOnSave: false,
                includeExtensions: ['.py', '.js', '.jsx', '.ts', '.tsx', '.sol', '.java', '.c', '.cpp', '.cs', '.php', '.rb', '.go', '.rs']
            }
        };
    }

    async applyPreset(presetName: string): Promise<void> {
        const presets = this.getPresets();
        const preset = presets[presetName];
        
        if (!preset) {
            throw new Error(`Unknown preset: ${presetName}`);
        }

        await this.updateConfiguration(preset);
    }

    // Environment variables for Python subprocess
    getEnvironmentVariables(): { [key: string]: string } {
        const config = this.getConfiguration();
        
        return {
            MODEL_BACKEND: config.modelBackend,
            MODEL_PATH: config.modelPath,
            HF_MODEL: config.hfModel,
            LLAMA_THREADS: config.llamaThreads.toString(),
            HF_DEVICE_MAP: config.hfDeviceMap,
            HF_LOAD_IN_8BIT: config.hfLoadIn8bit.toString()
        };
    }

    // Configuration change listener
    onConfigurationChanged(callback: () => void): vscode.Disposable {
        return vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration('datenschutz')) {
                callback();
            }
        });
    }

    // Reset to defaults
    async resetToDefaults(): Promise<void> {
        const defaults: DatenschutzConfiguration = {
            modelBackend: 'none',
            modelPath: '',
            hfModel: '',
            includeExtensions: ['.py', '.js', '.jsx', '.ts', '.tsx', '.sol'],
            maxFileSize: 1.5,
            chunkMaxLines: 400,
            chunkOverlapLines: 40,
            temperature: 0.2,
            maxNewTokens: 1200,
            enableRuleBased: true,
            autoScanOnSave: false,
            logRetentionDays: 14,
            llamaThreads: 6,
            hfDeviceMap: 'auto',
            hfLoadIn8bit: true
        };

        await this.updateConfiguration(defaults);
    }
}

