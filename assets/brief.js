/* Signal Brief UI: card based tab and standalone page (Nov 6, 2026).
   One module renders both surfaces from data/brief.json: the homepage
   #brief tab and the /brief/ page mount a [data-brief-root] element and
   pass data-root-prefix ("./" on the homepage, "../" on /brief/).
   Sharing goes through the shared Share panel (assets/signal-share.js);
   the news card image is rendered here in the deck card pattern. */
window.SignalBriefUI = (function () {
  var CAT_COLOURS = {
    "AI": "#2C6FAE", "Quantum": "#7C5CBF", "Cloud & DevOps": "#1B7A6E",
    "Cybersecurity": "#A62B25", "Industry": "#201B14", "Policy": "#201B14"
  };
  /* Themes step 2 (preview): each theme uses its own category shades.
     Industry and Policy take the theme ink, as in the Light map. */
  var CAT_COLOURS_ROSE = {
    "AI": "#225D96", "Quantum": "#6A47B0", "Cloud & DevOps": "#176A5F",
    "Cybersecurity": "#9A2620", "Industry": "#2A1A1F", "Policy": "#2A1A1F"
  };
  var CAT_COLOURS_DARK = {
    "AI": "#7FB3E0", "Quantum": "#A78BDB", "Cloud & DevOps": "#5FBFA9",
    "Cybersecurity": "#E58A80", "Industry": "#F1EBDD", "Policy": "#F1EBDD"
  };
  function themeName() {
    var el = document.documentElement;
    if (el.getAttribute("data-tone") === "rose") return "rose";
    return el.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }
  function catColour(name) {
    var t = themeName();
    var map = t === "rose" ? CAT_COLOURS_ROSE :
      t === "dark" ? CAT_COLOURS_DARK : CAT_COLOURS;
    return map[name] ||
      (t === "dark" ? "#9D937F" : t === "rose" ? "#6F545E" : "#5a6b7f");
  }
  function pillText() {
    return themeName() === "dark" ? "#12100D" : "#FFFFFF";
  }
  var CAT_TAGS = {
    "AI": "#AI", "Quantum": "#QuantumComputing",
    "Cloud & DevOps": "#CloudComputing", "Cybersecurity": "#CyberSecurity",
    "Industry": "#TechIndustry", "Policy": "#TechPolicy"
  };
  var DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug",
    "Sep", "Oct", "Nov", "Dec"];
  var MONTHS_FULL = ["January", "February", "March", "April", "May",
    "June", "July", "August", "September", "October", "November",
    "December"];
  var REDUCED = false;
  try {
    REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (e) {}

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;",
        "'": "&#39;" }[c];
    });
  }
  /* Readable dates everywhere: "Fri, 6 Nov 2026", never the ISO form. */
  function fmtDate(iso) {
    var p = String(iso || "").split("-").map(Number);
    if (p.length !== 3 || !p[0]) return String(iso || "");
    var d = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
    return DAYS[d.getUTCDay()] + ", " + d.getUTCDate() + " " +
      MONTHS[d.getUTCMonth()] + " " + d.getUTCFullYear();
  }
  function fmtDateShort(iso) {
    var p = String(iso || "").split("-").map(Number);
    if (p.length !== 3 || !p[0]) return String(iso || "");
    var d = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
    return d.getUTCDate() + " " + MONTHS[d.getUTCMonth()] + " " +
      d.getUTCFullYear();
  }
  /* Edition publish time in IST: the "published" ISO when present
     (breaking editions), otherwise the standing 07:00 IST. */
  function editionTime(ed) {
    if (ed && ed.published) {
      var d = new Date(ed.published);
      if (!isNaN(d)) {
        var ist = new Date(d.getTime() + (5 * 60 + 30) * 60000);
        return String(ist.getUTCHours()).padStart(2, "0") + ":" +
          String(ist.getUTCMinutes()).padStart(2, "0");
      }
    }
    return "07:00";
  }
  function firstSentence(s) {
    var m = String(s || "").match(/^[\s\S]*?[.!?](?=\s|$)/);
    return (m ? m[0] : String(s || "")).trim();
  }
  /* ---------- earlier editions (Nov 14, 2026; moved to the bottom
     Nov 26, 2026) ----------
     The calendar now sits at the bottom of the Brief, under an
     "Earlier editions" heading: a compact strip of the fourteen days
     ending today (CSS shows the last seven below 900px), and under it
     an expander, labelled with the shown month, that opens the full
     month grid only when tapped. A date with an edition is a button
     (green dot, full readable date plus story count as its
     aria-label); other dates are muted text. The today ring shows
     only on a date that has an edition. state.cal is the shown month;
     full renders reset it to the current month and collapse the grid
     (state.calOpen), while the month arrows re-render only the
     calendar so browsing months never changes the open edition. The
     edition bar at the top steps by edition day, using the same
     editionsByDate map, so its arrows skip days with no edition. */
  function dateParts(iso) {
    var p = String(iso || "").split("-").map(Number);
    return { y: p[0], m: p[1] - 1, d: p[2] };
  }
  /* First index per ISO date: editions sort newest first, so for a
     date with a standing and a breaking edition the breaking one
     (later published) is the date's edition. */
  function editionsByDate(state) {
    var map = {};
    state.data.editions.forEach(function (ed, i) {
      if (!(ed.date in map)) map[ed.date] = i;
    });
    return map;
  }
  function isoOf(t) {
    var d = new Date(t);
    return d.getUTCFullYear() + "-" +
      String(d.getUTCMonth() + 1).padStart(2, "0") + "-" +
      String(d.getUTCDate()).padStart(2, "0");
  }
  /* One day cell, shared by the month grid and the week strip so the
     two views can never drift: edition dates are buttons with the
     green dot, the open edition is the filled pill, today rings only
     when the date has an edition, and other dates are muted text. */
  function dayCell(state, byDate, iso, dnum, isToday) {
    if (iso in byDate) {
      var ei = byDate[iso], ed = state.data.editions[ei];
      var sel = ei === state.edIdx;
      return '<button type="button" class="bu-cal-day' +
        (sel ? " bu-cal-sel" : "") +
        (isToday && !sel ? " bu-cal-today" : "") +
        '" data-cal-ed="' + ei + '"' +
        (sel ? ' aria-current="true"' : "") +
        ' aria-label="' + esc(fmtDate(iso)) + ", " + ed.items.length +
        (ed.items.length === 1 ? " story" : " stories") + '">' + dnum +
        '<span class="bu-cal-dot" aria-hidden="true"></span></button>';
    }
    return '<span class="bu-cal-day bu-cal-off">' + dnum + "</span>";
  }
  function monthGrid(state, byDate, first, curY, curM, curD) {
    var y = state.cal.y, m = state.cal.m;
    var prevOff = y < first.y || (y === first.y && m <= first.m);
    var nextOff = y > curY || (y === curY && m >= curM);
    var out =
      '<div class="bu-cal-full">' +
      '<div class="bu-cal-head">' +
      '<button type="button" class="bu-cal-arrow" data-cal-prev ' +
      'aria-label="Previous month"' + (prevOff ? " disabled" : "") +
      ">‹</button>" +
      '<div class="bu-cal-month">' + MONTHS_FULL[m] + " " + y + "</div>" +
      '<button type="button" class="bu-cal-arrow" data-cal-next ' +
      'aria-label="Next month"' + (nextOff ? " disabled" : "") +
      ">›</button></div>" +
      '<div class="bu-cal-dow" aria-hidden="true">' +
      "<span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span>" +
      "<span>Fri</span><span>Sat</span><span>Sun</span></div>";
    var lead = (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7;
    var days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    var cells = "";
    for (var i = 0; i < lead; i++) {
      cells += '<span class="bu-cal-blank"></span>';
    }
    for (var dnum = 1; dnum <= days; dnum++) {
      var iso = y + "-" + String(m + 1).padStart(2, "0") + "-" +
        String(dnum).padStart(2, "0");
      var isToday = y === curY && m === curM && dnum === curD;
      cells += dayCell(state, byDate, iso, dnum, isToday);
    }
    return out + '<div class="bu-cal-grid">' + cells + "</div></div>";
  }
  /* The compact date strip at the bottom: the fourteen days ending
     today, oldest first, one shared day cell per day (CSS shows only
     the last seven below 900px). */
  function editionStrip(state) {
    var byDate = editionsByDate(state);
    var now = new Date();
    var todayMs = Date.UTC(now.getFullYear(), now.getMonth(),
      now.getDate());
    var cells = "";
    for (var i = 13; i >= 0; i--) {
      var t = todayMs - i * 86400000;
      var dt = new Date(t);
      cells += dayCell(state, byDate, isoOf(t), dt.getUTCDate(),
        i === 0);
    }
    return cells;
  }
  /* The bottom calendar: the month expander (the shown month, the
     current month until the reader steps) above the month grid,
     which renders only while the calendar is open. */
  function calendarInner(state) {
    var eds = state.data.editions;
    var first = dateParts(eds[eds.length - 1].date);
    var now = new Date();
    var curY = now.getFullYear(), curM = now.getMonth(),
      curD = now.getDate();
    var byDate = editionsByDate(state);
    var label = MONTHS_FULL[state.cal.m] + " " + state.cal.y;
    return '<button type="button" class="bu-strip-exp" data-cal-expand ' +
      'aria-expanded="' + (state.calOpen ? "true" : "false") + '">' +
      '<span class="bu-strip-month">' + label + "</span>" +
      '<span class="bu-strip-chev" aria-hidden="true">' +
      (state.calOpen ? "▴" : "▾") + "</span></button>" +
      (state.calOpen
        ? monthGrid(state, byDate, first, curY, curM, curD)
        : "");
  }
  function renderCalendar(state) {
    var cal = state.root.querySelector(".bu-cal");
    if (!cal) return;
    cal.innerHTML = calendarInner(state);
    cal.classList.toggle("is-open", !!state.calOpen);
    wireCalendar(state);
  }
  function wireCalendar(state) {
    var prev = state.root.querySelector("[data-cal-prev]");
    var next = state.root.querySelector("[data-cal-next]");
    if (prev) prev.addEventListener("click", function () {
      state.cal = state.cal.m === 0
        ? { y: state.cal.y - 1, m: 11 }
        : { y: state.cal.y, m: state.cal.m - 1 };
      renderCalendar(state);
    });
    if (next) next.addEventListener("click", function () {
      state.cal = state.cal.m === 11
        ? { y: state.cal.y + 1, m: 0 }
        : { y: state.cal.y, m: state.cal.m + 1 };
      renderCalendar(state);
    });
    var exp = state.root.querySelector("[data-cal-expand]");
    if (exp) exp.addEventListener("click", function () {
      state.calOpen = !state.calOpen;
      renderCalendar(state);
    });
    /* Only the grid's own day buttons: the strip above the calendar
       is wired once per full render in wire(), and the calendar
       re-renders must not bind it twice. */
    var cal = state.root.querySelector(".bu-cal");
    if (cal) cal.querySelectorAll("[data-cal-ed]").forEach(function (b) {
      b.addEventListener("click", function () {
        openEdition(state, Number(b.getAttribute("data-cal-ed")));
      });
    });
  }
  /* Open an edition (from a day cell or the edition bar): full render,
     then back to the very top of the page. */
  function openEdition(state, ei) {
    state.edIdx = ei;
    state.cat = "";
    render(state);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  /* Step to the nearest edition day in the given direction (negative
     is the previous, older day): the editionsByDate keys are the only
     days that exist, so days without an edition are skipped. */
  function stepEdition(state, dir) {
    var byDate = editionsByDate(state);
    var dates = Object.keys(byDate).sort();
    var i = dates.indexOf(curEd(state).date) + dir;
    if (i < 0 || i >= dates.length) return;
    openEdition(state, byDate[dates[i]]);
  }
  function storyNN(item) {
    var m = String(item.id || "").match(/-(\d+)$/);
    return m ? m[1].padStart(2, "0") : "01";
  }
  function tint(hex, alpha) {
    var n = parseInt(hex.slice(1), 16);
    return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," +
      (n & 255) + "," + alpha + ")";
  }
  /* The WHY label sits on the category tint; the pure category colour
     falls under 4.5:1 on that tint for Cybersecurity and Industry, so the
     label colour is shaded (darker on light cards, lighter on dark
     cards) until it clears 4.6:1. Bands, pills and dots keep the pure
     category colour. */
  function lum(rgb) {
    function f(c) {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    }
    return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]);
  }
  function cratio(a, b) {
    var la = lum(a), lb = lum(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }
  function hexRgb(hex) {
    var n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function isDark() {
    return themeName() === "dark";
  }
  function labelColour(cat) {
    var c = hexRgb(catColour(cat)), dark = isDark();
    var card = dark ? [29, 32, 25] :
      themeName() === "rose" ? [249, 231, 236] : [255, 255, 255];
    var bg = c.map(function (v, i) {
      return Math.round(v * 0.12 + card[i] * 0.88);
    });
    var out = c.slice(), i;
    if (dark) {
      for (i = 0; i < 20 && cratio(out, bg) < 4.6; i++) {
        out = out.map(function (v) {
          return Math.round(v + (255 - v) * 0.12);
        });
      }
    } else {
      for (i = 0; i < 30 && cratio(out, bg) < 4.6; i++) {
        out = out.map(function (v) { return Math.round(v * 0.96); });
      }
    }
    return "rgb(" + out.join(",") + ")";
  }

  /* ---------- captions ---------- */
  function storyUrl(state, item, ed) {
    return state.siteRoot + "brief/" + ed.date + "/" + storyNN(item) + "/";
  }
  function shareSpec(state, item, ed) {
    var SS = window.SignalShare;
    var url = storyUrl(state, item, ed);
    var srcName = item.sources[0] ? item.sources[0].label : "";
    var caption = SS.buildCaption([
      item.headline,
      item.summary,
      "Why it matters: " + item.why,
      "Source: " + srcName,
      "Read on Signal Brief, free:\n" + url,
      "#TheSignal " + (CAT_TAGS[item.category] || "#AI")
    ]);
    return {
      title: item.headline,
      line: firstSentence(item.summary),
      link: url,
      caption: caption,
      tags: "#TheSignal " + (CAT_TAGS[item.category] || "#AI"),
      image: SS.cardImage({
        type: "Signal Brief \u00b7 " + fmtDateShort(ed.date),
        tech: SS.techForCategory(item.category),
        heading: item.headline,
        body: item.summary,
        boxLabel: "Why it matters",
        box: item.why,
        source: srcName
      }, item.id + ".png")
    };
  }

  /* ---------- story sheet (one per page) ---------- */
  var sheet = null;
  function ensureOverlays(state) {
    if (!sheet) {
      var ov = document.createElement("div");
      ov.className = "bu-overlay";
      ov.hidden = true;
      ov.innerHTML =
        '<div class="bu-sheet" role="dialog" aria-modal="true" ' +
        'aria-label="Story">' +
        '<div class="bu-sheet-top"><div class="bu-sheet-meta"></div>' +
        '<button type="button" class="bu-close" aria-label="Close">' +
        "×</button></div>" +
        '<h3 class="bu-sheet-h"></h3>' +
        '<p class="bu-sheet-sum"></p>' +
        '<div class="bu-why"><span class="bu-why-label">' +
        'WHY IT MATTERS FOR TECH</span><p class="bu-sheet-why"></p></div>' +
        '<p class="bu-srcs-label">Sources</p><ul class="bu-srcs"></ul>' +
        '<div class="bu-sheet-share"></div></div>';
      document.body.appendChild(ov);
      sheet = {
        ov: ov, meta: ov.querySelector(".bu-sheet-meta"),
        h: ov.querySelector(".bu-sheet-h"),
        sum: ov.querySelector(".bu-sheet-sum"),
        why: ov.querySelector(".bu-sheet-why"),
        srcs: ov.querySelector(".bu-srcs"),
        share: ov.querySelector(".bu-sheet-share"),
        invoker: null
      };
      ov.querySelector(".bu-close").addEventListener("click", closeSheet);
      ov.addEventListener("click", function (e) {
        if (e.target === ov) closeSheet();
      });
      ov.addEventListener("keydown", function (e) {
        if (e.key === "Escape") closeSheet();
      });
    }
  }
  function openSheet(state, item, ed, invoker) {
    ensureOverlays(state);
    var cat = catColour(item.category);
    sheet.meta.innerHTML =
      '<span><span class="bu-pill" style="background:' + cat +
      ';color:' + pillText() + '">' +
      esc(item.category) + "</span></span>" +
      '<p class="bu-sheet-dates">' + esc(fmtDate(ed.date)) + " · " +
      esc(editionTime(ed)) + " IST · Source dated " +
      esc(fmtDateShort(item.source_date)) + "</p>";
    sheet.why.parentNode.querySelector(".bu-why-label").style.color =
      labelColour(item.category);
    sheet.why.parentNode.style.background = tint(cat, 0.12);
    sheet.h.textContent = item.headline;
    sheet.sum.textContent = item.summary;
    sheet.why.textContent = item.why;
    sheet.srcs.innerHTML = item.sources.map(function (s) {
      return '<li><a href="' + esc(s.url) + '" target="_blank" ' +
        'rel="noopener">' + esc(s.label) + "</a></li>";
    }).join("");
    sheet.share.innerHTML = "";
    if (window.SignalShare) {
      var btn = window.SignalShare.shareButton(shareSpec(state, item, ed));
      sheet.share.appendChild(btn);
      var a = document.createElement("a");
      a.className = "bu-sheet-page";
      a.href = storyUrl(state, item, ed);
      a.textContent = "Open this story's page";
      sheet.share.appendChild(a);
    }
    sheet.invoker = invoker || document.activeElement;
    sheet.ov.hidden = false;
    sheet.prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    var c = sheet.ov.querySelector(".bu-close");
    if (c) c.focus();
  }
  function closeSheet() {
    if (!sheet) return;
    sheet.ov.hidden = true;
    document.body.style.overflow = sheet.prevOverflow || "";
    if (sheet.invoker && sheet.invoker.focus) {
      try { sheet.invoker.focus(); } catch (e) {}
    }
  }
  /* ---------- the Follow section (bottom of the Brief) ----------
     The shared component (assets/signal-follow.css and
     assets/signal-follow.js): one row per feed with its colour dot
     and a tiny copy button. Feed addresses are the canonical
     signal.luzovi.com ones, as in the component. */
  var FEED_DOTS = {
    "ai": "var(--sg-ai,#2C6FAE)", "quantum": "var(--sg-quantum,#7C5CBF)",
    "cloud-devops": "var(--sg-cloud,#1B7A6E)",
    "cybersecurity": "var(--sg-cyber,#A62B25)",
    "industry": "var(--sg-ink,#201B14)", "policy": "var(--sg-ink,#201B14)"
  };
  var COPY_SVG =
    '<svg class="cy" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg>' +
    '<svg class="ok" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l4 4 10-10"/></svg>' +
    '<span class="tip">Copied</span>';
  function feedsSection(state) {
    var feeds = [{ label: "All stories", file: "signal.xml",
      dot: "var(--sg-ink,#201B14)" }].concat(
      (state.data.categories || []).map(function (c) {
        return { label: c.label, file: c.file,
          dot: FEED_DOTS[c.key] || "var(--sg-ink,#201B14)" };
      }));
    var rows = feeds.map(function (f) {
      var url = "https://signal.luzovi.com/" + f.file;
      return '<li><span class="sg-dot" style="--dot:' + f.dot +
        '"></span><span class="sg-feedname">' + esc(f.label) + "</span>" +
        '<button type="button" class="sg-copyfeed" data-url="' + url +
        '" aria-label="Copy the ' + esc(f.label) + ' feed link">' +
        COPY_SVG + "</button></li>";
    }).join("");
    return '<section class="sg-feeds" id="follow-feeds" ' +
      'aria-labelledby="sgFeedsTitle">' +
      '<h2 id="sgFeedsTitle">Follow in a news reader</h2>' +
      "<p>Copy a feed and paste it into Feedly, Inoreader or any " +
      "reader. New items arrive on their own.</p>" +
      '<ul class="sg-feedlist">' + rows + "</ul></section>";
  }
  var FEED_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M5 11a8 8 0 0 1 8 8M5 5a14 14 0 0 1 14 14"/><circle cx="6" cy="18" r="1.8" fill="currentColor" stroke="none"/></svg>';

  /* ---------- the mounted UI ---------- */
  var states = [];
  function mount(root) {
    var prefix = root.getAttribute("data-root-prefix") || "./";
    var state = {
      tab: prefix === "./",
      root: root,
      siteRoot: new URL(prefix, window.location.href).href,
      data: null, edIdx: 0, cat: "", view: [], cal: null,
      calOpen: false
    };
    states.push(state);
    root.innerHTML =
      '<div class="brief-ui"><p class="bu-empty">Loading the brief…</p></div>';
    fetch(state.siteRoot + "data/brief.json")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        state.data = data;
        data.editions.sort(function (a, b) {
          if (a.date !== b.date) return a.date < b.date ? 1 : -1;
          return String(b.published || "") < String(a.published || "")
            ? -1 : 1;
        });
        render(state);
      })
      .catch(function () {
        root.innerHTML = '<div class="brief-ui"><p class="bu-empty">' +
          "The brief could not be loaded. Please reload the page.</p></div>";
      });
    return state;
  }
  function curEd(state) { return state.data.editions[state.edIdx]; }
  function render(state) {
    var ed = curEd(state);
    var cats = [];
    ed.items.forEach(function (i) {
      if (cats.indexOf(i.category) === -1) cats.push(i.category);
    });
    if (state.cat && cats.indexOf(state.cat) === -1) state.cat = "";
    state.view = state.cat
      ? ed.items.filter(function (i) { return i.category === state.cat; })
      : ed.items.slice();
    var time = editionTime(ed);
    var now = new Date();
    state.cal = { y: now.getFullYear(), m: now.getMonth() };
    state.calOpen = false;
    var edDates = Object.keys(editionsByDate(state)).sort();
    var edPos = edDates.indexOf(ed.date);
    var chips = ['<button type="button" class="bu-chip" data-cat="" ' +
      'aria-pressed="' + (!state.cat) + '">All' +
      '<span class="bu-count">' + ed.items.length + "</span></button>"]
      .concat(cats.map(function (c) {
        var n = ed.items.filter(function (i) {
          return i.category === c;
        }).length;
        return '<button type="button" class="bu-chip" data-cat="' +
          esc(c) + '" aria-pressed="' + (state.cat === c) + '">' +
          '<span class="bu-dot" style="background:' +
          catColour(c) + '"></span>' + esc(c) +
          '<span class="bu-count">' + n + "</span></button>";
      })).join("");
    var cards = state.view.map(function (item) {
      var pos = ed.items.indexOf(item) + 1;
      var cat = catColour(item.category);
      return '<article class="bu-card" tabindex="0" role="button" ' +
        'data-item="' + esc(item.id) + '" aria-label="' +
        esc(item.headline) + '">' +
        '<div class="bu-band" style="background:' + cat + '"></div>' +
        '<div class="bu-card-in">' +
        '<p class="bu-card-meta"><span class="bu-pill" style="background:' +
        cat + ';color:' + pillText() + '">' + esc(item.category) + '</span>' +
        '<span class="bu-card-date">' + esc(fmtDate(ed.date)) + " · " +
        esc(time) + " IST</span></p>" +
        '<h3 class="bu-card-h">' + esc(item.headline) + "</h3>" +
        '<p class="bu-card-sum">' + esc(item.summary) + "</p>" +
        '<div class="bu-why" style="background:' + tint(cat, 0.12) + '">' +
        '<span class="bu-why-label" style="color:' + labelColour(item.category) + '">' +
        "WHY IT MATTERS</span><p>" + esc(item.why) + "</p></div>" +
        '<div class="bu-card-foot"><span class="bu-counter">' + pos +
        "/" + ed.items.length + '</span><span class="bu-src">' +
        esc(item.sources[0] ? item.sources[0].label : "") + "</span>" +
        '<span class="bu-share-slot" data-share="' + esc(item.id) +
        '"></span></div></div></article>';
    }).join("");
    state.root.innerHTML =
      '<div class="brief-ui">' +
      '<div class="sg-headrow">' +
      '<h2 class="sg-pagetitle">Signal Brief</h2>' +
      '<a class="sg-followpill" href="#follow-feeds">' +
      '<span class="sg-fp-ic">' + FEED_ICON + "</span>" +
      'Follow in a reader <span aria-hidden="true">↓</span></a></div>' +
      '<p class="bu-desc">The day in technology, in our own words. ' +
      "New every day at 07:00 IST.</p>" +
      '<div class="bu-edbar">' +
      '<button type="button" class="bu-ednav" data-ed-prev ' +
      'aria-label="Previous edition day"' +
      (edPos > 0 ? "" : " disabled") + ">‹</button>" +
      '<div class="bu-edmid">' +
      (ed.breaking ? '<span class="bu-breaking">Breaking update</span>' : "") +
      '<div class="bu-eddate">' + esc(fmtDate(ed.date)) + "</div>" +
      '<div class="bu-edsub">' + ed.items.length +
      (ed.items.length === 1 ? " story" : " stories") + " · " +
      esc(time) + " IST</div></div>" +
      '<button type="button" class="bu-ednav" data-ed-next ' +
      'aria-label="Next edition day"' +
      (edPos < edDates.length - 1 ? "" : " disabled") + ">›</button>" +
      '<a class="bu-callink" href="#earlier-editions">Calendar ' +
      '<span aria-hidden="true">↓</span></a></div>' +
      '<div class="bu-chips">' + chips + "</div>" +
      '<div class="bu-rail">' + cards + "</div>" +
      '<div class="bu-railbar">' +
      '<button type="button" class="bu-rbtn" data-bu-prev ' +
      'aria-label="Previous story">‹</button>' +
      '<div class="bu-dots"></div>' +
      '<span class="bu-railcount"></span>' +
      '<button type="button" class="bu-rbtn" data-bu-next ' +
      'aria-label="Next story">›</button></div>' +
      '<section class="bu-earlier" id="earlier-editions">' +
      '<h3 class="bu-earlier-h">Earlier editions</h3>' +
      '<div class="bu-edstrip">' + editionStrip(state) + "</div>" +
      '<div class="bu-cal" role="group" ' +
      'aria-label="Choose an edition by date">' +
      calendarInner(state) + "</div>" +
      "</section>" +
      feedsSection(state) +
      "</div>";
    wire(state);
  }
  function wire(state) {
    var root = state.root, ed = curEd(state);
    var edPrev = root.querySelector("[data-ed-prev]");
    var edNext = root.querySelector("[data-ed-next]");
    if (edPrev) edPrev.addEventListener("click", function () {
      stepEdition(state, -1);
    });
    if (edNext) edNext.addEventListener("click", function () {
      stepEdition(state, 1);
    });
    root.querySelectorAll(".bu-edstrip [data-cal-ed]").forEach(
      function (b) {
        b.addEventListener("click", function () {
          openEdition(state, Number(b.getAttribute("data-cal-ed")));
        });
      });
    wireCalendar(state);
    root.querySelectorAll(".bu-chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        state.cat = chip.getAttribute("data-cat") || "";
        render(state);
      });
    });
    var byId = {};
    ed.items.forEach(function (i) { byId[i.id] = i; });
    root.querySelectorAll(".bu-share-slot").forEach(function (slot) {
      var item = byId[slot.getAttribute("data-share")];
      if (item && window.SignalShare) {
        var btn = window.SignalShare.shareButton(shareSpec(state, item, ed));
        btn.addEventListener("click", function (e) { e.stopPropagation(); });
        slot.appendChild(btn);
      }
    });
    root.querySelectorAll(".bu-card").forEach(function (card) {
      var open = function () {
        var item = byId[card.getAttribute("data-item")];
        if (item) openSheet(state, item, ed, card);
      };
      card.addEventListener("click", open);
      card.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault(); open();
        }
      });
    });
    /* Rail dots and arrows (phone carousel) */
    var rail = root.querySelector(".bu-rail");
    var dots = root.querySelector(".bu-dots");
    var count = root.querySelector(".bu-railcount");
    var prev = root.querySelector("[data-bu-prev]");
    var next = root.querySelector("[data-bu-next]");
    var n = state.view.length, idx = 0;
    if (dots) {
      dots.innerHTML = "";
      for (var i = 0; i < n; i++) {
        var d = document.createElement("button");
        d.type = "button";
        d.setAttribute("aria-label", "Go to story " + (i + 1));
        (function (j) {
          d.addEventListener("click", function () { goTo(j); });
        })(i);
        dots.appendChild(d);
      }
    }
    function paint() {
      if (dots) {
        Array.prototype.forEach.call(dots.children, function (d, j) {
          d.classList.toggle("on", j === idx);
        });
      }
      if (count) count.textContent = n ? (idx + 1) + " / " + n : "";
      if (prev) prev.disabled = idx <= 0;
      if (next) next.disabled = idx >= n - 1;
    }
    function goTo(j) {
      idx = Math.max(0, Math.min(n - 1, j));
      var card = rail.children[idx];
      if (card) {
        rail.scrollTo({ left: card.offsetLeft - rail.offsetLeft,
          behavior: REDUCED ? "auto" : "smooth" });
      }
      paint();
    }
    if (rail) {
      rail.addEventListener("scroll", function () {
        var w = rail.clientWidth || 1;
        var j = Math.round(rail.scrollLeft / w);
        if (j !== idx && j >= 0 && j < n) { idx = j; paint(); }
      }, { passive: true });
    }
    if (prev) prev.addEventListener("click", function () { goTo(idx - 1); });
    if (next) next.addEventListener("click", function () { goTo(idx + 1); });
    paint();
  }
  function openStory(id) {
    states.forEach(function (state) {
      if (!state.data) return;
      state.data.editions.forEach(function (ed, ei) {
        ed.items.forEach(function (item) {
          if (item.id === id) {
            state.edIdx = ei; state.cat = ""; render(state);
            var card = state.root.querySelector(
              '[data-item="' + id + '"]');
            openSheet(state, item, ed, card || state.root);
          }
        });
      });
    });
  }

  /* NEW badge on the homepage tab: shown for 14 days from Nov 6, 2026. */
  document.addEventListener("DOMContentLoaded", function () {
    var badge = document.getElementById("briefNewBadge");
    if (badge) {
      var launch = new Date("2026-11-06T00:00:00+05:30").getTime();
      badge.hidden = !(Date.now() < launch + 14 * 24 * 3600 * 1000);
    }
    document.querySelectorAll("[data-brief-root]").forEach(mount);
  });

  return {
    mount: mount, openStory: openStory, fmtDate: fmtDate,
    shareSpec: shareSpec, CAT_TAGS: CAT_TAGS, CAT_COLOURS: CAT_COLOURS
  };
})();
