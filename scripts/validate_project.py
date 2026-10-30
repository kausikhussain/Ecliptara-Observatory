from html.parser import HTMLParser
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
HTML_FILE = ROOT / "index.html"

class DocumentParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []
        self.local_references = []
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get("id"):
            self.ids.append(attrs["id"])
        for attr in ("src", "href"):
            value = attrs.get(attr)
            if not value or value.startswith(("https://", "http://", "data:", "mailto:", "tel:", "#", "javascript:")):
                continue
            # Ignore template, protocol-relative, and root-absolute references.
            if value.startswith(("//", "/")):
                continue
            path = value.split("?", 1)[0].split("#", 1)[0]
            if path and not path.startswith(("{", "(")):
                self.local_references.append((tag, attr, path))

html = HTML_FILE.read_text(encoding="utf-8")
p = DocumentParser()
p.feed(html)
from collections import Counter
counts = Counter(p.ids)
duplicates = sorted(k for k, v in counts.items() if v > 1)
app_js = (ROOT / "js" / "app.js").read_text(encoding="utf-8")
refs = set(re.findall(r"\$\('([^']+)'\)", app_js))
missing_ids = sorted(refs - set(p.ids))
missing_files = []
for tag, attr, rel in p.local_references:
    candidate = (ROOT / rel).resolve()
    if ROOT not in candidate.parents and candidate != ROOT:
        missing_files.append((tag, attr, rel, "path escapes project root"))
    elif not candidate.exists():
        missing_files.append((tag, attr, rel, "file not found"))
print(f"HTML IDs: {len(p.ids)}")
print(f"Direct JS DOM references: {len(refs)}")
print(f"Local HTML asset references: {len(p.local_references)}")
print(f"Duplicate IDs: {duplicates or 'none'}")
print(f"Missing direct JS DOM IDs: {missing_ids or 'none'}")
print(f"Missing local assets: {missing_files or 'none'}")
if duplicates or missing_files or missing_ids:
    sys.exit(1)
