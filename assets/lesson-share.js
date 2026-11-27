/* The Signal: per-lesson share buttons for the video learning spaces.
   One shared script for every *-learning-space page. Lesson cards are
   built by each space's own script (article.card inside a .rail), so
   this script enhances cards whenever they appear: once on
   DOMContentLoaded and again via a MutationObserver for cards added
   later. Each card gets the standard icon-only share button
   (SignalShare.shareButton) at its top-right, opening the one share
   panel with a "Video lesson" card image built by
   SignalShare.cardImage. Themes and layout live in signal-share.js. */
(function () {
  if (!window.SignalShare) return;

  var STYLE_ID = "lesson-share-style";
  if (!document.getElementById(STYLE_ID)) {
    var st = document.createElement("style");
    st.id = STYLE_ID;
    st.textContent = [
      ".rail .card{position:relative}",
      ".rail .card>.sg-share-btn{position:absolute;top:8px;right:8px;z-index:6}",
      ".sg-share-btn{width:32px;height:32px;border-radius:50%;border:1px solid var(--sg-line,#E4DAC6);background:var(--sg-surface,#fff);color:var(--sg-ink,#201B14);display:inline-flex;align-items:center;justify-content:center;cursor:pointer;padding:0;flex:0 0 auto}",
      ".sg-share-btn:hover{border-color:#3F7D20;color:#3F7D20}",
      ":root[data-tone='rose'] .sg-share-btn:hover{border-color:#2F6A18;color:#2F6A18}",
      ":root[data-theme='dark'] .sg-share-btn:hover{border-color:#8CC56A;color:#8CC56A}",
      ".sg-share-btn svg{width:15px;height:15px}"
    ].join("\n");
    document.head.appendChild(st);
  }

  function hashtagFor(tech) {
    var map = { ai: "#AI", quantum: "#QuantumComputing",
      cloud: "#CloudComputing", cyber: "#CyberSecurity",
      founders: "#Leadership", signal: "#AI" };
    return map[tech] || "#AI";
  }

  function techForPage() {
    var dt = document.documentElement.getAttribute("data-tech");
    if (dt) return dt;
    var seg = location.pathname.split("/").filter(Boolean);
    var dir = (seg[seg.length - 1] || "").replace(/\.html$/, "");
    if (!dir || dir === "index") dir = seg[seg.length - 2] || "";
    if (dir.indexOf("ai-quantum") === 0) return "quantum";
    if (dir.indexOf("quantum") === 0) return "quantum";
    if (dir.indexOf("cloud-devops") === 0) return "cloud";
    if (dir.indexOf("cybersecurity") === 0) return "cyber";
    if (dir.indexOf("ai") === 0) return "ai";
    return "signal";
  }

  function slugify(text) {
    return String(text || "lesson").toLowerCase()
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "lesson";
  }

  function spaceName() {
    return (document.title || "The Signal").split("·")[0].trim();
  }

  function enhance(card) {
    if (!card || card.dataset.sgShare) return;
    var titleEl = card.querySelector(".card-meta h3, h3");
    var title = titleEl ? titleEl.textContent.trim() : "";
    if (!title) return;
    var linkEl = card.querySelector(".card-actions a[href], a[href]");
    var href = linkEl ? linkEl.href : location.href;
    var byline = card.querySelector(".byline");
    var channel = "";
    var meta = "";
    if (byline) {
      var strong = byline.querySelector("strong");
      channel = strong ? strong.textContent.trim() : "";
      meta = byline.textContent.replace(/\s+/g, " ").trim().replace(/^By\s+/i, "");
    }
    var trackEl = card.closest ? card.closest("section.track") : null;
    var trackH = trackEl ? trackEl.querySelector(".track-head h2") : null;
    var track = trackH ?
      trackH.textContent.replace(/\s+/g, " ").trim() : "";
    var levelEl = card.querySelector(".level");
    var level = levelEl ? levelEl.textContent.trim() : "";
    if (level && meta.indexOf(level) < 0) meta = meta ? meta + " · " + level : level;
    if (!meta) meta = level;
    var tech = techForPage();
    var spec = {
      title: title,
      line: meta,
      link: href,
      caption: SignalShare.buildCaption([title, meta,
        "Watch it free:\n" + href, "#TheSignal " + hashtagFor(tech)]),
      tags: "#TheSignal " + hashtagFor(tech),
      tech: tech,
      image: SignalShare.cardImage({
        type: "Video lesson", tech: tech, heading: title,
        topic: track || "Video room", body: meta,
        source: channel || spaceName()
      }, slugify(title) + ".png")
    };
    var btn = SignalShare.shareButton(spec);
    /* The shared button's own handler opens the panel but does not
       stop propagation. Capture the click here, in the capture phase,
       stop it reaching the card (so it can never trigger the card's
       own play/link behaviour), and open the panel from this handler:
       in some engines stopPropagation in a capture listener on the
       button also suppresses the button's own bubble-phase listener,
       so opening here guarantees the panel in every engine. If both
       handlers do run, openPanel simply re-opens with the same spec. */
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      e.preventDefault();
      SignalShare.openPanel(spec, btn);
    }, true);
    card.dataset.sgShare = "1";
    card.appendChild(btn);
  }

  function enhanceAll(root) {
    var cards = (root || document).querySelectorAll(".rail .card");
    Array.prototype.forEach.call(cards, enhance);
  }

  function start() {
    enhanceAll(document);
    if (window.MutationObserver && document.body) {
      var pending = false;
      var obs = new MutationObserver(function () {
        if (pending) return;
        pending = true;
        setTimeout(function () { pending = false; enhanceAll(document); }, 60);
      });
      obs.observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
