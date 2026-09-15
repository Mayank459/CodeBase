---
name: ast-docstring-generator
description: Generates standardized, complete Google/NumPy-style docstrings and module documentation extracted directly from AST signatures and type hints.
---

# AST Docstring & API Documentation Generator

This skill guides the agent to generate accurate, high-fidelity docstrings and markdown API specifications based on AST signatures, type hints, and parameter contracts.

## When to Use
- When documenting undocumented functions, classes, or modules.
- When generating developer reference manuals or API documentation markdown files.
- When updating docstrings after a signature or parameter change.

## Docstring Standards (Google Style)

### Function / Method Template
```python
def process_repository(
    repo_url: str,
    depth: int = 1,
    force_reindex: bool = False
) -> Dict[str, Any]:
    """Clones and indexes a git repository into the vector and graph stores.

    Args:
        repo_url: Public HTTPS or SSH URL of the Git repository.
        depth: Git clone depth (default 1 for shallow clone).
        force_reindex: If True, ignores cached indices and recomputes all AST chunks.

    Returns:
        A dictionary containing the parsed entity count, node count, and collection ID.

    Raises:
        GitError: If the repository URL is inaccessible or fails to clone.
        IndexingError: If Tree-sitter parsing encounters fatal syntax errors.
    """
```

### Class Template
```python
class GraphBuilder:
    """Constructs and queries topological call graphs across AST entities.

    Attributes:
        graph: The underlying NetworkX DiGraph instance storing callers and callees.
        indexed_count: Total number of functions currently resolved in the graph.
    """
```

## Guidelines
1. **Never Invent Types**: Infer types from explicit annotations (`: str`, `-> int`) or default parameter values.
2. **Document Edge Cases & Exceptions**: Explicitly list all exceptions raised in the body.
3. **Preserve Existing Docstrings**: If a docstring already exists, only update missing parameters or stale descriptions.
