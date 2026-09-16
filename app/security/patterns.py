"""High-precision security patterns and rule definitions."""
import re

# File extensions and paths that should be skipped (documentation, static assets, lockfiles)
IGNORED_EXTENSIONS = {
    '.md', '.rst', '.txt', '.sample', '.example', '.svg', '.png', '.jpg', 
    '.jpeg', '.gif', '.ico', '.css', '.scss', '.sass', '.json', '.map'
}

IGNORED_PATH_PARTS = {
    'tests', 'test', '__tests__', 'docs', 'documentation', 'node_modules', 
    '.git', '.github', 'dist', 'build', '.spartan', '.claude'
}

# Safe lines that retrieve from environment or log without hardcoding secrets
SAFE_LINE_PATTERNS = [
    re.compile(r'process\.env\b'),
    re.compile(r'import\.meta\.env\b'),
    re.compile(r'os\.getenv\b'),
    re.compile(r'os\.environ\b'),
    re.compile(r'\bENV\.[A-Z0-9_]+'),
    re.compile(r'console\.(?:log|warn|error|info|debug)\b'),
    re.compile(r'\blogger\.(?:info|error|warn|debug)\b'),
    re.compile(r'\blogging\.(?:info|error|warn|debug)\b'),
    re.compile(r'^\s*(?://|#|/\*|\*)'),
]

# Common placeholders that indicate template/doc values rather than leaked credentials
PLACEHOLDER_REGEX = re.compile(
    r'(?i)(?:your_|my_|<your|placeholder|changeme|dummy|example|todo|fake|xxxx|your-key|your_key|none|null|false|true)'
)

# Active detection rules
SECURITY_RULES = [
    {
        "type": "hardcoded_secret",
        "category": "Secrets & Credentials",
        "severity": "CRITICAL",
        "cwe": "CWE-798",
        "description": "Hardcoded API Key or Secret Credential assigned directly in source code",
        "regex": re.compile(
            r'(?i)\b(api_key|secret_key|jwt_secret|access_token|private_key|auth_token|db_password)\s*[:=]\s*["\']([^"\']{10,})["\']'
        ),
        "filter": lambda m: not PLACEHOLDER_REGEX.search(m.group(2))
    },
    {
        "type": "known_secret_key",
        "category": "Secrets & Credentials",
        "severity": "CRITICAL",
        "cwe": "CWE-798",
        "description": "Known secret token signature (OpenAI / AWS / GitHub / Slack)",
        "regex": re.compile(
            r'\b(AKIA[0-9A-Z]{16}|sk-(?:live|proj)?[a-zA-Z0-9_\-]{20,}|gh[pousr]_[a-zA-Z0-9]{36}|xox[baprs]-[0-9a-zA-Z]{10,48})\b'
        ),
        "filter": lambda m: not PLACEHOLDER_REGEX.search(m.group(1))
    },
    {
        "type": "dangerous_eval",
        "category": "Code Execution",
        "severity": "CRITICAL",
        "cwe": "CWE-95",
        "description": "Dynamic code evaluation via eval() which may allow arbitrary code execution",
        "regex": re.compile(r'(?<![a-zA-Z0-9_])eval\s*\('),
        "filter": lambda m: True
    },
    {
        "type": "dangerous_exec",
        "category": "Code Execution",
        "severity": "CRITICAL",
        "cwe": "CWE-94",
        "description": "Dynamic execution via exec() which executes arbitrary Python code",
        "regex": re.compile(r'(?<![a-zA-Z0-9_])exec\s*\('),
        "filter": lambda m: True
    },
    {
        "type": "insecure_deserialization",
        "category": "Deserialization",
        "severity": "CRITICAL",
        "cwe": "CWE-502",
        "description": "Insecure deserialization using pickle.loads() which can lead to remote code execution",
        "regex": re.compile(r'pickle\.loads\s*\('),
        "filter": lambda m: True
    },
    {
        "type": "shell_injection_risk",
        "category": "Command Injection",
        "severity": "HIGH",
        "cwe": "CWE-78",
        "description": "Subprocess execution with shell=True or unescaped child_process.exec()",
        "regex": re.compile(r'shell\s*=\s*True|child_process\.exec\s*\('),
        "filter": lambda m: True
    },
    {
        "type": "dom_xss_risk",
        "category": "Injection & XSS",
        "severity": "HIGH",
        "cwe": "CWE-79",
        "description": "Direct innerHTML or dangerouslySetInnerHTML assignment permitting Cross-Site Scripting (XSS)",
        "regex": re.compile(r'dangerouslySetInnerHTML\s*=|(?<![a-zA-Z0-9_])\.innerHTML\s*='),
        "filter": lambda m: True
    },
    {
        "type": "sql_injection_risk",
        "category": "SQL Injection",
        "severity": "HIGH",
        "cwe": "CWE-89",
        "description": "SQL query concatenation or f-string interpolation without parameterized bindings",
        "regex": re.compile(r'(?i)(?:execute|query|rawQuery)\s*\(\s*(?:f["\'].*?\{|["\'].*?\+\s*[a-zA-Z0-9_])'),
        "filter": lambda m: True
    },
    {
        "type": "weak_cryptography",
        "category": "Cryptographic Flaws",
        "severity": "MEDIUM",
        "cwe": "CWE-327",
        "description": "Use of broken cryptographic hash function (MD5) which is vulnerable to collisions",
        "regex": re.compile(r'hashlib\.md5\s*\(|createHash\s*\(\s*["\']md5["\']'),
        "filter": lambda m: True
    }
]

# Legacy backward compatibility dictionary if imported elsewhere
SECURITY_PATTERNS = {
    r["type"]: [r["type"]] for r in SECURITY_RULES
}
