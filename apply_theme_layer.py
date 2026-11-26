#!/usr/bin/env python3
"""The Signal: add the site-wide theme to every page. Run from the repository root:  python3 apply_theme_layer.py [--dry-run]
Adds, to every real page (not redirect stubs, not research body fragments):
  <script src=".../assets/signal-theme.js?v=THEME"></script>   right after the charset line (so the theme applies before the page paints)
  <link rel="stylesheet" href=".../assets/signal-themes.css?v=THEME">   last in <head>
Idempotent: pages that already have both are skipped. Prints counts."""
import os,re,sys
V='20261126t'; DRY='--dry-run' in sys.argv
n=skip=0; stubs=0
for d,dirs,fs in os.walk('.'):
    dirs[:]=[x for x in dirs if x not in ('.git','node_modules')]
    for f in fs:
        if not f.endswith('.html'): continue
        p=os.path.relpath(os.path.join(d,f),'.')
        try: s=open(p,encoding='utf8').read()
        except: continue
        if 'http-equiv="refresh"' in s: stubs+=1; continue
        if not re.search(r'<head[\s>]',s) or '</head>' not in s: continue
        if 'signal-theme.js' in s and 'signal-themes.css' in s: skip+=1; continue
        r='../'*p.count('/')
        o=s
        if 'signal-theme.js' not in s:
            tag='<script src="%sassets/signal-theme.js?v=%s"></script>'%(r,V)
            m=re.search(r'<meta[^>]+charset[^>]*>',s,re.I)
            if m: s=s[:m.end()]+'\n'+tag+s[m.end():]
            else:
                m=re.search(r'<head[^>]*>',s); s=s[:m.end()]+'\n'+tag+s[m.end():]
        if 'signal-themes.css' not in s:
            s=s.replace('</head>','<link rel="stylesheet" href="%sassets/signal-themes.css?v=%s">\n</head>'%(r,V),1)
        if s!=o:
            n+=1
            if not DRY: open(p,'w',encoding='utf8').write(s)
print(('Would change' if DRY else 'Changed'),n,'pages; already done:',skip,'; redirect stubs left alone:',stubs)
