import os
import ast
import sys

imports = set()
python_files = []
for root, dirs, files in os.walk('.'):
    if any(x in root for x in ['node_modules', '.git', '.gemini', 'dist']):
        continue
    for f in files:
        if f.endswith('.py'):
            path = os.path.join(root, f)
            python_files.append(path)
            try:
                with open(path, 'r', encoding='utf-8') as fp:
                    tree = ast.parse(fp.read(), filename=path)
                    for node in ast.walk(tree):
                        if isinstance(node, ast.Import):
                            for alias in node.names:
                                imports.add(alias.name.split('.')[0])
                        elif isinstance(node, ast.ImportFrom):
                            if node.module:
                                imports.add(node.module.split('.')[0])
            except Exception as e:
                print(f"Error parsing {path}: {e}")

print(f"Total Python files found: {len(python_files)}")
for pf in sorted(python_files):
    print(f"  {pf}")

stdlib = {
    'os', 'sys', 're', 'json', 'math', 'time', 'uuid', 'datetime', 
    'hashlib', 'urllib', 'argparse', 'collections', 'difflib', 'subprocess', 
    'ast', 'csv', 'io'
}

print("\nImported packages analysis:")
external_needed = []
for imp in sorted(imports):
    if imp in stdlib:
        print(f"  [STDLIB]   {imp}")
    else:
        try:
            __import__(imp)
            print(f"  [EXTERNAL] {imp} (INSTALLED)")
        except ImportError:
            print(f"  [EXTERNAL] {imp} (MISSING ❌)")
            external_needed.append(imp)

print(f"\nMissing packages: {external_needed}")
