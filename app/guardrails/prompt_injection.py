"""Prompt Injection and Adversarial Input Guardrail."""
import re
from typing import NamedTuple, List

class GuardrailResult(NamedTuple):
    passed: bool
    reason: str = ""
    sanitized_input: str = ""

# Common jailbreak and prompt injection patterns
INJECTION_PATTERNS = [
    # Instruction overrides
    r"(?i)\bignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules|commands)",
    r"(?i)\bdisregard\s+(all\s+)?(previous|prior|above)\s+(instructions|directives|rules)",
    r"(?i)\bforget\s+(everything|all\s+rules|previous\s+instructions)",
    r"(?i)\boverride\s+(system\s+)?(prompt|instructions)",
    # System prompt extraction
    r"(?i)\b(print|show|repeat|display|output|reveal)\s+(your\s+)?((initial|original|hidden|base)\s+)?(system\s+prompt|instructions|prompt)",
    r"(?i)\bwhat\s+(is|are)\s+your\s+(exact\s+)?((initial|original|hidden)\s+)?(system\s+prompt|instructions)",
    # Persona hijacking / Jailbreaks
    r"(?i)\byou\s+are\s+now\s+(in\s+)?(dan|developer|jailbreak|unrestricted|god)\s+mode\b",
    r"(?i)\bact\s+as\s+an\s+unfiltered\b",
    r"(?i)\bpretend\s+you\s+have\s+no\s+(rules|ethics|guidelines|restrictions)\b",
    # Delimiter hijacking / raw role injection
    r"(?i)<\|im_start\|>",
    r"(?i)<\|im_end\|>",
    r"(?i)\[SYSTEM_PROMPT\]",
    r"(?i)\[INSTRUCTION\]",
]

COMPILED_PATTERNS = [re.compile(p) for p in INJECTION_PATTERNS]

class PromptInjectionGuardrail:
    """Detects and mitigates prompt injection and jailbreak attempts."""

    def __init__(self, patterns: List[re.Pattern] = None):
        self.patterns = patterns or COMPILED_PATTERNS

    def validate(self, user_query: str) -> GuardrailResult:
        if not user_query or not user_query.strip():
            return GuardrailResult(passed=True, sanitized_input="")

        for pattern in self.patterns:
            match = pattern.search(user_query)
            if match:
                matched_snippet = match.group(0)
                return GuardrailResult(
                    passed=False,
                    reason=f"Potential prompt injection detected: '{matched_snippet}'",
                    sanitized_input=user_query
                )

        # Basic sanitization of suspicious null-bytes or control characters
        sanitized = user_query.replace("\x00", "").strip()
        return GuardrailResult(passed=True, sanitized_input=sanitized)
