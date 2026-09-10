"""Class diagram module."""
import re

class ClassDiagramBuilder:

    def __init__(self, repository_index):
        self.repository_index = repository_index

    def get_classes(self):
        classes = []
        for parsed_file in self.repository_index.parsed_files:
            file_path = parsed_file.file_path
            for cls in parsed_file.classes:
                # Extract inheritance from class header: class Foo(Bar, Baz):
                bases = []
                match = re.search(r'class\s+[A-Za-z0-9_]+\s*\(([^)]+)\)', cls.code)
                if match:
                    raw_bases = match.group(1).split(",")
                    bases = [b.strip().split(".")[-1] for b in raw_bases if b.strip() and b.strip() != "object"]

                methods = []
                calls = []
                for m in cls.methods:
                    methods.append(m.name)
                    for c in getattr(m, 'calls', []):
                        calls.append(c.name.split(".")[-1])

                classes.append({
                    "name": cls.name,
                    "file_path": file_path,
                    "bases": bases,
                    "methods": methods[:8], # limit methods per class to 8
                    "calls": calls
                })

        return classes