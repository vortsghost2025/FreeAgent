# REMOVED: sensitive data redacted by automated security cleanup
#!/usr/bin/env python3
import os, re, sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
ignore_dirs = {'.git','node_modules','.venv','venv','.github','.vscode'}

# Patterns to redact: private keys, 64-hex, 40-hex prefixed 0x private keys, typical env keys
patterns = [
    (re.compile(r"\b[0-9a-fA-F]{64}\b"), 'REDACTED_HEX_64'),
    (re.compile(r"0x[0-9a-fA-F]{64}\b"), 'REDACTED_PRIVATE_KEY'),
    (re.compile(r"0x[0-9a-fA-F]{40}\b"), 'REDACTED_ADDRESS'),
    (re.compile(r"PRIVATE_KEY\s*=\s*.+", re.IGNORECASE), 'PRIVATE_KEY=REDACTED_SET_VIA_SECRET_MANAGER
    (re.compile(r"BOT_WALLET_PRIVATE_KEY\s*=\s*.+", re.IGNORECASE), 'BOT_WALLET_PRIVATE_KEY=REDACTED_SET_VIA_SECRET_MANAGER
    (re.compile(r"ETHERSCAN_API_KEY\s*=\s*.+", re.IGNORECASE), 'ETHERSCAN_API_KEY=REDACTED_SET_VIA_SECRET_MANAGER
    (re.compile(r"OPENAI?_?API_?KEY\s*=\s*.+", re.IGNORECASE), 'OPENAI_API_KEY=REDACTED_SET_VIA_SECRET_MANAGER
    (re.compile(r"AWS_ACCESS_KEY_ID\s*=\s*.+", re.IGNORECASE), 'AWS_ACCESS_KEY_ID=REDACTED
    (re.compile(r"AWS_SECRET_ACCESS_KEY\s*=\s*.+", re.IGNORECASE), 'AWS_SECRET_ACCESS_KEY=REDACTED
    (re.compile(r"[A-Za-z0-9_\-]{16,}\.[A-Za-z0-9_\-]{16,}\.[A-Za-z0-9_\-]{16,}"), 'REDACTED_JWT'),
]

binary_exts = {'.png','.jpg','.jpeg','.exe','.dll','.so','.bin','.pyc','.pkl'}

modified = []

for dirpath, dirnames, filenames in os.walk(root):
    # filter ignored dirs
    parts = Path(dirpath).parts
    if any(p in ignore_dirs for p in parts):
        continue
    for fname in filenames:
        fp = Path(dirpath) / fname
        if fp.suffix.lower() in binary_exts:
            continue
        try:
            text = fp.read_text(encoding='utf-8')
        except Exception:
            continue
        orig = text
        # skip large files (>1MB) to be safe
        if len(text) > 1_000_000:
            continue
        for pat, repl in patterns:
            text = pat.sub(repl, text)
        if text != orig:
            # add header note
            header = "# REMOVED: sensitive data redacted by automated security cleanup\n"
            if not text.startswith(header):
                text = header + text
            fp.write_text(text, encoding='utf-8')
            modified.append(str(fp.relative_to(root)))

print('MODIFIED_FILES_COUNT=', len(modified))
for m in modified:
    print(m)

# Exit with success
sys.exit(0)
