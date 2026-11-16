# The Signal Weekly Update: format spec

The weekly email that replaces the old LinkedIn newsletter. Sent
every Friday through Kit. This file is the format contract: the
Friday job (drafted, not yet enabled) builds each issue from the
week's site data to exactly this shape.

## Cadence and subject

- One issue every Friday, covering the week just ended.
- The subject line names 2 to 3 real highlights from the issue.
  Never a generic subject and never "Weekly update #N".

## Structure

1. **Opening.** 2 to 3 sentences on the week's big picture, in
   plain language.
2. **This week in Quantum & AI.** 3 to 5 top stories drawn from
   Signal Brief and Breaking. Each story: a short heading, 2 to 3
   sentences on what happened and why it matters, a plain text
   source line directly under the story in the form
   "Source: <organisation>" naming the primary source organisation
   from the story's Brief or Breaking item (never a link), then
   ONE link phrased as an invitation to the matching learning page.
3. **New on The Signal this week.** Everything new or changed on
   the site in the last 7 days: deck topics, explainers, periodic
   table terms, podcast episodes, research articles, games. Each
   item: a heading, 1 to 2 sentences, ONE link.
4. **Closing.** 1 to 2 friendly lines, signed "The Signal team",
   with the line "Learn. Share. Grow Together."
5. **Footer.** A line explaining why the reader receives the email,
   plus the unsubscribe link Kit adds.

## Rules

- 5 to 8 items in total across the two sections; about 3 minutes
  to read.
- Brand voice is "we". Warm, clear English.
- Facts only, no hype. Every story is traceable to a Signal Brief
  edition, a Breaking item, or a page change on the site.
- Maximum ONE link per item. The source line is plain text and
  does not count as the item's link.
- HTML and plain text versions. No PDF, no attachments.
- Mobile friendly, the site's light colours, Instrument Serif
  headings, Inter body text.

## Signup and sending

- Signup forms on the site (homepage subscribe block, topic hub
  sidebars) post directly to the Kit form endpoint. The Kit form ID
  is the single config value `KIT_FORM_ID` in `assets/signup.js`;
  while it is empty the forms show "Weekly update starting soon"
  and cannot submit. No API key or secret ever appears in this
  repository or in page code.
- Sending uses the Kit API from the Friday job's secret
  environment. The broadcast content must carry Kit's unsubscribe
  and address merge tags.
- Each issue is also published on the site under `weekly/<date>/`
  with an index at `weekly/`, carrying the global top bar and the
  standard footer.
