#!/usr/bin/env python3
"""The Signal — standard footer + version stamp generator (single source of truth).

Applies, to every full HTML page under the site root:
  1. Removes every old per-page credit line ("Curated by ... Follow on LinkedIn")
     in all its variants; a footer left empty by the removal is removed too.
  2. Injects the ONE standard footer (Follow along row with the three LinkedIn
     links, the copyright line and the tagline) from FOOTER_TEMPLATE below.
  3. Stamps the build id: <meta name="signal-build"> in <head>, the shared
     assets/signal-footer.css link, and the assets/version-check.js script.
  4. Writes /version.json with the same build id.

Skips: the protected Google verification file, meta-refresh redirect stubs,
and body fragments without an <html> shell (research/articles/*.html).

Usage: python3 apply_standard_footer.py SITE_ROOT BUILD_ID|@BUILD_ID_FILE [--noindex] [--strip-analytics]
Recurring jobs pass @scripts/BUILD_ID so the site-wide build id changes in exactly one place.
Idempotent: re-running replaces the previously injected footer/stamp.
"""
import re, sys, os, json

BUILD_ID = sys.argv[2]
if BUILD_ID.startswith('@'):
    with open(BUILD_ID[1:], encoding='utf-8') as _f:
        BUILD_ID = _f.read().strip()
ROOT = sys.argv[1]
FLAGS = set(sys.argv[3:])

LI_SVG = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.55V9h3.57v11.45z"/></svg>'

def sf_link(url, label):
    return (f'<a class="sf-link" href="{url}" target="_blank" rel="noopener">'
            f'<span class="sf-badge" aria-hidden="true">{LI_SVG}</span>{label}</a>')

FOOTER_TEMPLATE = (
    '<footer class="signal-footer">\n'
    '  <div class="sf-follow"><span class="sf-label">Follow along</span>'
    '<span class="sf-links">'
    + sf_link('https://www.linkedin.com/in/thillairaj', 'Thillai Raj')
    + sf_link('https://www.linkedin.com/showcase/qu-bits/', 'QuBits · Quantum &amp; AI')
    + sf_link('https://www.linkedin.com/showcase/agentic-ai-architect/', 'Agentic AI Architect')
    + '</span></div>\n'
    '  <p class="sf-copy">© 2026 The Signal</p>\n'
    '  <p class="sf-tag">Learn it. Then share it.</p>\n'
    '</footer>'
)

SKIP_FILES = {'google4f2a27e6bccae7a5.html'}

def strip_credit_lines(s):
    """Remove every 'Curated by' credit construct; drop footers left empty."""
    n0 = s
    # video-space curator footer block (whole element is the credit)
    s = re.sub(r'<footer class="curator-foot">.*?</footer>\s*', '', s, flags=re.S)
    # homepage credit span
    s = re.sub(r'<span class="credit">Curated by.*?</span>\s*', '', s, flags=re.S)
    # brief-style paragraph credit
    s = re.sub(r'<p>Curated by [^<]*<a class="li-btn".*?</a></p>\s*', '', s, flags=re.S)
    # generic: any element whose entire content is the credit line
    s = re.sub(r'<div[^>]*>\s*Curated by [^<]*<a[^>]*>.*?LinkedIn</a>\s*</div>\s*', '', s, flags=re.S)
    # deck/table/explainer/game footer: rule div + credit text + li-btn anchor
    s = re.sub(r'(<footer[^>]*>)\s*(?:<div class="rule"></div>)?\s*Curated by [^<]*<a class="li-btn".*?</a>\s*(</footer>)',
               lambda m: m.group(1) + m.group(2), s, flags=re.S)
    # plain-text credit inside a footer (answer-duel style anchor without li-btn class)
    s = re.sub(r'(<footer[^>]*>)\s*Curated by [^<]*<a [^>]*>Follow on LinkedIn</a>\s*(</footer>)',
               lambda m: m.group(1) + m.group(2), s, flags=re.S)
    # any footer now empty (or only a rule div) is removed entirely
    s = re.sub(r'<footer[^>]*>\s*(?:<div class="rule"></div>)?\s*</footer>\s*', '', s, flags=re.S)
    # periodic-table credit div (disclaimer text stays in the table footer)
    s = re.sub(r'<div style="margin-top:12px;font-size:13px">\s*Curated by .*?</a>\s*</div>\s*', '', s, flags=re.S)
    # deck share-card credit constant (drawn on downloaded cards)
    s = s.replace('const FOOTER="Curated by Thillai Raj Thanam Jeya Veera Raj";', 'const FOOTER="The Signal";')
    return s, (s != n0)

def process(path, rel):
    with open(path, encoding='utf-8', errors='replace') as f:
        s = f.read()
    if '<html' not in s[:600] or '</body>' not in s:
        return 'skip-fragment'
    if 'http-equiv="refresh"' in s[:3000]:
        # redirect stub: strip only its fallback credit line, nothing else
        s2 = re.sub(r'\s*<p style="font-size:\.85rem;opacity:\.7">Curated by [^<]*</p>', '', s)
        if s2 != s:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(s2)
            return 'redirect-credit-stripped'
        return 'skip-redirect'
    depth = rel.count('/')
    prefix = '../' * depth
    s, changed_credit = strip_credit_lines(s)
    # idempotency: drop a previously injected footer/stamp
    s = re.sub(r'<footer class="signal-footer">.*?</footer>\s*', '', s, flags=re.S)
    s = re.sub(r'\s*<meta name="signal-build"[^>]*>', '', s)
    s = re.sub(r'\s*<link rel="stylesheet" href="[^"]*assets/signal-footer\.css[^"]*">', '', s)
    s = re.sub(r'\s*<script src="[^"]*assets/version-check\.js[^"]*"></script>', '', s)
    head_bits = (f'\n<meta name="signal-build" content="{BUILD_ID}">'
                 f'\n<link rel="stylesheet" href="{prefix}assets/signal-footer.css?v={BUILD_ID}">')
    if '--noindex' in FLAGS and 'name="robots"' not in s:
        head_bits += '\n<meta name="robots" content="noindex">'
    s = s.replace('</head>', head_bits + '\n</head>', 1)
    tail = (FOOTER_TEMPLATE + f'\n<script src="{prefix}assets/version-check.js?v={BUILD_ID}"></script>\n')
    s = s.replace('</body>', tail + '</body>', 1)
    if '--strip-analytics' in FLAGS:
        s = re.sub(r'<script[^>]*(?:goatcounter|gc\.zgo\.at)[^>]*></script>\s*', '', s)
        s = re.sub(r'<script[^>]*(?:goatcounter|gc\.zgo\.at)[^>]*/>\s*', '', s)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(s)
    return 'credit-removed' if changed_credit else 'footer-added'

def main():
    counts = {}
    for dirpath, dirnames, filenames in os.walk(ROOT):
        if '.git' in dirpath:
            continue
        for fn in filenames:
            if not fn.endswith('.html'):
                continue
            path = os.path.join(dirpath, fn)
            rel = os.path.relpath(path, ROOT)
            if rel in SKIP_FILES:
                counts['skip-protected'] = counts.get('skip-protected', 0) + 1
                continue
            r = process(path, rel)
            counts[r] = counts.get(r, 0) + 1
    with open(os.path.join(ROOT, 'version.json'), 'w', encoding='utf-8') as f:
        json.dump({'build': BUILD_ID}, f, indent=2)
        f.write('\n')
    print(counts)

if __name__ == '__main__':
    main()
