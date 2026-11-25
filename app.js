const DATA_URL = "data/articles.json";
const AUDIO_PROXY = "https://signal-audio-proxy.raj-thillai.workers.dev/?u=";
const CLIENT_REFRESH_MS = 5 * 60 * 1000;
const TICK_MS = 30 * 1000;
const PAGE_SIZE = 10;
const BOOKMARK_KEY = "aisignal_bookmarks";
const THEME_KEY = "aisignal_theme";
const GOATCOUNTER_TOTAL_URL = "https://trttech.goatcounter.com/counter/TOTAL.json";

let allArticles = [];
let activeSource = null;
let activeCategory = "";
let searchTerm = "";
let feedPage = 0;
let bookmarks = new Set(JSON.parse(localStorage.getItem(BOOKMARK_KEY) || "[]"));
let lastGeneratedAt = null;

const feedEl = document.getElementById("feedList");
const feedToolsEl = document.getElementById("feed-tools");
const learnViewEl = document.getElementById("learn-view");
const podcastViewEl = document.getElementById("podcast-view");
const researchViewEl = document.getElementById("research-view");
const briefViewEl = document.getElementById("brief-view");
const homeViewEl = document.getElementById("home-view");
const researchGridEl = document.getElementById("researchGrid");
let researchItems = [];
const topTabsEl = document.getElementById("topTabs");
const podcastFeaturedEl = document.getElementById("podcast-featured");
const podcastListEl = document.getElementById("podcast-list");
const podcastTracksEl = document.getElementById("podcastTracks");
const trackRailEl = document.getElementById("trackRail");
let activeSeries = "";
let activeTrack = "";
let podcastQuery = "";
let podcastVisible = 5;
const POD_WINDOW = 5;
const sourceListEl = document.getElementById("sourceList");
const searchEl = document.getElementById("search");
const categoryToggleEl = document.getElementById("categoryToggle");
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const viewsTextEl = document.getElementById("viewsText");
const footerMeta = document.getElementById("footerMeta");
const themeToggleBtn = document.getElementById("themeToggle");
const sourcesToggleBtn = document.getElementById("sourcesToggle");
const sourcesCountEl = document.getElementById("sourcesCount");

function timeAgo(iso) {
  const then = new Date(iso).getTime();
  const diffMin = Math.round((Date.now() - then) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay}d ago`;
}

function updateStatusText() {
  if (lastGeneratedAt) {
    statusText.textContent = `updated ${timeAgo(lastGeneratedAt)}`;
  }
}

/* ---------- Theme ---------- */
function applyTheme(theme) {
  if (theme === "dark" || theme === "light") {
    document.documentElement.setAttribute("data-theme", theme);
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
  themeToggleBtn.textContent = (theme === "dark") ? "☀" : "☾";
}
(function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  applyTheme(saved);
})();
themeToggleBtn.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme") ||
    (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  const next = current === "dark" ? "light" : "dark";
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
});

/* ---------- Bookmarks ---------- */
function saveBookmarks() {
  localStorage.setItem(BOOKMARK_KEY, JSON.stringify([...bookmarks]));
}
function toggleBookmark(id) {
  if (bookmarks.has(id)) bookmarks.delete(id); else bookmarks.add(id);
  saveBookmarks();
  renderFeed();
}

/* ---------- Views (GoatCounter) ---------- */
async function loadViews() {
  try {
    const res = await fetch(GOATCOUNTER_TOTAL_URL);
    if (!res.ok) return;
    const data = await res.json();
    if (data && data.count) {
      viewsTextEl.textContent = `${data.count} views`;
    }
  } catch (err) {
    // Views are a nice-to-have; fail silently.
  }
}

/* ---------- Views: feed / learn / podcast ---------- */
/* Tab landing rule (Thillai, Nov 6, 2026): opening any section tab, by tap,
   link or back button, lands at the top of that tab's content. Two guards:
   the browser must not restore a saved scroll position for a tab entry, and
   no element id on this page may equal a section hash (the feed list element
   is #feedList, not #feed), so no fragment jump can move the landing point. */
try { history.scrollRestoration = "manual"; } catch (e) {}
const VIEW_TOP = { home: homeViewEl, feed: feedToolsEl, learn: learnViewEl, podcast: podcastViewEl, research: researchViewEl, brief: briefViewEl };
function scrollToViewTop(name) {
  const el = VIEW_TOP[name];
  if (!el) return;
  const y = el.getBoundingClientRect().top + window.scrollY;
  window.scrollTo({ top: Math.max(0, y), behavior: "instant" });
}
function showView(name) {
  document.body.dataset.view = name;
  homeViewEl.hidden = name !== "home";
  feedEl.hidden = name !== "feed";
  feedToolsEl.hidden = name !== "feed";
  learnViewEl.hidden = name !== "learn";
  podcastViewEl.hidden = name !== "podcast";
  researchViewEl.hidden = name !== "research";
  if (briefViewEl) briefViewEl.hidden = name !== "brief";
  topTabsEl.querySelectorAll(".top-tab").forEach(b =>
    b.classList.toggle("active", b.dataset.view === name));
  scrollActiveTabIntoView();
  if (name === "podcast") renderPodcast();
  if (name === "research") renderResearch();
  if (name === "learn") requestAnimationFrame(() => document.querySelectorAll(".rail-wrap").forEach(refreshRail));
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function fmtDur(s) {
  s = Math.round(Number(s) || 0);
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}

/* Tech Learning tracks (Oct 21 2026): the track is named in the episode title
   ("Tech Learning: <Track> — Ep N"); the first four episodes predate that format
   and are all Infrastructure. New tracks in future titles appear automatically. */
const TRACK_ORDER = ["IT Infrastructure & Cloud", "Cybersecurity & SOC", "Data Engineering & Analytics"];
function episodeTrack(a) {
  const t = String(a.title || "");
  const m = t.match(/^Tech Learning:\s*(.+?)\s*—\s*Ep\s*\d+/);
  if (m) return m[1].trim();
  if (/^Tech Learning Series\s*—\s*Ep\s*\d+/.test(t)) return "IT Infrastructure & Cloud";
  return "";
}
/* Episode title format (Nov 25, 2026): heading = the episode title only;
   facts = "Series · [Track ·] Episode N · D Mon YYYY · M:SS". Episodes with
   no separate title get heading "Episode N". Mirrors
   signal-qa/fix-episode-format.py and the episode page builder. */
function episodeParts(a) {
  const t = String(a.title || "");
  let heading = t, num = "", track = "";
  let m = t.match(/^(.+?)\s+—\s+Episode\s+(\d+)\s*(?:\([^)]*\))?\s*:\s*(.+)$/);
  if (m) { num = m[2]; heading = m[3].trim(); }
  else if ((m = t.match(/^Tech Learning:\s*(.+?)\s+—\s*Ep\s*(\d+)\s*:\s*(.+)$/))) { track = m[1].trim(); num = m[2]; heading = m[3].trim(); }
  else if ((m = t.match(/^Tech Learning Series\s+—\s+Ep\s*(\d+)\s*:\s*(.+)$/))) { num = m[1]; heading = m[2].trim(); }
  else if ((m = t.match(/^(.+?)\s+—\s+Episode\s+(\d+)$/))) { num = m[2]; heading = "Episode " + num; }
  else if (a.source && t.startsWith(a.source + " — ")) { heading = t.slice(a.source.length + 3); }
  const date = fmtResearchDate(a.published);
  const facts = [a.source, (a.source === "Technology Learnings" && track) ? track : "", num ? "Episode " + num : "", date, a.duration ? fmtDur(a.duration) : ""].filter(Boolean).join(" · ");
  const cardType = num ? "Episode " + num + " · " + date : (heading.includes("5-Minute Edition") ? "5-Minute Edition · " + date : date);
  return { heading, num, track, date, facts, cardType };
}

function refreshTrackRail() {
  if (!podcastTracksEl || !trackRailEl) return;
  const wrap = podcastTracksEl.querySelector(".track-wrap");
  const max = trackRailEl.scrollWidth - trackRailEl.clientWidth;
  wrap.classList.toggle("no-overflow", max <= 2);
  const prev = wrap.querySelector(".rail-btn.prev");
  const next = wrap.querySelector(".rail-btn.next");
  if (prev) prev.disabled = trackRailEl.scrollLeft <= 2;
  if (next) next.disabled = trackRailEl.scrollLeft >= max - 2;
}
function renderTracks(eps) {
  if (activeSeries !== "Technology Learnings") { podcastTracksEl.hidden = true; return; }
  const seriesEps = eps.filter(e => e.source === "Technology Learnings");
  const counts = {};
  seriesEps.forEach(e => { const t = episodeTrack(e); if (t) counts[t] = (counts[t] || 0) + 1; });
  const names = Object.keys(counts).sort((a, b) => {
    const ia = TRACK_ORDER.indexOf(a), ib = TRACK_ORDER.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
  if (activeTrack && !counts[activeTrack]) activeTrack = "";
  trackRailEl.innerHTML =
    `<button class="series-btn track-btn${!activeTrack ? " active" : ""}" data-track="">All tracks (${seriesEps.length})</button>` +
    names.map(n => `<button class="series-btn track-btn${activeTrack === n ? " active" : ""}" data-track="${escapeHtml(n)}">${escapeHtml(n)} (${counts[n]})</button>`).join("");
  trackRailEl.querySelectorAll(".track-btn").forEach(b =>
    b.addEventListener("click", () => { activeTrack = b.dataset.track; podcastVisible = POD_WINDOW; renderPodcast(); }));
  podcastTracksEl.hidden = false;
  requestAnimationFrame(refreshTrackRail);
}

function renderPodcast() {
  const eps = allArticles
    .filter(a => a.category === "Podcast" && a.audio_url)
    .sort((a, b) => new Date(b.published) - new Date(a.published));
  /* Series selector with episode counts — filters in place, no outbound links. */
  const seriesEl = document.getElementById("podcastSeries");
  const seriesOrder = ["Daily AI Intelligence", "Quantum Intelligence", "Technology Learnings"];
  const present = seriesOrder.filter(s => eps.some(e => e.source === s));
  const countOf = s => eps.filter(e => e.source === s).length;
  seriesEl.innerHTML =
    `<button class="series-btn${!activeSeries ? " active" : ""}" data-series="">All series (${eps.length})</button>` +
    present.map(s =>
      `<button class="series-btn${activeSeries === s ? " active" : ""}" data-series="${s}">${s} (${countOf(s)})</button>`
    ).join("");
  seriesEl.querySelectorAll(".series-btn").forEach(b =>
    b.addEventListener("click", () => { activeSeries = b.dataset.series; activeTrack = ""; podcastVisible = POD_WINDOW; renderPodcast(); }));
  /* Listen box (stage 1): fill the per-series episode counts and the tab total. */
  document.querySelectorAll("[data-episodes]").forEach(el => { el.textContent = countOf(el.dataset.episodes); });
  document.querySelectorAll("[data-pod-total]").forEach(el => { el.textContent = eps.length; });
  renderTracks(eps);
  let list = activeSeries ? eps.filter(e => e.source === activeSeries) : eps;
  if (activeTrack) list = list.filter(e => episodeTrack(e) === activeTrack);
  const q = podcastQuery.trim().toLowerCase();
  if (q) list = list.filter(e => (e.title || "").toLowerCase().includes(q));

  const total = list.length;
  if (podcastVisible < POD_WINDOW) podcastVisible = POD_WINDOW;
  const pageItems = list.slice(0, podcastVisible);

  if (!pageItems.length) {
    podcastFeaturedEl.innerHTML = "";
    const moreBtnE = document.getElementById("podcastMore");
    if (moreBtnE) moreBtnE.hidden = true;
    podcastListEl.innerHTML = `<p class="empty-state">${q ? `No episodes match "${escapeHtml(podcastQuery.trim())}". Try another search.` : "No episodes in this series yet — check back after the next scheduled run."}</p>`;
    return;
  }

  /* The window always leads with the featured hero card (the latest episode in the filtered list). */
  let heroHtml = "";
  let rows = pageItems;
  {
    const [latest, ...rest] = pageItems;
    rows = rest;
    heroHtml = `
    <div class="pod-featured" data-epid="${latest.id}">
      <p class="pod-kicker">${q ? "Top result" : "Latest episode"} · ${latest.source}</p>
      <h3>${escapeHtml(episodeParts(latest).heading)}</h3>
      <p class="pod-meta">${escapeHtml(episodeParts(latest).facts)}</p>
      <audio controls preload="none" src="${AUDIO_PROXY + encodeURIComponent(latest.audio_url)}"></audio>
      <div class="pod-share-slot" data-share-for="${latest.id}"></div>
    </div>`;
  }
  podcastFeaturedEl.innerHTML = heroHtml;
  const to = pageItems.length;
  podcastListEl.innerHTML = rows.map(a => `
    <div class="pod-row" data-epid="${a.id}">
      <div class="pod-row-text">
        <p class="pod-row-title">${escapeHtml(episodeParts(a).heading)}</p>
        <p class="pod-row-meta">${escapeHtml(episodeParts(a).facts)}</p>
      </div>
      <audio controls preload="none" src="${AUDIO_PROXY + encodeURIComponent(a.audio_url)}"></audio>
      <div class="pod-share-slot" data-share-for="${a.id}"></div>
    </div>`).join("") + `
    <div class="pager">
      <span class="pager-info">Showing ${to} of ${total}${q ? ` for "${escapeHtml(podcastQuery.trim())}"` : ""}</span>
    </div>`;
  const moreBtn = document.getElementById("podcastMore");
  if (moreBtn) moreBtn.hidden = podcastVisible >= total;
  mountPodShares(eps);
}


function episodeSpec(a) {
  const parts = episodeParts(a);
  const link = SignalShare.BASE + "/podcast/" + a.id + "/";
  return { title: parts.heading, line: parts.facts, link,
    caption: SignalShare.podcastCaption(parts.heading, parts.facts, link),
    tags: "#TheSignal #Podcast",
    image: SignalShare.cardImage({ type: parts.cardType, tech: SignalShare.techForSeries(a.source), pill: a.source, heading: parts.heading, body: SignalShare.episodeBody(a.summary, a.title), source: a.source }, a.id + ".png") };
}

function mountPodShares(eps) {
  if (!window.SignalShare) return;
  document.querySelectorAll(".pod-share-slot").forEach(slot => {
    const ep = eps.find(e => e.id === slot.dataset.shareFor);
    if (ep) slot.appendChild(SignalShare.shareButton(episodeSpec(ep)));
  });
}

let podcastTargetDone = "";
function openPodcastTarget() {
  const h = location.hash;
  if (!h.startsWith("#podcast/")) return;
  if (podcastTargetDone === h) return;
  const id = h.slice("#podcast/".length);
  const ep = allArticles.find(a => a.category === "Podcast" && a.id === id);
  if (!ep) return;
  podcastTargetDone = h;
  activeSeries = ep.source || "";
  activeTrack = "";
  podcastQuery = "";
  const si = document.getElementById("podcastSearch");
  if (si) si.value = "";
  showView("podcast");
  const eps = allArticles
    .filter(a => a.category === "Podcast" && a.audio_url)
    .sort((a, b) => new Date(b.published) - new Date(a.published))
    .filter(e => e.source === activeSeries);
  const idx = eps.findIndex(e => e.id === id);
  if (idx >= 0) podcastVisible = Math.max(POD_WINDOW, Math.ceil((idx + 1) / POD_WINDOW) * POD_WINDOW);
  renderPodcast();
  requestAnimationFrame(() => {
    const row = document.querySelector('[data-epid="' + id + '"]');
    if (row) {
      row.classList.add("pod-hl");
      row.scrollIntoView({ block: "center" });
      setTimeout(() => row.classList.remove("pod-hl"), 2600);
    }
  });
}

/* ---------- Research Notes ---------- */
function fmtResearchDate(iso) {
  if (!iso) return "";
  const d = new Date(iso.length <= 10 ? iso + "T12:00:00" : iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

async function loadResearch() {
  try {
    const res = await fetch(`data/research.json?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    researchItems = (data.articles || []).slice()
      .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  } catch (err) {
    researchItems = [];
    console.error("Failed to load research.json", err);
  }
  renderResearch();
  fillHomeArticles();
}

function renderResearch() {
  if (!researchViewEl) return;
  researchGridEl.hidden = false;
  if (!researchItems.length) {
    researchGridEl.innerHTML = `<p class="empty-state">The first Research Notes edition lands soon.</p>`;
    return;
  }
  researchGridEl.innerHTML = researchItems.map(a => `
    <button class="research-card" data-id="${escapeHtml(a.id)}">
      <img src="${escapeHtml(a.card)}" alt="${escapeHtml(a.title)} cover" loading="lazy">
      <span class="research-card-meta">${escapeHtml(a.kind || "Research")} · ${fmtResearchDate(a.date)}</span>
      <span class="research-card-title">${escapeHtml(a.title)}</span>
      <span class="research-card-sub">${escapeHtml(a.subtitle || "")}</span>
    </button>`).join("");
  researchGridEl.querySelectorAll(".research-card").forEach(c =>
    c.addEventListener("click", () => {
      window.location.href = "research/" + c.dataset.id + "/";
    }));
}

function getFiltered() {
  const term = searchTerm.trim().toLowerCase();
  return allArticles.filter(a => {
    if (a.category === "Podcast") return false; /* episodes live in the Podcast tab only (Oct 21 2026) */
    if (activeCategory === "__bookmarked") {
      if (!bookmarks.has(a.id)) return false;
    } else if (activeCategory && a.category !== activeCategory) {
      return false;
    }
    if (activeSource && a.source !== activeSource) return false;
    if (term && !(a.title.toLowerCase().includes(term) || a.summary.toLowerCase().includes(term))) return false;
    return true;
  });
}

function renderSources() {
  let scoped;
  if (activeCategory === "__bookmarked") {
    scoped = allArticles.filter(a => bookmarks.has(a.id));
  } else if (activeCategory) {
    scoped = allArticles.filter(a => a.category === activeCategory);
  } else {
    scoped = allArticles;
  }

  scoped = scoped.filter(a => a.category !== "Podcast");
  const counts = {};
  scoped.forEach(a => { counts[a.source] = (counts[a.source] || 0) + 1; });
  const sources = Object.keys(counts).sort();
  if (sourcesCountEl) sourcesCountEl.textContent = `(${sources.length})`;

  sourceListEl.innerHTML = "";
  const allBtn = document.createElement("li");
  allBtn.innerHTML = `<button class="source-toggle ${activeSource === null ? "active" : ""}" data-source="">
    <span>All sources</span><span class="count">${scoped.length}</span></button>`;
  sourceListEl.appendChild(allBtn);

  sources.forEach(src => {
    const li = document.createElement("li");
    li.innerHTML = `<button class="source-toggle ${activeSource === src ? "active" : ""}" data-source="${src}">
      <span>${src}</span><span class="count">${counts[src]}</span></button>`;
    sourceListEl.appendChild(li);
  });

  sourceListEl.querySelectorAll(".source-toggle").forEach(btn => {
    btn.addEventListener("click", () => {
      activeSource = btn.dataset.source || null;
      feedPage = 0;
      renderSources();
      renderFeed();
    });
  });
}

function feedSpec(a) {
  const SS = window.SignalShare;
  const tag = SS.categoryHashtag(a.category);
  return {
    title: a.title,
    line: "Source: " + a.source,
    link: a.link,
    caption: SS.feedCaption(a.title, a.source, a.link, tag),
    tags: "#TheSignal " + tag,
    xText: SS.feedShort(a.title, a.source, a.link, tag),
    waText: SS.feedWa(a.title, a.source, a.link),
    image: SS.cardImage({ type: "RSS Feed", tech: SS.techForCategory(a.category), heading: a.title, body: a.summary, source: a.source }, a.id + ".png")
  };
}
function mountFeedShares(shown) {
  if (!window.SignalShare) return;
  const byId = {};
  shown.forEach(a => { byId[a.id] = a; });
  feedEl.querySelectorAll(".feed-share-slot").forEach(slot => {
    const a = byId[slot.dataset.fid];
    if (a) slot.appendChild(SignalShare.iconShareButton(feedSpec(a), "feed-share-btn"));
  });
}

function renderFeed() {
  const filtered = getFiltered();

  if (filtered.length === 0) {
    feedEl.innerHTML = `<p class="empty-state">Nothing matches yet. Try a different source, topic, or search term.</p>`;
    return;
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  if (feedPage > totalPages - 1) feedPage = totalPages - 1;
  const start = feedPage * PAGE_SIZE;
  const shown = filtered.slice(start, start + PAGE_SIZE);

  feedEl.innerHTML = shown.map(a => {
    const saved = bookmarks.has(a.id);
    return `
    <article class="article">
      <div class="article-meta">
        ${timeAgo(a.published)}
        <span class="source">${a.source}</span>
        <div class="article-actions">
          <button class="icon-btn bookmark-btn ${saved ? "active" : ""}" data-id="${a.id}" title="${saved ? "Remove bookmark" : "Save for later"}">${saved ? "★" : "☆"}</button>
          <span class="feed-share-slot" data-fid="${a.id}"></span>
        </div>
      </div>
      <div>
        <h2 class="article-title"><a href="${a.link}" target="_blank" rel="noopener">${a.title}</a></h2>
        <p class="article-summary">${a.summary || ""}</p>
        ${a.audio_url ? `
        <div class="audio-player">
          <audio controls preload="none" src="${AUDIO_PROXY + encodeURIComponent(a.audio_url)}"></audio>
          ${a.duration ? `<span class="duration">${a.duration}</span>` : ""}
        </div>` : ""}
      </div>
    </article>
  `;
  }).join("");
  mountFeedShares(shown);

  const pager = document.createElement("div");
  pager.className = "pager";
  const from = filtered.length ? start + 1 : 0;
  const to = Math.min(start + PAGE_SIZE, filtered.length);
  pager.innerHTML = `
    <button class="pager-btn" id="feedPrev" ${feedPage === 0 ? "disabled" : ""}>← Prev</button>
    <span class="pager-info">${from}–${to} of ${filtered.length}</span>
    <button class="pager-btn" id="feedNext" ${feedPage >= totalPages - 1 ? "disabled" : ""}>Next →</button>`;
  feedEl.appendChild(pager);
  document.getElementById("feedPrev").addEventListener("click", () => {
    if (feedPage > 0) { feedPage--; renderFeed(); feedEl.scrollIntoView(); }
  });
  document.getElementById("feedNext").addEventListener("click", () => {
    if (feedPage < totalPages - 1) { feedPage++; renderFeed(); feedEl.scrollIntoView(); }
  });
}

feedEl.addEventListener("click", (e) => {
  const bm = e.target.closest(".bookmark-btn");
  if (bm) {
    toggleBookmark(bm.dataset.id);
    return;
  }
});

async function loadData() {
  try {
    const res = await fetch(`${DATA_URL}?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    allArticles = data.articles || [];
    const wc = document.getElementById("wireCount");
    if (wc) wc.textContent = allArticles.filter(a => a.category !== "Podcast").length;
    renderSources();
    renderFeed();
    fillHomeWire();
    if (!podcastViewEl.hidden) renderPodcast();
    openPodcastTarget();

    if (data.generated_at) {
      statusDot.classList.add("live");
      lastGeneratedAt = data.generated_at;
      updateStatusText();
      footerMeta.textContent = `${allArticles.length} articles · ${(data.sources_polled || []).length} sources polled · last run ${new Date(data.generated_at).toUTCString()}`;
    } else {
      statusText.textContent = "awaiting first bot run";
      footerMeta.textContent = "No automated run yet — check the GitHub Action.";
    }
  } catch (err) {
    statusDot.classList.remove("live");
    statusText.textContent = "data unavailable";
    console.error("Failed to load articles.json", err);
  }
}

searchEl.addEventListener("input", (e) => {
  searchTerm = e.target.value;
  feedPage = 0;
  renderFeed();
});

document.getElementById("podcastSearch").addEventListener("input", (e) => {
  podcastQuery = e.target.value;
  podcastVisible = POD_WINDOW;
  renderPodcast();
});

const podcastMoreBtn = document.getElementById("podcastMore");
if (podcastMoreBtn) podcastMoreBtn.addEventListener("click", () => {
  podcastVisible += POD_WINDOW;
  renderPodcast();
});

categoryToggleEl.querySelectorAll(".cat-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    categoryToggleEl.querySelectorAll(".cat-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    activeCategory = btn.dataset.category;
    activeSource = null;
    feedPage = 0;
    renderSources();
    renderFeed();
    showView("feed");
  });
});

topTabsEl.querySelectorAll(".top-tab").forEach(btn => {
  btn.addEventListener("click", () => {
    topTabsEl.querySelectorAll(".top-tab").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    showView(btn.dataset.view);
    scrollToViewTop(btn.dataset.view);
    const h = "#" + btn.dataset.view;
    if (location.hash !== h) history.pushState(null, "", h);
  });
});

/* ---------- Top tab arrows: shown only while the tabs overflow ---------- */
const tabsPrevBtn = document.getElementById("tabsPrev");
const tabsNextBtn = document.getElementById("tabsNext");
const tabsFadeEl = document.getElementById("tabsFade");
function scrollActiveTabIntoView() {
  const btn = topTabsEl.querySelector(".top-tab.active");
  if (!btn) return;
  const c = topTabsEl.getBoundingClientRect(), r = btn.getBoundingClientRect();
  if (r.left < c.left) topTabsEl.scrollBy({ left: r.left - c.left - 8, behavior: "smooth" });
  else if (r.right > c.right) topTabsEl.scrollBy({ left: r.right - c.right + 8, behavior: "smooth" });
}
function refreshTabArrows() {
  if (!tabsPrevBtn || !tabsNextBtn) return;
  const max = topTabsEl.scrollWidth - topTabsEl.clientWidth;
  const canLeft = topTabsEl.scrollLeft > 2;
  const canRight = max - topTabsEl.scrollLeft > 2;
  tabsPrevBtn.style.display = canLeft ? "flex" : "none";
  tabsNextBtn.style.display = canRight ? "flex" : "none";
  if (tabsFadeEl) tabsFadeEl.style.opacity = canRight ? "1" : "0";
}
if (tabsPrevBtn && tabsNextBtn) {
  tabsPrevBtn.addEventListener("click", () => topTabsEl.scrollBy({ left: -260, behavior: "smooth" }));
  tabsNextBtn.addEventListener("click", () => topTabsEl.scrollBy({ left: 260, behavior: "smooth" }));
  topTabsEl.addEventListener("scroll", refreshTabArrows, { passive: true });
  window.addEventListener("resize", refreshTabArrows);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { refreshTabArrows(); scrollActiveTabIntoView(); });
  refreshTabArrows();
}

if (sourcesToggleBtn) {
  sourcesToggleBtn.addEventListener("click", () => {
    const expanded = sourcesToggleBtn.getAttribute("aria-expanded") === "true";
    sourcesToggleBtn.setAttribute("aria-expanded", String(!expanded));
    sourceListEl.classList.toggle("is-collapsed", expanded);
  });
}

/* ---------- Learning Space rail arrows ---------- */
function refreshRail(wrap) {
  const rail = wrap.querySelector(".table-rail");
  if (!rail) return;
  const max = rail.scrollWidth - rail.clientWidth;
  wrap.classList.toggle("no-overflow", max <= 2);
  const prev = wrap.querySelector(".rail-btn.prev");
  const next = wrap.querySelector(".rail-btn.next");
  if (prev) prev.disabled = rail.scrollLeft <= 2;
  if (next) next.disabled = rail.scrollLeft >= max - 2;
}
function initRails() {
  document.querySelectorAll(".rail-wrap").forEach(wrap => {
    const rail = wrap.querySelector(".table-rail");
    if (!rail || wrap.dataset.wired) return;
    wrap.dataset.wired = "1";
    const step = () => {
      const card = rail.querySelector(".learn-card");
      return card ? card.offsetWidth + 14 : rail.clientWidth * 0.8;
    };
    const prev = wrap.querySelector(".rail-btn.prev");
    const next = wrap.querySelector(".rail-btn.next");
    if (prev) prev.addEventListener("click", () => rail.scrollBy({ left: -step(), behavior: "smooth" }));
    if (next) next.addEventListener("click", () => rail.scrollBy({ left: step(), behavior: "smooth" }));
    rail.addEventListener("scroll", () => refreshRail(wrap), { passive: true });
    refreshRail(wrap);
  });
}
window.addEventListener("resize", () => document.querySelectorAll(".rail-wrap").forEach(refreshRail));

(function initTrackRail() {
  if (!podcastTracksEl || !trackRailEl) return;
  const wrap = podcastTracksEl.querySelector(".track-wrap");
  const prev = wrap.querySelector(".rail-btn.prev");
  const next = wrap.querySelector(".rail-btn.next");
  if (prev) prev.addEventListener("click", () => trackRailEl.scrollBy({ left: -220, behavior: "smooth" }));
  if (next) next.addEventListener("click", () => trackRailEl.scrollBy({ left: 220, behavior: "smooth" }));
  trackRailEl.addEventListener("scroll", refreshTrackRail, { passive: true });
  window.addEventListener("resize", refreshTrackRail);
})();

initRails();
loadData();
loadResearch();
loadViews();
setInterval(loadData, CLIENT_REFRESH_MS);
setInterval(loadViews, CLIENT_REFRESH_MS);
setInterval(updateStatusText, TICK_MS);
/* Deep link: standalone pages link back to a specific part of the Learning Spaces view
   ("Back to Learning Spaces" -> index.html#learn-tables-quantum etc., Thillai, Oct 21 2026). */
const LEARN_TARGETS = ["learn-videos", "learn-decks", "learn-explainers", "learn-tables", "learn-games", "learn-tables-founders", "learn-tables-quantum", "learn-tables-ai", "learn-tables-cloud", "learn-tables-cyber"];
/* Learning Spaces doors (Oct 21 2026): three groups, one open at a time. */
const DOOR_OF = { "learn-videos": "videos", "learn-decks": "decks", "learn-explainers": "explainers", "learn-games": "games", "learn-tables": "tables", "learn-tables-founders": "tables", "learn-tables-quantum": "tables", "learn-tables-ai": "tables", "learn-tables-cloud": "tables", "learn-tables-cyber": "tables" };
function openDoor(name) {
  document.querySelectorAll(".learn-door").forEach(d => {
    const open = d.dataset.door === name;
    d.querySelector(".learn-door-body").hidden = !open;
    d.querySelector(".learn-door-head").setAttribute("aria-expanded", String(open));
    const chip = d.querySelector(".learn-door-enter");
    if (chip) chip.textContent = open ? "Close" : "Click to enter";
  });
  requestAnimationFrame(() => document.querySelectorAll(".rail-wrap").forEach(refreshRail));
}
function openDoorForTarget(id) { const n = DOOR_OF[id]; if (n) openDoor(n); }
document.querySelectorAll("[data-door-btn]").forEach(btn => {
  btn.addEventListener("click", () => {
    const door = btn.closest(".learn-door");
    const body = door.querySelector(".learn-door-body");
    if (body.hidden) openDoor(door.dataset.door);
    else { body.hidden = true; btn.setAttribute("aria-expanded", "false"); const chip = door.querySelector(".learn-door-enter"); if (chip) chip.textContent = "Click to enter"; }
  });
});
/* Family sub-doors inside the Tables door (Oct 21 2026): one open at a time,
   all closed by default; deep links open the family they name. */
const FAM_OF = { "learn-tables-founders": "founders", "learn-tables-quantum": "quantum", "learn-tables-ai": "ai", "learn-tables-cloud": "cloud", "learn-tables-cyber": "cyber" };
function openFamDoor(name) {
  document.querySelectorAll(".fam-door").forEach(d => {
    const open = d.dataset.famdoor === name;
    d.querySelector(".fam-door-body").hidden = !open;
    d.querySelector(".fam-door-head").setAttribute("aria-expanded", String(open));
  });
  requestAnimationFrame(() => document.querySelectorAll(".rail-wrap").forEach(refreshRail));
}
document.querySelectorAll("[data-fam-btn]").forEach(btn => {
  btn.addEventListener("click", () => {
    const door = btn.closest(".fam-door");
    const body = door.querySelector(".fam-door-body");
    if (body.hidden) openFamDoor(door.dataset.famdoor);
    else { body.hidden = true; btn.setAttribute("aria-expanded", "false"); }
  });
});
function scrollToLearnId(id) {
  openDoorForTarget(id);
  if (FAM_OF[id]) openFamDoor(FAM_OF[id]);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ block: "start" });
  }));
}
/* Stage 1: the Learning Space tab is the menu and the hub pages now.
   Old deep links into the doors land on the matching hub page instead. */
const LEARN_HUB = { "learn": "videos/", "learn-videos": "videos/", "learn-decks": "decks/", "learn-explainers": "explainers/", "learn-games": "games/", "learn-tables": "periodic-tables/", "learn-tables-ai": "periodic-tables/#ai", "learn-tables-quantum": "periodic-tables/#quantum", "learn-tables-cloud": "periodic-tables/#cloud", "learn-tables-cyber": "periodic-tables/#cyber", "learn-tables-founders": "periodic-tables/#founders" };
function openLearnTarget() {
  const id = location.hash.startsWith("#") ? location.hash.slice(1) : "";
  if (Object.prototype.hasOwnProperty.call(LEARN_HUB, id)) {
    window.location.replace(LEARN_HUB[id]);
  }
}
openLearnTarget();
function openResearchTarget() {
  const h = location.hash;
  if (h.startsWith("#research/")) {
    const id = h.slice("#research/".length);
    if (id) window.location.replace("research/" + id + "/");
  }
}
openResearchTarget();
/* Stage 2: "#learn" is deliberately absent here — openLearnTarget
   above redirects it to the videos hub; the in-page learn view is
   retired and must not be reachable from anywhere. */
const SECTION_HASH = { "#home": "home", "#podcast": "podcast", "#research": "research", "#feed": "feed", "#brief": "brief" };
function openSectionTarget() {
  const v = SECTION_HASH[location.hash];
  if (v) { showView(v); scrollToViewTop(v); return; }
  if (!location.hash || location.hash === "#") { showView("home"); scrollToViewTop("home"); }
}
openSectionTarget();
openPodcastTarget();
window.addEventListener("hashchange", function () { openLearnTarget(); openResearchTarget(); openPodcastTarget(); openSectionTarget(); });

/* ---------- Home view: auto-rails, live counts (Oct 21 2026 redesign) ---------- */
(function initHome() {
  var reduce = false;
  try { reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  ["hmTickerTrack", "hmWeekTrack"].forEach(function (id) {
    var t = document.getElementById(id);
    if (t) t.innerHTML += t.innerHTML;
  });

  var brand = document.querySelector(".brand-h");
  if (brand) brand.addEventListener("click", function () { showView("home"); window.scrollTo({ top: 0 }); });

  document.querySelectorAll(".hm-go[data-goto]").forEach(function (btn) {
    btn.addEventListener("click", function (ev) {
      var view = btn.getAttribute("data-goto");
      if (view === "learn") {
        /* Stage 2: room 01 Enter opens the Learning Space menu, like
           the 01 tab (signal-shell.js intercepts that tab's click in
           the capture phase and opens the menu). The old in-page
           learn view is retired and no longer reachable.
           stopPropagation matters: the shell closes the menu on any
           document click that lands outside it, so this button's own
           click must not bubble on to document after the tab click
           has opened the menu. */
        ev.stopPropagation();
        var tab = document.querySelector('.top-tab[data-view="learn"]');
        if (tab) tab.click();
        return;
      }
      if (view === "podcast") { activeSeries = ""; podcastVisible = POD_WINDOW; }
      showView(view);
      window.scrollTo({ top: 0 });
    });
  });

  /* Rail items are links: each rotating card navigates to what it shows. */
  document.querySelectorAll(".hm-ritem[data-goto], .hm-ritem[data-ext], .hm-ritem[data-href]").forEach(function (item) {
    item.setAttribute("tabindex", "0");
    function nav() {
      if (item.dataset.href) { window.location.href = item.dataset.href; return; }
      if (item.dataset.ext) { window.open(item.dataset.ext, "_blank", "noopener"); return; }
      var view = item.dataset.goto;
      if (view === "podcast") { activeSeries = item.dataset.series || ""; podcastVisible = POD_WINDOW; }
      if (view === "research" && item.dataset.artId) {
        window.location.href = "research/" + item.dataset.artId + "/";
        return;
      }
      if (view === "learn") {
        /* Stage 2: learn rail cards go to the matching hub page (the
           LEARN_HUB map above); the in-page learn view is retired. */
        window.location.href = LEARN_HUB[item.dataset.scroll] || "videos/";
        return;
      }
      showView(view);
      if (view === "brief" && item.dataset.briefItem && window.SignalBriefUI) {
        SignalBriefUI.openStory(item.dataset.briefItem);
        return;
      }
      window.scrollTo({ top: 0 });
    }
    item.addEventListener("click", nav);
    item.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); nav(); }
    });
  });

  document.querySelectorAll("[data-hm-rail]").forEach(function (rail) {
    var track = rail.querySelector(".hm-rtrack");
    var items = track.children.length;
    var dotsBox = rail.querySelector(".hm-dots");
    var count = rail.querySelector(".hm-count");
    var idx = 0, timer = null;
    for (var i = 0; i < items; i++) {
      var b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-label", "Go to item " + (i + 1));
      (function (n) { b.addEventListener("click", function () { go(n); restart(); }); })(i);
      dotsBox.appendChild(b);
    }
    function render() {
      track.style.transform = "translateX(" + (-idx * 100) + "%)";
      count.textContent = (idx + 1) + " / " + items;
      Array.prototype.forEach.call(dotsBox.children, function (d, j) { d.classList.toggle("on", j === idx); });
    }
    function go(n) { idx = (n + items) % items; render(); }
    function start() { if (!reduce && !timer) timer = setInterval(function () { if (rail.offsetParent !== null && !document.hidden) go(idx + 1); }, 4200); }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function restart() { stop(); start(); }
    rail.querySelector("[data-hm-prev]").addEventListener("click", function () { go(idx - 1); restart(); });
    rail.querySelector("[data-hm-next]").addEventListener("click", function () { go(idx + 1); restart(); });
    rail.addEventListener("pointerenter", stop);
    rail.addEventListener("pointerleave", start);
    rail.addEventListener("focusin", stop);
    rail.addEventListener("focusout", start);
    render(); start();
  });

  var bars = document.querySelectorAll(".hm-bar i[data-hm-fill]");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.style.width = e.target.getAttribute("data-hm-fill") + "%"; io.unobserve(e.target); }
      });
    }, { threshold: .4 });
    bars.forEach(function (el) { io.observe(el); });
  } else {
    bars.forEach(function (el) { el.style.width = el.getAttribute("data-hm-fill") + "%"; });
  }
})();

function hmFmtDate(iso) {
  var d = new Date(String(iso || "") + "T00:00:00");
  if (isNaN(d)) return String(iso || "");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function fillHomeWire() {
  if (!allArticles.length) return;
  var ext = allArticles.filter(function (a) { return a.category !== "Podcast"; });
  document.querySelectorAll("[data-hm-wire-count]").forEach(function (el) { el.textContent = ext.length; });
  document.querySelectorAll("[data-hm-wire]").forEach(function (slot, i) {
    var a = ext[i];
    if (!a) return;
    slot.querySelector(".hm-meta").textContent = "On the wire · " + (a.source || "");
    slot.querySelector("h4").textContent = a.title || "";
    var chip = slot.querySelector(".hm-chip");
    if (chip) chip.textContent = "Source · " + (a.source || "");
    if (a.link) slot.dataset.ext = a.link;
  });
}

function fillHomeArticles() {
  if (!researchItems.length) return;
  document.querySelectorAll("[data-hm-art-count]").forEach(function (el) { el.textContent = researchItems.length; });
  document.querySelectorAll("[data-hm-art]").forEach(function (slot, i) {
    var a = researchItems[i];
    if (!a) return;
    slot.querySelector(".hm-meta").textContent = (a.kind || "") + " · " + hmFmtDate(a.date);
    slot.querySelector("h4").textContent = a.title || "";
    var chip = slot.querySelector(".hm-chip");
    if (chip) chip.textContent = "Edition " + String(researchItems.length - i).padStart(2, "0");
    if (a.id) slot.dataset.artId = a.id;
  });
}

/* Interactive Explainers launch pop up: shown once per visitor;
   the go button opens Learning Spaces with the explainers door expanded. */
(function initGamesPopup() {
  var KEY = "signalExplainersPopupV1";
  var seen = false;
  try { seen = !!localStorage.getItem(KEY); } catch (e) {}
  var popup = document.getElementById("gamesPopup");
  if (!popup || seen) return;
  if (location.hash && location.hash !== "#home") return;
  function mark() { try { localStorage.setItem(KEY, "1"); } catch (e) {} }
  function hide() { popup.hidden = true; }
  document.getElementById("gamesPopupClose").addEventListener("click", function () { mark(); hide(); });
  document.getElementById("gamesPopupLater").addEventListener("click", function () { mark(); hide(); });
  popup.addEventListener("click", function (ev) { if (ev.target === popup) { mark(); hide(); } });
  document.getElementById("gamesPopupGo").addEventListener("click", function () {
    mark(); hide();
    /* Stage 2: the explainers door lives on the hub page now; the
       in-page learn view is retired. */
    window.location.href = "explainers/";
  });
  setTimeout(function () { popup.hidden = false; }, 900);
})();
