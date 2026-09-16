from app.security.models import SecurityFinding
from app.security.patterns import SECURITY_PATTERNS

class SecurityScanner:
    def scan_file(
        self,
        file_path,
        content
    ):
        findings = []
        if not content:
            return findings

        lines = content.splitlines()

        for line_number, line in enumerate(lines, start=1):
            for finding_type, patterns in SECURITY_PATTERNS.items():
                for pattern in patterns:
                    if pattern in line:
                        severity = "HIGH"
                        if finding_type in ["hardcoded_secret", "dangerous_eval", "dangerous_exec", "pickle_loads", "shell_true"]:
                            severity = "CRITICAL"
                        elif finding_type in ["md5_usage", "insecure_cors"]:
                            severity = "MEDIUM"

                        findings.append(
                            SecurityFinding(
                                finding_type=finding_type,
                                severity=severity,
                                file_path=file_path,
                                line_number=line_number,
                                description=f"{finding_type.replace('_', ' ').title()} ({pattern})",
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
            # 1. Prefer full raw source code if available
            content = getattr(parsed_file, "source_code", "")

            # 2. If not available, check parsed variables (e.g. generic extractor file_content)
            if not content:
                for var in parsed_file.variables:
                    if var.name == "file_content" and var.value:
                        content = var.value
                        break

            # 3. Fallback: reconstruct from AST nodes (functions, classes, methods, variables)
            if not content:
                content_parts = []
                for function in parsed_file.functions:
                    content_parts.append(function.code)
                for cls in parsed_file.classes:
                    content_parts.append(cls.code)
                    for method in cls.methods:
                        content_parts.append(method.code)
                for var in parsed_file.variables:
                    if var.value:
                        content_parts.append(f"{var.name} = {var.value}")
                content = "\n".join(content_parts)

            findings = self.scan_file(
                parsed_file.file_path,
                content
            )

            all_findings.extend(findings)

        return all_findings
