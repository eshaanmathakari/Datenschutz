import * as vscode from 'vscode';
import { ConfigurationManager } from './configuration';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';

export class ModelProvider {
    private configManager: ConfigurationManager;
    private modelBackend: string = 'none';
    private modelPath: string = '';
    private hfModel: string = '';
    private pythonProcess: any = null;

    constructor(configManager: ConfigurationManager) {
        this.configManager = configManager;
        this.loadConfiguration();
    }

    private loadConfiguration() {
        const config = vscode.workspace.getConfiguration('datenschutz');
        this.modelBackend = config.get('modelBackend', 'none');
        this.modelPath = config.get('modelPath', '');
        this.hfModel = config.get('hfModel', '');
    }

    isModelAvailable(): boolean {
        this.loadConfiguration();
        return this.modelBackend !== 'none' && 
               (this.modelBackend === 'llama_cpp' ? fs.existsSync(this.modelPath) : true) &&
               (this.modelBackend === 'transformers' ? this.hfModel !== '' : true);
    }

    async generate(prompt: string, maxTokens: number = 1024, temperature: number = 0.2): Promise<string> {
        if (!this.isModelAvailable()) {
            throw new Error('No model configured or model not available');
        }

        // Use Python subprocess to run the existing model provider
        return new Promise((resolve, reject) => {
            const pythonScript = this.createPythonScript(prompt, maxTokens, temperature);
            
            const pythonProcess = spawn('python3', ['-c', pythonScript], {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let output = '';
            let errorOutput = '';

            pythonProcess.stdout.on('data', (data) => {
                output += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            pythonProcess.on('close', (code) => {
                if (code === 0) {
                    resolve(output.trim());
                } else {
                    reject(new Error(`Python process failed: ${errorOutput}`));
                }
            });

            pythonProcess.on('error', (error) => {
                reject(new Error(`Failed to start Python process: ${error.message}`));
            });

            // Set timeout
            setTimeout(() => {
                pythonProcess.kill();
                reject(new Error('Model generation timeout'));
            }, 30000); // 30 second timeout
        });
    }

    private createPythonScript(prompt: string, maxTokens: number, temperature: number): string {
        // Escape the prompt for Python
        const escapedPrompt = prompt.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
        
        return `
import json
import os
import sys
import tempfile
from typing import Optional

# Set environment variables based on VS Code configuration
model_backend = "${this.modelBackend}"
model_path = "${this.modelPath}"
hf_model = "${this.hfModel}"

os.environ["MODEL_BACKEND"] = model_backend
if model_path:
    os.environ["MODEL_PATH"] = model_path
if hf_model:
    os.environ["HF_MODEL"] = hf_model

class LocalModel:
    def __init__(self) -> None:
        self.backend = os.getenv("MODEL_BACKEND", "none")
        self.model = None
        self.tokenizer = None

        if self.backend == "llama_cpp":
            try:
                from llama_cpp import Llama
                model_path = os.getenv("MODEL_PATH", "")
                if not model_path or not os.path.exists(model_path):
                    self.backend = "none"
                else:
                    n_threads = int(os.getenv("LLAMA_THREADS", "6"))
                    self.model = Llama(model_path=model_path, n_threads=n_threads)
            except Exception as e:
                self.backend = "none"
                print(f"llama_cpp error: {e}", file=sys.stderr)
        elif self.backend == "transformers":
            try:
                from transformers import AutoModelForCausalLM, AutoTokenizer
                model_name = os.getenv("HF_MODEL", "")
                if not model_name:
                    self.backend = "none"
                else:
                    self.tokenizer = AutoTokenizer.from_pretrained(model_name)
                    self.model = AutoModelForCausalLM.from_pretrained(
                        model_name,
                        device_map=os.getenv("HF_DEVICE_MAP", "auto"),
                        load_in_8bit=os.getenv("HF_LOAD_IN_8BIT", "true").lower() == "true",
                    )
            except Exception as e:
                self.backend = "none"
                print(f"transformers error: {e}", file=sys.stderr)

    def generate(self, prompt: str, max_new_tokens: int = 1024, temperature: float = 0.2) -> str:
        if self.backend == "llama_cpp" and self.model is not None:
            out = self.model(prompt, max_tokens=max_new_tokens, temperature=temperature)
            return out["choices"][0]["text"]
        if self.backend == "transformers" and self.model is not None and self.tokenizer is not None:
            import torch
            inputs = self.tokenizer(prompt, return_tensors="pt").to(self.model.device)
            with torch.no_grad():
                output_ids = self.model.generate(
                    **inputs, max_new_tokens=max_new_tokens, do_sample=False, temperature=temperature
                )
            return self.tokenizer.decode(output_ids[0], skip_special_tokens=True)[len(prompt):]
        # Fallback: no model available → return minimal empty structure
        return json.dumps({"issues": []})

# Initialize model and generate response
try:
    model = LocalModel()
    prompt = "${escapedPrompt}"
    response = model.generate(prompt, max_new_tokens=${maxTokens}, temperature=${temperature})
    print(response)
except Exception as e:
    print(json.dumps({"issues": []}))
    print(f"Error: {e}", file=sys.stderr)
`;
    }

    async testModel(): Promise<boolean> {
        try {
            const testPrompt = 'Test prompt for model availability';
            await this.generate(testPrompt, 10, 0.1);
            return true;
        } catch (error) {
            console.error('Model test failed:', error);
            return false;
        }
    }

    getModelInfo(): { backend: string; path?: string; hfModel?: string } {
        this.loadConfiguration();
        const info: any = { backend: this.modelBackend };
        
        if (this.modelBackend === 'llama_cpp' && this.modelPath) {
            info.path = this.modelPath;
        } else if (this.modelBackend === 'transformers' && this.hfModel) {
            info.hfModel = this.hfModel;
        }
        
        return info;
    }
}

