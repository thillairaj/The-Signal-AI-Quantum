#!/usr/bin/env python3
"""Submit changed page URLs to IndexNow after a publish.

The key lives in a file at the site root named <key>.txt whose entire
content is the key (discovers it by shape: a 32 hex character stem whose
file content equals the stem). With URL arguments, submits those URLs.
With no arguments, derives the page URLs from the files changed in the
latest git commit (HTML pages only) and submits those.

Usage: python3 scripts/indexnow_ping.py [url ...]
Prints the IndexNow HTTP status; exits non-zero on failure.
"""
import json
import re
import subprocess
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE_URL = "https://thillairaj.github.io/The-Signal-AI-Quantum/"
HOST = "thillairaj.github.io"
ENDPOINT = "https://api.indexnow.org/indexnow"


def find_key():
    for f in sorted(ROOT.glob("*.txt")):
        if re.fullmatch(r"[0-9a-f]{32}", f.stem):
            if f.read_text().strip() == f.stem:
                return f.stem, f.name
    return None, None


def changed_urls():
    out = subprocess.run(
        ["git", "-C", str(ROOT), "show", "--name-only", "--format=", "HEAD"],
        capture_output=True, text=True, check=True).stdout
    urls = []
    for path in out.splitlines():
        path = path.strip()
        if not path.endswith(".html"):
            continue
        if path.startswith(("scripts/", "assets/")):
            continue
        if path == "index.html":
            urls.append(SITE_URL)
        elif path.endswith("/index.html"):
            urls.append(SITE_URL + path[: -len("index.html")])
        else:
            urls.append(SITE_URL + path)
    return sorted(set(urls))


def main():
    key, key_file = find_key()
    if not key:
        print("FAIL: no IndexNow key file found at the site root")
        return 1
    urls = sys.argv[1:] or changed_urls()
    if not urls:
        print("NOCHANGE: no page URLs to submit")
        return 0
    payload = {
        "host": HOST,
        "key": key,
        "keyLocation": SITE_URL + key_file,
        "urlList": urls[:10000],
    }
    req = urllib.request.Request(
        ENDPOINT,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            status = resp.status
    except urllib.error.HTTPError as e:
        status = e.code
    except Exception as e:
        print(f"FAIL: IndexNow submission error: {e}")
        return 1
    print(f"IndexNow: HTTP {status} for {len(urls)} URL(s)")
    return 0 if status in (200, 202) else 1


if __name__ == "__main__":
    sys.exit(main())
