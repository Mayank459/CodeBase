from app.security.scanner import SecurityScanner

def test_security_scanner():
    code = """
JWT_SECRET = "123"

eval(user_input)

subprocess.run(
    cmd,
    shell=True
)
"""
    scanner = SecurityScanner()
    findings = scanner.scan_file("test_file.py", code)
    
    assert len(findings) == 3
    assert findings[0].finding_type == "hardcoded_secret"
    assert findings[1].finding_type == "dangerous_eval"
    assert findings[2].finding_type == "shell_true"
