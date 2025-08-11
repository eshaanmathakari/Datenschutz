import os
from typing import Dict, List, Tuple


def is_text_file(path: str) -> bool:
    try:
        with open(path, "r", encoding="utf-8") as f:
            f.read(2048)
        return True
    except Exception:
        return False


def iter_code_files(base_path: str, include_exts: List[str]) -> List[str]:
    matched: List[str] = []
    for root, _dirs, files in os.walk(base_path):
        for name in files:
            if any(name.endswith(ext) for ext in include_exts):
                full = os.path.join(root, name)
                if is_text_file(full):
                    matched.append(full)
    return matched


def add_line_numbers(text: str) -> str:
    lines = text.splitlines()
    return "\n".join(f"{i+1:05d}: {line}" for i, line in enumerate(lines))


def chunk_by_lines(numbered_text: str, max_lines: int, overlap_lines: int) -> List[str]:
    lines = numbered_text.splitlines()
    chunks: List[str] = []
    start = 0
    n = len(lines)
    while start < n:
        end = min(start + max_lines, n)
        chunk = "\n".join(lines[start:end])
        chunks.append(chunk)
        if end == n:
            break
        start = max(0, end - overlap_lines)
    return chunks


def scan_project(
    base_path: str,
    include_exts: List[str],
    max_file_mb: float,
    chunk_max_lines: int,
    chunk_overlap_lines: int,
) -> List[Dict[str, str]]:
    # Check if base_path is a single file
    if os.path.isfile(base_path):
        files = [base_path]
    else:
        files = iter_code_files(base_path, include_exts)
    
    results: List[Dict[str, str]] = []
    size_limit = max_file_mb * 1024 * 1024

    for file_path in files:
        try:
            if os.path.getsize(file_path) > size_limit:
                continue
            with open(file_path, "r", encoding="utf-8") as f:
                text = f.read()
        except Exception:
            continue

        numbered = add_line_numbers(text)
        chunks = chunk_by_lines(numbered, chunk_max_lines, chunk_overlap_lines)
        for idx, chunk in enumerate(chunks):
            results.append({
                "file_path": file_path,
                "chunk_index": str(idx),
                "language": language_from_ext(file_path),
                "content": chunk,
            })
    return results


def language_from_ext(file_path: str) -> str:
    lower = file_path.lower()
    if lower.endswith(".py"):
        return "Python"
    if lower.endswith(".js") or lower.endswith(".jsx"):
        return "JavaScript"
    if lower.endswith(".ts") or lower.endswith(".tsx"):
        return "TypeScript"
    if lower.endswith(".sol"):
        return "Solidity"
    return "Unknown"


