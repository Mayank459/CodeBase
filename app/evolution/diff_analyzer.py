from app.evolution.models import EvolutionReport

class RepositoryDiffAnalyzer:
    def analyze(self, old_repo, new_repo):
        old_classes = set()
        new_classes = set()

        for file in old_repo.parsed_files:
            for cls in file.classes:
                old_classes.add(cls.name)

        for file in new_repo.parsed_files:
            for cls in file.classes:
                new_classes.add(cls.name)

        old_functions = set()
        new_functions = set()

        for file in old_repo.parsed_files:
            for func in file.functions:
                old_functions.add(func.name)

        for file in new_repo.parsed_files:
            for func in file.functions:
                new_functions.add(func.name)

        old_files = {f.file_path for f in old_repo.parsed_files}
        new_files = {f.file_path for f in new_repo.parsed_files}

        return EvolutionReport(
            added_classes=list(new_classes - old_classes),
            removed_classes=list(old_classes - new_classes),
            added_functions=list(new_functions - old_functions),
            removed_functions=list(old_functions - new_functions),
            added_files=list(new_files - old_files),
            removed_files=list(old_files - new_files)
        )
