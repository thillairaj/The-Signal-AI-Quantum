# Breaking: system notes (built Nov 15, 2026; live Nov 17, 2026)

Status: LIVE on signal.luzovi.com since Nov 17,
2026, approved by Thillai. Built and reviewed on the preview site first.
The four hour job (signal-breaking-4h) runs the lane.

## Two separate products

- Signal Brief: the daily edition, published once a day at 07:00 IST by
  signal-brief-daily. Unchanged by this lane.
- Breaking: checked every four hours at 02:00, 06:00, 10:00, 14:00, 18:00
  and 22:00 IST. A check publishes only when a qualifying item exists. A
  check with nothing qualifying publishes nothing and is logged as
  checked, no breaking news.

## Data: data/breaking.json

Separate from page HTML. Three collections plus bookkeeping:

- `items`: published breaking items. Fields: `id`
  (breaking-YYYY-MM-DD-NN, numbered within the IST day), `slot` (ISO
  timestamp of the check slot, with the +05:30 offset), `published` (ISO
  timestamp), `category` (one of the six Brief categories: AI, Quantum,
  Cloud & DevOps, Cybersecurity, Industry, Policy), `company` (the company
  or subject the item is about), `headline` (factual, neutral), `what`
  (2 to 3 lines of facts, dates and numbers), `impact` (1 to 2 lines of
  technology impact), `sources` (list of {label, url}, official source
  preferred), `financial` (true for market sensitive items; the impact
  text of a financial item ends with the line "Not investment advice.").
- `review_queue`: sensitive items held for Thillai's approval, in the
  same shape plus `held_reason`, with `published` set to null. The queue
  is data only: no page or script renders it, ever.
- `slots`: one entry per check slot that has run: {date (IST), time,
  result: "published" with count, or "none"}.
- `updated`: ISO timestamp of the last write. `version`: schema version.

## What counts as breaking

Any significant event, worldwide, that directly or indirectly affects
technology, the tech industry or people who work in it:

- Tech incidents: major cloud or SaaS outages (AWS, Azure, Google Cloud,
  Cloudflare, GitHub and similar), large data breaches, big ransomware
  attacks. Security flaws qualify only under the security threshold
  below.
- Leadership: CEO or top level changes at major tech companies.
- Deals: mergers or acquisitions worth USD 1 billion or more, or that
  change a major tech market.
- Results: only market moving quarterly or yearly results (big surprise,
  forecast cut, layoffs announced with results) from major tech firms.
  Routine results are not breaking; they belong in normal news.
- Funding: rounds of USD 500 million or more.
- Layoffs or hiring freezes: 1,000 or more people, or 10 percent or more
  of staff, at a tech company.
- Major AI model or chip launches from top companies.
- Quantum milestones: major hardware, error correction or algorithm
  breakthroughs.
- Policy and law with technology impact: visa rules such as H-1B, AI
  laws, data rules, export controls, antitrust fines, major court
  rulings (India, US, EU, UK).
- Geopolitics, conflict, disasters, pandemics, energy shocks, major
  market crashes, undersea cable or satellite failures: only with a
  clear technology impact.
- Standards: official standards with technology impact, for example post
  quantum cryptography standards.

Every item must carry a clear technology impact line. If a clear impact
line cannot be written, the item is not breaking.

## Security threshold for Cybersecurity items

A Cybersecurity item qualifies as breaking ONLY if at least one of
these holds:

- a flaw with a CVSS score of 9.0 or higher;
- active exploitation confirmed (a CISA KEV listing, or the vendor
  confirming exploitation in the wild);
- a mass impact outage caused by a security incident.

Routine High rated patch releases do not qualify; they belong in
normal news. In `data/breaking.json`, every published Cybersecurity
item must carry a `qualifier` object recording the basis:
`{"basis": "cvss", "cvss": 9.8}`, `{"basis": "kev"}` or
`{"basis": "mass_outage"}`. check-breaking.js fails a published
Cybersecurity item without a valid basis. The future
`signal-breaking-4h` job draft inherits its thresholds from this
file, so this section is the single source for the rule.

## Verification and tone

- Publish only from an official source (company, government, regulator,
  status page), or when two trusted outlets (Reuters, AP, Bloomberg, FT
  or equivalent) agree. No rumours, no single unverified report.
- Neutral and factual. No opinions on politics or sides. No graphic
  details. No casualty numbers unless officially confirmed. No personal
  or gossip angles: confirmed facts and technology impact only. Where a
  story turns on a disputed claim, state what is confirmed and note the
  dispute without adopting a side.
- Financial items: facts only, plus the line "Not investment advice."

## Sensitive items: the review queue

Sensitive items (war, terror attacks, deaths, political events, and
nation state attributions under public dispute) never auto publish. The
job writes them to `review_queue` in data/breaking.json with a
`held_reason`, reports them to Thillai in chat, and publishes one only
after his explicit approval (on approval the item moves to `items` with
a published timestamp in the next slot, or immediately if he says so).

## Limits and lifecycle

- At most 5 published items per IST calendar day. If more qualify, keep
  the highest impact five.
- At most 2 items about the same company per four hour cycle, and at
  most 2 per company per day.
- The same story arriving from several sources is de duplicated into one
  item, carrying the best sources.
- A published item stays active (homepage strip and the top of the
  Breaking page) for 24 hours from its published time, then moves to the
  archive section of the Breaking page. Items are not deleted.
- Every slot is logged in `slots`, published or not.

## Diversity rules across the three news products

- Breaking: the per company caps above, plus category balance across
  the six categories when several items compete for the five daily
  slots.
- Live Wire: scripts/fetch_feeds.py caps each source at 10 stored items
  and the weekly health rule removes a source that falls below its
  threshold (1 post a week for official company, lab and status sources
  and for Quantum news sites; 2 a week for other news sites) for two
  judged weeks in a row. The widened feeds.json (Nov 15, 2026) reduces
  the old Google and AWS weight by adding company newsrooms, status
  feeds, CISA, quantum company news and government press feeds.
- Daily Brief: build_brief.py already enforces at most 2 items about
  the same company per edition; the brief job researches from the same
  widened pool, so the diversity fix reaches the Brief without a builder
  change.
- De duplication is shared: one story, one item, in whichever product
  carries it first; the other products link or summarise rather than
  repeat.

## Research sources for the breaking job

Primary pool: feeds.json (38 sources after the Nov 15, 2026 widening:
12 AI, 5 Quantum, 4 Cybersecurity, 7 Cloud & DevOps, 5 Industry,
2 Policy, 3 Podcast). Every source in feeds.json was fetched during the
build and showed an item within the previous 7 days.

Official sources verified during the build that are not RSS or Atom
feeds, so they are researched directly rather than listed in feeds.json:

- CISA Known Exploited Vulnerabilities catalog (JSON):
  https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json
  Fetched 15 Nov 2026: HTTP 200, newest entry dated 13 Nov 2026.
- Microsoft 365 Service Health (admin centre, incident records such as
  EX1550543 and MO1550821) and status.cloud.microsoft for outage
  confirmation.
- Company newsrooms and investor relations pages for the majors
  (NVIDIA Newsroom carried the 12 Nov 2026 CEO transition release).

Sources tried during the build that are not usable from this network
(full evidence in the build report): Reuters and AP direct feeds
(401 and connection failure), SEC EDGAR filing feeds and the EDGAR data
API (403, undeclared automated tool block), Oracle and Intel newsroom
feeds (403), IBM newsroom feeds (404), CERT-In RSS (JavaScript
challenge page), USCIS RSS (dead since 2015), India PIB RSS (items
carry no dates, so the weekly evidence test cannot be passed), MeitY
RSS (returns an HTML page), NIST news RSS (newest item 12 days old),
NVD legacy RSS (404) and the NVD API (503 bot challenge), AWS Service
Health RSS (newest item 60 days old), Azure Status RSS (channel empty
at fetch time), Google Cloud Status Atom (newest item 9 days old).

## Rendering

- assets/breaking.js + assets/breaking.css (both referenced with
  ?v=20261115) render everything from data/breaking.json.
- Homepage: a slim strip above the masthead, shown only while at least
  one item is active: red pulsing dot, the newest active headline, and
  a Read more link to the Breaking page. Hidden entirely otherwise.
- Breaking page (breaking/index.html): standard site chrome, today's
  six slot timeline (published, no news, next check, later), active
  items newest first with a distinct Tech impact box, then the archive.
  Visually separate from Signal Brief: no calendar, no Brief cards, a
  news wire look with a red accent.
- The standard footer step runs on the page as in the daily job. The
  the page is indexed normally and its URL is sent to IndexNow when an
  item publishes (preview URLs are never sent).

## Go live notes (done Nov 17, 2026, as specified here)

- Port feeds.json, data/breaking.json, assets/breaking.js,
  assets/breaking.css, breaking/ and the homepage strip wiring to the
  live repo; add HEALTH_THRESHOLDS entries in scripts/fetch_feeds.py
  for the 13 new sources (1 a week for official company, lab, status
  and Quantum sources; 2 a week for news sources) in the same change.
- Create the signal-breaking-4h job from the drafted body only after
  Thillai approves it.
- The wire category chips on the homepage cover AI, Quantum,
  Cybersecurity and Cloud & DevOps; the new Industry and Policy feeds
  surface under All and under the source filter until chips are added.
