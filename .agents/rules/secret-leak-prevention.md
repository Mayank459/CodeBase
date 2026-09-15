# Secret Leakage & Credential Protection Rule

## Purpose
Prevent accidental disclosure, logging, or echo of sensitive credentials, API keys, private keys, database passwords, and PII in chat responses, artifacts, or commit messages.

## Guidelines
1. **Never Echo Sensitive Values**:
   - Never print raw values of API keys (`sk-...`, `gsk_...`, `AIza...`, `ghp_...`, AWS `AKIA...`), database connection strings with passwords, or private key blocks.
   - Always redact or mask them as `[REDACTED_API_KEY]`, `[REDACTED_PASSWORD]`, etc.
2. **Environment File Discipline**:
   - Never commit `.env` files containing live secrets to version control.
   - Ensure `.gitignore` contains `.env` and sensitive credential files.
   - When generating example configurations, only write to `.env.example` using placeholder values.
3. **Command Output Sanitization**:
   - Before outputting command outputs or logs that might contain tokens or authorization headers, scrub the sensitive parameters.
