from collections import defaultdict

def generate_stats(files):
    stats = defaultdict(int)

    stats["total_files"] = len(files)

    for file in files:
        suffix = file.suffix.lower()
        stats[suffix] += 1

    return dict(stats)
