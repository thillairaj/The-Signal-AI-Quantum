/* Signal Brief UI: card based tab and standalone page (Nov 6, 2026).
   One module renders both surfaces from data/brief.json: the homepage
   #brief tab and the /brief/ page mount a [data-brief-root] element and
   pass data-root-prefix ("./" on the homepage, "../" on /brief/).
   Sharing goes through the shared Share panel (assets/signal-share.js);
   the news card image is rendered here in the deck card pattern. */
window.SignalBriefUI = (function () {
  var CAT_COLOURS = {
    "AI": "#3B82C4", "Quantum": "#7C5CBF", "Cloud & DevOps": "#1B7A6E",
    "Cybersecurity": "#A62B25", "Industry": "#201B14", "Policy": "#201B14"
  };
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
  /* ---------- edition calendar (Nov 14, 2026; week strip Nov 15) ----------
     One component replaces the edition switcher row and the Past
     editions list on both surfaces. At 900px and above it is a month
     grid of day numbers. Below 900px it collapses to a one week strip
     (the shown week, stepped by its own arrows) whose expander,
     labelled with the month and year, opens the same month grid.
     A date with an edition is a button (gold dot, full readable date
     plus story count as its aria-label); other dates are muted text.
     The today ring shows only on a date that has an edition.
     state.cal is the shown month and state.weekMs the Monday of the
     shown week; full renders sync both to the open edition, while the
     arrows re-render only the calendar so browsing months or weeks
     never changes the open edition. Opening an edition collapses the
     grid again (state.calOpen reset on every full render). */
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
  /* Monday (00:00 UTC) of the week containing the calendar date. */
  function mondayMs(y, m, d) {
    var t = Date.UTC(y, m, d);
    return t - ((new Date(t).getUTCDay() + 6) % 7) * 86400000;
  }
  function isoOf(t) {
    var d = new Date(t);
    return d.getUTCFullYear() + "-" +
      String(d.getUTCMonth() + 1).padStart(2, "0") + "-" +
      String(d.getUTCDate()).padStart(2, "0");
  }
  /* One day cell, shared by the month grid and the week strip so the
     two views can never drift: edition dates are buttons with the
     gold dot, the open edition is the filled pill, today rings only
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
  /* The compact week strip shown below 900px: the shown week's seven
     day cells on their own row, using the full card width so each
     cell stays comfortably tappable, and below them a control row
     where two week chevrons flank the expander that opens the month
     grid. The expander label takes the month of the shown week's
     Thursday, the standard week to month convention. The strip
     cannot step to a week entirely before the first edition's week,
     nor past the week containing today. */
  function weekStrip(state, byDate, first, curY, curM, curD) {
    if (state.weekMs == null) {
      var ep = dateParts(state.data.editions[state.edIdx].date);
      state.weekMs = mondayMs(ep.y, ep.m, ep.d);
    }
    var prevOff = state.weekMs <= mondayMs(first.y, first.m, first.d);
    var nextOff = state.weekMs >= mondayMs(curY, curM, curD);
    var cells = "";
    for (var i = 0; i < 7; i++) {
      var t = state.weekMs + i * 86400000;
      var dt = new Date(t);
      var isToday = dt.getUTCFullYear() === curY &&
        dt.getUTCMonth() === curM && dt.getUTCDate() === curD;
      cells += dayCell(state, byDate, isoOf(t), dt.getUTCDate(), isToday);
    }
    var thu = new Date(state.weekMs + 3 * 86400000);
    var label = MONTHS_FULL[thu.getUTCMonth()] + " " + thu.getUTCFullYear();
    return '<div class="bu-cal-strip">' +
      '<div class="bu-strip-days">' + cells + "</div>" +
      '<div class="bu-strip-ctl">' +
      '<button type="button" class="bu-strip-step" data-strip-prev ' +
      'aria-label="Previous week"' + (prevOff ? " disabled" : "") +
      ">‹</button>" +
      '<button type="button" class="bu-strip-exp" data-cal-expand ' +
      'aria-expanded="' + (state.calOpen ? "true" : "false") + '">' +
      '<span class="bu-strip-month">' + label + "</span>" +
      '<span class="bu-strip-chev" aria-hidden="true">' +
      (state.calOpen ? "▴" : "▾") + "</span></button>" +
      '<button type="button" class="bu-strip-step" data-strip-next ' +
      'aria-label="Next week"' + (nextOff ? " disabled" : "") +
      ">›</button></div></div>";
  }
  function calendarInner(state) {
    var eds = state.data.editions;
    var first = dateParts(eds[eds.length - 1].date);
    var now = new Date();
    var curY = now.getFullYear(), curM = now.getMonth(),
      curD = now.getDate();
    var byDate = editionsByDate(state);
    return weekStrip(state, byDate, first, curY, curM, curD) +
      monthGrid(state, byDate, first, curY, curM, curD);
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
    var sprev = state.root.querySelector("[data-strip-prev]");
    var snext = state.root.querySelector("[data-strip-next]");
    if (sprev) sprev.addEventListener("click", function () {
      state.weekMs -= 7 * 86400000;
      renderCalendar(state);
    });
    if (snext) snext.addEventListener("click", function () {
      state.weekMs += 7 * 86400000;
      renderCalendar(state);
    });
    var exp = state.root.querySelector("[data-cal-expand]");
    if (exp) exp.addEventListener("click", function () {
      state.calOpen = !state.calOpen;
      renderCalendar(state);
    });
    state.root.querySelectorAll("[data-cal-ed]").forEach(function (b) {
      b.addEventListener("click", function () {
        state.edIdx = Number(b.getAttribute("data-cal-ed"));
        state.cat = "";
        render(state);
        state.root.scrollIntoView({ block: "start" });
      });
    });
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
    var t = document.documentElement.getAttribute("data-theme");
    if (t) return t === "dark";
    try {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    } catch (e) { return false; }
  }
  function labelColour(cat) {
    var c = hexRgb(cat), dark = isDark();
    var card = dark ? [29, 32, 25] : [255, 255, 255];
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

  /* ---------- story sheet and Follow panel (one of each per page) ---------- */
  var sheet = null, followPanel = null;
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
    if (!followPanel) {
      var fo = document.createElement("div");
      fo.className = "bu-overlay";
      fo.hidden = true;
      fo.innerHTML =
        '<div class="bu-sheet" role="dialog" aria-modal="true" ' +
        'aria-label="Follow Signal Brief">' +
        '<div class="bu-sheet-top"><div class="bu-sheet-meta">' +
        '<span class="bu-pill" style="background:#b8860b">Follow</span>' +
        '</div><button type="button" class="bu-close" aria-label="Close">' +
        "×</button></div>" +
        "<h3>Follow Signal Brief</h3>" +
        '<p class="bu-follow-text">Get every edition in a news reader ' +
        "app such as Feedly or Inoreader. Copy a feed link and paste it " +
        "into the app's follow box.</p>" +
        '<div class="bu-feed-rows"></div>' +
        '<p class="bu-follow-status" aria-live="polite"></p></div>';
      document.body.appendChild(fo);
      followPanel = {
        ov: fo, rows: fo.querySelector(".bu-feed-rows"),
        status: fo.querySelector(".bu-follow-status"), invoker: null
      };
      fo.querySelector(".bu-close").addEventListener("click", closeFollow);
      fo.addEventListener("click", function (e) {
        if (e.target === fo) closeFollow();
      });
      fo.addEventListener("keydown", function (e) {
        if (e.key === "Escape") closeFollow();
      });
    }
  }
  function openSheet(state, item, ed, invoker) {
    ensureOverlays(state);
    var cat = CAT_COLOURS[item.category] || "#5a6b7f";
    sheet.meta.innerHTML =
      '<span><span class="bu-pill" style="background:' + cat + '">' +
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
  function openFollow(state, invoker) {
    ensureOverlays(state);
    var feeds = [{ label: "All stories", file: "signal.xml" }]
      .concat(state.data.categories || []);
    followPanel.rows.innerHTML = "";
    feeds.forEach(function (f) {
      var url = state.siteRoot + f.file;
      var row = document.createElement("div");
      row.className = "bu-feed-row";
      row.innerHTML = '<span class="bu-feed-name">' + esc(f.label) +
        '</span><span class="bu-feed-url">' + esc(url) + "</span>";
      var b = document.createElement("button");
      b.type = "button";
      b.className = "bu-copy";
      b.textContent = "Copy link";
      b.addEventListener("click", function () {
        var done = function () {
          followPanel.status.textContent = "Copied: " + f.label + " feed link";
        };
        if (window.SignalShare) window.SignalShare.copy(url).then(done);
        else done();
      });
      row.appendChild(b);
      followPanel.rows.appendChild(row);
    });
    followPanel.status.textContent = "";
    followPanel.invoker = invoker || document.activeElement;
    followPanel.ov.hidden = false;
    followPanel.prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    var c = followPanel.ov.querySelector(".bu-close");
    if (c) c.focus();
  }
  function closeFollow() {
    if (!followPanel) return;
    followPanel.ov.hidden = true;
    document.body.style.overflow = followPanel.prevOverflow || "";
    if (followPanel.invoker && followPanel.invoker.focus) {
      try { followPanel.invoker.focus(); } catch (e) {}
    }
  }

  /* ---------- the mounted UI ---------- */
  var states = [];
  function mount(root) {
    var prefix = root.getAttribute("data-root-prefix") || "./";
    var state = {
      tab: prefix === "./",
      root: root,
      siteRoot: new URL(prefix, window.location.href).href,
      data: null, edIdx: 0, cat: "", view: [], cal: null,
      weekMs: null, calOpen: false
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
    var edp = dateParts(ed.date);
    state.cal = { y: edp.y, m: edp.m };
    state.weekMs = mondayMs(edp.y, edp.m, edp.d);
    state.calOpen = false;
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
          (CAT_COLOURS[c] || "#5a6b7f") + '"></span>' + esc(c) +
          '<span class="bu-count">' + n + "</span></button>";
      })).join("");
    var cards = state.view.map(function (item) {
      var pos = ed.items.indexOf(item) + 1;
      var cat = CAT_COLOURS[item.category] || "#5a6b7f";
      return '<article class="bu-card" tabindex="0" role="button" ' +
        'data-item="' + esc(item.id) + '" aria-label="' +
        esc(item.headline) + '">' +
        '<div class="bu-band" style="background:' + cat + '"></div>' +
        '<div class="bu-card-in">' +
        '<p class="bu-card-meta"><span class="bu-pill" style="background:' +
        cat + '">' + esc(item.category) + '</span>' +
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
      '<header class="bu-head">' +
      (state.tab
        ? '<h2 class="bu-title">Signal Brief</h2>' +
          '<p class="bu-desc">The day in technology, in our own words. ' +
          "New every day at 07:00 IST.</p>"
        : '<h2 class="bu-title">Signal Brief</h2>' +
          '<p class="bu-desc">The day in technology, in our own words. ' +
          "New every day at 07:00 IST.</p>") +
      '<button type="button" class="bu-follow">Follow</button>' +
      "</header>" +
      '<div class="bu-cal" role="group" ' +
      'aria-label="Choose an edition by date">' +
      calendarInner(state) + "</div>" +
      '<p class="bu-edmeta">' +
      (ed.breaking ? '<span class="bu-breaking">Breaking update</span>' : "") +
      esc(fmtDate(ed.date)) + " · " + ed.items.length +
      " stories · published " + esc(time) + " IST</p>" +
      '<div class="bu-chips">' + chips + "</div>" +
      '<div class="bu-rail">' + cards + "</div>" +
      '<div class="bu-railbar">' +
      '<button type="button" class="bu-rbtn" data-bu-prev ' +
      'aria-label="Previous story">‹</button>' +
      '<div class="bu-dots"></div>' +
      '<span class="bu-railcount"></span>' +
      '<button type="button" class="bu-rbtn" data-bu-next ' +
      'aria-label="Next story">›</button></div>' +
      "</div>";
    wire(state);
  }
  function wire(state) {
    var root = state.root, ed = curEd(state);
    root.querySelector(".bu-follow").addEventListener("click", function () {
      openFollow(state, this);
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
