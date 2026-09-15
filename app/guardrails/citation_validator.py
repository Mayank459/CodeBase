"""Citation Grounding and Hallucination Validator Guardrail."""
import re
from typing import NamedTuple, List, Set, Optional

class CitationValidationResult(NamedTuple):
    passed: bool
    cited_files: List[str]
    valid_citations: List[str]
    hallucinated_citations: List[str]
    annotated_output: str

class CitationValidatorGuardrail:
    """Validates citations in LLM outputs against ground-truth indexed repository files and symbols."""

    # Matches file paths like `app/api/routes.py`, `src/index.js`, or [file.py](...)
    FILE_PATH_PATTERN = re.compile(r"`([a-zA-Z0-9_\-./]+\.[a-zA-Z0-9]+)`|\[.*?\]\(file:\/\/\/([a-zA-Z0-9_\-./]+)\)")

    def __init__(self):
        pass

    def extract_citations(self, text: str) -> Set[str]:
        citations = set()
        for match in self.FILE_PATH_PATTERN.finditer(text):
            path = match.group(1) or match.group(2)
            if path and "/" in path and not path.startswith("http"):
                # Clean up any trailing punctuation
                cleaned = path.strip().rstrip(".,:;")
                citations.add(cleaned)
        return citations

    def validate(
        self,
        output_text: str,
        indexed_files: Optional[Set[str]] = None
    ) -> CitationValidationResult:
        if not output_text:
            return CitationValidationResult(
                passed=True,
                cited_files=[],
                valid_citations=[],
                hallucinated_citations=[],
                annotated_output=""
            )

        cited_files = list(self.extract_citations(output_text))

        # If no indexed files list is provided, treat all structural paths as valid
        if not indexed_files:
            return CitationValidationResult(
                passed=True,
                cited_files=cited_files,
                valid_citations=cited_files,
                hallucinated_citations=[],
                annotated_output=output_text
            )

        # Normalize indexed files for case-insensitive and slash-agnostic comparison
        normalized_known = {f.replace("\\", "/").lower() for f in indexed_files}

        valid = []
        hallucinated = []

        for citation in cited_files:
            norm_cit = citation.replace("\\", "/").lower()
            # Match exact or suffix (e.g. app/api/routes.py matching c:/users/.../app/api/routes.py)
            if any(known.endswith(norm_cit) or norm_cit.endswith(known) for known in normalized_known):
                valid.append(citation)
            else:
                hallucinated.append(citation)

        passed = len(hallucinated) == 0
        annotated = output_text

        # If hallucinated paths were found, append a subtle grounding warning
        if hallucinated:
            warning = f"\n\n> ⚠️ **Grounding Notice:** The following cited path(s) were not verified in the active index: {', '.join(hallucinated)}"
            annotated += warning

        return CitationValidationResult(
            passed=passed,
            cited_files=cited_files,
            valid_citations=valid,
            hallucinated_citations=hallucinated,
            annotated_output=annotated
        )
