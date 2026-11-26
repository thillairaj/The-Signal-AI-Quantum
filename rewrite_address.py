#!/usr/bin/env python3
"""The Signal: move every written address from the GitHub address to signal.luzovi.com.
Run from the repository root:   python3 rewrite_address.py [--dry-run | --check]
  --dry-run  count what would change, change nothing
  --check    change nothing; exit 1 if any old address is still present (used as the final gate)
Idempotent: running it again changes nothing. Text files only; .git is skipped.
Does NOT touch any other github.io address (for example the preview site) and does NOT create the CNAME file."""
import os,sys,collections
OLD_PATH='thillairaj.github.io/The-Signal-AI-Quantum'
NEW_HOST='signal.luzovi.com'
RULES=[ # order matters: longest first
 ('https://'+OLD_PATH+'/', 'https://'+NEW_HOST+'/'),
 ('https://'+OLD_PATH,     'https://'+NEW_HOST),
 (OLD_PATH+'/',            NEW_HOST+'/'),
 (OLD_PATH,                NEW_HOST),
 ('HOST = "thillairaj.github.io"', 'HOST = "'+NEW_HOST+'"'),  # the IndexNow script
]
TEXT=('.html','.js','.css','.json','.xml','.txt','.md','.py','.yml','.yaml','.svg','.webmanifest','.csv')
mode='dry' if '--dry-run' in sys.argv else ('check' if '--check' in sys.argv else 'write')
changed=collections.Counter(); left=[]; n_total=0
for d,dirs,fs in os.walk('.'):
    dirs[:]=[x for x in dirs if x!='.git']
    for f in fs:
        if not f.lower().endswith(TEXT): continue
        p=os.path.join(d,f)
        if os.path.abspath(p)==os.path.abspath(__file__): continue  # local guard (Nov 25, 2026): never rewrite or flag this script itself; its own OLD_PATH constant otherwise self-rewrites on the first write run and --check can never pass with the script inside the repo
        try:
            with open(p,encoding='utf8',newline='') as h: s=h.read()
        except (UnicodeDecodeError,OSError): continue
        o=s
        for a,b in RULES: s=s.replace(a,b)
        if OLD_PATH in s: left.append(p)
        if s!=o:
            n_total+=1; changed[os.path.splitext(f)[1]]+=1
            if mode=='write':
                with open(p,'w',encoding='utf8',newline='') as h: h.write(s)
print(('Would change' if mode!='write' else 'Changed'),n_total,'files:',dict(changed))
if left: print('STILL CONTAINS THE OLD ADDRESS:',left[:10])
if mode=='check': sys.exit(1 if left or n_total else 0)
