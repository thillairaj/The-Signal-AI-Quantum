#!/usr/bin/env python3
"""Signal Brief builder.

Reads data/brief.json (the editorial source of truth: editions of items,
each item carrying its own source links) and generates:
  signal.xml                 the full Signal Brief RSS feed (all categories)
  signal/<category>.xml      one RSS feed per category (ai, quantum,
                             cloud-devops, cybersecurity, industry, policy)
  brief/index.html           the Signal Brief page (all editions, newest first)
  index.html                 the homepage Signal Brief room's latest edition
                             cards, between the BRIEF-LATEST markers

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

DEFAULT_BASE = "https://thillairaj.github.io/The-Signal-AI-Quantum/"
EDITION_TIME_UTC = timezone(timedelta(hours=1, minutes=30))  # 07:00 IST

CAT_COLOURS = {
    "AI": "#2f6fed",
    "Quantum": "#7c4dff",
    "Cloud & DevOps": "#2a9d8f",
    "Cybersecurity": "#d64560",
    "Industry": "#b8860b",
    "Policy": "#5a6b7f",
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
        link = f"{base}brief/#{item['id']}"
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


def item_card(item, ed):
    colour = CAT_COLOURS.get(item["category"], "#5a6b7f")
    sources = " · ".join(
        f'<a href="{escape(s["url"])}" target="_blank" rel="noopener">{escape(s["label"])}</a>'
        for s in item["sources"])
    breaking = ' <span class="brief-breaking">Breaking</span>' if ed.get("breaking") else ""
    return f"""      <article class="brief-item" id="{item['id']}">
        <p class="brief-meta"><span class="brief-tag" style="background:{colour}">{escape(item['category'])}</span><span class="brief-srcdate">Source dated {escape(item['source_date'])}</span>{breaking}</p>
        <h3>{escape(item['headline'])}</h3>
        <p>{escape(item['summary'])}</p>
        <p class="brief-why"><strong>Why it matters for tech:</strong> {escape(item['why'])}</p>
        <p class="brief-source">Source: {sources}</p>
      </article>"""


def build_page(data, base):
    editions = sorted(data["editions"], key=lambda e: e["date"], reverse=True)
    cat_links = "".join(
        f'<a class="brief-feedlink" href="{base}{c["file"]}">'
        f'{escape(c["label"])} feed</a>'
        for c in data["categories"])
    sections = []
    for ed in editions:
        cards = "\n".join(item_card(i, ed) for i in ed["items"])
        label = "Breaking update" if ed.get("breaking") else "Daily edition"
        sections.append(f"""    <section class="brief-edition">
      <h2>{escape(ed['date'])}</h2>
      <p class="brief-edmeta">{label} · {len(ed['items'])} items · Published 07:00 IST</p>
{cards}
    </section>""")
    editions_html = "\n".join(sections)
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Signal Brief · The Signal</title>
<meta name="description" content="Signal Brief: The Signal's own daily brief on AI, quantum, cloud and DevOps, cybersecurity, industry and policy. Original wording, every claim linked to its source.">
<link rel="alternate" type="application/rss+xml" title="Signal Brief" href="{base}signal.xml">
<style>
  :root {{ --ink:#171b24; --muted:#5a6270; --gold:#b8860b; --paper:#faf9f6; --card:#ffffff; --line:#e5dfce; }}
  * {{ box-sizing:border-box; }}
  body {{ margin:0; font-family: Georgia, 'Times New Roman', serif; background:var(--paper); color:var(--ink); }}
  .brief-hero {{ text-align:center; padding:56px 20px 30px; background:radial-gradient(ellipse at 50% 0%, #fffdf4 0%, var(--paper) 70%); border-bottom:3px solid var(--gold); position:relative; }}
  .brief-kicker {{ letter-spacing:.28em; font-size:.72rem; color:var(--gold); text-transform:uppercase; font-family: Arial, sans-serif; font-weight:bold; }}
  .brief-hero h1 {{ font-size:2.6rem; margin:.35em 0 .15em; font-weight:normal; }}
  .brief-hero h1 .thin {{ color:var(--gold); }}
  .brief-hero p {{ color:var(--muted); max-width:640px; margin:0 auto; line-height:1.55; }}
  .brief-topbar {{ position:sticky; top:0; z-index:10; background:var(--paper); border-bottom:1px solid var(--line); padding:10px 16px; display:flex; justify-content:center; }}
  .brief-back {{ font-family: Arial, sans-serif; font-size:.85rem; color:var(--ink); text-decoration:none; border:1px solid var(--line); background:var(--card); border-radius:10px; padding:8px 14px; line-height:1.3; text-align:left; }}
  .brief-back small {{ display:block; color:var(--muted); }}
  main {{ max-width:820px; margin:0 auto; padding:10px 18px 30px; }}
  .brief-feeds {{ display:flex; flex-wrap:wrap; gap:8px; justify-content:center; margin:22px 0 6px; }}
  .brief-feedlink {{ font-family: Arial, sans-serif; font-size:.78rem; color:var(--ink); border:1px solid var(--gold); border-radius:999px; padding:6px 12px; text-decoration:none; background:var(--card); }}
  .brief-rules {{ background:var(--card); border:1px solid var(--line); border-radius:12px; padding:16px 20px; margin:18px 0 8px; font-size:.92rem; line-height:1.55; color:var(--muted); }}
  .brief-rules strong {{ color:var(--ink); }}
  .brief-edition h2 {{ font-size:1.55rem; margin:34px 0 2px; font-weight:normal; }}
  .brief-edmeta {{ color:var(--muted); font-family: Arial, sans-serif; font-size:.8rem; margin:0 0 10px; }}
  .brief-item {{ background:var(--card); border:1px solid var(--line); border-radius:12px; padding:18px 20px; margin:14px 0; }}
  .brief-item h3 {{ margin:.3em 0 .45em; font-size:1.22rem; line-height:1.35; }}
  .brief-item p {{ line-height:1.6; margin:.45em 0; }}
  .brief-meta {{ display:flex; gap:10px; align-items:center; font-family: Arial, sans-serif; font-size:.75rem; }}
  .brief-tag {{ color:#fff; border-radius:999px; padding:3px 10px; font-weight:bold; }}
  .brief-srcdate {{ color:var(--muted); }}
  .brief-breaking {{ color:#b00020; font-weight:bold; letter-spacing:.08em; }}
  .brief-why {{ background:#fdf8ec; border-radius:8px; padding:10px 12px; }}
  .brief-source {{ font-family: Arial, sans-serif; font-size:.82rem; color:var(--muted); }}
  .brief-source a {{ color:#0b5cad; }}
  footer {{ text-align:center; padding:26px 16px 40px; color:var(--muted); font-size:.9rem; }}
  footer .rule {{ width:60px; height:3px; background:var(--gold); margin:0 auto 16px; }}
  .li-btn {{ display:inline-block; margin-left:8px; background:#0a66c2; color:#fff; text-decoration:none; border-radius:6px; padding:3px 10px; font-family: Arial, sans-serif; font-size:.8rem; }}
</style>
</head>
<body>
  <div class="brief-topbar"><a class="brief-back" href="{base}"><small>← Back to</small>The Signal</a></div>
  <header class="brief-hero">
    <p class="brief-kicker">The Signal · Daily at 07:00 IST</p>
    <h1>Signal <span class="thin">Brief</span></h1>
    <p>The day in technology, in our own words: AI, quantum, cloud and DevOps, cybersecurity, industry and policy. Every claim is linked to its source and checked before publication; source text is never copied.</p>
    <div class="brief-feeds"><a class="brief-feedlink" href="{base}signal.xml">Full feed (RSS)</a>{cat_links}</div>
  </header>
  <main>
    <div class="brief-rules"><strong>How Signal Brief is made:</strong> items are written from the validated wire sources, official government and company pages, and Reuters or AP for geopolitical events. Policy coverage is limited to events with a clear technology impact, is neutral and factual, and carries each side's official position where relevant. Any item whose claims cannot be linked to a source is dropped before publication.</div>
{editions_html}
  </main>
  <footer>
    <div class="rule"></div>
    <p>Curated by Thillai Raj Thanam Jeya Veera Raj <a class="li-btn" href="https://www.linkedin.com/in/thillairaj" target="_blank" rel="noopener">Follow on LinkedIn</a></p>
  </footer>
</body>
</html>
"""


def update_home(data, base):
    """Refresh the homepage Signal Brief room between its markers."""
    html = HOME_FILE.read_text(encoding="utf-8")
    start_marker, end_marker = "<!--BRIEF-LATEST-->", "<!--/BRIEF-LATEST-->"
    if start_marker not in html:
        print("homepage: BRIEF-LATEST markers not found, skipping")
        return
    latest = sorted(data["editions"], key=lambda e: e["date"], reverse=True)[0]
    cards = []
    cards.append(
        f'<section class="hm-ritem" data-ext="{base}brief/"><span class="hm-ghost">1</span>'
        f'<p class="hm-meta">Signal Brief · Latest edition</p>'
        f'<h4>{escape(latest["date"])}: {len(latest["items"])} items</h4>'
        f'<p>The day in technology, in our own words, every claim linked to its source. '
        f'New edition daily at 07:00 IST.</p>'
        f'<div class="hm-chips"><span class="hm-chip navy">Daily · 07:00 IST</span>'
        f'<span class="hm-chip">{len(latest["items"])} items</span></div></section>')
    for n, item in enumerate(latest["items"][:3], start=2):
        cards.append(
            f'<section class="hm-ritem" data-ext="{base}brief/#{item["id"]}">'
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
    update_home(data, base)


if __name__ == "__main__":
    main()
