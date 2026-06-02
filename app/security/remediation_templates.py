from app.security.remediation_models import SecurityFix

SECURITY_FIXES = {

    "dangerous_eval": SecurityFix(
        finding_type="dangerous_eval",
        risk="Remote Code Execution",
        recommendation="Replace eval() with ast.literal_eval().",
        example_before="eval(user_input)",
        example_after="""
import ast

ast.literal_eval(user_input)
"""
    ),

    "dangerous_exec": SecurityFix(
        finding_type="dangerous_exec",
        risk="Arbitrary Code Execution",
        recommendation="Avoid exec() entirely.",
        example_before="exec(code)",
        example_after="# Refactor logic without exec()"
    ),

    "shell_true": SecurityFix(
        finding_type="shell_true",
        risk="Command Injection",
        recommendation="Use shell=False.",
        example_before="""
subprocess.run(
    cmd,
    shell=True
)
""",
        example_after="""
subprocess.run(
    cmd.split(),
    shell=False
)
"""
    ),

    "pickle_loads": SecurityFix(
        finding_type="pickle_loads",
        risk="Unsafe Deserialization",
        recommendation="Use JSON when possible.",
        example_before="pickle.loads(data)",
        example_after="json.loads(data)"
    ),

    "md5_usage": SecurityFix(
        finding_type="md5_usage",
        risk="Weak Cryptography",
        recommendation="Use SHA256.",
        example_before="hashlib.md5(data)",
        example_after="hashlib.sha256(data)"
    )
}
