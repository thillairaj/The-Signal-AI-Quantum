#!/usr/bin/env python3
"""Signal Brief builder.

Reads data/brief.json (the editorial source of truth: editions of items,
each item carrying its own source links) and generates:
  signal.xml                 the full Signal Brief RSS feed (all categories)
  signal/<category>.xml      one RSS feed per category (ai, quantum,
                             cloud-devops, cybersecurity, industry, policy)
  brief/index.html           the Signal Brief page: the card based design
                             rendered by assets/brief.js (same UI as the
                             homepage #brief tab)
  brief/<date>/<nn>/         one static story page per story, with its own
                             preview tags and a rendered og.png news card
                             (Obsidian Gold, 1200x630), for link previews
  sitemap.xml                gains the /brief/ page and every story page
  index.html                 the homepage Signal Brief room's latest
                             edition cards, between the BRIEF-LATEST markers
  brief/story-urls.txt       the brief page plus every story page URL,
                             one per line, for the daily job's IndexNow ping

Every item must carry at least one source link; the builder refuses to
publish an item with no sources (the fact check gate, Thillai, Nov 5, 2026).
Item text is original wording; sources are linked, never copied.

An edition may carry "breaking": true with its own "published" ISO
timestamp; breaking editions are published immediately between daily
editions by the daily job rerunning this builder.

Usage: python3 scripts/build_brief.py [--base-url https://example.org/site/]
The base URL defaults to the live site; the preview build passes the
preview base explicitly.
"""
import json
import re
import sys
from collections import Counter
from datetime import datetime, timezone, timedelta
from email.utils import format_datetime
from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = ROOT / "data" / "brief.json"
PAGE_DIR = ROOT / "brief"
HOME_FILE = ROOT / "index.html"
SITEMAP_FILE = ROOT / "sitemap.xml"

DEFAULT_BASE = "https://thillairaj.github.io/The-Signal-AI-Quantum/"
EDITION_TIME_UTC = timezone(timedelta(hours=1, minutes=30))  # 07:00 IST

# Category colours from the approved card design (Thillai, Nov 6, 2026).
CAT_COLOURS = {
    "AI": "#4F46E5",
    "Quantum": "#7C3AED",
    "Cloud & DevOps": "#0E7490",
    "Cybersecurity": "#DC2626",
    "Industry": "#B45309",
    "Policy": "#0F766E",
}


def parse_args():
    base = DEFAULT_BASE
    args = sys.argv[1:]
    if "--base-url" in args:
        base = args[args.index("--base-url") + 1]
    if not base.endswith("/"):
        base += "/"
    return base


def edition_dt(edition):
    if edition.get("published"):
        return datetime.fromisoformat(edition["published"])
    d = datetime.fromisoformat(edition["date"]).replace(
        hour=7, minute=0, tzinfo=timezone(timedelta(hours=5, minutes=30)))
    return d.astimezone(timezone.utc)


def fmt_date(iso):
    """Readable date: 'Fri, 6 Nov 2026' (never the ISO form on a page)."""
    d = datetime.fromisoformat(str(iso))
    return d.strftime("%a, %-d %b %Y")


def fmt_date_short(iso):
    d = datetime.fromisoformat(str(iso))
    return d.strftime("%-d %b %Y")


def edition_time(edition):
    if edition.get("published"):
        dt = datetime.fromisoformat(edition["published"])
        ist = dt.astimezone(timezone(timedelta(hours=5, minutes=30)))
        return ist.strftime("%H:%M")
    return "07:00"


def story_nn(item):
    m = re.search(r"-(\d+)$", item["id"])
    return m.group(1).zfill(2) if m else "01"


def story_path(edition, item):
    return f"brief/{edition['date']}/{story_nn(item)}/"


def item_html(item, base):
    sources = "".join(
        f'<li><a href="{escape(s["url"])}">{escape(s["label"])}</a></li>'
        for s in item["sources"])
    return (f"<p>{escape(item['summary'])}</p>"
            f"<p><strong>Why it matters for tech:</strong> "
            f"{escape(item['why'])}</p>"
            f"<p>Source: </p><ul>{sources}</ul>")


def build_feed(items, base, title, feed_path, self_file):
    now = datetime.now(timezone.utc)
    rows = []
    for item, ed in items:
        pub = edition_dt(ed)
        link = f"{base}{story_path(ed, item)}"
        content = item_html(item, base)
        rows.append(f"""    <item>
      <title>{escape(item['headline'])}</title>
      <link>{escape(link)}</link>
      <guid isPermaLink="false">{item['id']}</guid>
      <pubDate>{format_datetime(pub)}</pubDate>
      <category>{escape(item['category'])}</category>
      <description>{escape(item['summary'] + ' Why it matters for tech: ' + item['why'])}</description>
      <content:encoded><![CDATA[{content}]]></content:encoded>
    </item>""")
    body = "\n".join(rows)
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>{escape(title)}</title>
    <link>{base}brief/</link>
    <description>Signal Brief: the day in technology, in The Signal's own words. Every item is written from linked official sources and fact checked before publication.</description>
    <lastBuildDate>{format_datetime(now)}</lastBuildDate>
    <atom:link xmlns:atom="http://www.w3.org/2005/Atom" href="{base}{self_file}" rel="self" type="application/rss+xml"/>
{body}
  </channel>
</rss>
"""


PAGE_CSS = """
  :root { --ink:#171b24; --muted:#5a6270; --gold:#b8860b; --paper:#faf9f6; --card:#ffffff; --line:#e5dfce; }
  :root[data-theme="dark"] { --ink:#ecede4; --muted:#9aa08d; --paper:#15170f; --card:#1d2019; --line:#3a3d31; }
  @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --ink:#ecede4; --muted:#9aa08d; --paper:#15170f; --card:#1d2019; --line:#3a3d31; } }
  * { box-sizing:border-box; }
  body { margin:0; font-family: Inter, system-ui, sans-serif; background:var(--paper); color:var(--ink); }
  [hidden] { display: none !important; }
  .brief-topbar { position:sticky; top:0; z-index:50; background:var(--paper); border-bottom:1px solid var(--line); padding:10px 16px; display:flex; justify-content:center; align-items:center; gap:12px; }
  .brief-topbar .ss-page-mount { margin-left: 4px; }
  .brief-back { font-size:.85rem; color:var(--ink); text-decoration:none; border:1px solid var(--line); background:var(--card); border-radius:10px; padding:8px 14px; line-height:1.3; text-align:left; }
  .brief-back small { display:block; color:var(--muted); }
  .brief-theme { margin-left:auto; position:absolute; right:16px; width:38px; height:38px; border-radius:50%; border:1px solid var(--line); background:var(--card); color:var(--ink); font-size:1rem; cursor:pointer; }
  .brief-rules { max-width:820px; margin:18px auto 4px; padding:0 18px; }
  .brief-rules-in { background:var(--card); border:1px solid var(--line); border-radius:12px; padding:14px 18px; font-size:.9rem; line-height:1.55; color:var(--muted); }
  .brief-rules-in strong { color:var(--ink); }
  footer { text-align:center; padding:26px 16px 40px; color:var(--muted); font-size:.9rem; }
  footer .rule { width:60px; height:3px; background:var(--gold); margin:0 auto 16px; }
  .li-btn { display:inline-block; margin-left:8px; background:#0a66c2; color:#fff; text-decoration:none; border-radius:6px; padding:3px 10px; font-size:.8rem; }
"""

THEME_SCRIPT = """<script>
(function () {
  var saved = null;
  try { saved = localStorage.getItem("aisignal_theme"); } catch (e) {}
  if (saved === "dark" || saved === "light") {
    document.documentElement.setAttribute("data-theme", saved);
  }
  document.addEventListener("DOMContentLoaded", function () {
    var btn = document.getElementById("briefTheme");
    if (!btn) return;
    var sync = function () {
      var cur = document.documentElement.getAttribute("data-theme") ||
        (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      btn.textContent = cur === "dark" ? "☀" : "☾";
    };
    sync();
    btn.addEventListener("click", function () {
      var cur = document.documentElement.getAttribute("data-theme") ||
        (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      var next = cur === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("aisignal_theme", next); } catch (e) {}
      sync();
    });
  });
})();
</script>"""

RULES_BOX = """<div class="brief-rules"><div class="brief-rules-in"><strong>How Signal Brief is made:</strong> items are written from the validated wire sources, official government and company pages, and Reuters or AP for geopolitical events. Policy coverage is limited to events with a clear technology impact, is neutral and factual, and carries each side's official position where relevant. Any item whose claims cannot be linked to a source is dropped before publication.</div></div>"""

FOOTER = """<footer class="signal-footer">
  <div class="sf-follow"><span class="sf-label">Follow along</span><span class="sf-links"><a class="sf-link" href="https://www.linkedin.com/in/thillairaj" target="_blank" rel="noopener">Thillai Raj</a><a class="sf-link" href="https://www.linkedin.com/showcase/qu-bits/" target="_blank" rel="noopener">QuBits · Quantum &amp; AI</a><a class="sf-link" href="https://www.linkedin.com/showcase/agentic-ai-architect/" target="_blank" rel="noopener">Agentic AI Architect</a></span></div>
  <p class="sf-copy">© 2026 The Signal</p>
  <p class="sf-tag">Learn it. Then share it.</p>
</footer>"""
# NOTE: apply_standard_footer.py runs after this builder and adds the footer badge svg,
# signal-footer.css link, build stamp and version-check script (single footer source).


def build_page(data, base):
    editions = data.get("editions", data)
    latest = max(editions, key=lambda e: (e.get("date", ""),
                                          str(e.get("published", ""))))
    page_share_cfg = {
        "title": "Signal Brief · The Signal",
        "desc": "Today in tech, in one swipe. The Signal's own daily "
                "brief: original wording, every claim linked to its "
                "source.",
        "inside": "A fresh brief every morning at 07:00, "
                  f"{len(latest.get('items', []))} stories in the "
                  "latest edition",
        "link": f"{base}brief/",
        "tag": "#SignalBrief",
        "image": {"url": f"{base}assets/og/brief.png",
                  "filename": "signal-brief.png"},
    }
    import json as _json
    page_share_block = (
        '<span id="ssPageMount" class="ss-page-mount"></span>'
    )
    page_share_script = (
        "<!-- ss-page-share:start -->\n<script>\n"
        "(function(){function go(){"
        "if(window.SignalShare&&SignalShare.mountPageShare){"
        "SignalShare.mountPageShare("
        "document.getElementById(\"ssPageMount\"), "
        + _json.dumps(page_share_cfg, ensure_ascii=False) +
        ");}}if(document.readyState===\"loading\"){"
        "document.addEventListener(\"DOMContentLoaded\",go);}"
        "else{go();}})();\n</script>\n<!-- ss-page-share:end -->"
    )
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Signal Brief · The Signal</title>
<meta name="description" content="Signal Brief: The Signal's own daily brief on AI, quantum, cloud and DevOps, cybersecurity, industry and policy. Original wording, every claim linked to its source.">
<meta property="og:title" content="Signal Brief · The Signal">
<meta property="og:description" content="Today in tech, in one swipe. The Signal's own daily brief: original wording, every claim linked to its source.">
<meta property="og:type" content="website">
<meta property="og:url" content="{base}brief/">
<meta property="og:image" content="{base}assets/og/brief.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:type" content="image/png">
<link rel="canonical" href="{base}brief/">
<link rel="alternate" type="application/rss+xml" title="Signal Brief" href="{base}signal.xml">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,800;1,9..144,500;1,9..144,600&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{base}assets/brief.css?v=20261106">
<style>{PAGE_CSS}</style>
{THEME_SCRIPT}
</head>
<body>
  <div class="brief-topbar"><a class="brief-back" href="{base}#brief"><small>← Back to</small>The Signal</a>{page_share_block}<button class="brief-theme" id="briefTheme" type="button" aria-label="Toggle dark mode">☾</button></div>
  <main>
    <div data-brief-root data-root-prefix="../"></div>
    {RULES_BOX}
  </main>
  {FOOTER}
  <script src="{base}assets/signal-share.js"></script>
  <script src="{base}assets/brief.js?v=20261106"></script>
  {page_share_script}
</body>
</html>
"""


# ---------- story pages and their og images ----------

def first_sentence(text):
    m = re.match(r"^[\s\S]*?[.!?](?=\s|$)", text or "")
    return (m.group(0) if m else (text or "")).strip()


def render_og_image(item, ed, out_path):
    """The story's news card, Obsidian Gold, 1200x630, drawn with PIL.
    Same design as the canvas news card in assets/brief.js (category
    colour bar, SIGNAL BRIEF pill, readable date, headline, first
    sentence, WHY box, source line, THE SIGNAL footer with the TRT
    badge), tightened for the landscape frame: the first sentence and
    the why line are capped at two lines each, cut at a word boundary,
    and the type shrinks until everything fits above the footer."""
    from PIL import Image, ImageDraw, ImageFont

    W, H = 1200, 630
    k = W / 1080.0
    fonts_dir = "/usr/share/fonts/truetype/dejavu"

    def font(name, size):
        return ImageFont.truetype(f"{fonts_dir}/{name}", max(8, int(size)))

    cat_hex = CAT_COLOURS.get(item["category"], "#5a6b7f")
    cat_rgb = tuple(int(cat_hex[i:i + 2], 16) for i in (1, 3, 5))
    img = Image.new("RGB", (W, H), (13, 15, 20))
    dr = ImageDraw.Draw(img, "RGBA")
    for yy in range(H):
        t = yy / H
        dr.line([(0, yy), (W, yy)],
                fill=(int(21 + (13 - 21) * t), int(25 + (15 - 25) * t),
                      int(35 + (20 - 35) * t)))
    dr.rectangle([0, 0, W, 12], fill=cat_rgb)
    pad = int(72 * k)
    mw = W - 2 * pad
    gold = (212, 175, 106)
    head_c = (255, 255, 255)
    body_c = (195, 204, 217)
    foot_c = (143, 160, 181)
    foot_y = H - int(92 * k)

    def wrap(text, fnt, width):
        lines, cur = [], ""
        for word in str(text).split():
            trial = (cur + " " + word).strip()
            if dr.textlength(trial, font=fnt) > width and cur:
                lines.append(cur)
                cur = word
            else:
                cur = trial
        if cur:
            lines.append(cur)
        return lines

    def cap_lines(lines, fnt, width, max_lines):
        if len(lines) <= max_lines:
            return lines
        kept = lines[:max_lines]
        last = kept[-1]
        while last and dr.textlength(last + "…", font=fnt) > width:
            last = last.rsplit(" ", 1)[0] if " " in last else last[:-1]
        kept[-1] = last + "…"
        return kept

    date_line = f"{fmt_date(ed['date'])} · {edition_time(ed)} IST"
    first = first_sentence(item["summary"])

    def layout(hf, bf):
        hfnt = font("DejaVuSerif-Bold.ttf", hf * k)
        bfnt = font("DejaVuSans.ttf", bf * k)
        wfnt = font("DejaVuSans.ttf", (bf - 3) * k)
        head = wrap(item["headline"], hfnt, mw)
        body = cap_lines(wrap(first, bfnt, mw), bfnt, mw, 2)
        why = cap_lines(wrap(item["why"], wfnt, mw - int(36 * k)),
                        wfnt, mw - int(36 * k), 2)
        why_h = (int(44 * k) + len(why) * int((bf - 3) * 1.3 * k) +
                 int(14 * k))
        y = int(30 * k)
        y += int(40 * k) + int(22 * k)
        y += int(40 * k)
        head_y = y
        y += len(head) * int(hf * 1.18 * k) + int(16 * k)
        body_y = y
        y += len(body) * int(bf * 1.3 * k) + int(14 * k)
        why_y = y
        y += why_h + int(18 * k)
        src_y = y
        y += int(30 * k)
        return (hfnt, bfnt, wfnt, head, body, why, why_h, head_y, body_y,
                why_y, src_y, y)

    hf, bf = 46, 25
    lay = layout(hf, bf)
    while lay[-1] > foot_y - int(10 * k) and hf > 26:
        hf -= 2
        bf -= 1
        lay = layout(hf, bf)
    (hfnt, bfnt, wfnt, head, body, why, why_h, head_y, body_y, why_y,
     src_y, _end) = lay

    y = int(30 * k)
    label = f"SIGNAL BRIEF · {item['category'].upper()}"
    lfnt = font("DejaVuSans-Bold.ttf", 24 * k)
    tw = dr.textlength(label, font=lfnt)
    pill_h = int(40 * k)
    dr.rounded_rectangle([pad, y, pad + tw + int(34 * k), y + pill_h],
                         radius=pill_h // 2, fill=cat_rgb)
    dr.text((pad + int(17 * k), y + pill_h / 2), label, font=lfnt,
            fill=(255, 255, 255), anchor="lm")
    y += pill_h + int(22 * k)
    dr.text((pad, y), date_line, font=font("DejaVuSans-Bold.ttf", 24 * k),
            fill=foot_c, anchor="la")
    y = head_y
    for line in head:
        dr.text((pad, y), line, font=hfnt, fill=head_c, anchor="la")
        y += int(hf * 1.18 * k)
    y = body_y
    for line in body:
        dr.text((pad, y), line, font=bfnt, fill=body_c, anchor="la")
        y += int(bf * 1.3 * k)
    y = why_y
    dr.rounded_rectangle([pad, y, pad + mw, y + why_h],
                         radius=int(12 * k),
                         fill=cat_rgb + (40,),
                         outline=cat_rgb + (140,), width=max(1, int(1.5 * k)))
    wy = y + int(15 * k)
    dr.text((pad + int(18 * k), wy), "WHY IT MATTERS",
            font=font("DejaVuSans-Bold.ttf", 20 * k), fill=gold, anchor="la")
    wy += int(29 * k)
    for line in why:
        dr.text((pad + int(18 * k), wy), line, font=wfnt, fill=body_c,
                anchor="la")
        wy += int((bf - 3) * 1.3 * k)
    dr.text((pad, src_y), f"Source: {item['sources'][0]['label']}",
            font=font("DejaVuSans-Bold.ttf", 23 * k), fill=foot_c,
            anchor="la")
    dr.line([(pad, foot_y), (W - pad, foot_y)], fill=gold + (128,), width=2)
    dr.text((W / 2, H - int(44 * k)), "THE SIGNAL · free learning",
            font=font("DejaVuSans-Bold.ttf", 25 * k), fill=foot_c,
            anchor="mm")
    bx, by, br = W - pad - int(30 * k), H - int(44 * k), int(28 * k)
    dr.ellipse([bx - br, by - br, bx + br, by + br], outline=gold, width=3)
    dr.text((bx, by), "TRT", font=font("DejaVuSerif-Bold.ttf", 21 * k),
            fill=gold, anchor="mm")
    img.save(out_path, "PNG")


STORY_CSS = """
  main { max-width:760px; margin:0 auto; padding:26px 18px 10px; }
  .story-pill { display:inline-block; color:#fff; border-radius:999px; padding:4px 13px; font-size:.75rem; font-weight:700; letter-spacing:.04em; }
  .story-dates { color:var(--muted); font-size:.85rem; margin:10px 0 0; }
  h1 { font-family: Georgia, 'Times New Roman', serif; font-weight:normal; font-size:2rem; line-height:1.3; margin:.35em 0 .4em; }
  .story-sum { line-height:1.7; font-size:1.02rem; }
  .story-why { border-radius:10px; padding:12px 14px; line-height:1.6; margin:16px 0; }
  .story-why .story-why-label { display:block; font-size:.68rem; font-weight:800; letter-spacing:.16em; margin-bottom:4px; }
  .story-why p { margin:0; }
  .story-srcs { list-style:none; padding:0; margin:6px 0 18px; display:flex; flex-direction:column; gap:7px; }
  .story-srcs a { color:#0b5cad; }
  .story-actions { display:flex; align-items:center; gap:14px; flex-wrap:wrap; margin:20px 0 6px; }
  .story-edition { display:inline-block; margin-top:14px; border:1px solid var(--gold); border-radius:999px; padding:8px 16px; color:var(--ink); text-decoration:none; background:var(--card); font-size:.88rem; font-weight:600; }
"""


def tint(hex_colour, alpha_pct):
    n = int(hex_colour[1:], 16)
    return (f"rgba({(n >> 16) & 255},{(n >> 8) & 255},{n & 255},"
            f"{alpha_pct / 100:.2f})")


def _lum(rgb):
    def f(c):
        c = c / 255
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2])


def _ratio(a, b):
    la, lb = _lum(a), _lum(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)


def label_shades(hex_colour):
    """WHY label shades that clear 4.6:1 on the category tint: darkened
    for light cards, lightened for dark cards (the pure colour falls
    under 4.5:1 for Cybersecurity and Industry)."""
    c = tuple(int(hex_colour[i:i + 2], 16) for i in (1, 3, 5))
    light_bg = tuple(round(v * 0.12 + 255 * 0.88) for v in c)
    dark_bg = tuple(round(c[i] * 0.12 + (29, 32, 25)[i] * 0.88)
                    for i in range(3))
    out = c
    for _ in range(30):
        if _ratio(out, light_bg) >= 4.6:
            break
        out = tuple(round(v * 0.96) for v in out)
    light = "#%02x%02x%02x" % out
    out = c
    for _ in range(20):
        if _ratio(out, dark_bg) >= 4.6:
            break
        out = tuple(round(v + (255 - v) * 0.12) for v in out)
    dark = "#%02x%02x%02x" % out
    return light, dark


def build_story_page(item, ed, base):
    colour = CAT_COLOURS.get(item["category"], "#5a6b7f")
    label_light, label_dark = label_shades(colour)
    url = f"{base}{story_path(ed, item)}"
    og = f"{base}{story_path(ed, item)}og.png"
    sources = "".join(
        f'<li><a href="{escape(s["url"])}" target="_blank" '
        f'rel="noopener">{escape(s["label"])}</a></li>'
        for s in item["sources"])
    spec = {
        "title": item["headline"],
        "line": first_sentence(item["summary"]),
        "link": url,
        "caption": "\n\n".join([
            item["headline"], item["summary"],
            "Why it matters: " + item["why"],
            "Source: " + item["sources"][0]["label"],
            "Read on Signal Brief, free:\n" + url,
            "#TheSignal " + {
                "AI": "#AI", "Quantum": "#QuantumComputing",
                "Cloud & DevOps": "#CloudComputing",
                "Cybersecurity": "#CyberSecurity",
                "Industry": "#TechIndustry",
                "Policy": "#TechPolicy"}.get(item["category"], "#AI")]),
        "image": {"kind": "static", "url": og,
                  "filename": f"signal-brief-{ed['date']}-{story_nn(item)}.png"},
    }
    spec_js = json.dumps(spec).replace("</", "<\\/")
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{escape(item['headline'])} · Signal Brief</title>
<meta name="description" content="{escape(item['summary'][:160])}">
<meta property="og:title" content="{escape(item['headline'])}">
<meta property="og:description" content="{escape(item['summary'][:200])}">
<meta property="og:type" content="article">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{og}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{escape(item['headline'])}">
<meta name="twitter:description" content="{escape(item['summary'][:200])}">
<meta name="twitter:image" content="{og}">
<link rel="canonical" href="{url}">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,800;1,9..144,500;1,9..144,600&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>{PAGE_CSS}{STORY_CSS}
  .story-why-label {{ color:{label_light}; }}
  :root[data-theme="dark"] .story-why-label {{ color:{label_dark}; }}
  @media (prefers-color-scheme: dark) {{ :root:not([data-theme="light"]) .story-why-label {{ color:{label_dark}; }} }}
</style>
{THEME_SCRIPT}
</head>
<body>
  <div class="brief-topbar"><a class="brief-back" href="{base}brief/"><small>← Back to</small>Signal Brief</a><button class="brief-theme" id="briefTheme" type="button" aria-label="Toggle dark mode">☾</button></div>
  <main>
    <span class="story-pill" style="background:{colour}">{escape(item['category'])}</span>
    <p class="story-dates">{escape(fmt_date(ed['date']))} · {escape(edition_time(ed))} IST · Source dated {escape(fmt_date_short(item['source_date']))}</p>
    <h1>{escape(item['headline'])}</h1>
    <p class="story-sum">{escape(item['summary'])}</p>
    <div class="story-why" style="background:{tint(colour, 12)}"><span class="story-why-label">WHY IT MATTERS FOR TECH</span><p>{escape(item['why'])}</p></div>
    <p class="bu-srcs-label" style="font-size:.7rem;font-weight:800;letter-spacing:.16em;color:var(--muted);text-transform:uppercase">Sources</p>
    <ul class="story-srcs">{sources}</ul>
    <div class="story-actions"><span id="storyShare"></span></div>
    <a class="story-edition" href="{base}#brief">Read the whole {escape(fmt_date(ed['date']))} edition in the Signal Brief tab →</a>
  </main>
  {FOOTER}
  <script src="{base}assets/signal-share.js"></script>
  <script>
    (function () {{
      var slot = document.getElementById("storyShare");
      if (slot && window.SignalShare) {{
        slot.appendChild(SignalShare.shareButton({spec_js}));
      }}
    }})();
  </script>
</body>
</html>
"""


def build_story_pages(data, base):
    count = 0
    for ed in data["editions"]:
        for item in ed["items"]:
            d = PAGE_DIR / ed["date"] / story_nn(item)
            d.mkdir(parents=True, exist_ok=True)
            (d / "index.html").write_text(
                build_story_page(item, ed, base), encoding="utf-8")
            render_og_image(item, ed, d / "og.png")
            count += 1
    print(f"story pages: {count}")
    return count


def update_sitemap(data, base):
    if not SITEMAP_FILE.exists():
        print("sitemap.xml not found, skipping")
        return
    text = SITEMAP_FILE.read_text(encoding="utf-8")
    latest = sorted(data["editions"], key=lambda e: e["date"],
                    reverse=True)[0]
    entries = [(f"{base}brief/", latest["date"])]
    for ed in data["editions"]:
        for item in ed["items"]:
            entries.append((f"{base}{story_path(ed, item)}", ed["date"]))
    added = 0
    for url, lastmod in entries:
        if f"<loc>{url}</loc>" in text:
            continue
        entry = (f"  <url><loc>{url}</loc>"
                 f"<lastmod>{lastmod}</lastmod></url>\n")
        text = text.replace("</urlset>", entry + "</urlset>")
        added += 1
    if added:
        SITEMAP_FILE.write_text(text, encoding="utf-8")
    print(f"sitemap: {added} brief URLs added")


def update_home(data, base):
    """Refresh the homepage Signal Brief room between its markers.
    The room's cards open the Signal Brief tab (data-goto="brief");
    story cards also carry the item id so the tab opens that story."""
    html = HOME_FILE.read_text(encoding="utf-8")
    start_marker, end_marker = "<!--BRIEF-LATEST-->", "<!--/BRIEF-LATEST-->"
    if start_marker not in html:
        print("homepage: BRIEF-LATEST markers not found, skipping")
        return
    latest = sorted(data["editions"], key=lambda e: e["date"], reverse=True)[0]
    cards = []
    cards.append(
        f'<section class="hm-ritem" data-goto="brief"><span class="hm-ghost">1</span>'
        f'<p class="hm-meta">Signal Brief · Latest edition</p>'
        f'<h4>{escape(fmt_date(latest["date"]))}: {len(latest["items"])} items</h4>'
        f'<p>The day in technology, in our own words, every claim linked to its source. '
        f'New edition daily at 07:00 IST.</p>'
        f'<div class="hm-chips"><span class="hm-chip navy">Daily · 07:00 IST</span>'
        f'<span class="hm-chip">{len(latest["items"])} items</span></div></section>')
    for n, item in enumerate(latest["items"][:3], start=2):
        cards.append(
            f'<section class="hm-ritem" data-goto="brief" '
            f'data-brief-item="{item["id"]}">'
            f'<span class="hm-ghost">{n}</span>'
            f'<p class="hm-meta">Signal Brief · {escape(item["category"])}</p>'
            f'<h4>{escape(item["headline"])}</h4>'
            f'<p>{escape(item["why"])}</p>'
            f'<div class="hm-chips"><span class="hm-chip">Source · '
            f'{escape(item["sources"][0]["label"])}</span></div></section>')
    inner = "\n            ".join(cards)
    before, rest = html.split(start_marker, 1)
    _old, after = rest.split(end_marker, 1)
    HOME_FILE.write_text(before + start_marker + "\n            " + inner +
                         "\n            " + end_marker + after, encoding="utf-8")
    print(f"homepage: latest edition {latest['date']} injected")


def main():
    base = parse_args()
    data = json.loads(DATA_FILE.read_text(encoding="utf-8"))

    # Fact check gate: no item ships without at least one source link, a
    # summary and a why line. Company cap (Thillai, Nov 5, 2026): at most 2
    # items about the same company per edition, counted by the item's
    # "company" field. Policy gate (Thillai, Nov 5, 2026): a Policy item
    # may not contain predictive language unless it sits inside a direct,
    # attributed quote.
    PREDICTIVE = ["expected to", "will likely", "set to"]
    # Superlative gate (Thillai, Nov 5, 2026): a why line may not contain a
    # superlative or a first ("first", "largest", "biggest", "never",
    # "not seen") unless the item is flagged why_claim_sourced, which the
    # editor sets only when that exact claim appears in a linked source.
    SUPERLATIVES = re.compile(r"\b(first|largest|biggest|never)\b|not seen",
                              re.IGNORECASE)
    problems = []
    for ed in data["editions"]:
        if not (8 <= len(ed["items"]) <= 12) and not ed.get("breaking"):
            problems.append(f"edition {ed['date']} has {len(ed['items'])} items (needs 8 to 12)")
        counts = Counter(i.get("company") for i in ed["items"] if i.get("company"))
        for company, n in counts.items():
            if n > 2:
                problems.append(f"edition {ed['date']}: {n} items about {company} (cap is 2)")
        for item in ed["items"]:
            if not item.get("sources"):
                problems.append(f"{item['id']}: no sources, dropped by the gate")
            if not item.get("summary") or not item.get("why"):
                problems.append(f"{item['id']}: missing summary or why line")
            if item["category"] == "Policy":
                text = " ".join([item.get("headline", ""), item.get("summary", ""),
                                 item.get("why", "")])
                unquoted = re.sub(r"[\"“”][^\"“”]*[\"“”]", " ", text)
                unquoted = re.sub(r"'[^']*'", " ", unquoted)
                for phrase in PREDICTIVE:
                    if phrase in unquoted.lower():
                        problems.append(
                            f"{item['id']}: predictive language '{phrase}' in a Policy item "
                            "outside a direct quote, rejected by the gate")
            if not item.get("company"):
                problems.append(f"{item['id']}: missing company field")
            m = SUPERLATIVES.search(item.get("why", ""))
            if m and not item.get("why_claim_sourced"):
                problems.append(
                    f"{item['id']}: superlative '{m.group(0)}' in the why line is not "
                    "flagged as sourced (why_claim_sourced), rejected by the gate")
    if problems:
        for p in problems:
            print(f"GATE: {p}")
        sys.exit(1)

    all_items = []
    for ed in sorted(data["editions"], key=lambda e: e["date"], reverse=True):
        for item in ed["items"]:
            all_items.append((item, ed))

    (ROOT / "signal.xml").write_text(
        build_feed(all_items, base, "Signal Brief · The Signal",
                   "signal.xml", "signal.xml"), encoding="utf-8")
    print(f"signal.xml: {len(all_items)} items")

    cat_by_label = {c["label"]: c for c in data["categories"]}
    for label, cat in cat_by_label.items():
        items = [(i, e) for i, e in all_items if i["category"] == label]
        path = ROOT / cat["file"]
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(build_feed(items, base, f"Signal Brief · {label}",
                                   cat["file"], cat["file"]), encoding="utf-8")
        print(f"{cat['file']}: {len(items)} items")

    PAGE_DIR.mkdir(exist_ok=True)
    (PAGE_DIR / "index.html").write_text(build_page(data, base), encoding="utf-8")
    print("brief/index.html written")
    build_story_pages(data, base)
    urls = [f"{base}brief/", f"{base}signal.xml"]
    for ed in data["editions"]:
        for item in ed["items"]:
            urls.append(f"{base}{story_path(ed, item)}")
    (PAGE_DIR / "story-urls.txt").write_text(
        "\n".join(urls) + "\n", encoding="utf-8")
    print(f"story-urls.txt: {len(urls)} URLs")
    update_sitemap(data, base)
    update_home(data, base)


if __name__ == "__main__":
    main()
