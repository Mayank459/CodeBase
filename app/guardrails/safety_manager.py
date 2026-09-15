"""Unified Safety Manager combining Input and Output Guardrails."""
from typing import Optional, Set, Dict, Any

from app.guardrails.prompt_injection import PromptInjectionGuardrail, GuardrailResult
from app.guardrails.data_leakage import DataLeakageGuardrail, LeakageCheckResult
from app.guardrails.citation_validator import CitationValidatorGuardrail, CitationValidationResult

class SafetyManager:
    """Enterprise guardrails orchestrator for input sanitization and output verification."""

    def __init__(self):
        self.injection_guard = PromptInjectionGuardrail()
        self.leakage_guard = DataLeakageGuardrail()
        self.citation_guard = CitationValidatorGuardrail()

    def validate_input(self, user_query: str) -> GuardrailResult:
        """Validates incoming developer query for prompt injection and malicious payloads."""
        return self.injection_guard.validate(user_query)

    def validate_output(
        self,
        output_text: str,
        indexed_files: Optional[Set[str]] = None
    ) -> Dict[str, Any]:
        """Validates and sanitizes model output against secret leakage and hallucinated citations."""
        # Step 1: Data leakage and secret scrubbing
        leakage_result = self.leakage_guard.scrub(output_text)

        # Step 2: Citation grounding validation
        citation_result = self.citation_guard.validate(
            leakage_result.scrubbed_text,
            indexed_files=indexed_files
        )

        return {
            "passed": leakage_result.passed and citation_result.passed,
            "final_text": citation_result.annotated_output,
            "secret_violations": leakage_result.violations,
            "hallucinated_citations": citation_result.hallucinated_citations,
            "valid_citations": citation_result.valid_citations,
        }

# Global singleton
safety_manager = SafetyManager()
