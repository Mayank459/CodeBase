class PullRequestReportGenerator:
    def generate(self, pr):
        lines = []
        lines.append("# Pull Request\n")
        
        lines.append("Title:")
        lines.append(pr.title)
        lines.append("")
        
        lines.append("Summary:")
        lines.append(pr.summary)
        lines.append("")
        
        lines.append("Files Changed:")
        for item in pr.files_changed:
            lines.append(f"- {item}")
        lines.append("")
        
        lines.append("Changes:")
        for item in pr.changes:
            lines.append(f"- {item}")
        lines.append("")
        
        lines.append("Risk Reduction:")
        lines.append(pr.risk_reduction)
        
        return "\n".join(lines)
