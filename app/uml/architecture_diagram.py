"""Architecture diagram generator module."""
import os

class ArchitectureDiagramGenerator:

    def __init__(self, repository_index):
        self.repository_index = repository_index
        self.graph = repository_index.graph

    @staticmethod
    def _escape_label(label):
        return label.replace("\\", "\\\\").replace('"', '\\"')

    @staticmethod
    def _clean_id(name):
        return "".join(c if c.isalnum() else "_" for c in name).strip("_")

    def _is_noise(self, path):
        low = path.lower()
        noise_exts = ('.md', '.yaml', '.yml', '.toml', '.json', '.txt', '.lock', '.rst')
        if any(low.endswith(ext) for ext in noise_exts):
            return True
        if 'test' in low or 'conf.py' in low or 'setup.py' in low:
            return True
        return False

    def generate(self):
        lines = ["graph TD", ""]

        # Collect relevant source files/modules
        modules = {}
        for node, data in self.graph.nodes(data=True):
            if data.get("type") == "file":
                if not self._is_noise(node):
                    base_dir = os.path.dirname(node) or "root"
                    base_name = os.path.basename(node)
                    modules.setdefault(base_dir, []).append((node, base_name))

        # If no files matched or very few, include all non-noise nodes
        if not modules:
            for node in self.graph.nodes():
                if not self._is_noise(node):
                    base_name = node.split("::")[-1]
                    modules.setdefault("core", []).append((node, base_name))

        node_id_map = {}
        subgraph_idx = 1

        # Build subgraphs by directory / layer
        for dir_name, files in modules.items():
            clean_dir = dir_name.replace("/", " / ").replace("\\", " / ")
            lines.append(f'  subgraph sub_{subgraph_idx} ["📂 {self._escape_label(clean_dir)}"]')
            for file_path, base_name in files:
                nid = f"m_{self._clean_id(file_path)}"
                node_id_map[file_path] = nid
                lines.append(f'    {nid}["📄 {self._escape_label(base_name)}"]')
            lines.append("  end")
            lines.append("")
            subgraph_idx += 1

        # Track module-to-module dependencies from graph edges
        module_edges = set()
        for source, target, data in self.graph.edges(data=True):
            src_file = source.split("::")[0]
            tgt_file = target.split("::")[0]

            if src_file in node_id_map and tgt_file in node_id_map and src_file != tgt_file:
                module_edges.add((node_id_map[src_file], node_id_map[tgt_file]))

        # Render deduplicated module couplings (limit to top 40 edges to keep diagram readable)
        for src_id, tgt_id in list(module_edges)[:40]:
            lines.append(f"  {src_id} --> {tgt_id}")

        # Add styling
        lines.append("")
        lines.append("  classDef default fill:#0f172a,stroke:#3b82f6,stroke-width:1.5px,color:#f8fafc;")
        lines.append("  classDef cluster fill:#080d1a,stroke:#1e293b,stroke-width:1px,color:#94a3b8;")

        return "\n".join(lines)