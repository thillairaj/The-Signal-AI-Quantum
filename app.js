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

const feedEl = document.getElementById("feed");
const learnViewEl = document.getElementById("learn-view");
const podcastViewEl = document.getElementById("podcast-view");
const researchViewEl = document.getElementById("research-view");
const homeViewEl = document.getElementById("home-view");
const researchGridEl = document.getElementById("researchGrid");
const researchArticleEl = document.getElementById("researchArticle");
let researchItems = [];
let openResearchId = null;
const topTabsEl = document.getElementById("topTabs");
const podcastFeaturedEl = document.getElementById("podcast-featured");
const podcastListEl = document.getElementById("podcast-list");
const podcastTracksEl = document.getElementById("podcastTracks");
const trackRailEl = document.getElementById("trackRail");
let activeSeries = "";
let activeTrack = "";
let podcastQuery = "";
let podcastPage = 0;
const POD_PAGE_SIZE = 10;
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
function showView(name) {
  document.body.dataset.view = name;
  homeViewEl.hidden = name !== "home";
  feedEl.hidden = name !== "feed";
  learnViewEl.hidden = name !== "learn";
  podcastViewEl.hidden = name !== "podcast";
  researchViewEl.hidden = name !== "research";
  topTabsEl.querySelectorAll(".top-tab").forEach(b =>
    b.classList.toggle("active", b.dataset.view === name));
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
    b.addEventListener("click", () => { activeTrack = b.dataset.track; podcastPage = 0; renderPodcast(); }));
  podcastTracksEl.hidden = false;
  requestAnimationFrame(refreshTrackRail);
}

function renderPodcast() {
  const eps = allArticles
    .filter(a => a.category === "Podcast" && a.audio_url)
    .sort((a, b) => new Date(b.published) - new Date(a.published));
  /* Series selector with episode counts — filters in place, no outbound links. */
  const seriesEl = document.getElementById("podcastSeries");
  const seriesOrder = ["Daily AI Intelligence", "Technology Learnings", "Quantum Intelligence"];
  const present = seriesOrder.filter(s => eps.some(e => e.source === s));
  const countOf = s => eps.filter(e => e.source === s).length;
  seriesEl.innerHTML =
    `<button class="series-btn${!activeSeries ? " active" : ""}" data-series="">All series (${eps.length})</button>` +
    present.map(s =>
      `<button class="series-btn${activeSeries === s ? " active" : ""}" data-series="${s}">${s} (${countOf(s)})</button>`
    ).join("");
  seriesEl.querySelectorAll(".series-btn").forEach(b =>
    b.addEventListener("click", () => { activeSeries = b.dataset.series; activeTrack = ""; podcastPage = 0; renderPodcast(); }));
  renderTracks(eps);
  let list = activeSeries ? eps.filter(e => e.source === activeSeries) : eps;
  if (activeTrack) list = list.filter(e => episodeTrack(e) === activeTrack);
  const q = podcastQuery.trim().toLowerCase();
  if (q) list = list.filter(e => (e.title || "").toLowerCase().includes(q));

  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / POD_PAGE_SIZE));
  if (podcastPage > totalPages - 1) podcastPage = totalPages - 1;
  const start = podcastPage * POD_PAGE_SIZE;
  const pageItems = list.slice(start, start + POD_PAGE_SIZE);

  if (!pageItems.length) {
    podcastFeaturedEl.innerHTML = "";
    podcastListEl.innerHTML = `<p class="empty-state">${q ? `No episodes match "${escapeHtml(podcastQuery.trim())}". Try another search.` : "No episodes in this series yet — check back after the next scheduled run."}</p>`;
    return;
  }

  /* Page 1 leads with the featured hero card; later pages are all rows. */
  let heroHtml = "";
  let rows = pageItems;
  if (podcastPage === 0) {
    const [latest, ...rest] = pageItems;
    rows = rest;
    heroHtml = `
    <div class="pod-featured">
      <p class="pod-kicker">${q ? "Top result" : "Latest episode"} · ${latest.source}</p>
      <h3>${latest.title}</h3>
      <p class="pod-meta">${timeAgo(latest.published)}${latest.duration ? " · " + fmtDur(latest.duration) : ""}</p>
      <audio controls preload="none" src="${AUDIO_PROXY + encodeURIComponent(latest.audio_url)}"></audio>
    </div>`;
  }
  podcastFeaturedEl.innerHTML = heroHtml;
  const from = total ? start + 1 : 0;
  const to = Math.min(start + POD_PAGE_SIZE, total);
  podcastListEl.innerHTML = rows.map(a => `
    <div class="pod-row">
      <div class="pod-row-text">
        <p class="pod-row-title">${a.title}</p>
        <p class="pod-row-meta">${a.source} · ${timeAgo(a.published)}${a.duration ? " · " + fmtDur(a.duration) : ""}</p>
      </div>
      <audio controls preload="none" src="${AUDIO_PROXY + encodeURIComponent(a.audio_url)}"></audio>
    </div>`).join("") + `
    <div class="pager">
      <button class="pager-btn" id="podPrev" ${podcastPage === 0 ? "disabled" : ""}>← Prev</button>
      <span class="pager-info">${from}–${to} of ${total}${q ? ` for "${escapeHtml(podcastQuery.trim())}"` : ""}</span>
      <button class="pager-btn" id="podNext" ${podcastPage >= totalPages - 1 ? "disabled" : ""}>Next →</button>
    </div>`;
  document.getElementById("podPrev").addEventListener("click", () => {
    if (podcastPage > 0) { podcastPage--; renderPodcast(); podcastViewEl.scrollIntoView(); }
  });
  document.getElementById("podNext").addEventListener("click", () => {
    if (podcastPage < totalPages - 1) { podcastPage++; renderPodcast(); podcastViewEl.scrollIntoView(); }
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
  if (openResearchId) { renderResearchArticle(openResearchId); return; }
  researchArticleEl.hidden = true;
  researchArticleEl.innerHTML = "";
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
      openResearchId = c.dataset.id;
      renderResearch();
      researchViewEl.scrollIntoView();
    }));
}

async function renderResearchArticle(id) {
  const a = researchItems.find(x => x.id === id);
  if (!a) { openResearchId = null; renderResearch(); return; }
  researchGridEl.hidden = true;
  researchArticleEl.hidden = false;
  let body = "";
  try {
    const res = await fetch(`${a.body}?t=${Date.now()}`, { cache: "no-store" });
    body = res.ok ? await res.text() : "<p>Article body unavailable.</p>";
  } catch (err) {
    body = "<p>Article body unavailable.</p>";
  }
  const sources = (a.sources || []).map(s =>
    `<li><a href="${escapeHtml(s.url)}" target="_blank" rel="noopener">${escapeHtml(s.label)}</a></li>`).join("");
  const title = escapeHtml(a.title);
  const card = escapeHtml(a.card);
  researchArticleEl.innerHTML = `
    <button class="research-back" id="researchBack">← All research</button>
    <div class="research-article-wrap">
      <p class="research-kicker">THE SIGNAL · RESEARCH NOTES · ${escapeHtml((a.kind || "Research").toUpperCase())}</p>
      <h2 class="research-title">${title}</h2>
      <p class="research-sub">${escapeHtml(a.subtitle || "")}</p>
      <p class="research-date">${fmtResearchDate(a.date)} · By The Signal</p>
      <div class="research-layout">
        <div class="research-main">
          <div class="research-body">${body}</div>
          ${sources ? `<h3 class="research-sources-h">Sources</h3><ul class="research-sources">${sources}</ul>` : ""}
        </div>
        <aside class="research-rail">
          <button class="research-thumb" id="researchThumb" aria-label="Expand cover image">
            <img src="${card}" alt="${title} cover">
            <span class="research-zoom">⤢ Tap to expand</span>
          </button>
        </aside>
      </div>
    </div>
    <div class="research-lightbox" id="researchLightbox" hidden>
      <img src="${card}" alt="${title} cover">
    </div>`;
  document.getElementById("researchBack").addEventListener("click", () => {
    openResearchId = null;
    renderResearch();
  });
  const thumb = document.getElementById("researchThumb");
  const lightbox = document.getElementById("researchLightbox");
  const onEsc = (e) => { if (e.key === "Escape") closeLb(); };
  function closeLb() {
    lightbox.hidden = true;
    document.body.style.overflow = "";
    document.removeEventListener("keydown", onEsc);
  }
  thumb.addEventListener("click", () => {
    lightbox.hidden = false;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onEsc);
  });
  lightbox.addEventListener("click", closeLb);
}

/* ---------- Filtering & rendering ---------- */
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
          <button class="icon-btn copy-btn" data-link="${a.link}" title="Copy link">⧉</button>
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
  const cp = e.target.closest(".copy-btn");
  if (cp) {
    navigator.clipboard.writeText(cp.dataset.link).then(() => {
      const original = cp.textContent;
      cp.textContent = "✓";
      setTimeout(() => { cp.textContent = original; }, 1200);
    }).catch(() => {});
  }
});

async function loadData() {
  try {
    const res = await fetch(`${DATA_URL}?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    allArticles = data.articles || [];
    renderSources();
    renderFeed();
    fillHomeWire();
    if (!podcastViewEl.hidden) renderPodcast();

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
  podcastPage = 0;
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
  });
});

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
const LEARN_TARGETS = ["learn-videos", "learn-decks", "learn-tables", "learn-tables-founders", "learn-tables-quantum", "learn-tables-ai", "learn-tables-cloud", "learn-tables-cyber"];
/* Learning Spaces doors (Oct 21 2026): three groups, one open at a time. */
const DOOR_OF = { "learn-videos": "videos", "learn-decks": "decks", "learn-tables": "tables", "learn-tables-founders": "tables", "learn-tables-quantum": "tables", "learn-tables-ai": "tables", "learn-tables-cloud": "tables", "learn-tables-cyber": "tables" };
function openDoor(name) {
  document.querySelectorAll(".learn-door").forEach(d => {
    const open = d.dataset.door === name;
    d.querySelector(".learn-door-body").hidden = !open;
    d.querySelector(".learn-door-head").setAttribute("aria-expanded", String(open));
  });
  requestAnimationFrame(() => document.querySelectorAll(".rail-wrap").forEach(refreshRail));
}
function openDoorForTarget(id) { const n = DOOR_OF[id]; if (n) openDoor(n); }
document.querySelectorAll("[data-door-btn]").forEach(btn => {
  btn.addEventListener("click", () => {
    const door = btn.closest(".learn-door");
    const body = door.querySelector(".learn-door-body");
    if (body.hidden) openDoor(door.dataset.door);
    else { body.hidden = true; btn.setAttribute("aria-expanded", "false"); }
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
function openLearnTarget() {
  const h = location.hash;
  if (h === "#learn") { showView("learn"); return; }
  const id = h.startsWith("#") ? h.slice(1) : "";
  if (LEARN_TARGETS.includes(id)) {
    showView("learn");
    scrollToLearnId(id);
  }
}
openLearnTarget();
window.addEventListener("hashchange", openLearnTarget);

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
    btn.addEventListener("click", function () {
      var view = btn.getAttribute("data-goto");
      if (view === "podcast") { activeSeries = ""; podcastPage = 0; }
      if (view === "research") { openResearchId = null; }
      showView(view);
      window.scrollTo({ top: 0 });
    });
  });

  /* Rail items are links: each rotating card navigates to what it shows. */
  document.querySelectorAll(".hm-ritem[data-goto], .hm-ritem[data-ext]").forEach(function (item) {
    item.setAttribute("tabindex", "0");
    function nav() {
      if (item.dataset.ext) { window.open(item.dataset.ext, "_blank", "noopener"); return; }
      var view = item.dataset.goto;
      if (view === "podcast") { activeSeries = item.dataset.series || ""; podcastPage = 0; }
      if (view === "research") { openResearchId = item.dataset.artId || null; }
      showView(view);
      if (view === "learn" && item.dataset.scroll) scrollToLearnId(item.dataset.scroll);
      else window.scrollTo({ top: 0 });
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
