"""Security Patch Generator that produces concrete remediation diffs."""
import re
from typing import Optional
from app.security.remediation_models import SecurityPatch
from app.security.fix_generator import SecurityFixGenerator

class PatchGenerator:
    def __init__(self):
        self.fix_generator = SecurityFixGenerator()

    def generate_patch(self, finding) -> Optional[SecurityPatch]:
        fix = self.fix_generator.generate_fix(finding)
        if fix is None:
            return None

        original_code = finding.code_snippet.strip()
        replacement_code = self._craft_contextual_replacement(finding, original_code, fix)

        return SecurityPatch(
            file_path=finding.file_path,
            line_number=finding.line_number,
            finding_type=finding.finding_type,
            original_code=original_code,
            replacement_code=replacement_code,
            explanation=f"{fix.risk}: {fix.recommendation}"
        )

    def _craft_contextual_replacement(self, finding, original_code: str, fix) -> str:
        """
        Attempts targeted AST/regex transformation on the actual code snippet.
        Falls back to template recommendation if context cannot be safely transformed.
        """
        ftype = finding.finding_type

        # 1. Dangerous eval -> ast.literal_eval
        if ftype == "dangerous_eval" and "eval(" in original_code:
            return re.sub(r'(?<![a-zA-Z0-9_\.])eval\s*\(', 'ast.literal_eval(', original_code)

        # 2. Subprocess shell=True -> shell=False
        if ftype == "shell_true" and "shell=True" in original_code:
            return original_code.replace("shell=True", "shell=False")

        # 3. MD5 Weak Cryptography -> SHA256
        if ftype in ("weak_cryptography", "md5_usage") and "hashlib.md5" in original_code:
            return original_code.replace("hashlib.md5", "hashlib.sha256")

        # 4. Hardcoded Secrets -> os.getenv()
        if ftype in ("hardcoded_secret", "known_secret_key"):
            secret_pattern = re.compile(r'(\b[a-zA-Z0-9_]+\b)\s*([:=])\s*["\']([^"\']+)["\']')
            match = secret_pattern.search(original_code)
            if match:
                var_name = match.group(1)
                delimiter = match.group(2)
                env_key = var_name.upper()
                return secret_pattern.sub(f'{var_name} {delimiter} os.getenv("{env_key}", "")', original_code)

        # 5. Pickle Loads -> json.loads
        if ftype in ("insecure_deserialization", "pickle_loads") and "pickle.loads(" in original_code:
            return original_code.replace("pickle.loads(", "json.loads(")

        # Fallback to general recommended template
        return fix.example_after