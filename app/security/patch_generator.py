from app.security.remediation_models import (
    SecurityPatch
)
from app.security.fix_generator import (
    SecurityFixGenerator
)

class PatchGenerator:
    def __init__(self):
        self.fix_generator = (
            SecurityFixGenerator()
        )

    def generate_patch(
        self,
        finding
    ):
        fix = (
            self.fix_generator
            .generate_fix(
                finding
            )
        )

        if fix is None:
            return None

        return SecurityPatch(
            file_path=
                finding.file_path,

            line_number=
                finding.line_number,

            finding_type=
                finding.finding_type,

            original_code=
                finding.code_snippet,

            replacement_code=
                fix.example_after,

            explanation=
                fix.recommendation
        )