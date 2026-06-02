from app.pr_generator.models import PullRequestDraft

class PRDescriptionGenerator:
    def generate(self, patches):
        files_modified = list(set([p.file_path for p in patches]))
        changes = [f"Replaced {p.finding_type} with secure equivalent." for p in patches]
        risk_reduction = "High" if len(patches) > 0 else "None"
        
        return PullRequestDraft(
            title="Security Hardening",
            summary="Fixed detected vulnerabilities.",
            files_changed=files_modified,
            changes=changes,
            risk_reduction=risk_reduction
        )
