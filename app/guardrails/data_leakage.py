"""Data Leakage and Secret Scrubbing Guardrail."""
import re
from typing import NamedTuple, List, Tuple

class LeakageCheckResult(NamedTuple):
    passed: bool
    scrubbed_text: str
    violations: List[str]

# Regex patterns for high-risk secrets and sensitive credentials
SECRET_PATTERNS = [
    # AWS Access Key ID
    (r"(?i)\b(AKIA[0-9A-Z]{16})\b", "[REDACTED_AWS_KEY]"),
    # Generic API Keys (OpenAI sk-, Groq gsk_, GitHub ghp_, Anthropic sk-ant-)
    (r"\b(sk-[a-zA-Z0-9]{20,})\b", "[REDACTED_API_KEY]"),
    (r"\b(gsk_[a-zA-Z0-9]{20,})\b", "[REDACTED_GROQ_KEY]"),
    (r"\b(ghp_[a-zA-Z0-9]{36})\b", "[REDACTED_GITHUB_TOKEN]"),
    (r"\b(AIza[0-9A-Za-z-_]{35})\b", "[REDACTED_GEMINI_KEY]"),
    # Private Keys
    (r"-----BEGIN\s+([A-Z\s]+)?PRIVATE\s+KEY-----[\s\S]*?-----END\s+([A-Z\s]+)?PRIVATE\s+KEY-----", "[REDACTED_PRIVATE_KEY]"),
    # JWT Tokens
    (r"\beyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*\b", "[REDACTED_JWT]"),
    # Database Connection Strings with Passwords
    (r"(?i)(postgres|mysql|mongodb|redis):\/\/[a-zA-Z0-9_]+:([^@]+)@", r"\1://user:[REDACTED_PASSWORD]@"),
    # PII: Email addresses
    (r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b", "[REDACTED_EMAIL]"),
]

class DataLeakageGuardrail:
    """Scans and scrubs sensitive secrets, credentials, and PII from outputs."""

    def __init__(self, patterns: List[Tuple[str, str]] = None):
        self.compiled = [
            (re.compile(pattern), replacement)
            for pattern, replacement in (patterns or SECRET_PATTERNS)
        ]

    def scrub(self, text: str) -> LeakageCheckResult:
        if not text:
            return LeakageCheckResult(passed=True, scrubbed_text="", violations=[])

        scrubbed = text
        violations = []

        for regex, replacement in self.compiled:
            matches = regex.findall(scrubbed)
            if matches:
                violations.append(f"Secret/PII pattern detected ({len(matches)} occurrence(s))")
                scrubbed = regex.sub(replacement, scrubbed)

        return LeakageCheckResult(
            passed=len(violations) == 0,
            scrubbed_text=scrubbed,
            violations=violations
        )
