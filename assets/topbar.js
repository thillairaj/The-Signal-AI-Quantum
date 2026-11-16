/* Shared top bar behaviour for The Signal deep pages (Nov 15, 2026).
   Dependency free. The bar markup is emitted by
   patch-global-topbar.py (and by the family builders that import it)
   and styled by assets/design-system.css; this script carries only
   the behaviour: the Learn mega menu (click, outside click, Esc,
   aria-expanded), the mobile full screen menu (button, close, Esc,
   aria-expanded), the theme toggle for the spaces and games
   (data-tb-theme; the other families wire their own by id), and
   the Breaking dot in the bar, which lights while
   any breaking item is inside its 24 hour active window (read from
   data/breaking.json, resolved relative to this script so every page
   depth works). Defensive throughout: a missing element or a failed
   fetch leaves the static bar in place and never throws. */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function initMega() {
    var btn = $("[data-tb-learn]"), panel = $("[data-tb-mega]");
    if (!btn || !panel) return;
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

  function initMobileMenu() {
    var btn = $("[data-tb-menu-btn]"), menu = $("[data-tb-mobile]");
    if (!btn || !menu) return;
    var closeBtn = $("[data-tb-mm-close]", menu);
    function setMenu(open) {
      menu.hidden = !open;
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      if (open && closeBtn) closeBtn.focus();
      if (!open) btn.focus();
    }
    btn.addEventListener("click", function () { setMenu(menu.hidden); });
    if (closeBtn) closeBtn.addEventListener("click", function () { setMenu(false); });
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape" && !menu.hidden) setMenu(false);
    });
    $$("a, button", menu).forEach(function (el) {
      el.addEventListener("click", function () { if (el !== closeBtn) menu.hidden = true; });
    });
  }

  /* Theme toggle wiring (round 5, Nov 15, 2026) for the families
     whose pages carry no inline theme script of their own: the
     learning spaces and the games. Their bar button carries
     data-tb-theme; decks, tables, the hub and the Brief wire their
     own buttons by id and are not touched here. The mechanism is
     the site standard: the aisignal_theme localStorage key plus
     the data-theme attribute on the root element (the pre paint
     init script and the data-theme palette overrides are emitted
     per page by patch-global-topbar.py). The glyph follows the
     deck convention: a sun while dark is active, a moon while
     light is active. */
  function initThemeToggle() {
    var btn = $("[data-tb-theme]");
    if (!btn) return;
    var root = document.documentElement;
    function current() {
      var t = root.getAttribute("data-theme");
      if (t === "dark" || t === "light") return t;
      var dark = false;
      if (typeof window.matchMedia === "function") {
        try { dark = window.matchMedia("(prefers-color-scheme: dark)").matches; } catch (e) { /* light */ }
      }
      return dark ? "dark" : "light";
    }
    function sync() { btn.textContent = current() === "dark" ? "☀" : "☾"; }
    sync();
    btn.addEventListener("click", function () {
      var next = current() === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("aisignal_theme", next); } catch (e) { /* private mode */ }
      sync();
    });
  }

  function initBreakingDot() {
    var dot = $("[data-tb-bk-dot]");
    if (!dot) return;
    var scriptEl = document.currentScript ||
      document.querySelector('script[src*="topbar.js"]');
    var base = "";
    if (scriptEl && scriptEl.src) {
      base = scriptEl.src.replace(/assets\/topbar\.js.*$/, "");
    }
    fetch(base + "data/breaking.json", { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var now = window.__BREAKING_NOW__ ? new Date(window.__BREAKING_NOW__) : new Date();
        var active = (data.items || []).some(function (it) {
          var t = Date.parse(it.published || "");
          return !isNaN(t) && t <= now.getTime() && (now.getTime() - t) < 24 * 3600 * 1000;
        });
        dot.hidden = !active;
      })
      .catch(function () { /* dot stays hidden */ });
  }

  /* Header height tracking (round 4, Nov 15, 2026). The bar is
     sticky; design-system.css reserves scroll-padding-top from the
     --ds-header-h custom property so anchor jumps land below the
     bar. This keeps the property equal to the bar's measured
     height: bar alone normally, bar plus ticker while the Breaking
     ticker inside the bar is visible (the ticker is toggled
     asynchronously by assets/breaking.js, so the bar is observed
     for attribute and subtree changes as well as resizes). */
  function syncHeaderHeight() {
    var bar = $(".ds-topbar");
    if (!bar) return;
    var h = 0;
    if (bar.getBoundingClientRect) h = bar.getBoundingClientRect().height || 0;
    if (!h) h = bar.offsetHeight || 0;
    if (h > 0) {
      document.documentElement.style.setProperty("--ds-header-h", h + "px");
    }
  }

  function initHeaderSync() {
    var bar = $(".ds-topbar");
    if (!bar) return;
    syncHeaderHeight();
    window.addEventListener("resize", syncHeaderHeight);
    if (typeof ResizeObserver !== "undefined") {
      try { new ResizeObserver(syncHeaderHeight).observe(bar); } catch (e) { /* fall through */ }
    }
    if (typeof MutationObserver !== "undefined") {
      try {
        new MutationObserver(syncHeaderHeight).observe(bar, {
          attributes: true, childList: true, subtree: true,
          attributeFilter: ["hidden", "class", "style"]
        });
      } catch (e) { /* resize listener still covers viewport changes */ }
    }
  }
  window.DSHeader = { sync: syncHeaderHeight };

  function init() {
    try { initMega(); } catch (e) { /* menu is progressive enhancement */ }
    try { initMobileMenu(); } catch (e) { /* as above */ }
    try { initBreakingDot(); } catch (e) { /* dot stays hidden */ }
    try { initThemeToggle(); } catch (e) { /* toggle is progressive enhancement */ }
    try { initHeaderSync(); } catch (e) { /* CSS fallback height still applies */ }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else { init(); }
})();
