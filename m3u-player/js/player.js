/* Thin wrapper around <video>. webOS plays HLS/TS/MP4 natively. */
var Player = (function () {
  var v = document.getElementById('video'), spinner = document.getElementById('spinner');
  var onError = function () {}, hls = null, playToken = 0, hlsState = 0; // 0 = not loaded, 1 = loading, 2 = ready, -1 = failed
  var hlsQueue = [];
  function start(url) { v.src = url; var p = v.play(); if (p && p.catch) p.catch(function () {}); }
  function destroyHls() { if (hls) { try { hls.destroy(); } catch (e) {} hls = null; } }
  function loadHls(cb) {
    if (hlsState === 2) return cb(true);
    if (hlsState === -1) return cb(false);
    hlsQueue.push(cb);
    if (hlsState === 1) return;
    hlsState = 1;
    var s = document.createElement('script'); s.src = 'js/vendor/hls.min.js';
    var done = function (ok) {
      ok = ok && window.Hls && Hls.isSupported(); hlsState = ok ? 2 : -1;
      hlsQueue.splice(0).forEach(function (f) { f(ok); });
    };
    s.onload = function () { done(true); }; s.onerror = function () { done(false); };
    document.head.appendChild(s);
  }
  v.addEventListener('waiting', function () { spinner.classList.remove('hidden'); });
  v.addEventListener('playing', function () { spinner.classList.add('hidden'); });
  v.addEventListener('canplay', function () { spinner.classList.add('hidden'); });
  v.addEventListener('error', function () {
    spinner.classList.add('hidden');
    var e = v.error, codes = { 1: 'przerwano', 2: 'błąd sieci', 3: 'błąd dekodowania', 4: 'nieobsługiwany format/URL' };
    onError(e ? (codes[e.code] || 'błąd ' + e.code) : 'błąd');
  });
  return {
    el: v,
    onError: function (f) { onError = f; },
    play: function (url) {
      spinner.classList.remove('hidden');
      destroyHls();
      var token = ++playToken;
      // webOS / Safari play HLS natively; desktop Chrome/Firefox need hls.js (loaded only when needed)
      if (/\.m3u8(\?|$)/i.test(url) && !v.canPlayType('application/vnd.apple.mpegurl')) {
        return loadHls(function (ok) {
          if (token !== playToken) return;
          if (!ok) return start(url);
          hls = new Hls();
          hls.on(Hls.Events.ERROR, function (e, d) {
            if (d.fatal) { spinner.classList.add('hidden'); onError('HLS: ' + d.type + ' / ' + d.details + (d.response ? ' (HTTP ' + d.response.code + ')' : '')); }
          });
          hls.loadSource(url); hls.attachMedia(v);
          var p = v.play(); if (p && p.catch) p.catch(function () {});
        });
      }
      start(url);
    },
    stop: function () { playToken++; destroyHls(); v.pause(); v.removeAttribute('src'); v.load(); spinner.classList.add('hidden'); },
    toggle: function () { v.paused ? v.play() : v.pause(); },
    seek: function (d) { if (isFinite(v.duration)) v.currentTime = Math.max(0, v.currentTime + d); },
    isVod: function () { return isFinite(v.duration) && v.duration > 0; }
  };
})();
