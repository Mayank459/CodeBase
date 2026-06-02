from dataclasses import dataclass

@dataclass
class EvolutionReport:
    added_classes: list[str]
    removed_classes: list[str]
    added_functions: list[str]
    removed_functions: list[str]
    added_files: list[str]
    removed_files: list[str]
