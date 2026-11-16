/* Breaking lane (Nov 15, 2026, preview build): renders the homepage strip
   and the standalone /breaking/ page from data/breaking.json.
   Rules enforced here are display rules only; the publication gates live
   in the breaking job and are documented in breaking/SYSTEM.md.
   An item is active for 24 hours from its published time, then it moves
   to the archive. Items in data.review_queue are never rendered.
   window.__BREAKING_NOW__ (an ISO timestamp) pins "now" for QA. */
(function () {
  "use strict";

  var SLOT_TIMES = ["02:00", "06:00", "10:00", "14:00", "18:00", "22:00"];
  var DAY_MS = 24 * 60 * 60 * 1000;
  var CAT_COLOURS = {
    "AI": "#4F46E5",
    "Quantum": "#7C3AED",
    "Cloud & DevOps": "#0E7490",
    "Cybersecurity": "#DC2626",
    "Industry": "#B45309",
    "Policy": "#0F766E"
  };

  function now() {
    if (window.__BREAKING_NOW__) return new Date(window.__BREAKING_NOW__);
    return new Date();
  }

  function istDateKey(d) {
    var parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit"
    }).formatToParts(d);
    var y = "", m = "", dd = "";
    parts.forEach(function (p) {
      if (p.type === "year") y = p.value;
      if (p.type === "month") m = p.value;
      if (p.type === "day") dd = p.value;
    });
    return y + "-" + m + "-" + dd;
  }

  function fmtIST(iso) {
    var d = new Date(iso);
    var date = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric"
    }).format(d);
    var time = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false
    }).format(d);
    return date + " · " + time + " IST";
  }

  function fmtTimeIST(iso) {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false
    }).format(new Date(iso)) + " IST";
  }

  function isActive(item, at) {
    var t = Date.parse(item.published || "");
    if (isNaN(t)) return false;
    var ms = at.getTime();
    return t <= ms && (ms - t) < DAY_MS;
  }

  function byNewest(a, b) {
    return Date.parse(b.published || "") - Date.parse(a.published || "");
  }

  function computeActive(items, at) {
    return (items || []).filter(function (it) { return isActive(it, at); }).sort(byNewest);
  }

  function computeArchive(items, at) {
    return (items || []).filter(function (it) {
      var t = Date.parse(it.published || "");
      return !isNaN(t) && t <= at.getTime() && !isActive(it, at);
    }).sort(byNewest);
  }

  /* States for today's six slots, in order. Past slots read the slot log;
     the first future slot is the next check; the rest are later. Each
     state also carries its display label (home.js renders it directly). */
  function slotStates(data, at) {
    var today = istDateKey(at);
    var log = {};
    (data.slots || []).forEach(function (s) {
      if (s.date === today) log[s.time] = s;
    });
    function mk(time, state, count) {
      var st = { time: time, state: state, count: count };
      st.label = slotLabel(st);
      return st;
    }
    var nextAssigned = false;
    return SLOT_TIMES.map(function (t) {
      if (log[t]) {
        return mk(t, log[t].result === "published" ? "published" : "none",
          log[t].count || 0);
      }
      var slotDate = new Date(today + "T" + t + ":00+05:30");
      if (slotDate.getTime() > at.getTime()) {
        if (!nextAssigned) {
          nextAssigned = true;
          return mk(t, "next", 0);
        }
        return mk(t, "later", 0);
      }
      return mk(t, "nolog", 0);
    });
  }

  window.SignalBreaking = {
    SLOT_TIMES: SLOT_TIMES,
    CAT_COLOURS: CAT_COLOURS,
    istDateKey: istDateKey,
    fmtIST: fmtIST,
    fmtTimeIST: fmtTimeIST,
    isActive: isActive,
    computeActive: computeActive,
    computeArchive: computeArchive,
    slotStates: slotStates
  };

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function itemHTML(item, archived) {
    var colour = CAT_COLOURS[item.category] || "#555555";
    var srcs = (item.sources || []).map(function (s) {
      return '<a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.label) + "</a>";
    }).join(" · ");
    return '<article class="bk-item">' +
      '<p class="bk-item-meta"><span class="bk-chip" style="background:' + colour + '">' +
      esc(item.category) + '</span><time class="bk-item-time">' + esc(fmtIST(item.published)) + "</time>" +
      (archived ? '<span class="bk-item-arch">Archived</span>' : "") + "</p>" +
      '<h3 class="bk-item-h">' + esc(item.headline) + "</h3>" +
      '<p class="bk-item-what">' + esc(item.what) + "</p>" +
      '<div class="bk-impact"><span class="bk-impact-label">Tech impact</span><p>' +
      esc(item.impact) + "</p></div>" +
      '<p class="bk-srcs">Sources: ' + srcs + "</p></article>";
  }

  function slotLabel(st) {
    if (st.state === "published") return "Published · " + st.count + (st.count === 1 ? " item" : " items");
    if (st.state === "none") return "Checked · no breaking news";
    if (st.state === "next") return "Next check";
    if (st.state === "later") return "Later today";
    return "No log recorded";
  }

  /* Homepage ticker: every active item scrolls in one continuous loop.
     The sequence is duplicated once for the loop; the duplicate is
     aria-hidden and its links are unfocusable, so each item is read and
     tabbed to exactly once. Under prefers-reduced-motion the CSS turns
     the track into a static list and hides the duplicate. */
  function renderStrip(data, at, base) {
    var strip = document.getElementById("breakingStrip");
    if (!strip) return;
    var active = computeActive(data.items, at);
    if (!active.length) {
      strip.hidden = true;
      strip.innerHTML = "";
      return;
    }
    function tick(it, dup) {
      return '<span class="bk-tick"><time class="bk-tick-time">' +
        esc(fmtTimeIST(it.published)) + '</time> ' +
        '<span class="bk-tick-head">' + esc(it.headline) + "</span> " +
        '<a class="bk-tick-link" href="' + esc(base) + 'breaking/"' +
        (dup ? ' tabindex="-1"' : "") + ">Read more</a></span>";
    }
    function seq(dup) {
      return '<div class="bk-ticker-seq"' + (dup ? ' aria-hidden="true"' : "") +
        ">" + active.map(function (it) { return tick(it, dup); }).join("") + "</div>";
    }
    var seconds = Math.max(18, active.length * 12);
    strip.innerHTML =
      '<span class="bk-dot" aria-hidden="true"></span>' +
      '<span class="bk-strip-label">Breaking</span>' +
      '<div class="bk-ticker"><div class="bk-ticker-track" style="--bk-dur:' +
      seconds + 's">' + seq(false) + seq(true) + "</div></div>";
    strip.hidden = false;
  }

  function renderPage(data, at) {
    var root = document.querySelector("[data-breaking-root]");
    if (!root) return;
    var tl = document.getElementById("bkTimeline");
    if (tl) {
      tl.innerHTML = slotStates(data, at).map(function (st) {
        return '<li class="bk-slot bk-slot-' + st.state + '">' +
          '<span class="bk-slot-time">' + st.time + ' IST</span>' +
          '<span class="bk-slot-state">' + slotLabel(st) + "</span></li>";
      }).join("");
    }
    var active = computeActive(data.items, at);
    var itemsEl = document.getElementById("bkItems");
    if (itemsEl) {
      itemsEl.innerHTML = active.length
        ? active.map(function (it) { return itemHTML(it, false); }).join("")
        : '<p class="bk-empty">No active breaking items right now. The lane checks again at the next slot.</p>';
    }
    var arch = computeArchive(data.items, at);
    var archEl = document.getElementById("bkArchive");
    if (archEl) {
      archEl.innerHTML = arch.length
        ? arch.map(function (it) { return itemHTML(it, true); }).join("")
        : '<p class="bk-empty">Nothing in the archive yet. Items move here 24 hours after they publish.</p>';
    }
  }

  function go() {
    var scriptEl = document.currentScript ||
      document.querySelector('script[src*="breaking.js"]');
    var base = "";
    if (scriptEl && scriptEl.src) {
      base = scriptEl.src.replace(/assets\/breaking\.js.*$/, "");
    }
    fetch(base + "data/breaking.json", { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var at = now();
        renderStrip(data, at, base);
        renderPage(data, at);
      })
      .catch(function () { /* strip stays hidden, page keeps its fallback text */ });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", go);
  } else {
    go();
  }
})();
