"""Dependency diagram module."""

class DependencyDiagramBuilder:

    def __init__(
        self,
        repository_index
    ):

        self.repository_index = (
            repository_index
        )
        self.graph = (
            repository_index.graph
        )

    def get_dependencies(self):

        dependencies = []

        for u, v, data in (
            self.graph.edges(data=True)
        ):

            relation = data.get("relation", "depends_on")

            source = u.split("::")[0].replace("\\", "/").split("/")[-1]
            target = v.split("::")[0].replace("\\", "/").split("/")[-1]

            if source != target:
                dep = {
                    "source": source,
                    "target": target,
                    "relation": relation
                }

                if dep not in dependencies:
                    dependencies.append(dep)

        return dependencies
