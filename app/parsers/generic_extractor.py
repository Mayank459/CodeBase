from app.parsers.models.parsed_file import ParsedFile
from app.parsers.models.parsed_variable import ParsedVariable

def extract_generic_file(file_path: str, source_code: str) -> ParsedFile:
    """
    Fallback generic extractor for languages that don't have a specialized AST parser yet.
    Embeds the entire file content as a single searchable entity.
    """
    lines = source_code.count("\n") + 1
    
    # Store the entire file as a "file_content" variable so it gets picked up by EntityExtractor
    content_variable = ParsedVariable(
        name="file_content",
        value=source_code,
        start_line=1,
        end_line=lines
    )
    
    return ParsedFile(
        file_path=file_path,
        classes=[],
        functions=[],
        variables=[content_variable],
        imports=[]
    )
