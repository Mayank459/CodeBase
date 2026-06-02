LANGUAGE_MAP = {
    # Python
    ".py": "python",

    # JavaScript / TypeScript
    ".js": "javascript",
    ".jsx": "javascript",
    ".mjs": "javascript",
    ".cjs": "javascript",

    ".ts": "typescript",
    ".tsx": "typescript",

    # Java
    ".java": "java",

    # C / C++
    ".c": "c",
    ".h": "c",

    ".cpp": "cpp",
    ".cc": "cpp",
    ".cxx": "cpp",
    ".hpp": "cpp",
    ".hh": "cpp",
    ".hxx": "cpp",

    # Go
    ".go": "go",

    # Rust
    ".rs": "rust",

    # C#
    ".cs": "c_sharp",

    # PHP
    ".php": "php",

    # Ruby
    ".rb": "ruby",

    # Kotlin
    ".kt": "kotlin",
    ".kts": "kotlin",

    # Swift
    ".swift": "swift",

    # Scala
    ".scala": "scala",

    # Dart
    ".dart": "dart",

    # Lua
    ".lua": "lua",

    # R
    ".r": "r",

    # Perl
    ".pl": "perl",

    # Shell
    ".sh": "bash",
    ".bash": "bash",
    ".zsh": "bash",

    # SQL
    ".sql": "sql",

    # HTML
    ".html": "html",
    ".htm": "html",

    # CSS
    ".css": "css",

    # JSON
    ".json": "json",

    # YAML
    ".yaml": "yaml",
    ".yml": "yaml",

    # TOML
    ".toml": "toml",

    # XML
    ".xml": "xml",

    # Markdown
    ".md": "markdown",

    # Docker
    "Dockerfile": "dockerfile",

    # Git config
    ".gitignore": "gitignore",

    # Makefiles
    "Makefile": "make",

    # Protocol Buffers
    ".proto": "proto",

    # HCL / Terraform
    ".tf": "hcl",

    # Vue
    ".vue": "vue",

    # Svelte
    ".svelte": "svelte",
}

def detect_languages(path):
    suffix = path.suffix.lower()

    return LANGUAGE_MAP.get(suffix, "unknown")