"""Dead code report generator."""
from collections import defaultdict


class DeadCodeReportGenerator:

    def generate(
        self,
        findings
    ):

        if not findings:
            return (
                "# Dead code\n\n"
                "No unreferenced functions or methods were found. Every function and method "
                "either has a caller, is referenced by name somewhere, or is invoked by the "
                "runtime or a framework (dunder methods, decorated handlers, tests)."
            )

        counts = defaultdict(int)
        for f in findings:
            counts[f.confidence] += 1

        lines = [
            "# Dead code",
            "",
            f"{len(findings)} unreferenced symbols: "
            f"{counts['high']} high confidence (private), "
            f"{counts['medium']} medium (public, may be used by importers), "
            f"{counts['low']} low (may override an inherited method).",
            "",
            "| Confidence | Symbol | Where |",
            "| --- | --- | --- |",
        ]
        for f in findings:
            where = f"`{f.file_path}`" + (f":{f.start_line}" if f.start_line else "")
            lines.append(f"| {f.confidence} | `{f.name or f.node_id}` ({f.node_type}) | {where} |")

        return "\n".join(lines)
