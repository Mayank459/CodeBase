---
name: dead-code-cleaner
description: Detects unreferenced functions, classes, dead methods, and unused imports across codebases, and coordinates safe surgical deprecation and removal.
---

# Dead Code & Dangling Symbol Cleaner

This skill guides the agent to systematically identify, audit, and safely eliminate unused code, dead functions, dangling classes, and zombie imports.

## When to Use
- During codebase cleanups, refactorings, or technical debt reduction sprints.
- When evaluating bloat, dead dependencies, or deprecated API endpoints.
- When validating whether an old utility can be safely deleted.

## Detection Methodology

### 1. Definition vs Call-Site Cross-Referencing
For any candidate symbol (function, method, class):
- Extract the definition identifier.
- Search the entire repository for usages across all source files, test files, and configuration files.
- Distinguish between:
  - **Internal Private Symbols** (`_helper`): Safe to remove if zero internal references exist.
  - **Public Exported Symbols**: Check `__all__`, `__init__.py`, `index.js`, or package exports before assuming dead.
  - **Dynamic Calls**: Check if invoked via `getattr()`, reflection, or framework dependency injection.

### 2. Triage Categories
Classify detected dead code into:
1. **Unused Imports**: Module imports that are never referenced in the file.
2. **Dangling Private Functions/Methods**: Functions defined internally with zero call sites.
3. **Dead Constants/Variables**: Configuration constants no longer read by any logic.
4. **Orphan Files**: Entire modules that are never imported or referenced in the project.

### 3. Safe Removal Workflow
1. **Verify Test Coverage**: Check if unit tests specifically test the candidate symbol.
2. **Deprecate or Remove**:
   - If internal/unexported: surgically delete using `replace_file_content`.
   - If external/public API: consider adding a `@deprecated` docstring or warning before hard deletion.
3. **Regression Validation**:
   - Run the test suite (`pytest`, `npm test`) immediately after removal.
   - Run linter (`ruff`, `eslint`) to ensure no dangling references remain.
