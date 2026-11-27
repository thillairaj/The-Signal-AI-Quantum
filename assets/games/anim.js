/* Signal Games character animation layer (Round 1).
   One shared layer for every game: instant feedback, character reactions
   and the calm idle timeline for Kings and Fox & Penguin.
   Rules: transform and opacity only; pauses while the tab is hidden, the
   help card is open or the result screen is showing; off entirely under
   reduce motion or when the player turns Calm animations off in the help
   card (localStorage key signal_games_quiet, shared by all games).
   Animations never touch timing, scoring, par or streaks. */
(function () {
  var KEY = 'signal_games_quiet';
  function stored() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function isOn() { return stored() !== '"off"' && stored() !== 'off'; }
  function setOn(on) {
    try { localStorage.setItem(KEY, JSON.stringify(on ? 'on' : 'off')); } catch (e) {}
    syncClass();
  }
  function reduced() {
    try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
  }
  function enabled() { return isOn() && !reduced(); }
  function syncClass() {
    if (document.documentElement) document.documentElement.classList.toggle('sg-quiet', !enabled());
  }
  function add(el, cls, ms) {
    if (!el || !enabled()) return;
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
    setTimeout(function () { el.classList.remove(cls); }, ms || 500);
  }
  function pop(el) { add(el, 'sg-pop', 460); }
  function shake(el) { add(el, 'sg-shake', 460); }
  function hop(el, delay) {
    if (!el || !enabled()) return;
    setTimeout(function () { add(el, 'sg-hop', 500); }, delay || 0);
  }
  function shimmer(els) {
    if (!enabled() || !els) return;
    els.forEach(function (el, i) { if (el) setTimeout(function () { add(el, 'sg-shimmer', 700); }, i * 40); });
  }
  function gasp(el) {
    if (!el || !enabled()) return;
    add(el, 'sg-shake', 460);
    var b = document.createElement('span'); b.className = 'sg-gasp'; b.textContent = '!';
    el.appendChild(b); setTimeout(function () { b.remove(); }, 1200);
  }
  function burst(el, text) {
    if (!el || !enabled()) return;
    var b = document.createElement('span'); b.className = 'sg-burst'; b.textContent = text || '×2';
    el.appendChild(b); setTimeout(function () { b.remove(); }, 800);
  }
  function neighbours(board, cell, sel) {
    if (!board || !cell || !enabled()) return;
    var r = +cell.dataset.r, c = +cell.dataset.c;
    board.querySelectorAll(sel).forEach(function (el) {
      var dr = Math.abs(+el.dataset.r - r), dc = Math.abs(+el.dataset.c - c);
      if ((dr + dc) === 1) hop(el, 60);
    });
  }
  function win(board, sel) {
    if (!board || !enabled()) return;
    var els = board.querySelectorAll(sel);
    els.forEach(function (el, i) { hop(el, i * 90); });
  }
  /* ---------- idle timeline ----------
     0 to 10 s: nothing. At 10 s a subtle blink and board breathe (about
     1 s). At 20 s a fidget (about 3 s) with a doze and one hint offer
     bubble (about 6 s). Then repeats: a movement at most every 20 s,
     blinks and fidgets alternating, at most 3 hint offers per puzzle.
     At 3 minutes the characters nap, then nothing moves and no timers
     run until the next tap. Any tap, key or touch stops everything at
     once with a happy hop and restarts the clock. */
  var idle = null;
  function paused() {
    if (document.hidden) return true;
    if (document.querySelector('.helpcard')) return true;
    if (document.querySelector('#cele')) return true;
    return false;
  }
  function clearFx(s) {
    if (!s) return;
    s.chars().forEach(function (el) { el.classList.remove('sg-blink', 'sg-fidget', 'sg-nap'); });
    var b = s.boardEl && s.boardEl(); if (b) b.classList.remove('sg-breathe', 'sg-nap');
    s.zz.forEach(function (z) { z.remove(); }); s.zz = [];
    if (s.bubble) { s.bubble.remove(); s.bubble = null; }
  }
  function stopIdle() {
    if (!idle) return;
    clearTimeout(idle.timer); clearFx(idle);
    window.removeEventListener('pointerdown', idle.onAct, true);
    window.removeEventListener('keydown', idle.onAct, true);
    window.removeEventListener('touchstart', idle.onAct, true);
    idle = null;
  }
  function startIdle(opts) {
    stopIdle();
    if (!opts || !opts.board) return;
    var s = {
      boardEl: function () { return typeof opts.board === 'function' ? opts.board() : opts.board; },
      chars: opts.chars || function () { return []; },
      offers: 0, zz: [], bubble: null, timer: 0, step: 0, napped: false,
      onAct: null
    };
    /* steps: [delay from previous event, kind]; after the list, nap */
    var plan = [[10000, 'blink'], [10000, 'fidget'], [20000, 'blink'], [20000, 'fidget'],
                [20000, 'blink'], [20000, 'fidget'], [20000, 'blink'], [20000, 'fidget']];
    function arm() {
      if (idle !== s) return;
      if (s.step >= plan.length) {
        s.timer = setTimeout(function () {
          if (idle !== s) return;
          s.napped = true;
          if (enabled() && !paused()) {
            s.chars().forEach(function (el) { el.classList.add('sg-nap'); });
            setTimeout(function () { s.chars().forEach(function (el) { el.classList.remove('sg-nap'); }); }, 13000);
          }
        }, 40000);
        return;
      }
      var d = plan[s.step][0], kind = plan[s.step][1];
      s.timer = setTimeout(function () { fire(kind); }, d);
    }
    function fire(kind) {
      if (idle !== s) return;
      if (!enabled() || paused()) { s.timer = setTimeout(function () { fire(kind); }, 2000); return; }
      var cs = s.chars();
      if (kind === 'blink') {
        if (cs[0]) add(cs[0], 'sg-blink', 1000);
        var bb = s.boardEl(); if (bb) add(bb, 'sg-breathe', 1000);
      } else {
        cs.forEach(function (el, i) { setTimeout(function () { add(el, 'sg-fidget', 3000); }, i * 200); });
        if (cs.length) {
          var z = document.createElement('span'); z.className = 'sg-zz'; z.textContent = 'z z';
          cs[cs.length - 1].appendChild(z); s.zz.push(z);
          setTimeout(function () { z.remove(); s.zz = s.zz.filter(function (q) { return q !== z; }); }, 3000);
        }
        var bel = s.boardEl();
        if (s.offers < 3 && bel && bel.parentNode) {
          s.offers++;
          var b = document.createElement('div'); b.className = 'sg-hintbubble'; b.textContent = 'Need a hint?';
          bel.parentNode.appendChild(b); s.bubble = b;
          setTimeout(function () { if (s.bubble === b) { b.remove(); s.bubble = null; } }, 6000);
        }
      }
      s.step++; arm();
    }
    s.onAct = function () {
      if (idle !== s) return;
      var wasActive = s.step > 0 || s.bubble || s.napped;
      clearTimeout(s.timer); clearFx(s); s.step = 0; s.napped = false;
      if (wasActive && enabled()) s.chars().forEach(function (el, i) { hop(el, i * 70); });
      arm();
    };
    window.addEventListener('pointerdown', s.onAct, true);
    window.addEventListener('keydown', s.onAct, true);
    window.addEventListener('touchstart', s.onAct, true);
    idle = s; arm();
    return s;
  }
  window.SGAnim = {
    enabled: enabled, isOn: isOn, setOn: setOn, reduced: reduced,
    pop: pop, shake: shake, hop: hop, shimmer: shimmer, gasp: gasp, burst: burst,
    neighbours: neighbours, win: win, startIdle: startIdle, stopIdle: stopIdle,
    _idle: function () { return idle; }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', syncClass);
  else syncClass();
})();
