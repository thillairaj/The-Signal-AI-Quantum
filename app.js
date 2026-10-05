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
let visibleCount = PAGE_SIZE;
let bookmarks = new Set(JSON.parse(localStorage.getItem(BOOKMARK_KEY) || "[]"));
let lastGeneratedAt = null;

const feedEl = document.getElementById("feed");
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
      visibleCount = PAGE_SIZE;
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

  const shown = filtered.slice(0, visibleCount);

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

  if (filtered.length > visibleCount) {
    const remaining = filtered.length - visibleCount;
    const btnWrap = document.createElement("div");
    btnWrap.className = "load-more-wrap";
    btnWrap.innerHTML = `<button class="load-more-btn" id="loadMoreBtn">Show ${Math.min(PAGE_SIZE, remaining)} more (${remaining} left)</button>`;
    feedEl.appendChild(btnWrap);
    document.getElementById("loadMoreBtn").addEventListener("click", () => {
      visibleCount += PAGE_SIZE;
      renderFeed();
    });
  }
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
  visibleCount = PAGE_SIZE;
  renderFeed();
});

categoryToggleEl.querySelectorAll(".cat-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    activeCategory = btn.dataset.category;
    activeSource = null;
    visibleCount = PAGE_SIZE;
    categoryToggleEl.querySelectorAll(".cat-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    renderSources();
    renderFeed();
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