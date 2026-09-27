from app.parsers.models.parsed_file import ParsedFile
from app.parsers.models.parsed_function import ParsedFunction
from app.parsers.models.parsed_import import ParsedImport
from app.parsers.models.parsed_class import ParsedClass
from app.parsers.models.parsed_variable import ParsedVariable
from app.parsers.models.parsed_method import ParsedMethod

from app.parsers.python.parser import build_python_parser
from app.parsers.python.call_extractor import extract_calls


parser = build_python_parser()


def clean_import(import_text: str):

    if import_text.startswith("import "):
        return import_text.replace(
            "import ",
            ""
        ).strip()

    if import_text.startswith("from "):

        return import_text.split()[1]

    return import_text


def _unwrap(node):
    """Return (definition_node, outer_node, decorators).

    `@decorator` wraps a definition in a `decorated_definition` node; without
    unwrapping, every decorated function, method and class was skipped. The
    outer node keeps the decorators in the stored code and line span.
    """
    if node.type != "decorated_definition":
        return node, node, []
    definition = node.child_by_field_name("definition")
    decorators = [
        child.text.decode("utf8", errors="replace").lstrip("@").strip()
        for child in node.children
        if child.type == "decorator"
    ]
    return definition, node, decorators


def _string_value(node):
    """Python value of a string literal node ('\'\'\'...\'\'\'', r"...", etc.)."""
    import ast
    import inspect
    text = node.text.decode("utf8", errors="replace")
    try:
        value = ast.literal_eval(text)
    except Exception:
        value = text.strip("rRuUbBfF").strip("\"'")
    return inspect.cleandoc(value) if isinstance(value, str) else ""


def _docstring(block):
    """Docstring of a module/class/function body: its first statement, if a string."""
    if block is None:
        return ""
    for child in block.named_children:
        if child.type == "comment":
            continue
        if child.type == "expression_statement" and child.named_children and child.named_children[0].type == "string":
            return _string_value(child.named_children[0])
        return ""
    return ""


def _api(node):
    """Signature pieces of a function_definition: parameters, return annotation, async."""
    params = node.child_by_field_name("parameters")
    ret = node.child_by_field_name("return_type")
    return {
        "signature": params.text.decode("utf8", errors="replace") if params else "()",
        "return_type": ret.text.decode("utf8", errors="replace") if ret else "",
        "docstring": _docstring(node.child_by_field_name("body")),
        "is_async": any(c.type == "async" for c in node.children),
    }


def extract_python_file(
    file_path: str,
    source_code: str
):

    parsed_file = ParsedFile(
        file_path=file_path,
        source_code=source_code
    )

    # tree-sitter offsets are byte offsets into the UTF-8 encoding; slicing the
    # str with them shifts or garbles snippets in any file with non-ASCII text.
    source_bytes = bytes(source_code, "utf8")

    def code_of(node):
        return source_bytes[node.start_byte:node.end_byte].decode("utf8", errors="replace")

    tree = parser.parse(source_bytes)

    root = tree.root_node
    parsed_file.module_docstring = _docstring(root)

    for top in root.children:

        node, outer, decorators = _unwrap(top)
        if node is None:
            continue

        # -------------------------
        # Functions
        # -------------------------
        if node.type == "function_definition":

            name_node = node.child_by_field_name(
                "name"
            )

            parsed_file.functions.append(
                ParsedFunction(
                    name=name_node.text.decode(),
                    start_line=outer.start_point[0] + 1,
                    end_line=outer.end_point[0] + 1,
                    code=code_of(outer),
                    calls=extract_calls(node),
                    decorators=decorators,
                    **_api(node)
                )
            )

        # -------------------------
        # Imports
        # -------------------------
        elif node.type in [
            "import_statement",
            "import_from_statement"
        ]:

            parsed_file.imports.append(
                ParsedImport(
                    module=clean_import(
                        node.text.decode()
                    )
                )
            )

        # -------------------------
        # Classes + Methods
        # -------------------------
        elif node.type == "class_definition":

            name_node = node.child_by_field_name(
                "name"
            )

            bases = []
            superclasses_node = node.child_by_field_name("superclasses")
            if superclasses_node:
                for arg in superclasses_node.children:
                    if arg.type in ["identifier", "attribute"]:
                        bases.append(arg.text.decode())

            parsed_class = ParsedClass(
                name=name_node.text.decode(),
                start_line=outer.start_point[0] + 1,
                end_line=outer.end_point[0] + 1,
                code=code_of(outer),
                methods=[],
                bases=bases,
                docstring=_docstring(node.child_by_field_name("body"))
            )

            for child in node.children:

                if child.type == "block":

                    for raw_item in child.children:

                        item, item_outer, item_decorators = _unwrap(raw_item)

                        if item is not None and item.type == "function_definition":

                            method_name = (
                                item.child_by_field_name(
                                    "name"
                                )
                            )

                            parsed_class.methods.append(
                                ParsedMethod(
                                    name=method_name.text.decode(),
                                    start_line=item_outer.start_point[0] + 1,
                                    end_line=item_outer.end_point[0] + 1,
                                    code=code_of(item_outer),
                                    calls=extract_calls(item),
                                    decorators=item_decorators,
                                    **_api(item)
                                )
                            )

            parsed_file.classes.append(
                parsed_class
            )

        # -------------------------
        # Variables
        # -------------------------
        elif node.type == "expression_statement":

            if not node.children:
                continue

            child = node.children[0]

            if child.type == "assignment":

                name_node = child.child_by_field_name(
                    "left"
                )

                value_node = child.child_by_field_name(
                    "right"
                )

                if name_node:

                    parsed_file.variables.append(
                        ParsedVariable(
                            name=name_node.text.decode(),
                            value=value_node.text.decode()
                            if value_node
                            else None,
                            start_line=node.start_point[0] + 1,
                            end_line=node.end_point[0] + 1
                        )
                    )

    return parsed_file
