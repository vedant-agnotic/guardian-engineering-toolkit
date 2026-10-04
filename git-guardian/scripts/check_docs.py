#!/usr/bin/env python3
"""Offline scaffold integrity check; not an implementation test suite."""
from pathlib import Path
import json,re,sys
root=Path(__file__).resolve().parents[1]
errors=[]
required=['Readme.md','docs/DEVELOPMENT.md','docs/USAGE.md','docs/REFERENCE_MANUAL.md','docs/ARCHITECTURE.md','docs/TESTING.md','docs/ROADMAP.md','docs/SECURITY.md','docs/DECISIONS.md','docs/SOURCES.md']
for rel in required:
    if not (root/rel).is_file():errors.append('Missing '+rel)
for p in root.rglob('*.json'):
    try:json.loads(p.read_text())
    except Exception as e:errors.append(str(p.relative_to(root))+': '+str(e))
for p in root.rglob('*.md'):
    text=p.read_text()
    for dest in re.findall(r'(?<!!)\[[^\]]+\]\(([^)]+)\)',text):
        if '://' in dest or dest.startswith(('#','mailto:')):continue
        path=dest.split('#',1)[0]
        if path and not (p.parent/path).exists():errors.append(str(p.relative_to(root))+': missing link '+dest)
if errors:
    print('\n'.join(errors));sys.exit(1)
print('PASS: required documents, local file links and JSON syntax. Product behavior and YAML schemas are not tested.')
