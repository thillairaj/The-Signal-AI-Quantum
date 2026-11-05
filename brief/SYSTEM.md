# Signal Brief: system notes (preview build, Nov 5, 2026)

Status: PREVIEW ONLY. Nothing here runs on the live site until Thillai
approves the preview. On approval: copy data/brief.json,
scripts/build_brief.py, signal.xml, signal/, brief/ and the homepage room
to the live repo, create the daily job below, add the Saturday section
below, and ping IndexNow for the brief page and feeds.

## Editorial rules (from the task, Nov 5, 2026)
- Six categories: AI, Quantum, Cloud & DevOps, Cybersecurity, Industry
  (major launches, funding, acquisitions, outages), Policy (government and
  geopolitical events that affect technology: visas for tech workers, chip
  export controls, sanctions, conflicts affecting chips, energy, supply
  chains or cyber threats).
- Daily edition at 07:00 IST with 8 to 12 items. A breaking item for major
  events may be published between editions: an edition object with
  "breaking": true and its own "published" timestamp in data/brief.json,
  rebuilt and pushed the same way.
- Each item: category tag, plain English headline, 2 to 3 sentence summary
  in original wording, one line "Why it matters for tech", official source
  link(s), full text in the RSS item (content:encoded) with publish date.
- Sources: only the validated wire sources plus official government and
  company pages; for geopolitical events, Reuters or AP as well. Never
  copy source text; always link.
- Policy rules: technology impact only; neutral and factual; official
  announcements and each side's official position where relevant; no
  opinions, predictions or partisan language; no conflict coverage without
  a clear technology impact.
- Fact check gate: every claim and number linked to a source. The builder
  refuses any item with no source link, no summary or no why line, and any
  non breaking edition outside 8 to 12 items. Any unsourced item is
  dropped before publication.
- Company cap (Thillai, Nov 5, 2026): at most 2 items about the same
  company per edition, counting items about the company (the item's
  "company" field), not the source that reported it. The builder enforces
  the cap.
- Primary sources (Thillai, Nov 5, 2026): Industry and Policy items must
  link the primary source (company press release, regulator or government
  page) alongside any news report, when a primary source exists.
- Predictive language (Thillai, Nov 5, 2026): Policy items may not
  contain predictive phrasing ("expected to", "will likely", "set to")
  unless it is a direct, attributed quote. The builder rejects a Policy
  item that breaks this rule. Policy items state specific, verifiable
  facts; broad generalisations and predictions are removed or the item is
  replaced.

## Files
- data/brief.json: editorial source of truth (editions and items).
- scripts/build_brief.py: builds signal.xml, signal/<category>.xml,
  brief/index.html, and refreshes the homepage room between the
  BRIEF-LATEST markers. Run with --base-url for preview builds; the live
  default is the live site base.
- signal.xml and signal/*.xml: generated feeds. Do not hand edit.
- brief/index.html: generated page. Do not hand edit.

## Daily job (to create at live publish, NOT created for the preview)
Signal Brief daily, 07:00 IST, in the main chat's ownership:
1. Research the previous 24 hours from the validated wire feeds
   (feeds.json), official government and company pages, and Reuters or AP
   for geopolitical items with technology impact.
2. Draft 8 to 12 items across the six categories in data/brief.json
   format, original wording, every claim sourced; drop anything that
   cannot be sourced.
3. Run scripts/build_brief.py in the work clone, verify the feeds parse
   and the page renders, commit and push from the work clone, sync the
   bot clone.
4. Ping IndexNow for the brief page and signal.xml
   (scripts/indexnow_ping.py with those URLs).
5. Report in chat: edition date, item count by category, and any item
   dropped by the fact check gate.
Breaking items: on a major event, add a breaking edition, rebuild, push,
ping, and report the same way, without waiting for 07:00.

## Saturday quality check (section to add at live publish)
Signal Brief: sample 10 items from the week's editions. For each, open
every source link and confirm the item's claims and numbers match the
source, the wording is the Brief's own (no copied source text), and
Policy items are neutral, factual and limited to technology impact.
Also check: no edition carried more than 2 items about one company;
Industry and Policy items link a primary source where one exists; no
Policy item uses predictive language outside a direct, attributed quote.
Report mismatches as Fix now items. Also confirm each edition that week
carried 8 to 12 items, every item had at least one working source link,
and the daily job ran each day.
