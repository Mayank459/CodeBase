from app.security.remediation_models import SecurityFix

SECURITY_FIXES = {
    "dangerous_eval": SecurityFix(
        finding_type="dangerous_eval",
        risk="Remote Code Execution (CWE-95)",
        recommendation="Replace eval() with ast.literal_eval() or a safe parser.",
        example_before="eval(user_input)",
        example_after="import ast\nast.literal_eval(user_input)"
    ),

    "dangerous_exec": SecurityFix(
        finding_type="dangerous_exec",
        risk="Arbitrary Code Execution (CWE-94)",
        recommendation="Avoid exec() entirely; dispatch to explicit callable handlers or data structures.",
        example_before="exec(code_string)",
        example_after="# Refactor dynamic execution to use a registered function dictionary"
    ),

    "shell_true": SecurityFix(
        finding_type="shell_true",
        risk="Command Injection (CWE-78)",
        recommendation="Pass command arguments as a list and set shell=False to prevent shell metacharacter expansion.",
        example_before='subprocess.run(f"ls {dir_name}", shell=True)',
        example_after='subprocess.run(["ls", dir_name], shell=False, check=True)'
    ),

    "insecure_deserialization": SecurityFix(
        finding_type="insecure_deserialization",
        risk="Unsafe Deserialization Remote Code Execution (CWE-502)",
        recommendation="Use safe serialization formats like JSON, MessagePack, or Safetensors instead of Python pickle.",
        example_before="pickle.loads(untrusted_payload)",
        example_after="json.loads(payload_str)"
    ),

    "pickle_loads": SecurityFix(
        finding_type="pickle_loads",
        risk="Unsafe Deserialization (CWE-502)",
        recommendation="Use JSON when possible.",
        example_before="pickle.loads(data)",
        example_after="json.loads(data)"
    ),

    "weak_cryptography": SecurityFix(
        finding_type="weak_cryptography",
        risk="Broken Cryptographic Hash Function (CWE-327)",
        recommendation="Upgrade MD5/SHA1 to SHA-256 (hashlib.sha256) or SHA-512 to prevent collision attacks.",
        example_before="hashlib.md5(data.encode()).hexdigest()",
        example_after="hashlib.sha256(data.encode()).hexdigest()"
    ),

    "md5_usage": SecurityFix(
        finding_type="md5_usage",
        risk="Weak Cryptography (CWE-327)",
        recommendation="Use SHA256.",
        example_before="hashlib.md5(data)",
        example_after="hashlib.sha256(data)"
    ),

    "hardcoded_secret": SecurityFix(
        finding_type="hardcoded_secret",
        risk="Exposed Credentials in Source Code (CWE-798)",
        recommendation="Externalize credentials to environment variables or a dedicated secret management vault.",
        example_before='api_key = "sk-live-abcdef1234567890"',
        example_after='api_key = os.getenv("API_KEY", "")'
    ),

    "known_secret_key": SecurityFix(
        finding_type="known_secret_key",
        risk="High-Entropy Leaked Key Signature (CWE-798)",
        recommendation="Immediately revoke and rotate the exposed credential, and load secrets from environment variables.",
        example_before='aws_key = "AKIA1234567890EXAMPLE"',
        example_after='aws_key = os.getenv("AWS_ACCESS_KEY_ID", "")'
    ),

    "sql_injection_risk": SecurityFix(
        finding_type="sql_injection_risk",
        risk="SQL Injection Vulnerability (CWE-89)",
        recommendation="Use parameterized query placeholders instead of string formatting or concatenation.",
        example_before='cursor.execute(f"SELECT * FROM users WHERE id = {user_id}")',
        example_after='cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))'
    ),

    "dom_xss_risk": SecurityFix(
        finding_type="dom_xss_risk",
        risk="Cross-Site Scripting (DOM XSS) (CWE-79)",
        recommendation="Sanitize HTML content using DOMPurify or use textContent / React JSX escaping instead of innerHTML.",
        example_before="element.innerHTML = userProvidedHtml;",
        example_after="element.textContent = userProvidedHtml; // or DOMPurify.sanitize(userProvidedHtml)"
    )
}
