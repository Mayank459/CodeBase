"""Advanced static code security scanner."""
from pathlib import Path
from typing import List, Optional
from app.security.models import SecurityFinding
from app.security.patterns import (
    SECURITY_RULES,
    IGNORED_EXTENSIONS,
    IGNORED_PATH_PARTS,
    SAFE_LINE_PATTERNS,
    PLACEHOLDER_REGEX
)

class SecurityScanner:
    def should_skip_file(self, file_path: str) -> bool:
        if not file_path:
            return True
        norm_path = file_path.replace("\\", "/").lower()
        path_obj = Path(norm_path)

        # Skip documentation, assets, lockfiles
        if path_obj.suffix in IGNORED_EXTENSIONS:
            return True

        # Skip test directories, node_modules, internal git files
        parts = set(norm_path.split("/"))
        if parts & IGNORED_PATH_PARTS:
            return True

        # Skip scanner's own internal rule pattern definitions and remediation templates
        if norm_path.endswith("app/security/patterns.py") or norm_path.endswith("app/security/remediation_templates.py"):
            return True

        return False

    def scan_file(
        self,
        file_path: str,
        content: str
    ) -> List[SecurityFinding]:
        findings: List[SecurityFinding] = []
        if not content or self.should_skip_file(file_path):
            return findings

        lines = content.splitlines()

        for line_number, line in enumerate(lines, start=1):
            stripped = line.strip()
            if not stripped or len(stripped) < 4:
                continue

            # 1. Skip lines that are purely comments, safe environment retrievals, or log statements
            if any(pat.search(line) for pat in SAFE_LINE_PATTERNS):
                continue

            # 2. Evaluate high-precision security rules
            for rule in SECURITY_RULES:
                match = rule["regex"].search(line)
                if match:
                    # Apply specific filter (e.g. check that secret is not a placeholder)
                    if rule["filter"](match):
                        findings.append(
                            SecurityFinding(
                                finding_type=rule["type"],
                                severity=rule["severity"],
                                file_path=file_path.replace("\\", "/"),
                                line_number=line_number,
                                description=rule["description"],
                                code_snippet=stripped[:180],
                                category=rule["category"],
                                cwe=rule["cwe"],
                                recommendation=f"Sanitize or remove `{rule['type']}` at line {line_number}."
                            )
                        )
                        # Avoid multiple redundant findings on the exact same line
                        break

        return findings

    def scan_repository(
        self,
        parsed_files
    ) -> List[SecurityFinding]:
        all_findings: List[SecurityFinding] = []

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
