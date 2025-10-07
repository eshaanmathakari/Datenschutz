import os
from typing import Any, Dict


def apply_fix_for_issue(issue: Dict[str, Any]) -> Dict[str, Any]:
    fix = issue.get("fix")
    file_path = issue.get("file_path")
    if not fix or not file_path:
        return {"applied": False, "reason": "no fix provided"}

    before = fix.get("before")
    after = fix.get("after")
    if not before or not after:
        return {"applied": False, "reason": "invalid fix structure"}

    # Validate file path for security
    if not isinstance(file_path, str) or ".." in file_path or file_path.startswith("/"):
        return {"applied": False, "reason": "invalid file path"}

    if not os.path.exists(file_path):
        return {"applied": False, "reason": "file not found"}

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
        if before not in content:
            return {"applied": False, "reason": "before snippet not found in file"}
        new_content = content.replace(before, after, 1)
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(new_content)
        patch = _render_simple_patch(file_path, before, after)
        return {"applied": True, "patch": patch}
    except PermissionError:
        return {"applied": False, "reason": "permission denied"}
    except Exception as e:
        return {"applied": False, "reason": str(e)}


def _render_simple_patch(file_path: str, before: str, after: str) -> str:
    return (
        f"--- {os.path.basename(file_path)} (before)\n"
        f"+++ {os.path.basename(file_path)} (after)\n"
        f"@@\n{_indent(before)}\n@@\n{_indent(after)}\n"
    )


def _indent(block: str) -> str:
    return "\n".join(f"    {line}" for line in block.splitlines())


