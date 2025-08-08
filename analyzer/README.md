Local Code Analyzer (LLM-powered)

Quickstart
- Create a virtual env and install deps: `python3 -m venv .venv && source .venv/bin/activate && pip install -U pip && pip install -r analyzer/requirements.txt`
- Configure model (choose one):
  - llama.cpp: set `MODEL_BACKEND=llama_cpp` and `MODEL_PATH=/absolute/path/to/model.gguf`
  - transformers: set `MODEL_BACKEND=transformers` and `HF_MODEL=<huggingface-model-id>` (plus optional `HF_DEVICE_MAP=auto`, `HF_LOAD_IN_8BIT=true`)
- Optional: set `DEFAULT_SCAN_PATH=/absolute/path/to/project` and `LOG_RETENTION_DAYS=14`.
- Run: `python -m analyzer.backend.app` from repo root (or `FLASK_APP=analyzer/backend/app.py flask run`).
- Open `http://localhost:4001` and click Start Scan.

Endpoints
- POST `/scan` body: `{ "path": "/project", "options": { "reasoning": "medium", "temperature": 0.2 } }`
- POST `/apply_fix` body: `{ "issue_id": "..." }`

Notes
- The app expects the model to emit strict JSON. If no model is configured, it returns an empty issue list.
- Fix application uses a before/after snippet replacement. Only one occurrence is replaced per apply action.
- Logs are written under `fix_logs/` and cleaned up by age on each scan.


