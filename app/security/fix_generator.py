from app.security.remediation_templates import (
    SECURITY_FIXES
)

class SecurityFixGenerator:
    def generate_fix(
        self,
        finding
    ):
        return SECURITY_FIXES.get(
            finding.finding_type
        )