# Signal Brief: system notes (LIVE since Nov 5, 2026)

Status: LIVE on The Signal, approved by Thillai on Nov 5, 2026 after five
fixes to the preview editions (factual midterm item, Russia wording,
2 per company cap, IonQ primary source, predictive language gate). The
daily job is signal-brief-daily (07:00 IST); the Saturday quality check
carries the Signal Brief sampling as its check 7; IndexNow pings for the
brief page and signal.xml run inside the daily job.

## Card redesign (Nov 6, 2026, preview first, live on Thillai's approval)
Signal Brief is a card based tab, matching the approved
signal-brief-design.html:
- Homepage: "05 Signal Brief" top tab (after 04 RSS Feed) opening #brief,
  with a NEW badge for 14 days from Nov 6, 2026 (brief.js hides it after
  Nov 20, 2026). The room 05 card and its Read button open the tab; room
  story cards open the tab with that story's sheet open.
- One UI module, assets/brief.js + assets/brief.css, renders both the tab
  and the standalone /brief/ page from data/brief.json: header (kicker
  SIGNAL BRIEF · DAILY AT 07:00 IST, "Today in tech, in one swipe."),
  edition switcher with readable dates ("Fri, 6 Nov 2026", never ISO),
  category chips with colour dot and count (only categories present),
  story cards (category band, pill, date and time, 4 line clamped
  summary, WHY IT MATTERS box tinted in the category colour, counter,
  first source, Share), swipe carousel with dots and arrows on phones,
  3 column grid from 900px, Past editions list at the bottom.
- Category colours: AI #4F46E5, Quantum #7C3AED, Cloud & DevOps #0E7490,
  Cybersecurity #DC2626, Industry #B45309, Policy #0F766E.
- Tapping a card opens the story sheet (bottom sheet on phones, centred
  dialog on desktop): pill, edition date and time, source date, full
  summary, WHY IT MATTERS FOR TECH, all sources (new tab), Share section
  using the shared Share panel. News card image: category bar and pill,
  date, headline, first sentence, WHY box, source, footer "THE SIGNAL ·
  free learning" with the TRT badge, both sizes and all three themes,
  shrink to fit. Captions: full caption per the standing shape ending
  "#TheSignal" plus the category hashtag (AI #AI, Quantum
  #QuantumComputing, Cloud & DevOps #CloudComputing, Cybersecurity
  #CyberSecurity, Industry #TechIndustry, Policy #TechPolicy); X and
  WhatsApp use the shared short shapes, X within 280.
- Story pages: the builder generates one static page per story at
  /brief/<date>/<nn>/ with its own title, meta and og tags, og:image the
  story's rendered news card (Obsidian Gold, 1200x630, PIL), canonical,
  full story and sources, a Share button (static og image) and a link to
  that edition in the #brief tab. Story pages join sitemap.xml. RSS item
  links point at the story pages. The builder writes brief/story-urls.txt
  (brief page, signal.xml, every story page) for IndexNow.
- Follow: the raw XML buttons are gone. A Follow button opens a panel
  explaining news reader apps (Feedly, Inoreader) with a Copy link
  button for each of the 7 feeds. The feeds themselves are unchanged.
- At go live: the daily job's IndexNow step pings every URL in
  brief/story-urls.txt (not just the brief page and signal.xml), and the
  Saturday check gains the design checks below.

## Saturday design checks (added Nov 6, 2026, apply from go live)
The #brief tab opens from the tab bar and from #brief directly; every
edition shows readable dates (no ISO dates visible); every story has a
page at /brief/<date>/<nn>/ carrying og:title, og:description, og:image
and a self referencing canonical; a sampled card Share delivers the
story link and the matching category hashtag in its caption; no visible
link on the tab or the /brief/ page opens a raw XML feed.

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
- Superlatives in why lines (Thillai, Nov 5, 2026): a "Why it matters"
  line may not contain a superlative or a first ("first", "largest",
  "biggest", "never", "not seen") unless the claim appears in a linked
  source. The builder rejects such a why line unless the item carries
  "why_claim_sourced": true, which the editor sets only after checking
  the claim in the linked source itself. Every item must carry a company
  field so the company cap covers every item.

## Files
- data/brief.json: editorial source of truth (editions and items).
- assets/brief.js and assets/brief.css: the card UI for the tab and the
  /brief/ page. Hand written; edit directly.
- scripts/build_brief.py: builds signal.xml, signal/<category>.xml,
  brief/index.html, the story pages under brief/<date>/<nn>/ with their
  og.png cards, refreshes sitemap.xml and the homepage room between the
  BRIEF-LATEST markers, and writes brief/story-urls.txt. Run with
  --base-url for preview builds; the live default is the live site base.
- signal.xml and signal/*.xml: generated feeds. Do not hand edit.
- brief/index.html and brief/<date>/<nn>/: generated pages. Do not hand
  edit.

## Daily job (signal-brief-daily, created Nov 5, 2026)
Signal Brief daily, 07:00 IST:
1. Research the previous 24 hours from the validated wire feeds
   (feeds.json), official government and company pages, and Reuters or AP
   for geopolitical items with technology impact.
2. Draft 8 to 12 items across the six categories in data/brief.json
   format, original wording, every claim sourced; drop anything that
   cannot be sourced.
3. Run scripts/build_brief.py in the bot clone (jobs only ever use the
   bot clone, under the git safety rule of Nov 6, 2026: confirm the
   folder and remote, refuse if the clone holds unpushed commits or
   unexpected changes, reset to origin/main before editing, and pull
   with rebase before pushing), verify the feeds parse and the page
   renders, commit and push from the bot clone. Hand edits to the Brief
   system happen in the work clone instead.
4. Ping IndexNow for the brief page and signal.xml
   (scripts/indexnow_ping.py with those URLs). From the card redesign
   go live: ping every URL in brief/story-urls.txt instead, which adds
   the day's story pages.
5. Report in chat: edition date, item count by category, and any item
   dropped by the fact check gate.
Breaking items: on a major event, add a breaking edition, rebuild, push,
ping, and report the same way, without waiting for 07:00.

## Saturday quality check (check 7, added Nov 5, 2026)
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
