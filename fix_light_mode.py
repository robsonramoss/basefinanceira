import os, re

BASE = '/Users/renangalhardo/Documents/granazap-v5-main/granazap/src/components/dashboard'

REPLACEMENTS = [
    (r'bg-\[#0A0F1C\]',         'bg-[var(--bg-base)]'),
    (r'bg-\[#0F1419\]',         'bg-[var(--bg-card)]'),
    (r'bg-\[#111827\]',         'bg-[var(--bg-card)]'),
    (r'bg-\[#1E293B\]',         'bg-[var(--bg-elevated)]'),
    (r'bg-\[#1F2937\]',         'bg-[var(--bg-elevated)]'),
    (r'bg-\[#0F172A\]',         'bg-[var(--bg-card-inner)]'),
    (r'bg-zinc-950',            'bg-[var(--bg-card-inner)]'),
    (r'bg-zinc-900/\d+',        'bg-[var(--bg-elevated)]'),
    (r'bg-zinc-800/\d+',        'bg-[var(--bg-elevated)]'),
    (r'\bbg-zinc-900\b',        'bg-[var(--bg-card)]'),
    (r'\bbg-zinc-800\b',        'bg-[var(--bg-elevated)]'),
    (r'\bbg-zinc-700\b',        'bg-[var(--bg-active)]'),
    (r'border-white/5(?!\d)',   'border-[var(--border-default)]'),
    (r'border-white/10(?!\d)',  'border-[var(--border-medium)]'),
    (r'border-white/20(?!\d)',  'border-[var(--border-strong)]'),
    (r'\bborder-zinc-900\b',    'border-[var(--border-default)]'),
    (r'\bborder-zinc-800\b',    'border-[var(--border-medium)]'),
    (r'\bborder-zinc-700\b',    'border-[var(--border-medium)]'),
    (r'\bborder-zinc-600\b',    'border-[var(--border-strong)]'),
    (r'divide-zinc-800',        'divide-[var(--border-medium)]'),
    (r'divide-white/5',         'divide-[var(--border-default)]'),
    (r'\[color-scheme:dark\]',  ''),
    (r'(?<![a-z:-])text-white(?![-/a-z0-9])', 'text-[var(--text-primary)]'),
    (r'\btext-zinc-200\b',      'text-[var(--text-primary)]'),
    (r'\btext-zinc-300\b',      'text-[var(--text-secondary)]'),
    (r'\btext-zinc-400\b',      'text-[var(--text-secondary)]'),
    (r'\btext-zinc-500\b',      'text-[var(--text-tertiary)]'),
    (r'placeholder:text-zinc-\d+', 'placeholder:text-[var(--input-placeholder)]'),
    (r'placeholder-zinc-\d+',   'placeholder:text-[var(--input-placeholder)]'),
    (r'\bhover:bg-zinc-700\b',  'hover:bg-[var(--bg-active)]'),
    (r'\bhover:bg-zinc-800\b',  'hover:bg-[var(--bg-elevated)]'),
    (r'\bhover:text-white\b',   'hover:text-[var(--text-primary)]'),
]

changed = []
for root, dirs, files in os.walk(BASE):
    for fname in sorted(files):
        if not fname.endswith('.tsx'):
            continue
        fpath = os.path.join(root, fname)
        with open(fpath, 'r') as f:
            content = f.read()
        original = content
        for pattern, replacement in REPLACEMENTS:
            content = re.sub(pattern, replacement, content)
        if content != original:
            with open(fpath, 'w') as f:
                f.write(content)
            changed.append(os.path.relpath(fpath, BASE))

print(f'Fixed {len(changed)} files:')
for f in sorted(changed):
    print(' ', f)
