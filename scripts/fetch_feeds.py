#!/usr/bin/env python3
"""
Pulls every feed listed in feeds.json, merges new items into data/articles.json,
and keeps the 10 most recent articles per source (no time cutoff; wire rebuild,
Thillai, Nov 5, 2026). Stored articles whose source is no longer listed in
feeds.json are dropped, so removing a source removes its items from the wire.
Podcast episodes are exempt from that cap and are never dropped: a podcast
series is a fixed catalogue, and capping its single source at 50 silently cut
the 10 earliest Tech Learning episodes on Nov 2, 2026 (Thillai's fix,
Nov 3, 2026).

Weekly source health check (Thillai, Nov 5, 2026): every run records how
many posts each non podcast source's feed returned from the last 7 days.
The threshold is at least 2 posts a week for AI, Cybersecurity and Cloud &
DevOps, and at least 1 a week for Quantum. When a new ISO week starts, the
finished week is judged on its final recorded count; a source below its
threshold for 2 judged weeks in a row is removed automatically: it is taken
out of feeds.json, its stored items are dropped, and the removal is
recorded in data/wire-health.json for the Saturday quality report. Podcast
sources are exempt from the health check.

Podcast feeds additionally carry an audio_url and duration, extracted from
the RSS <enclosure> tag, so the site can show an inline player. If a podcast
entry has no standalone <link> (common for podcast feeds), the audio URL
itself is used as the link.
Also writes feed.xml.

Usage: python3 scripts/fetch_feeds.py
"""
import json
import hashlib
import re
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from pathlib import Path
from email.utils import parsedate_to_datetime, format_datetime
from xml.sax.saxutils import escape

import feedparser

ROOT = Path(__file__).resolve().parent.parent
FEEDS_FILE = ROOT / "feeds.json"
DATA_FILE = ROOT / "data" / "articles.json"
HEALTH_FILE = ROOT / "data" / "wire-health.json"
RSS_FILE = ROOT / "feed.xml"
SITE_URL = "https://thillairaj.github.io/The-Signal-AI-Quantum/"
MAX_PER_SOURCE = 10
RSS_ITEM_LIMIT = 60

# Weekly health thresholds: minimum posts in the trailing 7 days.
HEALTH_THRESHOLDS = {"Quantum": 1}
HEALTH_DEFAULT_THRESHOLD = 2

AGENT_KEYWORDS = re.compile(
    r"\b(agent|agentic|multi-agent|multiagent|tool.?use|tool.?calling|"
    r"autonomous|orchestrat|llm agent|reasoning agent|agent harness|"
    r"agent workflow|agent framework)\w*",
    re.IGNORECASE,
)

QUANTUM_KEYWORDS = re.compile(
    r"\b(quantum comput|qubit|quantum algorithm|quantum circuit|"
    r"quantum error correction|quantum hardware|quantum advantage|"
    r"quantum supremacy|quantum processor|quantum chip|quantum software|"
    r"quantum gate|quantum annealing)\w*",
    re.IGNORECASE,
)


def clean_html(raw: str) -> str:
    if not raw:
        return ""
    text = re.sub(r"<[^>]+>", " ", raw)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:280]


def parse_date(entry) -> str:
    for key in ("published", "updated"):
        value = entry.get(key)
        if value:
            try:
                dt = parsedate_to_datetime(value)
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                return dt.astimezone(timezone.utc).isoformat()
            except (TypeError, ValueError):
                pass
    return datetime.now(timezone.utc).isoformat()


def article_id(link: str) -> str:
    return hashlib.sha1(link.encode("utf-8")).hexdigest()[:16]


def load_existing() -> dict:
    if DATA_FILE.exists():
        existing = json.loads(DATA_FILE.read_text())
        return {a["id"]: a for a in existing.get("articles", [])}
    return {}


def is_relevant(source: str, category: str, title: str, summary: str) -> bool:
    if not source.lower().startswith("arxiv"):
        return True
    pattern = QUANTUM_KEYWORDS if category == "Quantum" else AGENT_KEYWORDS
    return bool(pattern.search(title) or pattern.search(summary))


def extract_audio(entry):
    """Return (audio_url, duration) if this entry has a podcast audio enclosure."""
    audio_url = None
    for enc in entry.get("enclosures", []) or []:
        href = enc.get("href") or enc.get("url")
        enc_type = enc.get("type", "")
        if href and ("audio" in enc_type or href.lower().endswith((".mp3", ".m4a", ".wav"))):
            audio_url = href
            break
    duration = entry.get("itunes_duration", "") or ""
    return audio_url, duration


def entry_datetime(entry):
    """Best effort publication datetime for a feed entry, or None."""
    for key in ("published_parsed", "updated_parsed"):
        st = entry.get(key)
        if st:
            try:
                return datetime(*st[:6], tzinfo=timezone.utc)
            except (TypeError, ValueError):
                pass
    for key in ("published", "updated"):
        value = entry.get(key)
        if value:
            try:
                dt = parsedate_to_datetime(value)
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                return dt.astimezone(timezone.utc)
            except (TypeError, ValueError):
                pass
    return None


def update_health(feeds, feed_stats):
    """Weekly health check. Returns the set of source names auto removed.

    feed_stats maps source name to the count of feed entries published in
    the trailing 7 days, recorded on every run. When the ISO week rolls
    over, the finished week is judged once on its final recorded count.
    Two below threshold judged weeks in a row removes the source from
    feeds.json and records the removal in data/wire-health.json.
    """
    now = datetime.now(timezone.utc)
    iso = now.isocalendar()
    week_key = f"{iso.year}-W{iso.week:02d}"
    if HEALTH_FILE.exists():
        try:
            health = json.loads(HEALTH_FILE.read_text())
        except (ValueError, OSError):
            health = {}
    else:
        health = {}
    sources_state = health.setdefault("sources", {})
    removals = health.setdefault("removals", [])
    removed = set()

    for feed in feeds:
        source = feed["source"]
        category = feed.get("category", "AI")
        if category == "Podcast":
            continue
        threshold = HEALTH_THRESHOLDS.get(category, HEALTH_DEFAULT_THRESHOLD)
        count7 = feed_stats.get(source, 0)
        state = sources_state.setdefault(source, {"below_streak": 0})
        prev_week = state.get("current_week")
        if prev_week and prev_week != week_key and state.get("last_judged_week") != prev_week:
            judged = int(state.get("current_count_7d", 0))
            if judged < threshold:
                state["below_streak"] = int(state.get("below_streak", 0)) + 1
            else:
                state["below_streak"] = 0
            state["last_judged_week"] = prev_week
            state["last_judged_count_7d"] = judged
            if state["below_streak"] >= 2:
                removed.add(source)
                removals.append({
                    "source": source,
                    "category": category,
                    "removed_at": now.isoformat(),
                    "reason": (f"Below threshold ({threshold} post(s) a week for "
                               f"{category}) for 2 weeks in a row; judged weeks "
                               f"ended with {judged} post(s) in the trailing "
                               f"7 days."),
                })
                print(f"  [REMOVED] {source}: below its weekly threshold for "
                      f"2 weeks in a row; removed from feeds.json")
        state.update({
            "category": category,
            "threshold_per_week": threshold,
            "current_week": week_key,
            "current_count_7d": count7,
            "below_threshold_now": count7 < threshold,
            "last_checked": now.isoformat(),
        })

    if removed:
        feeds[:] = [f for f in feeds if f["source"] not in removed]
        FEEDS_FILE.write_text(json.dumps(feeds, indent=2) + "\n")
        for source in removed:
            sources_state.pop(source, None)

    health["updated_at"] = now.isoformat()
    HEALTH_FILE.parent.mkdir(exist_ok=True)
    HEALTH_FILE.write_text(json.dumps(health, indent=2))
    return removed


def build_rss(articles) -> str:
    # Podcasts live in the Podcast tab only (Thillai, Oct 21 2026) — the RSS
    # file carries wire stories, not episodes, to avoid double entries.
    articles = [a for a in articles if a.get("category") != "Podcast"]
    items = []
    for a in articles[:RSS_ITEM_LIMIT]:
        try:
            pub_dt = datetime.fromisoformat(a["published"])
        except ValueError:
            pub_dt = datetime.now(timezone.utc)
        items.append(f"""    <item>
      <title>{escape(a['title'])}</title>
      <link>{escape(a['link'])}</link>
      <guid isPermaLink="false">{a['id']}</guid>
      <description>{escape(a['summary'])}</description>
      <category>{escape(a['source'])}</category>
      <pubDate>{format_datetime(pub_dt)}</pubDate>
    </item>""")
    items_xml = "\n".join(items)
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>The Signal</title>
    <link>{SITE_URL}</link>
    <description>A self-updating feed of AI, quantum computing, cybersecurity, cloud and DevOps, and podcast updates.</description>
    <lastBuildDate>{format_datetime(datetime.now(timezone.utc))}</lastBuildDate>
{items_xml}
  </channel>
</rss>
"""


def main():
    feeds = json.loads(FEEDS_FILE.read_text())
    by_id = load_existing()
    listed_sources = {f["source"] for f in feeds}
    dropped_unlisted = 0
    for aid in [aid for aid, a in by_id.items() if a.get("source") not in listed_sources]:
        del by_id[aid]
        dropped_unlisted += 1
    if dropped_unlisted:
        print(f"Dropped {dropped_unlisted} stored item(s) from sources no "
              f"longer listed in feeds.json")
    added, skipped_offtopic, skipped_no_link, seen_sources = 0, 0, 0, []
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    feed_stats = {}

    print("--- Per-source diagnostic ---")
    for feed in feeds:
        source = feed["source"]
        url = feed["url"]
        category = feed.get("category", "AI")
        parsed = feedparser.parse(url)
        feed_stats[source] = sum(
            1 for e in parsed.entries
            if (entry_datetime(e) or datetime.min.replace(tzinfo=timezone.utc)) >= week_ago)

        if parsed.bozo and not parsed.entries:
            print(f"  [FAILED] {source}: could not parse feed ({parsed.bozo_exception})")
            continue

        entry_count = len(parsed.entries)
        if entry_count == 0:
            print(f"  [EMPTY]  {source}: feed loaded fine but returned 0 entries")
        else:
            print(f"  [OK]     {source}: {entry_count} entries returned")

        seen_sources.append(source)
        for entry in parsed.entries:
            audio_url, duration = extract_audio(entry)

            # Podcast feeds often have no standalone <link> - fall back to the
            # audio file's own URL so the episode isn't silently dropped.
            link = entry.get("link", "").strip() or (audio_url or "")
            title = entry.get("title", "").strip()
            if not link or not title:
                skipped_no_link += 1
                continue

            aid = article_id(link)
            if aid in by_id:
                continue

            summary = clean_html(entry.get("summary", ""))
            if not is_relevant(source, category, title, summary):
                skipped_offtopic += 1
                continue

            by_id[aid] = {
                "id": aid,
                "title": title,
                "link": link,
                "source": source,
                "category": category,
                "summary": summary,
                "published": parse_date(entry),
                "audio_url": audio_url,
                "duration": duration,
            }
            added += 1
    print("--- End diagnostic ---")

    removed_sources = update_health(feeds, feed_stats)
    if removed_sources:
        for aid in [aid for aid, a in by_id.items()
                    if a.get("source") in removed_sources]:
            del by_id[aid]

    by_source = defaultdict(list)
    for a in by_id.values():
        by_source[a["source"]].append(a)

    final = []
    for source_articles in by_source.values():
        source_articles.sort(key=lambda a: a["published"], reverse=True)
        episodes = [a for a in source_articles if a.get("category") == "Podcast"]
        stories = [a for a in source_articles if a.get("category") != "Podcast"]
        final.extend(episodes)
        final.extend(stories[:MAX_PER_SOURCE])

    articles = sorted(final, key=lambda a: a["published"], reverse=True)

    DATA_FILE.parent.mkdir(exist_ok=True)
    DATA_FILE.write_text(json.dumps({
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "sources_polled": seen_sources,
        "articles": articles,
    }, indent=2))

    RSS_FILE.write_text(build_rss(articles), encoding="utf-8")

    print(f"Polled {len(seen_sources)}/{len(feeds)} feeds, added {added} new item(s) "
          f"(skipped {skipped_offtopic} off-topic, {skipped_no_link} with no usable link), "
          f"kept up to {MAX_PER_SOURCE} stories per source (podcast episodes uncapped), "
          f"{len(articles)} total stored, feed.xml written.")


if __name__ == "__main__":
    main()