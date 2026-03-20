import os
from pathlib import Path
from typing import List, Tuple


def find_large_files(root: Path, min_size: int = 1_000_000) -> List[Tuple[int, Path]]:
    """Return list of files larger than min_size (bytes)."""
    results = []
    for dirpath, _, filenames in os.walk(root):
        for fname in filenames:
            fpath = Path(dirpath) / fname
            try:
                size = fpath.stat().st_size
            except Exception:
                continue
            if size >= min_size:
                results.append((size, fpath))
    return sorted(results, reverse=True)


def summary_extensions(root: Path) -> dict:
    counts = {}
    for dirpath, _, filenames in os.walk(root):
        for fname in filenames:
            ext = Path(fname).suffix.lower()
            counts[ext] = counts.get(ext, 0) + 1
    return counts


if __name__ == "__main__":
    import sys
    root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.cwd()
    print("Counting extensions...")
    ext_summary = summary_extensions(root)
    for ext, cnt in sorted(ext_summary.items(), key=lambda kv: -kv[1])[:20]:
        print(f"{ext or '[no ext]'}: {cnt}")
    print("\nFinding large files (>=1MB)...")
    large = find_large_files(root)
    for size, path in large[:20]:
        print(f"{size/1_000_000:.1f}MB  {path}")
