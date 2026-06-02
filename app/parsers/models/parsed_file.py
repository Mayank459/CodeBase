from dataclasses import dataclass, field

from .parsed_class import ParsedClass
from .parsed_function import ParsedFunction
from .parsed_import import ParsedImport
from .parsed_variable import ParsedVariable


@dataclass
class ParsedFile:

    file_path: str

    classes: list[ParsedClass] = field(default_factory=list)

    functions: list[ParsedFunction] = field(default_factory=list)

    imports: list[ParsedImport] = field(default_factory=list)

    variables: list[ParsedVariable] = field(default_factory=list)