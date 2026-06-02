from tree_sitter import Language, Parser
import tree_sitter_python as _tspython


def build_python_parser() -> Parser:
    """Return a tree-sitter Parser configured for Python.

    Uses the modern tree-sitter >= 0.22 API where Language is passed
    directly to the Parser constructor.
    """
    return Parser(Language(_tspython.language()))
