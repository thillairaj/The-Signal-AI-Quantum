#!/usr/bin/env python3
"""The Signal: give every page the Luzovi tab icon. Run from the repository root:  python3 apply_icon_layer.py [--dry-run]
Adds, to every real page (not redirect stubs, not fragments without a <head>), just before </head>:
  <link rel="icon" href=".../favicon.svg" type="image/svg+xml">
  <link rel="icon" href=".../favicon.ico" sizes="any">
  <link rel="apple-touch-icon" href=".../apple-touch-icon.png">
  <link rel="manifest" href=".../site.webmanifest">
  <meta name="theme-color" content="#3F7D20">
with the right relative prefix for the page's depth. Any pre-existing icon,
apple-touch-icon, manifest or theme-color tag is removed first (the old emoji
and empty data:, icons, and the term pages' #071527 theme-color), so each page
ends with exactly one icon block. Idempotent: a page already carrying the
block is left byte-identical. Prints counts."""
import os, re, sys
DRY = '--dry-run' in sys.argv
TAG_RE = re.compile(r'<(?:link|meta)\b(?:[^>"]|"[^"]*")*>', re.I)
REL_RE = re.compile(r'\brel\s*=\s*["\'](icon|shortcut icon|apple-touch-icon|apple-touch-icon-precomposed|manifest)["\']', re.I)
TC_RE = re.compile(r'\bname\s*=\s*["\']theme-color["\']', re.I)

def strip_old(s):
    """Remove existing icon/manifest/theme-color tags (whole line when the tag sits alone on it)."""
    out = []
    for m in TAG_RE.finditer(s):
        t = m.group(0)
        if (t.lower().startswith('<link') and REL_RE.search(t)) or (t.lower().startswith('<meta') and TC_RE.search(t)):
            out.append((m.start(), m.end()))
    if not out:
        return s
    parts, last = [], 0
    for a, b in out:
        seg_start = a
        # swallow the whole line if only whitespace surrounds the tag on it
        ls = s.rfind('\n', 0, a) + 1
        le = s.find('\n', b)
        if s[ls:a].strip() == '' and (le == -1 or s[b:le].strip() == ''):
            seg_start = ls
            b = le + 1 if le != -1 else b
        parts.append(s[last:seg_start])
        last = b
    parts.append(s[last:])
    return ''.join(parts)

BLOCK = ('<link rel="icon" href="{r}favicon.svg" type="image/svg+xml">\n'
         '<link rel="icon" href="{r}favicon.ico" sizes="any">\n'
         '<link rel="apple-touch-icon" href="{r}apple-touch-icon.png">\n'
         '<link rel="manifest" href="{r}site.webmanifest">\n'
         '<meta name="theme-color" content="#3F7D20">\n')

n = skip = stubs = 0
for d, dirs, fs in os.walk('.'):
    dirs[:] = [x for x in dirs if x not in ('.git', 'node_modules')]
    for f in fs:
        if not f.endswith('.html'):
            continue
        p = os.path.relpath(os.path.join(d, f), '.')
        try:
            s = open(p, encoding='utf8').read()
        except Exception:
            continue
        if 'http-equiv="refresh"' in s:
            stubs += 1
            continue
        if not re.search(r'<head[\s>]', s) or '</head>' not in s:
            continue
        r = '../' * p.count('/')
        s2 = strip_old(s)
        s2 = s2.replace('</head>', BLOCK.format(r=r) + '</head>', 1)
        if s2 != s:
            n += 1
            if not DRY:
                open(p, 'w', encoding='utf8').write(s2)
        else:
            skip += 1
print(('Would change' if DRY else 'Changed'), n, 'pages; already done:', skip, '; redirect stubs left alone:', stubs)
