import json
from typing import Any, Dict, List

from .model_provider import get_model
from .prompts import render_prompt
from .vulnerability_mapping import enhance_issue_with_mapping
from .rule_based_detector import analyze_with_rules


def analyze_chunks(chunks: List[Dict[str, str]], options: Dict[str, Any]) -> List[Dict[str, Any]]:
    reasoning = options.get("reasoning", "medium")
    temperature = float(options.get("temperature", 0.2))
    max_new_tokens = int(options.get("max_new_tokens", 1200))

    model = get_model()
    issues: List[Dict[str, Any]] = []
    
    for item in chunks:
        # First try AI model analysis
        if model.backend != "none":
            prompt = render_prompt(
                language=item["language"],
                file_path=item["file_path"],
                code_chunk=item["content"],
                reasoning=reasoning,
            )
            raw = model.generate(prompt, max_new_tokens=max_new_tokens, temperature=temperature)
            parsed = _parse_output(raw)
            for iss in parsed:
                iss.setdefault("file_path", item["file_path"])
                # Enhance with vulnerability mapping
                enhanced_iss = enhance_issue_with_mapping(iss)
                issues.append(enhanced_iss)
        
        # Always run rule-based detection as backup or primary method
        rule_issues = analyze_with_rules(item["file_path"], item["content"])
        issues.extend(rule_issues)
    
    return issues


def _parse_output(output_text: str) -> List[Dict[str, Any]]:
    try:
        data = json.loads(_extract_json(output_text))
        out = data.get("issues", [])
        # Normalize schema
        normed: List[Dict[str, Any]] = []
        for it in out:
            normed.append({
                "title": it.get("title") or "Issue",
                "description": it.get("description") or "",
                "severity": it.get("severity") or "medium",
                "file_path": it.get("file_path"),
                "line": it.get("line"),
                "suggestion": it.get("suggestion") or "",
                "fix": it.get("fix"),  # {'before': str, 'after': str} or None
            })
        return normed
    except Exception:
        return []


def _extract_json(text: str) -> str:
    # Attempt to find the first JSON object
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        return text[start:end+1]
    return "{}"


