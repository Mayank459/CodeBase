"""Class diagram module."""
class ClassDiagramBuilder:

    def __init__(
        self,
        repository_index
    ):

        self.repository_index = (
            repository_index
        )


    def get_classes(self):

        classes = []

        for parsed_file in (
            self.repository_index
            .parsed_files
        ):

            for cls in (
                parsed_file.classes
            ):

                classes.append(
                    {
                    "name": cls.name,
                    "methods": [
                        m.name
                        for m in cls.methods
                    ]
                }
            )

        return classes