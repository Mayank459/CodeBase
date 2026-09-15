---
name: codebase-security-auditor
description: Performs AST-based static code security audits, scans for CVEs, SQL injection, unsafe deserialization, hardcoded credentials, and generates automated remediation patches.
---

# Codebase Security Auditor & Patch Generator

This skill guides the agent to audit codebases for security vulnerabilities, calculate risk ratings, and prepare validated remediation patches.

## When to Use
- When asked to "audit security", "find vulnerabilities", or "check for security bugs".
- Before deploying code to production to verify no exposed secrets or injection vectors exist.
- When generating automated security fix PRs or remediation guidance.

## Vulnerability Detection Categories

### 1. Hardcoded Secrets & Credentials
- Scans for hardcoded tokens, API keys (AWS, OpenAI, Stripe, GitHub), private certificates, and database connection strings containing plaintext passwords.
- **Remediation**: Migrate to environment variables (`os.environ`, `.env`, or Secret Manager).

### 2. Injection Vulnerabilities
- **SQL Injection**: Raw string formatting/concatenation in SQL statements (`f"SELECT * FROM users WHERE id = {user_id}"`).
  - **Remediation**: Parameterized queries or ORM binds (`cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))`).
- **Command Injection**: `subprocess.Popen(..., shell=True)`, `os.system(...)` with unsanitized inputs.
  - **Remediation**: Use `shell=False` with argument lists: `subprocess.run(["cmd", arg])`.

### 3. Unsafe Deserialization & Code Execution
- Usage of `pickle.loads()`, `yaml.load()` without SafeLoader, `eval()`, `exec()`.
  - **Remediation**: Replace with `json.loads()`, `yaml.safe_load()`, or structured AST parsing.

### 4. Permissive Network & Access Defaults
- `CORS(allow_origins=["*"])`, disabling SSL validation (`verify=False`), debug mode enabled in production.

## Audit Workflow
1. **Scan Source Code**: Analyze critical path entrypoints (routes, handlers, data access layers).
2. **Assign Severity**:
   - **CRITICAL**: Remote Code Execution (RCE), SQL Injection, hardcoded production secrets.
   - **HIGH**: Insecure deserialization, missing authentication gates, SSRF.
   - **MEDIUM**: Overly permissive CORS, verbose stack traces in client responses.
   - **LOW**: Missing HTTP security headers, outdated non-critical dependencies.
3. **Draft Remediation**: Provide direct surgical replacement diffs fixing the vulnerability while preserving functional contracts.
