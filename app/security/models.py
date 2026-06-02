from dataclasses import dataclass

@dataclass
class SecurityFinding:
    finding_type: str
    severity: str
    file_path: str
    line_number: int
    description: str
    code_snippet: str
