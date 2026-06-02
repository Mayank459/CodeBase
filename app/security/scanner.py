from app.security.models import SecurityFinding
from app.security.patterns import SECURITY_PATTERNS

class SecurityScanner:
    def scan_file(
        self,
        file_path,
        content
    ):
        findings = []
        lines = content.splitlines()

        for line_number, line in enumerate(lines, start=1):
            for finding_type, patterns in SECURITY_PATTERNS.items():
                for pattern in patterns:
                    if pattern in line:
                        findings.append(
                            SecurityFinding(
                                finding_type=finding_type,
                                severity="HIGH",
                                file_path=file_path,
                                line_number=line_number,
                                description=pattern,
                                code_snippet=line.strip()
                            )
                        )

        return findings

    def scan_repository(
        self,
        parsed_files
    ):
        all_findings = []

        for parsed_file in parsed_files:
            content_parts = []

            for function in parsed_file.functions:
                content_parts.append(function.code)

            for cls in parsed_file.classes:
                content_parts.append(cls.code)
                for method in cls.methods:
                    content_parts.append(method.code)

            findings = self.scan_file(
                parsed_file.file_path,
                "\n".join(content_parts)
            )

            all_findings.extend(findings)

        return all_findings
