/* Persistent state in localStorage (safe against failures). */
var Store = (function () {
  function get(k, d) { try { var v = localStorage.getItem('m3u.' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function set(k, v) { try { localStorage.setItem('m3u.' + k, JSON.stringify(v)); } catch (e) {} }
  return {
    playlists: function () { return get('playlists', []); },
    savePlaylists: function (l) { set('playlists', l); },
    favorites: function () { return get('favs', {}); },
    saveFavorites: function (f) { set('favs', f); },
    last: function () { return get('last', {}); },
    saveLast: function (l) { set('last', l); },
    cache: function (id) { return get('cache.' + id, null); },
    saveCache: function (id, text) { set('cache.' + id, text); }
  };
})();
