/* Signal Brief UI: card based tab and standalone page (Nov 6, 2026).
   One module renders both surfaces from data/brief.json: the homepage
   #brief tab and the /brief/ page mount a [data-brief-root] element and
   pass data-root-prefix ("./" on the homepage, "../" on /brief/).
   Sharing goes through the shared Share panel (assets/signal-share.js);
   the news card image is rendered here in the deck card pattern. */
window.SignalBriefUI = (function () {
  var CAT_COLOURS = {
    "AI": "#4F46E5", "Quantum": "#7C3AED", "Cloud & DevOps": "#0E7490",
    "Cybersecurity": "#DC2626", "Industry": "#B45309", "Policy": "#0F766E"
  };
  var CAT_TAGS = {
    "AI": "#AI", "Quantum": "#QuantumComputing",
    "Cloud & DevOps": "#CloudComputing", "Cybersecurity": "#CyberSecurity",
    "Industry": "#TechIndustry", "Policy": "#TechPolicy"
  };
  var DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug",
    "Sep", "Oct", "Nov", "Dec"];
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

  /* ---------- news share card image (deck card pattern) ---------- */
  function wrap(x, t, mw) {
    var w = String(t || "").split(" "), L = [], l = "";
    w.forEach(function (s) {
      var t2 = l ? l + " " + s : s;
      if (x.measureText(t2).width > mw && l) { L.push(l); l = s; }
      else l = t2;
    });
    if (l) L.push(l);
    return L;
  }
  function renderNewsBlob(item, ed, size, theme) {
    return new Promise(function (resolve) {
      var SS = window.SignalShare;
      var P = (SS && SS.PALETTES[theme]) || SS.PALETTES.obsidian;
      var parts = size.split("x").map(Number), W = parts[0], H = parts[1];
      var k = W / 1080;
      var cat = CAT_COLOURS[item.category] || "#5a6b7f";
      var cv = document.createElement("canvas");
      cv.width = W; cv.height = H;
      var x = cv.getContext("2d");
      var grd = x.createLinearGradient(0, 0, 0, H);
      grd.addColorStop(0, P.bg0); grd.addColorStop(1, P.bg1);
      x.fillStyle = grd; x.fillRect(0, 0, W, H);
      x.fillStyle = cat; x.fillRect(0, 0, W, Math.round(16 * k));
      var pad = Math.round(84 * k), mw = W - 2 * pad, cx = W / 2;
      var footTop = H - Math.round(150 * k);
      var dateLine = fmtDate(ed.date) + " · " + editionTime(ed) + " IST";
      var first = firstSentence(item.summary);
      var hf = 66, bf = 40;
      function measure() {
        x.font = "700 " + Math.round(hf * k) + "px Georgia, serif";
        var head = wrap(x, item.headline, mw);
        x.font = Math.round(bf * k) + "px system-ui, sans-serif";
        var body = wrap(x, first, mw);
        x.font = Math.round((bf - 4) * k) + "px system-ui, sans-serif";
        var why = wrap(x, item.why, mw - Math.round(44 * k));
        var h = Math.round(30 * k) + Math.round(44 * k) + Math.round(30 * k) +
          head.length * Math.round(hf * 1.22 * k) + Math.round(30 * k) +
          body.length * Math.round(bf * 1.3 * k) + Math.round(34 * k) +
          why.length * Math.round((bf - 4) * 1.32 * k) + Math.round(84 * k) +
          Math.round(34 * k) + Math.round(30 * k);
        return { head: head, body: body, why: why, h: h };
      }
      var m = measure();
      var avail = footTop - Math.round(56 * k);
      while (m.h > avail && hf > 30) { hf -= 3; bf -= 2; m = measure(); }
      var y = Math.round(56 * k);
      /* Category pill */
      x.font = "700 " + Math.round(27 * k) + "px system-ui, sans-serif";
      var label = "SIGNAL BRIEF · " + String(item.category).toUpperCase();
      var tw = x.measureText(label).width;
      x.fillStyle = cat;
      var pillH = Math.round(46 * k), pillW = tw + Math.round(40 * k);
      x.beginPath();
      if (x.roundRect) x.roundRect(pad, y, pillW, pillH, pillH / 2);
      else x.rect(pad, y, pillW, pillH);
      x.fill();
      x.fillStyle = "#ffffff"; x.textAlign = "left"; x.textBaseline = "middle";
      x.fillText(label, pad + Math.round(20 * k), y + pillH / 2 + Math.round(2 * k));
      x.textBaseline = "alphabetic";
      y += pillH + Math.round(40 * k);
      x.fillStyle = P.foot;
      x.font = "600 " + Math.round(28 * k) + "px system-ui, sans-serif";
      x.fillText(dateLine, pad, y);
      y += Math.round(56 * k);
      x.fillStyle = P.head;
      x.font = "700 " + Math.round(hf * k) + "px Georgia, serif";
      m.head.forEach(function (l) {
        x.fillText(l, pad, y); y += Math.round(hf * 1.22 * k);
      });
      y += Math.round(28 * k);
      x.fillStyle = P.body;
      x.font = Math.round(bf * k) + "px system-ui, sans-serif";
      m.body.forEach(function (l) {
        if (y < footTop) x.fillText(l, pad, y);
        y += Math.round(bf * 1.3 * k);
      });
      y += Math.round(22 * k);
      /* WHY IT MATTERS box, tinted in the category colour */
      var whyH = m.why.length * Math.round((bf - 4) * 1.32 * k) +
        Math.round(84 * k);
      x.fillStyle = tint(cat, 0.16);
      x.beginPath();
      if (x.roundRect) x.roundRect(pad, y, mw, whyH, Math.round(14 * k));
      else x.rect(pad, y, mw, whyH);
      x.fill();
      x.strokeStyle = tint(cat, 0.55); x.lineWidth = Math.max(1, 1.5 * k);
      x.stroke();
      var wy = y + Math.round(38 * k);
      x.fillStyle = P.accent;
      x.font = "800 " + Math.round(23 * k) + "px system-ui, sans-serif";
      x.fillText("WHY IT MATTERS", pad + Math.round(22 * k), wy);
      wy += Math.round(36 * k);
      x.fillStyle = P.body;
      x.font = Math.round((bf - 4) * k) + "px system-ui, sans-serif";
      m.why.forEach(function (l) {
        x.fillText(l, pad + Math.round(22 * k), wy);
        wy += Math.round((bf - 4) * 1.32 * k);
      });
      y += whyH + Math.round(34 * k);
      x.fillStyle = P.foot;
      x.font = "600 " + Math.round(27 * k) + "px system-ui, sans-serif";
      x.fillText("Source: " + (item.sources[0] ?
        item.sources[0].label : ""), pad, y);
      /* Footer: THE SIGNAL · free learning, with the TRT badge */
      x.strokeStyle = P.dim; x.lineWidth = 2 * k;
      x.beginPath();
      x.moveTo(pad, H - Math.round(116 * k));
      x.lineTo(W - pad, H - Math.round(116 * k));
      x.stroke();
      x.textAlign = "center";
      x.fillStyle = P.foot;
      x.font = "600 " + Math.round(28 * k) + "px system-ui, sans-serif";
      x.fillText("THE SIGNAL · free learning", cx, H - Math.round(62 * k));
      var bx = W - pad - Math.round(38 * k), by = H - Math.round(62 * k),
        br = Math.round(34 * k);
      x.strokeStyle = P.accent; x.lineWidth = Math.round(3 * k);
      x.beginPath(); x.arc(bx, by, br, 0, Math.PI * 2); x.stroke();
      x.fillStyle = P.accent;
      x.font = "700 " + Math.round(26 * k) + "px Georgia, serif";
      x.textBaseline = "middle";
      try { x.letterSpacing = "3px"; } catch (e) {}
      x.fillText("TRT", bx, by + Math.round(2 * k));
      try { x.letterSpacing = "0px"; } catch (e) {}
      x.textAlign = "left"; x.textBaseline = "alphabetic";
      if (cv.toBlob) cv.toBlob(function (b) { resolve(b); }, "image/png");
      else resolve(null);
    });
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
      image: {
        kind: "render",
        filename: "signal-brief-" + ed.date + "-" + storyNN(item) + ".png",
        render: function (size, theme) {
          return renderNewsBlob(item, ed, size, theme);
        }
      }
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
      root: root,
      siteRoot: new URL(prefix, window.location.href).href,
      data: null, edIdx: 0, cat: "", view: []
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
    var past = state.data.editions.map(function (e, i) {
      return '<button type="button" class="bu-past-item" data-ed="' + i +
        '" aria-current="' + (i === state.edIdx) + '">' +
        '<span class="bu-past-date">' + esc(fmtDate(e.date)) + "</span>" +
        '<span class="bu-past-meta">' + e.items.length + " stories · " +
        esc(editionTime(e)) + ' IST</span>' +
        '<span class="bu-past-arrow">›</span></button>';
    }).join("");
    state.root.innerHTML =
      '<div class="brief-ui">' +
      '<header class="bu-head">' +
      '<p class="bu-kicker">Signal Brief · Daily at 07:00 IST</p>' +
      '<h2 class="bu-title">Today in tech, in one swipe.</h2>' +
      '<p class="bu-desc">The day in technology, in our own words. ' +
      "Every story is checked and linked to its source.</p>" +
      '<button type="button" class="bu-follow">Follow</button>' +
      "</header>" +
      '<div class="bu-switch">' +
      '<button type="button" class="bu-arrow" data-bu-older ' +
      'aria-label="Older edition"' +
      (state.edIdx >= state.data.editions.length - 1 ? " disabled" : "") +
      ">‹</button>" +
      '<div class="bu-eddate">' +
      (ed.breaking ? '<span class="bu-breaking">Breaking update</span>' : "") +
      esc(fmtDate(ed.date)) + "</div>" +
      '<button type="button" class="bu-arrow" data-bu-newer ' +
      'aria-label="Newer edition"' +
      (state.edIdx <= 0 ? " disabled" : "") + ">›</button></div>" +
      '<p class="bu-edmeta">' + ed.items.length + " stories · published " +
      esc(time) + " IST</p>" +
      '<div class="bu-chips">' + chips + "</div>" +
      '<div class="bu-rail">' + cards + "</div>" +
      '<div class="bu-railbar">' +
      '<button type="button" class="bu-rbtn" data-bu-prev ' +
      'aria-label="Previous story">‹</button>' +
      '<div class="bu-dots"></div>' +
      '<span class="bu-railcount"></span>' +
      '<button type="button" class="bu-rbtn" data-bu-next ' +
      'aria-label="Next story">›</button></div>' +
      '<div class="bu-past"><h3>Past editions</h3>' +
      '<div class="bu-past-list">' + past + "</div></div>" +
      "</div>";
    wire(state);
  }
  function wire(state) {
    var root = state.root, ed = curEd(state);
    root.querySelector(".bu-follow").addEventListener("click", function () {
      openFollow(state, this);
    });
    var older = root.querySelector("[data-bu-older]");
    var newer = root.querySelector("[data-bu-newer]");
    if (older) older.addEventListener("click", function () {
      if (state.edIdx < state.data.editions.length - 1) {
        state.edIdx++; state.cat = ""; render(state);
      }
    });
    if (newer) newer.addEventListener("click", function () {
      if (state.edIdx > 0) { state.edIdx--; state.cat = ""; render(state); }
    });
    root.querySelectorAll(".bu-chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        state.cat = chip.getAttribute("data-cat") || "";
        render(state);
      });
    });
    root.querySelectorAll(".bu-past-item").forEach(function (b) {
      b.addEventListener("click", function () {
        state.edIdx = Number(b.getAttribute("data-ed"));
        state.cat = "";
        render(state);
        state.root.scrollIntoView({ block: "start" });
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
