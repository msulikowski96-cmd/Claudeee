/* Thin wrapper around <video>. webOS plays HLS/TS/MP4 natively. */
var Player = (function () {
  var v = document.getElementById('video'), spinner = document.getElementById('spinner');
  var onError = function () {};
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
      v.src = url;
      var p = v.play(); if (p && p.catch) p.catch(function () {});
    },
    stop: function () { v.pause(); v.removeAttribute('src'); v.load(); spinner.classList.add('hidden'); },
    toggle: function () { v.paused ? v.play() : v.pause(); },
    seek: function (d) { if (isFinite(v.duration)) v.currentTime = Math.max(0, v.currentTime + d); },
    isVod: function () { return isFinite(v.duration) && v.duration > 0; }
  };
})();
