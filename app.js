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
const topTabsEl = document.getElementById("topTabs");
const podcastFeaturedEl = document.getElementById("podcast-featured");
const podcastListEl = document.getElementById("podcast-list");
let activeSeries = "";
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
  feedEl.hidden = name !== "feed";
  learnViewEl.hidden = name !== "learn";
  podcastViewEl.hidden = name !== "podcast";
  topTabsEl.querySelectorAll(".top-tab").forEach(b =>
    b.classList.toggle("active", b.dataset.view === name));
  if (name === "podcast") renderPodcast();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function fmtDur(s) {
  s = Math.round(Number(s) || 0);
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}

function renderPodcast() {
  const eps = allArticles
    .filter(a => a.category === "Podcast" && a.audio_url)
    .sort((a, b) => new Date(b.published) - new Date(a.published));
  /* Series selector with episode counts — filters in place, no outbound links. */
  const seriesEl = document.getElementById("podcastSeries");
  const seriesOrder = ["Daily AI Intelligence", "Technology Learnings"];
  const present = seriesOrder.filter(s => eps.some(e => e.source === s));
  const countOf = s => eps.filter(e => e.source === s).length;
  seriesEl.innerHTML =
    `<button class="series-btn${!activeSeries ? " active" : ""}" data-series="">All series (${eps.length})</button>` +
    present.map(s =>
      `<button class="series-btn${activeSeries === s ? " active" : ""}" data-series="${s}">${s} (${countOf(s)})</button>`
    ).join("");
  seriesEl.querySelectorAll(".series-btn").forEach(b =>
    b.addEventListener("click", () => { activeSeries = b.dataset.series; podcastPage = 0; renderPodcast(); }));
  let list = activeSeries ? eps.filter(e => e.source === activeSeries) : eps;
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

/* ---------- Filtering & rendering ---------- */
function getFiltered() {
  const term = searchTerm.trim().toLowerCase();
  return allArticles.filter(a => {
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

loadData();
loadViews();
setInterval(loadData, CLIENT_REFRESH_MS);
setInterval(loadViews, CLIENT_REFRESH_MS);
setInterval(updateStatusText, TICK_MS);