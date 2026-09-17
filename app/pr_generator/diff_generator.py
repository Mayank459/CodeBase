"""Unified Diff Generator with syntax validation and safety boundary checks."""
import ast
from pathlib import Path
from typing import Tuple, Optional


class PatchValidationError(Exception):
    """Raised when generated patch fails validation."""
    pass


class DiffGenerator:
    """
    Generates standard unified diffs and performs static syntax validation
    and path traversal checks on patch candidates.
    """

    def validate_patch(self, patch) -> Tuple[bool, Optional[str]]:
        """
        Validate that the patch is safe and syntactically sound:
        1. File path traversal check.
        2. Python AST syntax validation on the replacement code.
        """
        file_path = getattr(patch, "file_path", "")
        # Path safety check
        if ".." in file_path or file_path.startswith("/") or file_path.startswith("\\"):
            return False, f"Unauthorized file path traversal attempt: '{file_path}'"

        replacement = getattr(patch, "replacement_code", "")
        # AST syntax check for Python files
        if file_path.endswith(".py") and replacement:
            try:
                # Wrap replacement if it's an indented block or statement
                try:
                    ast.parse(replacement)
                except SyntaxError:
                    # Attempt wrapping in a function to validate partial block indentation
                    import textwrap
                    dedented = textwrap.dedent(replacement)
                    ast.parse(dedented)
            except Exception as exc:
                return False, f"Patch syntax error in '{file_path}': {exc}"

        return True, None

    def generate(self, patch) -> str:
        """Generate a standard unified diff string."""
        file_path = getattr(patch, "file_path", "unknown_file")
        orig_lines = getattr(patch, "original_code", "").splitlines()
        repl_lines = getattr(patch, "replacement_code", "").splitlines()

        diff_lines = [
            f"--- a/{file_path}",
            f"+++ b/{file_path}",
            f"@@ -1,{max(1, len(orig_lines))} +1,{max(1, len(repl_lines))} @@"
        ]
        for line in orig_lines:
            diff_lines.append(f"- {line}")
        for line in repl_lines:
            diff_lines.append(f"+ {line}")

        return "\n".join(diff_lines) + "\n"
