SECURITY_PATTERNS = {
    "hardcoded_secret": [
        "SECRET_KEY",
        "JWT_SECRET",
        "API_KEY",
        "ACCESS_TOKEN"
    ],
    "dangerous_eval": [
        "eval("
    ],
    "dangerous_exec": [
        "exec("
    ],
    "pickle_loads": [
        "pickle.loads("
    ],
    "shell_true": [
        "shell=True"
    ],
    "md5_usage": [
        "hashlib.md5("
    ]
}
