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


def extract_python_file(
    file_path: str,
    source_code: str
):

    parsed_file = ParsedFile(
        file_path=file_path
    )

    tree = parser.parse(
        bytes(source_code, "utf8")
    )

    root = tree.root_node

    for node in root.children:

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
                    start_line=node.start_point[0] + 1,
                    end_line=node.end_point[0] + 1,
                    code=source_code[
                        node.start_byte:node.end_byte
                    ],
                    calls=extract_calls(node)
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

            parsed_class = ParsedClass(
                name=name_node.text.decode(),
                start_line=node.start_point[0] + 1,
                end_line=node.end_point[0] + 1,
                code=source_code[
                    node.start_byte:node.end_byte
                ],
                methods=[]
            )

            for child in node.children:

                if child.type == "block":

                    for item in child.children:

                        if item.type == "function_definition":

                            method_name = (
                                item.child_by_field_name(
                                    "name"
                                )
                            )

                            parsed_class.methods.append(
                                ParsedMethod(
                                    name=method_name.text.decode(),
                                    start_line=item.start_point[0] + 1,
                                    end_line=item.end_point[0] + 1,
                                    code=source_code[
                                        item.start_byte:item.end_byte
                                    ],
                                    calls=extract_calls(item)
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