BASE_INSTRUCTION = (
    "You are an expert software security and bug-finding AI. "
    "Analyze the provided code for memory/resource leaks, logical errors, runtime errors, security vulnerabilities, and bad practices. "
    "Respond in strict JSON with an array under key 'issues'. Each issue is an object with keys: "
    "'title' (string), 'description' (string), 'severity' ('low'|'medium'|'high'|'critical'), 'file_path' (string), 'line' (int or null), "
    "'suggestion' (string), and 'fix' (object or null). If a fix is possible, set 'fix' with keys: 'before' (string), 'after' (string) representing the exact before/after snippet to replace."
)


def render_prompt(language: str, file_path: str, code_chunk: str, reasoning: str = "medium") -> str:
    return (
        f"Instructions:\n{BASE_INSTRUCTION}\n\n"
        f"Language: {language}\n"
        f"File: {file_path}\n"
        f"ReasoningEffort: {reasoning}\n"
        f"Code (with line numbers):\n" 
        "```\n"
        f"{code_chunk}\n"
        "```\n"
        "Output JSON only with keys {\"issues\": [...]} and no extra text."
    )


