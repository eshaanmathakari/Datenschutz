import os
import time
from datetime import datetime, timedelta


def _logs_dir() -> str:
    base = os.getenv("LOG_DIR", os.path.join(os.getcwd(), "fix_logs"))
    os.makedirs(base, exist_ok=True)
    return base


def log_change(file_path: str, before_after_patch: str, note: str) -> str:
    ts = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    base_name = os.path.basename(file_path)
    out_name = f"{ts}_{base_name}.diff"
    out_path = os.path.join(_logs_dir(), out_name)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(before_after_patch)
        f.write("\n\n")
        f.write(f"Note: {note}\n")
    return out_path


def cleanup_old_logs(retention_days: int = 14) -> None:
    cutoff = datetime.now() - timedelta(days=retention_days)
    base = _logs_dir()
    for name in os.listdir(base):
        path = os.path.join(base, name)
        try:
            mtime = datetime.fromtimestamp(os.path.getmtime(path))
            if mtime < cutoff:
                os.remove(path)
        except Exception:
            continue


