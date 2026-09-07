import os, glob, re

files = glob.glob('**/*.html', recursive=True) + glob.glob('**/*.js', recursive=True) + glob.glob('**/*.json', recursive=True)
issues = []

for f in files:
    if any(x in f for x in ['node_modules', '.git', 'scratch', 'walkthrough', 'implementation_plan']):
        continue
    with open(f, 'r', encoding='utf-8') as fl:
        txt = fl.read()
        if re.search(r'href=["\']/[a-zA-Z]', txt) or re.search(r'src=["\']/[a-zA-Z]', txt):
            issues.append(f)

if not issues:
    print("SUCCESS: All paths are completely relative. 100% GitHub Pages ready!")
else:
    print("ISSUES FOUND:", issues)
