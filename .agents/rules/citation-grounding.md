# Citation Grounding & Path Verification Rule

## Purpose
Ensure all file links, symbols, and code references provided to the user are grounded in the actual codebase, preventing hallucinated file paths or nonexistent functions.

## Guidelines
1. **Always Verify Path Existence Before Linking**:
   - Before writing markdown links like `[filename](file:///path/to/file)`, verify that the file actually exists using `list_dir` or `view_file`.
   - Never invent hypothetical file paths (e.g. `src/utils/auth_helper.js`) if they do not exist in the repository.
2. **Deterministic Symbol Verification**:
   - When referencing a class, method, or function, cross-reference its definition in the source code.
   - If a symbol has been renamed or refactored, use the latest naming from the active source tree.
3. **Grounding Notices for Missing Assets**:
   - If an explanation refers to a missing or proposed file, explicitly mark it as `[NEW]` or `(To be created)` rather than citing it as an existing file.
