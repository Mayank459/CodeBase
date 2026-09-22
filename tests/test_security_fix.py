"""Comprehensive unit tests for Security Fix & Remediation Engine."""
import pytest
from unittest.mock import MagicMock
from app.security.models import SecurityFinding
from app.security.patch_generator import PatchGenerator
from app.security.remediation_report import RemediationReportGenerator
from app.agents.security_fix_agent import security_fix_node
from app.storage.repository_registry import repository_registry


def test_patch_generator_eval():
    finding = SecurityFinding(
        finding_type="dangerous_eval",
        severity="CRITICAL",
        file_path="app/math_eval.py",
        line_number=14,
        description="Dynamic code evaluation",
        code_snippet="result = eval(user_expression)",
        category="Code Execution",
        cwe="CWE-95",
        recommendation="Replace eval"
    )
    generator = PatchGenerator()
    patch = generator.generate_patch(finding)

    assert patch is not None
    assert patch.finding_type == "dangerous_eval"
    assert "ast.literal_eval(user_expression)" in patch.replacement_code


def test_patch_generator_shell_true():
    finding = SecurityFinding(
        finding_type="shell_true",
        severity="HIGH",
        file_path="app/runner.py",
        line_number=22,
        description="Shell execution",
        code_snippet="subprocess.run(cmd, shell=True)",
        category="Command Injection",
        cwe="CWE-78",
        recommendation="Use shell=False"
    )
    generator = PatchGenerator()
    patch = generator.generate_patch(finding)

    assert patch is not None
    assert "shell=False" in patch.replacement_code
    assert "shell=True" not in patch.replacement_code


def test_patch_generator_weak_crypto():
    finding = SecurityFinding(
        finding_type="weak_cryptography",
        severity="MEDIUM",
        file_path="app/hasher.py",
        line_number=9,
        description="Broken crypto hash",
        code_snippet="digest = hashlib.md5(token.encode()).hexdigest()",
        category="Cryptographic Flaws",
        cwe="CWE-327",
        recommendation="Use SHA256"
    )
    generator = PatchGenerator()
    patch = generator.generate_patch(finding)

    assert patch is not None
    assert "hashlib.sha256" in patch.replacement_code
    assert "hashlib.md5" not in patch.replacement_code


def test_patch_generator_hardcoded_secret():
    finding = SecurityFinding(
        finding_type="hardcoded_secret",
        severity="CRITICAL",
        file_path="app/config.py",
        line_number=5,
        description="Hardcoded credential",
        code_snippet='API_KEY = "sk-live-secret-token-123456"',
        category="Secrets & Credentials",
        cwe="CWE-798",
        recommendation="Use os.getenv"
    )
    generator = PatchGenerator()
    patch = generator.generate_patch(finding)

    assert patch is not None
    assert 'os.getenv("API_KEY", "")' in patch.replacement_code
    assert "sk-live-secret-token-123456" not in patch.replacement_code


def test_patch_generator_insecure_deserialization():
    finding = SecurityFinding(
        finding_type="insecure_deserialization",
        severity="CRITICAL",
        file_path="app/worker.py",
        line_number=45,
        description="Unsafe deserialization",
        code_snippet="payload = pickle.loads(raw_bytes)",
        category="Deserialization",
        cwe="CWE-502",
        recommendation="Use JSON"
    )
    generator = PatchGenerator()
    patch = generator.generate_patch(finding)

    assert patch is not None
    assert "json.loads(" in patch.replacement_code


def test_remediation_report_generator_no_misalignment():
    """Verify report generator handles findings with or without patches without misalignment."""
    f1 = SecurityFinding(
        finding_type="dangerous_eval",
        severity="CRITICAL",
        file_path="eval.py",
        line_number=10,
        description="eval used",
        code_snippet="eval(x)",
        category="Exec",
        cwe="CWE-95",
        recommendation="Use ast"
    )
    f2 = SecurityFinding(
        finding_type="unknown_vulnerability",
        severity="LOW",
        file_path="unknown.py",
        line_number=20,
        description="weird pattern",
        code_snippet="weird_call()",
        category="Misc",
        cwe="CWE-000",
        recommendation="Investigate"
    )

    patch_gen = PatchGenerator()
    p1 = patch_gen.generate_patch(f1)
    p2 = patch_gen.generate_patch(f2)

    patches = [p for p in [p1, p2] if p]
    assert len(patches) == 1

    report_gen = RemediationReportGenerator()
    report = report_gen.generate([f1, f2], patches)

    assert "**Total Findings Evaluated**: 2" in report
    assert "**Automated Patches Ready**: 1" in report
    assert "```diff" in report
    assert "Manual Remediation Recommended" in report


def test_security_fix_node_e2e():
    """Test security_fix_node with simulated repository."""
    mock_repo = MagicMock()
    mock_repo.repository_name = "test-sec-repo"
    
    mock_file = MagicMock()
    mock_file.file_path = "app/runner.py"
    mock_file.source_code = """
import os
import subprocess

API_KEY = "sk-live-exposed-key-99999"
subprocess.run("ls -la", shell=True)
"""
    mock_repo.parsed_files = [mock_file]
    
    repository_registry.repositories["test-sec-repo"] = mock_repo
    
    try:
        state = {"repository_name": "test-sec-repo"}
        result = security_fix_node(state)
        
        assert "security_patches" in result
        assert len(result["security_patches"]) >= 2
        assert "Security Vulnerability Remediation Report" in result["answer"]
        assert "API_KEY" in result["answer"]
        assert "shell=False" in result["answer"]
    finally:
        repository_registry.repositories.pop("test-sec-repo", None)
