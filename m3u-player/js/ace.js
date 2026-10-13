/* Ace Stream support.
   Playlist entries point to an engine at 127.0.0.1:6878, which on a TV is the TV itself.
   Ace.resolve() rewrites them to the user-configured engine (PC / Android box / NAS in the LAN)
   and, in "hls" mode, to /ace/manifest.m3u8 which webOS plays natively. */
var Ace = (function () {
  var RE = /^https?:\/\/[^\/]+\/ace\/(?:getstream|manifest\.m3u8)\?(.*)$/i;
  function isAce(url) { return RE.test(url) || /^acestream:\/\//i.test(url); }
  function resolve(url, cfg) {
    var q, m = RE.exec(url);
    if (m) q = m[1];
    else if (/^acestream:\/\//i.test(url)) q = 'id=' + url.replace(/^acestream:\/\//i, '').replace(/[\/?#].*$/, '');
    else return url;
    var host = (cfg.engine || '127.0.0.1:6878').replace(/^https?:\/\//i, '').replace(/\/+$/, '');
    var path = cfg.aceMode === 'ts' ? 'getstream' : 'manifest.m3u8';
    return 'http://' + host + '/ace/' + path + '?' + q;
  }
  function isLocal(cfg) { return /^(https?:\/\/)?(127\.|localhost)/i.test(cfg.engine || '127.0.0.1'); }
  return { isAce: isAce, resolve: resolve, isLocal: isLocal };
})();
if (typeof module !== 'undefined') module.exports = Ace;
