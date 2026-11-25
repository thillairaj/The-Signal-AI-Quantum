#!/usr/bin/env python3
"""The Signal, stage 2: apply the page standard to every individual page.
Run from the repository root:  python3 stage2_apply.py [--dry-run]
Changes ONLY the text around the content (heading, one line, labels, extra links) and adds assets/signal-pages.css.
Idempotent: pages already done carry <meta name="sg-stage" content="2"> and are skipped. Prints a report per page type."""
import os,re,sys,html,json,collections
DRY='--dry-run' in sys.argv
ROOT='.'
TABLE_TECH={'ai-keywords':'ai','ai-tools':'ai','agentic-ai-keywords':'ai','agentic-ai-tools':'ai','quantum-keywords':'quantum','quantum-algorithms':'quantum','quantum-hardware':'quantum','quantum-security':'quantum','cloud-devops':'cloud','aws-leaders':'cloud','azure-leaders':'cloud','google-cloud-leaders':'cloud','cybersecurity':'cyber','cyber-threats':'cyber','ai-cybersecurity':'cyber','security-frameworks':'cyber','founder-finance':'founders','startup-growth':'founders','startup-sales':'founders','leadership':'founders'}
EXPL={'llm-answers':'ai','quantum-hardware':'quantum','web-request':'cloud'}
DECK={'ai':('ai','AI deck'),'quantum':('quantum','Quantum deck'),'cloud':('cloud','Cloud & DevOps deck'),'cybersecurity':('cyber','Cybersecurity deck')}
VIDEO={'ai-learning-space':'ai','quantum-learning-space':'quantum','cloud-devops-learning-space':'cloud','cybersecurity-learning-space':'cyber'}
SERIES={'Daily AI Intelligence':'ai','Quantum Intelligence':'quantum'}
PILL={'AI':'ai','Quantum':'quantum','Cloud & DevOps':'cloud','Cloud':'cloud','Cybersecurity':'cyber','Security':'cyber'}
STOP={'for','of','in','to','with','and','a','an','the','on','at','every','should'}
KW=[('Cloud & DevOps','cloud'),('Cybersecurity','cyber'),('Quantum','quantum'),('Cyber','cyber'),('Cloud','cloud'),('DevOps','cloud'),('AI','ai')]
def rule(text,group=None):
    """Heading colour rule: the technology name and the words after it, up to a stop word, get <span class="sg-t sg-t-…">."""
    t=html.unescape(text).strip()
    if group=='founders': return html.escape(t)
    for kw,k in KW:
        m=re.search(r'(?<![A-Za-z])'+re.escape(kw)+r'(?![A-Za-z])',t)
        if not m: continue
        rest=re.split(r'(\s+)',t[m.end():]);acc=''
        for w in rest:
            if w.strip() and w.strip().lower().strip(',.:;') in STOP: break
            acc+=w
        acc=acc.rstrip(); trail=re.search(r'[?!.,:;]+$',acc)
        if trail: acc=acc[:trail.start()]
        end=m.end()+len(acc)
        return html.escape(t[:m.start()])+'<span class="sg-t sg-t-%s">%s</span>'%(k,html.escape(t[m.start():end]))+html.escape(t[end:])
    return html.escape(t)
def strip_tags(s): return re.sub(r'\s+',' ',re.sub(r'<[^>]+>','',s)).strip()
def rel_root(p): return '../'*p.count('/')
def set_html(s,kind,tech):
    m=re.search(r'<html([^>]*)>',s)
    attrs=m.group(1)
    if 'class="' in attrs: attrs=re.sub(r'class="([^"]*)"',lambda x:'class="%s sgp sgp-%s"'%(x.group(1),kind),attrs,1)
    else: attrs+=' class="sgp sgp-%s"'%kind
    if tech: attrs+=' data-tech="%s"'%tech
    return s[:m.start()]+'<html%s>'%attrs+s[m.end():]
def add_css(s,p):
    tag='<link rel="stylesheet" href="%sassets/signal-pages.css">\n<meta name="sg-stage" content="2">\n'%rel_root(p)
    return s.replace('</head>',tag+'</head>',1)
def head_block(h1,sub,toggle=''):
    return '<div class="sgp-head">%s<h1 class="sgp-h1">%s</h1>%s</div>'%(toggle,h1,('<p class="sgp-sub">%s</p>'%html.escape(sub)) if sub else '')
def replace_header(s,h1,sub,miss):
    m=re.search(r'<header>[\s\S]*?</header>',s)
    if not m: miss.append('header'); return s
    tg=re.search(r'<button[^>]*class="theme-toggle"[\s\S]*?</button>',m.group(0))
    return s[:m.start()]+head_block(h1,sub,tg.group(0) if tg else '')+s[m.end():]
def remove(s,pat,miss,name):
    n=len(re.findall(pat,s))
    if not n: miss.append(name)
    return re.sub(pat,'',s)
def nterms(slug):
    d=os.path.join(ROOT,'t',slug); return len([x for x in os.listdir(d) if os.path.isdir(os.path.join(d,x))]) if os.path.isdir(d) else 0
report=collections.Counter();issues=collections.defaultdict(list)
for dp,_,fs in os.walk(ROOT):
    if '/.git' in dp or '/assets' in dp or '/data' in dp: continue
    for f in fs:
        if not f.endswith('.html'): continue
        p=os.path.relpath(os.path.join(dp,f),ROOT); s=open(p,encoding='utf8').read()
        if 'http-equiv="refresh"' in s or '<head' not in s or 'name="sg-stage" content="2"' in s: continue
        miss=[];kind=None;tech=None;o=s
        if (m:=re.match(r'(ai|quantum|cloud|cybersecurity)-deck/index\.html$',p)):
            kind='deck';tech,title=DECK[m.group(1)]
            s=replace_header(s,'<span class="sg-t sg-t-%s">%s</span>'%(tech,title),'Read the cards, flip the flashcards, then take the quiz.',miss)
        elif (m:=re.match(r'periodic-tables/([^/]+)/index\.html$',p)):
            kind='table';tech=TABLE_TECH.get(m.group(1))
            hm=re.search(r'<header>[\s\S]*?<h1[^>]*>([\s\S]*?)</h1>',s);title=strip_tags(hm.group(1)) if hm else m.group(1)
            s=replace_header(s,rule(title,tech),'%d terms in plain business language.'%nterms(m.group(1)),miss)
            s=re.sub(r"(getItem\('[a-z_]*theme'\)\|\|)'dark'",r"\1'light'",s)
            s=re.sub(r'(<p class="hint"[^>]*>)[\s\S]*?(</p>)',r'\1Click any term to read it.\2',s,count=1)
        elif (m:=re.match(r't/([^/]+)/[^/]+/index\.html$',p)):
            kind='term';tech=TABLE_TECH.get(m.group(1))
            s=remove(s,r'<div class="kicker">[\s\S]*?</div>\s*',miss,'kicker')
            s=remove(s,r'<p class="src">[\s\S]*?</p>\s*',miss,'src')
            s=remove(s,r'<a class="cta"[\s\S]*?</a>\s*',miss,'cta')
            s=re.sub(r'<h1>([\s\S]*?)</h1>',lambda x:'<h1>%s</h1>'%rule(strip_tags(x.group(1)),tech),s,count=1)
        elif (m:=re.match(r'explainers/([a-z-]+)\.html$',p)) and m.group(1) in EXPL:
            kind='explainer';tech=EXPL[m.group(1)]
            hm=re.search(r'<header>[\s\S]*?<h1[^>]*>([\s\S]*?)</h1>',s);title=strip_tags(hm.group(1)) if hm else ''
            s=replace_header(s,rule(title,tech),'Tap any part to see what it does.',miss)
        elif (m:=re.match(r'([a-z-]+-learning-space)/index\.html$',p)) and m.group(1) in VIDEO:
            kind='video';tech=VIDEO[m.group(1)]
            s=remove(s,r'<p class="reader">[\s\S]*?</p>\s*',miss,'reader label')
            s=re.sub(r'(<h1 id="mastTitle">)([\s\S]*?)(</h1>)',lambda x:x.group(1)+'<span class="sg-t sg-t-%s">%s</span>'%(tech,html.escape(html.unescape(strip_tags(x.group(2)))))+x.group(3),s,count=1)
        elif re.match(r'research/[^/]+/index\.html$',p) and 'research-title' in s:
            kind='article'
            s=remove(s,r'<header class="ap-head">[\s\S]*?</header>\s*',miss,'own top bar')
            s=remove(s,r'<p class="research-kicker">[\s\S]*?</p>\s*',miss,'label')
            bm=re.search(r'<p>\s*<em>(Signal Research Notes is[\s\S]*?)</em>\s*</p>\s*',s)
            if bm:
                note=bm.group(1);s=s[:bm.start()]+s[bm.end():]
                tail='<p class="sgp-note">%s</p>'%note
                lm=-1
                for anchor in ('<div class="research-sources','<h3 class="research-sources-h">','<ul class="research-sources"'):
                    lm=s.rfind(anchor) if anchor in s else -1
                    if lm>0: break
                s=(s[:lm]+tail+s[lm:]) if lm>0 else s.replace('</article>',tail+'</article>',1) if '</article>' in s else s
            s=re.sub(r'<a href="[^"]*#research">\s*All articles\s*</a>','',s)
            s=re.sub(r'(<h1 class="research-title">)([\s\S]*?)(</h1>)',lambda x:x.group(1)+rule(strip_tags(x.group(2)))+x.group(3),s,count=1)
        elif re.match(r'podcast/[^/]+/index\.html$',p) and 'research-title' in s:
            kind='article'
            s=remove(s,r'<header class="ap-head">[\s\S]*?</header>\s*',miss,'own top bar')
            s=remove(s,r'<p class="research-kicker">[\s\S]*?</p>\s*',miss,'label')
            tm=re.search(r'<h1 class="research-title">([\s\S]*?)</h1>',s)
            if tm:
                full=html.unescape(strip_tags(tm.group(1)))
                mm=re.match(r'(.+?)\s+—\s+Episode\s+(\d+)\s*(?:\(([^)]*)\))?\s*:\s*(.+)$',full)
                if mm:
                    series,num,_,title=mm.groups();k=SERIES.get(series)
                    s=s[:tm.start()]+'<h1 class="research-title">%s</h1>'%rule(title)+s[tm.end():]
                    dm=re.search(r'<p class="research-date">([\s\S]*?)</p>',s)
                    if dm:
                        parts=[x.strip() for x in strip_tags(dm.group(1)).split('·')]
                        rest=' · '.join(parts[1:]) if len(parts)>1 else ''
                        lab=('<span class="sg-t sg-t-%s">%s</span>'%(k,html.escape(series))) if k else html.escape(series)
                        s=s[:dm.start()]+'<p class="research-date">%s · Episode %s%s</p>'%(lab,num,(' · '+html.escape(rest)) if rest else '')+s[dm.end():]
                else:
                    mt=re.match(r'Tech Learning:\s*(.+?)\s+—\s+Ep\s*(\d+)\s*:\s*(.+)$',full) or re.match(r'Tech Learning (Series)\s+—\s+Ep\s*(\d+)\s*:\s*(.+)$',full)
                    if mt:
                        track,num,title=mt.groups()
                        k='cyber' if 'Cyber' in track else ('cloud' if 'Cloud' in track else None)
                        s=s[:tm.start()]+'<h1 class="research-title">%s</h1>'%rule(title)+s[tm.end():]
                        dm=re.search(r'<p class="research-date">([\s\S]*?)</p>',s)
                        if dm:
                            parts=[x.strip() for x in strip_tags(dm.group(1)).split('·')]
                            rest=' · '.join(parts[1:]) if len(parts)>1 else ''
                            lab=('<span class="sg-t sg-t-%s">%s</span>'%(k,html.escape(track))) if k else html.escape(track)
                            lead='Technology Learnings · '+lab+' · ' if track!='Series' else 'Technology Learnings · '
                            s=s[:dm.start()]+'<p class="research-date">%sEpisode %s%s</p>'%(lead,num,(' · '+html.escape(rest)) if rest else '')+s[dm.end():]
                    elif re.match(r'.+—\s+Episode\s+\d+$',full): pass  # no separate title: keep as it is
                    else: miss.append('title format')
        elif re.match(r'brief/\d{4}-\d{2}-\d{2}/\d+/index\.html$',p):
            kind='brief'
            pm=re.search(r'<span class="story-pill"[^>]*>([^<]+)</span>',s);tech=PILL.get(pm.group(1).strip()) if pm else None
            s=remove(s,r'<a class="story-edition"[\s\S]*?</a>\s*',miss,'edition button')
            s=re.sub(r'(<main>[\s\S]*?<h1>)([\s\S]*?)(</h1>)',lambda x:x.group(1)+rule(strip_tags(x.group(2)))+x.group(3),s,count=1)
        if not kind: continue
        s=set_html(s,kind,tech);s=add_css(s,p)
        report[kind]+=1
        if miss: issues[kind].append((p,miss))
        if not DRY and s!=o: open(p,'w',encoding='utf8').write(s)
print('Pages changed by type:',dict(report))
for k,v in issues.items(): print('Not found on %s pages (%d):'%(k,len(v)),v[:5])
