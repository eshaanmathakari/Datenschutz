import os
import uuid
from typing import Any, Dict

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

from .scanner import scan_project
from .analysis import analyze_chunks
from .fixer import apply_fix_for_issue
from .logging_store import log_change, cleanup_old_logs


def create_app() -> Flask:
    app = Flask(__name__, static_folder="static", static_url_path="/")
    CORS(app)

    # In-memory store for last scan results: issue_id -> issue dict
    analysis_store: Dict[str, Dict[str, Any]] = {}

    @app.route("/")
    def index():
        return send_from_directory(app.static_folder, "index.html")

    @app.route("/health", methods=["GET"]) 
    def health():
        return jsonify({"status": "ok"})

    @app.route("/scan", methods=["POST"])
    def scan():
        payload = request.get_json(force=True) or {}
        target_path = payload.get("path") or os.getenv("DEFAULT_SCAN_PATH") or os.getcwd()
        options = payload.get("options") or {}

        retention_days = int(os.getenv("LOG_RETENTION_DAYS", "14"))
        cleanup_old_logs(retention_days)

        files = scan_project(
            base_path=target_path,
            include_exts=options.get("include_exts", [".py", ".js", ".jsx", ".ts", ".tsx", ".sol"]),
            max_file_mb=float(options.get("max_file_mb", 1.5)),
            chunk_max_lines=int(options.get("chunk_max_lines", 400)),
            chunk_overlap_lines=int(options.get("chunk_overlap_lines", 40)),
        )

        issues = analyze_chunks(files, options)

        analysis_store.clear()
        for issue in issues:
            issue_id = str(uuid.uuid4())
            issue["id"] = issue_id
            analysis_store[issue_id] = issue

        return jsonify({
            "summary": {
                "num_files": len(files),
                "num_issues": len(issues),
            },
            "issues": list(analysis_store.values()),
        })

    @app.route("/apply_fix", methods=["POST"]) 
    def apply_fix():
        payload = request.get_json(force=True) or {}
        issue_id = payload.get("issue_id")
        if not issue_id or issue_id not in analysis_store:
            return jsonify({"error": "invalid issue_id"}), 400

        issue = analysis_store[issue_id]
        result = apply_fix_for_issue(issue)
        if not result.get("applied"):
            return jsonify({"status": "skipped", "reason": result.get("reason", "unknown")}), 400

        log_change(
            file_path=issue.get("file_path"),
            before_after_patch=result.get("patch"),
            note=issue.get("title", "Applied fix"),
        )

        return jsonify({"status": "applied", "issue_id": issue_id})

    return app


app = create_app()

if __name__ == "__main__":
    port = int(os.getenv("PORT", "4001"))
    app.run(host="0.0.0.0", port=port, debug=True)


