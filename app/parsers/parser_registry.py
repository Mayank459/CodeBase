from app.parsers.python.extractor import extract_python_file
from app.parsers.generic_extractor import extract_generic_file
from app.parsers.language_detector import LANGUAGE_MAP

PARSER_REGISTRY = {}

for ext, lang in LANGUAGE_MAP.items():
    if lang == "python":
        PARSER_REGISTRY[ext] = extract_python_file
    else:
        PARSER_REGISTRY[ext] = extract_generic_file
