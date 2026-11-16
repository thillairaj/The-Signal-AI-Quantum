/* Homepage behaviour for the design system build (Nov 15, 2026):
   top bar and mega menu, mobile menu, data rendering from
   data/home-counts.json, the News two ways panels from
   data/breaking.json and data/brief.json, and the Subscribe
   controls, which scroll to the Kit signup block. Defensive
   throughout: a failed fetch leaves the static fallback content in
   place and never throws. */
(function () {
  "use strict";
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
  function num(n) { return Number(n).toLocaleString("en-IN"); }
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July",
    "August", "September", "October", "November", "December"];
  var DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  function readableDate(iso) {
    var p = String(iso).slice(0, 10).split("-");
    var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
    return DAYS[d.getUTCDay()] + " " + d.getUTCDate() + " " + MONTHS[d.getUTCMonth()] + " " + d.getUTCFullYear();
  }
  function shortDate(iso) {
    var p = String(iso).slice(0, 10).split("-");
    return (+p[2]) + " " + MONTHS[+p[1] - 1].slice(0, 3) + " " + p[0];
  }

  /* ---------- navigation: mega menu, mobile menu, scrolling ---------- */
  function goHomeThenScroll(id) {
    var target = document.getElementById(id);
    if (!target) return;
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    function scroll() {
      target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    }
    var home = document.getElementById("home-view");
    if (home && !home.hidden) { scroll(); return; }
    if (window.location.hash !== "#home") { window.location.hash = "#home"; }
    var tries = 0;
    var iv = window.setInterval(function () {
      tries += 1;
      if ((home && !home.hidden) || tries > 24) {
        window.clearInterval(iv);
        window.setTimeout(scroll, 40);
      }
    }, 60);
  }

  function initNav() {
    var btn = $("#dsLearnBtn"), panel = $("#dsMega");
    if (btn && panel) {
      var wrap = btn.closest(".ds-mega-wrap") || btn.parentNode;
      function setOpen(open, focusFirst) {
        panel.hidden = !open;
        btn.setAttribute("aria-expanded", open ? "true" : "false");
        if (open && focusFirst) {
          var first = panel.querySelector("a");
          if (first) first.focus();
        }
      }
      btn.addEventListener("click", function (ev) {
        setOpen(panel.hidden, ev.detail === 0);
      });
      document.addEventListener("click", function (ev) {
        if (!panel.hidden && !wrap.contains(ev.target)) setOpen(false, false);
      });
      document.addEventListener("keydown", function (ev) {
        if (ev.key === "Escape" && !panel.hidden) { setOpen(false, false); btn.focus(); }
      });
      $$("a", panel).forEach(function (a) {
        a.addEventListener("click", function () { setOpen(false, false); });
      });
    }
    var menuBtn = $("#dsMenuBtn"), menu = $("#dsMobileMenu");
    if (menuBtn && menu) {
      var closeBtn = $("[data-ds-mm-close]", menu);
      function setMenu(open) {
        menu.hidden = !open;
        menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
        if (open && closeBtn) closeBtn.focus();
        if (!open) menuBtn.focus();
      }
      menuBtn.addEventListener("click", function () { setMenu(menu.hidden); });
      if (closeBtn) closeBtn.addEventListener("click", function () { setMenu(false); });
      document.addEventListener("keydown", function (ev) {
        if (ev.key === "Escape" && !menu.hidden) setMenu(false);
      });
      $$("a, button", menu).forEach(function (el) {
        el.addEventListener("click", function () { if (el !== closeBtn) menu.hidden = true; });
      });
    }
    $$("[data-ds-scroll]").forEach(function (el) {
      el.addEventListener("click", function (ev) {
        ev.preventDefault();
        goHomeThenScroll(el.getAttribute("data-ds-scroll"));
      });
    });
  }

  /* ---------- subscribe: every Subscribe control scrolls to the
     Kit signup block (wired by assets/signup.js) ---------- */
  function initSubscribe() {
    $$("[data-ds-subscribe]").forEach(function (a) {
      a.addEventListener("click", function (ev) {
        ev.preventDefault();
        goHomeThenScroll("subscribe-block");
      });
    });
  }

  /* ---------- counts, hero, wire, latest ---------- */
  function renderCounts(data) {
    var c = data.counts || {};
    function set(sel, val) { var el = $(sel); if (el) el.textContent = val; }
    set(".ds-stat-pages b", c.learningPages);
    var dl = c.decks || {};
    set(".ds-stat-decks b", dl.topicsTotal);
    set(".ds-stat-decks span",
      "deck topics \u2014 " + dl.topicsLive + " live, " + (dl.topicsTotal - dl.topicsLive) + " to come");
    set(".ds-stat-terms b", num((c.tables || {}).terms));
    set(".ds-stat-explainers b", c.explainers);
    set(".ds-stat-articles b", c.articles);
    set(".ds-stat-wire b", c.wire);
    var lines = {
      decks: dl.topicsLive + " of " + dl.topicsTotal + " deck topics live",
      explainers: c.explainers + " interactive explainers",
      tables: (c.tables || {}).tables + " tables \u00B7 " + num((c.tables || {}).terms) + " terms",
      videos: num((c.videos || {}).lessons) + " video lessons in " + (c.videos || {}).rooms + " rooms",
      games: c.games + " games live",
      podcasts: (c.podcasts || {}).episodes + " episodes \u00B7 " + (c.podcasts || {}).series + " series",
      articles: c.articles + " research articles",
      wire: c.wire + " stories on the wire"
    };
    Object.keys(lines).forEach(function (k) {
      set('[data-ds-count="' + k + '"]', lines[k]);
    });
    Object.keys(data.topics || {}).forEach(function (k) {
      var t = data.topics[k];
      set('[data-ds-topic="' + k + '"]',
        t.lessons + " video lessons \u00B7 " + t.deckLive + " deck topics live \u00B7 " +
        t.tables + " tables \u00B7 " + num(t.terms) + " terms");
    });
    var hero = data.hero || {};
    if (hero.flashcard) {
      set('[data-ds-hero="fq"]', hero.flashcard.q);
      set('[data-ds-hero="fa"]', hero.flashcard.a);
      set('[data-ds-hero="ftopic"]', hero.flashcard.deck + " \u00B7 " + hero.flashcard.topic);
    }
    if (hero.episode) set('[data-ds-hero="ep"]', hero.episode.title);
    if (hero.quiz) {
      set('[data-ds-hero="quiz"]', hero.quiz.topic);
      set('[data-ds-hero="quizmeta"]', hero.quiz.count + " questions \u00B7 " + hero.quiz.deck + " deck");
    }
    if (data.deckCard) {
      set('[data-ds-tile="deckq"]', data.deckCard.q);
      set('[data-ds-tile="decka"]', data.deckCard.a);
    }
    var track = $("[data-ds-wire]");
    if (track && (data.wireHeadlines || []).length) {
      var html = "";
      data.wireHeadlines.concat(data.wireHeadlines).forEach(function (w) {
        html += "<p><span>" + esc(w.source) + "</span> " + esc(w.title) + "</p>";
      });
      track.innerHTML = html;
    }
    var latest = $("[data-ds-latest]");
    if (latest && (data.latest || []).length) {
      latest.innerHTML = data.latest.map(function (it) {
        return '<a class="ds-latest-card" href="' + esc(it.url) + '">' +
          '<span class="ds-fmt ds-fmt-' + esc(it.format) + '">' + esc(it.format) + "</span>" +
          "<h3>" + esc(it.title) + "</h3><p>Added " + esc(shortDate(it.date)) + "</p></a>";
      }).join("");
    }
  }

  /* ---------- News two ways: Breaking panel ---------- */
  function renderBreaking(data) {
    var SB = window.SignalBreaking;
    var now = window.__BREAKING_NOW__ ? new Date(window.__BREAKING_NOW__) : new Date();
    var active = [];
    if (SB && SB.computeActive) {
      active = SB.computeActive(data.items || [], now);
    } else {
      active = (data.items || []).filter(function (it) {
        return now - new Date(it.published) < 24 * 3600 * 1000;
      });
    }
    var dot = $("[data-ds-bk-dot]");
    if (dot) dot.hidden = active.length === 0;
    var slotsEl = $("[data-ds-slots]");
    if (slotsEl && SB && SB.slotStates) {
      slotsEl.innerHTML = SB.slotStates(data, now).map(function (s) {
        return '<li class="ds-slot ds-slot-' + esc(s.state) + '"><b>' +
          esc(s.time) + " IST</b>" + esc(s.label) + "</li>";
      }).join("");
    }
    var box = $("[data-ds-bk-latest]");
    if (!box) return;
    if (!active.length) {
      box.innerHTML = '<p class="ds-quiet">No breaking items are active right now. ' +
        "The lane checks again on the four hour cycle and publishes only when a story qualifies.</p>";
      return;
    }
    var it = active[0];
    var src = (it.sources || [])[0] || {};
    var when = SB && SB.fmtIST ? SB.fmtIST(it.published) : "";
    box.innerHTML =
      '<p class="ds-panel-line">' + esc(it.category) + (it.company ? " \u00B7 " + esc(it.company) : "") +
      (when ? " \u00B7 " + esc(when) : "") + "</p>" +
      "<h4>" + esc(it.headline) + '</h4><p class="ds-bk-what">' + esc(it.what) + "</p>" +
      '<div class="ds-impact"><b>Tech impact</b>' + esc(it.impact) + "</div>" +
      (src.url ? '<p class="ds-src">Source: <a href="' + esc(src.url) +
        '" target="_blank" rel="noopener">' + esc(src.label || "Primary source") + "</a></p>" : "") +
      (it.financial ? '<p class="ds-src">Not investment advice.</p>' : "");
  }

  /* ---------- News two ways: Signal Brief panel ---------- */
  function renderBrief(data) {
    var eds = (data.editions || []).slice().sort(function (a, b) {
      return String(b.published || b.date).localeCompare(String(a.published || a.date));
    });
    var ed = eds[0];
    if (!ed) return;
    var dateEl = $("[data-ds-brief-date]");
    if (dateEl) dateEl.textContent = readableDate(ed.date) + " \u00B7 " + (ed.items || []).length + " stories";
    var list = $("[data-ds-brief-top]");
    if (!list) return;
    list.innerHTML = (ed.items || []).slice(0, 5).map(function (it, i) {
      var nn = String(it.id || "").split("-").pop();
      var href = "brief/" + ed.date + "/" + nn + "/";
      return "<li><span class=\"ds-brief-num\">" + (i + 1) + "</span><span>" +
        '<span class="ds-brief-cat">' + esc(it.category) + "</span>" +
        '<a href="' + esc(href) + '">' + esc(it.headline) + "</a></span></li>";
    }).join("");
  }

  /* ---------- Signal Brief banner (replaces the old first visit
     popup; dismissal persists in localStorage) ---------- */
  function initBriefBanner() {
    var KEY = "signalBriefBannerV1";
    var banner = $("#briefBanner");
    if (!banner) return;
    var seen = false;
    try { seen = !!window.localStorage.getItem(KEY); } catch (e) {}
    if (seen) return;
    banner.hidden = false;
    var close = $("#briefBannerClose");
    if (close) close.addEventListener("click", function () {
      banner.hidden = true;
      try { window.localStorage.setItem(KEY, "1"); } catch (e) {}
    });
  }

  function init() {
    try { initNav(); } catch (e) { /* nav is progressive enhancement */ }
    try { initSubscribe(); } catch (e) { /* static href already set */ }
    try { initBriefBanner(); } catch (e) { /* banner stays hidden */ }
    getJSON("data/home-counts.json").then(renderCounts).catch(function () {});
    getJSON("data/breaking.json").then(renderBreaking).catch(function () {});
    getJSON("data/brief.json").then(renderBrief).catch(function () {});
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else { init(); }
})();
