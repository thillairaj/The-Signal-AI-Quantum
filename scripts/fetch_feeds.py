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
Thresholds are set by source type (Thillai, Nov 5, 2026): official company
and lab sources need at least 1 post a week; news sites need at least 2 a
week, except Quantum news sites, which need at least 1 a week. When a new
ISO week starts, the finished week is judged on its final recorded count;
a source below its threshold for 2 judged weeks in a row is removed
automatically: it is taken out of feeds.json, its stored items are
dropped, and the removal is recorded in data/wire-health.json for the
Saturday quality report. Podcast sources are exempt from the health check.

Podcast feeds additionally carry an audio_url and duration, extracted from
the RSS <enclosure> tag, so the site can show an inline player. If a podcast
entry has no standalone <link> (common for podcast feeds), the audio URL
itself is used as the link.
Also writes feed.xml.

Local podcast fallback (Thillai, Nov 23, 2026): the muse.ai podcast feeds
are unreachable from this runtime (proxy 403), so a podcast series whose
feed returns no entries is rebuilt from the local podcast-helper manifest
instead — see local_podcast_items below. Only manifest entries carrying an
episode_url (i.e. actually published) are used.

Usage: python3 scripts/fetch_feeds.py
"""
import json
import hashlib
import os
import re
import subprocess
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
SITE_URL = "https://signal.luzovi.com/"
MAX_PER_SOURCE = 10
RSS_ITEM_LIMIT = 60

# Local fallback for the muse.ai podcast feeds (Thillai, Nov 23, 2026):
# the egress proxy blocks muse.ai from this runtime (403 "Tunnel
# connection failed" on every poll since Nov 15, 2026), which froze
# The Signal's podcast catalogue at Daily AI Episode 45 / Quantum
# Episode 4 while the podcasts kept publishing. The podcast-helper
# manifest is the local source of truth for published episodes: an
# entry counts as published only when it carries an episode_url
# (unpublished drafts and duplicate generations have none, so they
# are never picked up). Fields map one to one onto the stored item
# shape: episode_url is both link and audio_url (the id is the same
# sha1 of the link), created_at is published, duration_secs is the
# duration, and an empty description becomes "AI Generated", the
# same placeholder the RSS feed itself carries for those episodes.
PODCAST_HELPER = os.environ.get(
    "SIGNAL_PODCAST_HELPER",
    "/opt/muse/skills/generate_podcast/scripts/podcast-helper")
_manifest_cache = None


def local_podcast_items(feed):
    """Stored-shape items for one podcast series, from the local manifest.

    Returns a list of article dicts, or None if the manifest cannot be
    read (the caller then treats the source as failed, as before)."""
    global _manifest_cache
    if _manifest_cache is None:
        try:
            raw = subprocess.run([PODCAST_HELPER, "manifest", "read"],
                                 capture_output=True, timeout=180)
            _manifest_cache = json.loads(raw.stdout.decode("utf-8"))
        except Exception as exc:  # noqa: BLE001 - any helper failure
            print(f"  [FAILED] {feed['source']}: local manifest fallback "
                  f"unavailable ({exc})")
            _manifest_cache = False
    if not _manifest_cache:
        return None
    items = []
    for ep in _manifest_cache.get("episodes", []):
        if ep.get("feed_url") != feed["url"] or not ep.get("episode_url"):
            continue
        link = ep["episode_url"]
        items.append({
            "id": article_id(link),
            "title": (ep.get("title") or "").strip(),
            "link": link,
            "source": feed["source"],
            "category": feed.get("category", "Podcast"),
            "summary": clean_html(ep.get("description", "")) or "AI Generated",
            "published": ep.get("created_at") or datetime.now(timezone.utc).isoformat(),
            "audio_url": link,
            "duration": str(ep.get("duration_secs") or ""),
        })
    return [i for i in items if i["title"]]

# Weekly health thresholds: minimum posts in the trailing 7 days, by
# source type (Thillai, Nov 5, 2026). Official company and lab sources:
# 1 a week. News sites: 2 a week, except Quantum news sites: 1 a week.
# Any non podcast source not listed here defaults to 2 a week.
HEALTH_THRESHOLDS = {
    "OpenAI Blog": 1,
    "Google AI Blog": 1,
    "Google DeepMind": 1,
    "Microsoft Research": 1,
    "Hugging Face Blog": 1,
    "NVIDIA Technical Blog": 1,
    "AWS Machine Learning Blog": 1,
    "AWS News Blog": 1,
    "Microsoft Security Blog": 1,
    "Google Cloud Blog": 1,
    "Azure Updates": 1,
    "The Quantum Insider": 1,
    "Quantum Computing Report": 1,
    "Phys.org Quantum Physics": 1,
    "ScienceDaily Quantum Computers": 1,
    # Widened pool (Nov 15, 2026; live Nov 17, 2026): official company,
    # status, regulator and government sources, 1 a week each.
    "NVIDIA Blog": 1,
    "NVIDIA Newsroom": 1,
    "IonQ News": 1,
    "CISA Advisories": 1,
    "Cloudflare Blog": 1,
    "Cloudflare Status": 1,
    "GitHub Status": 1,
    "Microsoft Blog": 1,
    "Meta Newsroom": 1,
    "Apple Newsroom": 1,
    "Salesforce Blog": 1,
    "European Commission Press Corner": 1,
    "GOV.UK DSIT": 1,
}
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


def parse_feed(url, source):
    """Parse one feed without letting a single bad feed crash the run.

    feedparser's urllib path truncates the European Commission Press
    Corner chunked response (http.client.IncompleteRead, ~2,159 bytes
    read; verified 17 Nov 2026, 2,198 bytes on retest), while curl
    fetches the same URL whole (7,397 bytes, 10 entries). So a failed
    direct parse is retried once through curl. If both fail, return an
    empty parse so the caller records the source as failed/empty and
    moves on instead of aborting the whole fetch (Thillai, Nov 17,
    2026: three 4-hourly refreshes failed this way, live wire stuck
    on the 03:30 IST data)."""
    try:
        return feedparser.parse(url)
    except Exception as exc:  # noqa: BLE001 - any transport/parse failure
        print(f"  [RETRY]  {source}: direct parse failed ({exc}); "
              f"retrying via curl")
    try:
        raw = subprocess.run(["curl", "-sS", "--max-time", "30", url],
                             capture_output=True, timeout=40)
        if raw.returncode == 0 and raw.stdout:
            return feedparser.parse(raw.stdout)
        print(f"  [FAILED] {source}: curl retry failed "
              f"(rc={raw.returncode})")
    except Exception as exc:  # noqa: BLE001
        print(f"  [FAILED] {source}: curl retry failed ({exc})")
    return feedparser.parse(b"")


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
        threshold = HEALTH_THRESHOLDS.get(source, HEALTH_DEFAULT_THRESHOLD)
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
                    "reason": (f"Below threshold ({threshold} post(s) a week) "
                               f"for 2 weeks in a row; judged weeks "
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
        parsed = parse_feed(url, source)
        feed_stats[source] = sum(
            1 for e in parsed.entries
            if (entry_datetime(e) or datetime.min.replace(tzinfo=timezone.utc)) >= week_ago)

        # Podcast series whose feed cannot be fetched (the muse.ai
        # proxy block) are rebuilt from the local manifest instead, so
        # new episodes keep reaching the site (Thillai, Nov 23, 2026).
        if category == "Podcast" and not parsed.entries:
            items = local_podcast_items(feed)
            if items is not None:
                new_here = 0
                for item in items:
                    if item["id"] not in by_id:
                        by_id[item["id"]] = item
                        added += 1
                        new_here += 1
                seen_sources.append(source)
                print(f"  [LOCAL]  {source}: feed unreachable; "
                      f"{len(items)} published episode(s) from the local "
                      f"manifest ({new_here} new)")
                continue

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