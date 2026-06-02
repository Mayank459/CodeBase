from dataclasses import dataclass

@dataclass
class SecurityFix:
    finding_type: str
    risk: str
    recommendation: str
    example_before: str
    example_after: str

@dataclass
class SecurityPatch:
    file_path: str
    line_number: int
    finding_type: str
    original_code: str
    replacement_code: str
    explanation: str
