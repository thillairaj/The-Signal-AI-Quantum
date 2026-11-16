/* Topic hub behaviour (Nov 15, 2026; rails Nov 16, 2026): renders
   one horizontal rail per format from the topic data file
   (data/topic-quantum.json here), wires the rail arrows, mounts the
   page share button, and fills the sidebar boxes from
   data/breaking.json and data/brief.json. Written as the reusable
   template for the other topic hubs: swap the data file and the
   page is done. Defensive throughout; a failed fetch leaves the
   fallback text in place.

   Rails (Nov 16, 2026): the filter tabs and the full grid are gone.
   Each format with items gets one rail, in FORMATS order, capped at
   RAIL_CAP items; the rail header carries the full count and a
   "See all" link to topics/<topic>/formats/<slug>/, the full list
   page built by build-topic-format-pages.py from the same data.
   Ordering rule, mirrored in that builder: within a format, items
   sort by their `date` field, newest first, when the data carries
   one; items without a date keep the data file's existing order
   (the sort is stable). The current data carries no dates, so
   today's order is the data file's order. */
(function () {
  "use strict";
  var SLOT_TIMES = ["02:00", "06:00", "10:00", "14:00", "18:00", "22:00"];
  var DATA_URL = "../../data/topic-quantum.json";
  var RAIL_CAP = 12;
  /* Canonical rail order: data format name, display name, page slug.
     Mirrored in build-topic-format-pages.py (FORMATS); the QA
     harness asserts the two agree with the data. */
  var FORMATS = [
    { name: "Decks", display: "Decks", slug: "decks" },
    { name: "Explainers", display: "Explainers", slug: "explainers" },
    { name: "Tables", display: "Periodic tables", slug: "tables" },
    { name: "Videos", display: "Video rooms", slug: "videos" },
    { name: "Games", display: "Games", slug: "games" },
    { name: "Podcasts", display: "Podcasts", slug: "podcasts" },
    { name: "Articles", display: "Articles", slug: "articles" }
  ];
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function getJSON(url) {
    return fetch(url, { credentials: "same-origin" }).then(function (r) {
      if (!r.ok) throw new Error("http " + r.status);
      return r.json();
    });
  }
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July",
    "August", "September", "October", "November", "December"];
  function shortDate(iso) {
    var p = String(iso).slice(0, 10).split("-");
    return (+p[2]) + " " + MONTHS[+p[1] - 1].slice(0, 3) + " " + p[0];
  }
  function nextCheckIST(now) {
    var ist = new Date(now.getTime() + (330 + now.getTimezoneOffset()) * 60000);
    var mins = ist.getHours() * 60 + ist.getMinutes();
    for (var i = 0; i < SLOT_TIMES.length; i++) {
      var p = SLOT_TIMES[i].split(":");
      if ((+p[0]) * 60 + (+p[1]) > mins) return SLOT_TIMES[i];
    }
    return SLOT_TIMES[0];
  }

  function orderedItems(items) {
    return items.slice().sort(function (a, b) {
      return String(b.date || "").localeCompare(String(a.date || ""));
    });
  }
  function cardHTML(it) {
    return '<a class="ds-hub-card ds-rail-card" data-format="' + esc(it.format) +
      '" href="' + esc(it.url) + '">' +
      '<span class="ds-fmt ds-fmt-' + esc(it.format) + '">' + esc(it.format) + "</span>" +
      "<h3>" + esc(it.title) + "</h3><p>" + esc(it.desc) + "</p>" +
      '<p class="ds-card-meta">' + esc(it.meta) + "</p></a>";
  }

  function wireRail(section) {
    var track = $(".ds-rail-track", section);
    var prev = $(".ds-rail-prev", section);
    var next = $(".ds-rail-next", section);
    if (!track || !prev || !next) return;
    function step() {
      var card = $(".ds-rail-card", track);
      return card ? card.offsetWidth + 14 : 280;
    }
    function update() {
      var max = track.scrollWidth - track.clientWidth;
      if (max <= 1) {
        prev.hidden = true;
        next.hidden = true;
        return;
      }
      prev.hidden = false;
      next.hidden = false;
      prev.disabled = track.scrollLeft <= 1;
      next.disabled = track.scrollLeft >= max - 1;
    }
    prev.addEventListener("click", function () {
      track.scrollLeft = Math.max(0, track.scrollLeft - step());
    });
    next.addEventListener("click", function () {
      track.scrollLeft = track.scrollLeft + step();
    });
    track.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    if (window.requestAnimationFrame) window.requestAnimationFrame(update);
    update();
  }

  function renderRails(data) {
    var wrap = $("[data-hub-rails]");
    if (wrap) {
      var byFormat = {};
      (data.items || []).forEach(function (it) {
        (byFormat[it.format] = byFormat[it.format] || []).push(it);
      });
      var html = "";
      FORMATS.forEach(function (f) {
        var items = orderedItems(byFormat[f.name] || []);
        if (!items.length) return;
        var shown = items.slice(0, RAIL_CAP);
        html += '<section class="ds-rail" data-rail="' + esc(f.name) + '">' +
          '<div class="ds-rail-head"><h2>' + esc(f.display) + " (" + items.length + ")</h2>" +
          '<span class="ds-rail-nav">' +
          '<button class="ds-rail-btn ds-rail-prev" type="button" aria-label="Scroll the ' +
          esc(f.display) + ' rail back">◀</button>' +
          '<button class="ds-rail-btn ds-rail-next" type="button" aria-label="Scroll the ' +
          esc(f.display) + ' rail forward">▶</button></span>' +
          '<a class="ds-rail-seeall" href="formats/' + esc(f.slug) + '/">See all →</a></div>' +
          '<div class="ds-rail-track" tabindex="0" role="region" aria-label="' +
          esc(f.display) + ' items">' +
          shown.map(cardHTML).join("") + "</div></section>";
      });
      wrap.innerHTML = html;
      $$(".ds-rail", wrap).forEach(wireRail);
    }
    if (data.flashcard) {
      var q = $('[data-hub-flash="q"]'), a = $('[data-hub-flash="a"]');
      if (q) q.textContent = data.flashcard.q;
      if (a) a.textContent = data.flashcard.a;
    }
    var mount = document.getElementById("ssPageMount");
    if (mount && window.SignalShare && window.SignalShare.mountPageShare && data.share) {
      var cfg = {};
      Object.keys(data.share).forEach(function (k) { cfg[k] = data.share[k]; });
      cfg.link = window.location.origin + window.location.pathname;
      cfg.image = new URL("../../assets/og/topics/quantum.png", window.location.href).href;
      try { window.SignalShare.mountPageShare(mount, cfg); } catch (e) { /* share is optional */ }
    }
  }

  function renderBreaking(data) {
    var box = $("[data-hub-breaking]");
    var compact = $("[data-hub-bk-status]");
    if (!box && !compact) return;
    var now = window.__BREAKING_NOW__ ? new Date(window.__BREAKING_NOW__) : new Date();
    var active = (data.items || []).filter(function (it) {
      return it.category === "Quantum" &&
        now - new Date(it.published) >= 0 &&
        now - new Date(it.published) < 24 * 3600 * 1000;
    });
    if (!active.length) {
      var quiet = "No quantum alerts today. Next check at " +
        esc(nextCheckIST(now)) + " IST.";
      if (box) box.innerHTML = "<p>" + quiet + "</p>" +
        '<p><a href="../../breaking/">Open the Breaking page</a></p>';
      if (compact) compact.innerHTML = "<p><strong>Quantum breaking:</strong> " + quiet +
        ' <a href="../../breaking/">Breaking page</a></p>';
      return;
    }
    if (box) box.innerHTML = active.map(function (it) {
      return '<div class="ds-side-item"><a href="../../breaking/">' + esc(it.headline) +
        "</a><span>" + esc(it.category) + " \u00B7 active now</span></div>";
    }).join("");
    if (compact) compact.innerHTML = "<p><strong>Quantum breaking:</strong> " +
      '<a href="../../breaking/">' + esc(active[0].headline) + "</a></p>";
  }

  function renderBrief(data) {
    var box = $("[data-hub-brief]");
    if (!box) return;
    var eds = (data.editions || []).slice().sort(function (a, b) {
      return String(b.published || b.date).localeCompare(String(a.published || a.date));
    }).slice(0, 2);
    var out = [];
    eds.forEach(function (ed) {
      (ed.items || []).forEach(function (it) {
        if (it.category === "Quantum" && out.length < 4) {
          var nn = String(it.id || "").split("-").pop();
          out.push({ headline: it.headline, date: ed.date, href: "../../brief/" + ed.date + "/" + nn + "/" });
        }
      });
    });
    if (!out.length) {
      box.innerHTML = "<p>No quantum stories in the latest editions.</p>";
      return;
    }
    box.innerHTML = out.map(function (s) {
      return '<div class="ds-side-item"><a href="' + esc(s.href) + '">' + esc(s.headline) +
        "</a><span>Signal Brief \u00B7 " + esc(shortDate(s.date)) + "</span></div>";
    }).join("");
    var first = $("[data-hub-brief-first]");
    if (first) first.innerHTML = "<p><strong>Top Quantum story in the Brief:</strong> " +
      '<a href="' + esc(out[0].href) + '">' + esc(out[0].headline) + "</a></p>";
  }

  function init() {
    getJSON(DATA_URL).then(renderRails).catch(function () {});
    getJSON("../../data/breaking.json").then(renderBreaking).catch(function () {});
    getJSON("../../data/brief.json").then(renderBrief).catch(function () {});
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else { init(); }
})();
