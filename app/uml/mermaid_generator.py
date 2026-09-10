"""Mermaid generator module for UML diagrams."""

class MermaidGenerator:

    def generate(self, classes):
        if not classes:
            return "classDiagram\n  class EmptyRepository {\n    +note: No classes detected\n  }"

        # Prioritize core domain classes over test classes
        domain_classes = [c for c in classes if not c["name"].startswith("Test") and "test" not in c.get("file_path", "").lower()]
        target_classes = domain_classes if len(domain_classes) >= 3 else classes

        # Limit to top 25 classes to avoid visual spaghetti
        selected_classes = target_classes[:25]
        selected_class_names = {c["name"] for c in selected_classes}

        lines = ["classDiagram", ""]

        # Render Class definitions
        for cls in selected_classes:
            name = cls["name"]
            methods = cls.get("methods", [])

            if not methods:
                lines.append(f"  class {name}")
            else:
                lines.append(f"  class {name} {{")
                for method in methods:
                    clean_m = "".join(ch if ch.isalnum() or ch == "_" else "" for ch in method)
                    if clean_m:
                        lines.append(f"    +{clean_m}()")
                lines.append("  }")

            lines.append("")

        # Render Inheritance relationships
        rendered_relations = set()
        for cls in selected_classes:
            name = cls["name"]
            for base in cls.get("bases", []):
                if base in selected_class_names and base != name:
                    rel_key = (base, name, "inherits")
                    if rel_key not in rendered_relations:
                        rendered_relations.add(rel_key)
                        lines.append(f"  {base} <|-- {name} : inherits")

        # Render Associations based on method calls
        for cls in selected_classes:
            name = cls["name"]
            for call_target in cls.get("calls", []):
                if call_target in selected_class_names and call_target != name:
                    rel_key = (name, call_target, "uses")
                    if rel_key not in rendered_relations and (call_target, name, "uses") not in rendered_relations:
                        rendered_relations.add(rel_key)
                        lines.append(f"  {name} --> {call_target} : uses")

        return "\n".join(lines)