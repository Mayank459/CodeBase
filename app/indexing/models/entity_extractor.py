from app.indexing.models.code_entity import (
    CodeEntity
)

class EntityExtractor:
    def __init__(self):
        self.counter = 0

    def extract_entities(
        self,
        parsed_files
    ):
        entities = []

        for parsed_file in parsed_files:

            for function in parsed_file.functions:
                self.counter += 1
                entities.append(
                    CodeEntity(
                        id=self.counter,
                        graph_node_id=f"{parsed_file.file_path}::{function.name}",
                        entity_type="function",
                        name=function.name,
                        file_path=parsed_file.file_path,
                        content=function.code
                    )
                )
        
            for cls in parsed_file.classes:
                self.counter += 1
                entities.append(
                    CodeEntity(
                        id=self.counter,
                        graph_node_id=f"{parsed_file.file_path}::{cls.name}",
                        entity_type="class",
                        name=cls.name,
                        file_path=parsed_file.file_path,
                        content=cls.code
                    )
                )
            
                for method in cls.methods:
                    self.counter += 1
                    entities.append(
                        CodeEntity(
                            id=self.counter,
                            graph_node_id=f"{parsed_file.file_path}::{cls.name}::{method.name}",
                            entity_type="method",
                            name=method.name,
                            file_path=parsed_file.file_path,
                            content=method.code
                        )
                    )
            
            for variable in parsed_file.variables:
                self.counter += 1
                entities.append(
                    CodeEntity(
                        id=self.counter,
                        graph_node_id=f"{parsed_file.file_path}::{variable.name}",
                        entity_type="variable",
                        name=variable.name,
                        file_path=parsed_file.file_path,
                        content=variable.value or ""
                    )
                )
        return entities