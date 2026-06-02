class DiffGenerator:
    def generate(self, patch):
        return f"""
- {patch.original_code}
+ {patch.replacement_code}
"""
