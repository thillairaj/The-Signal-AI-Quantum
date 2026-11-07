/* The Signal — automatic version check.
   Each page carries <meta name="signal-build" content="BUILD_ID"> and the site root
   carries /version.json with the current build id. On load we fetch version.json
   without cache; if the build differs, a slim dismissible bar offers a cache-bypassing
   refresh. Any failure (offline, missing file) shows nothing. */
(function () {
  try {
    var meta = document.querySelector('meta[name="signal-build"]');
    if (!meta || !meta.content) return;
    var mine = meta.content;
    var src = (document.currentScript && document.currentScript.src) || '';
    var root = src.replace(/assets\/version-check\.js.*$/, '');
    if (!root) return;
    fetch(root + 'version.json', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || !data.build || data.build === mine) return;
        var KEY = 'signal-update-dismissed';
        try { if (sessionStorage.getItem(KEY) === data.build) return; } catch (e) {}
        if (document.getElementById('signal-update-bar')) return;
        var bar = document.createElement('div');
        bar.id = 'signal-update-bar';
        bar.setAttribute('role', 'status');
        var msg = document.createElement('span');
        msg.textContent = 'A newer version is available';
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'sv-refresh';
        btn.textContent = 'Refresh';
        btn.addEventListener('click', function () {
          var u = new URL(window.location.href);
          u.searchParams.set('_sv', data.build);
          window.location.replace(u.toString());
        });
        var x = document.createElement('button');
        x.type = 'button';
        x.className = 'sv-dismiss';
        x.setAttribute('aria-label', 'Dismiss');
        x.textContent = '×';
        x.addEventListener('click', function () {
          try { sessionStorage.setItem(KEY, data.build); } catch (e) {}
          bar.remove();
        });
        bar.appendChild(msg);
        bar.appendChild(btn);
        bar.appendChild(x);
        document.body.appendChild(bar);
      })
      .catch(function () { /* offline or missing: show nothing */ });
  } catch (e) { /* never break the page */ }
})();
