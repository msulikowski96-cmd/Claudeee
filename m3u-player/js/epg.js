/* XMLTV EPG: parsing, channel matching, now/next lookup.
   Works in browser (window.Epg) and Node (module.exports). */
(function (root) {
  var WINDOW_BACK = 3600e3, WINDOW_FWD = 36 * 3600e3;

  function decode(s) {
    return String(s).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
      .replace(/&(#x?[0-9a-f]+|amp|lt|gt|quot|apos);/gi, function (m, e) {
        if (e.charAt(0) === '#') return String.fromCharCode(e.charAt(1).toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
        return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }[e.toLowerCase()];
      }).trim();
  }

  // "20240131203000 +0100" -> epoch ms
  function time(s) {
    var m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?\s*([+-]\d{4})?/.exec(s || '');
    if (!m) return NaN;
    var t = Date.UTC(+m[1], m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0));
    if (m[7]) t -= (m[7].charAt(0) === '-' ? -1 : 1) * (m[7].slice(1, 3) * 60 + +m[7].slice(3)) * 60000;
    return t;
  }

  // normalised channel name used for fuzzy matching playlist <-> EPG
  function norm(name) {
    var s = String(name).toLowerCase().replace(/ł/g, 'l');
    if (s.normalize) s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return s.replace(/\[[^\]]*\]|\([^)]*\)/g, ' ').replace(/\b(fhd|uhd|hd|4k|pl)\b/g, ' ').replace(/[^a-z0-9]/g, '');
  }

  function attr(s, n) { var m = new RegExp('\\b' + n + '="([^"]*)"').exec(s); return m ? decode(m[1]) : ''; }
  function tag(s, n) { var m = new RegExp('<' + n + '(?:\\s[^>]*)?>([\\s\\S]*?)</' + n + '>').exec(s); return m ? decode(m[1]) : ''; }

  /* parse(xmlText, items, now) -> compact store:
     { t, ids: {epgId:1}, names: {normName: epgId}, progs: {epgId: [[start,end,title,desc], ...]} }
     Only programmes for channels matched by `items` and inside the time window are kept. */
  function parse(xml, items, now) {
    now = now || Date.now();
    var ids = {}, names = {}, m, re = /<channel\s+([^>]*?)>([\s\S]*?)<\/channel>/g;
    while ((m = re.exec(xml))) {
      var id = attr(m[1], 'id'); if (!id) continue;
      ids[id] = 1;
      var dn = /<display-name(?:\s[^>]*)?>([\s\S]*?)<\/display-name>/g, d;
      while ((d = dn.exec(m[2]))) { var k = norm(decode(d[1])); if (k && !names[k]) names[k] = id; }
      var k2 = norm(id.replace(/\.[a-z]{2,3}$/i, '')); if (k2 && !names[k2]) names[k2] = id;
    }
    var store = { t: now, ids: ids, names: names, progs: {} };
    var want = {};
    (items || []).forEach(function (it) { var id = idFor(store, it); if (id) want[id] = 1; });
    var pr = /<programme\s+([^>]*?)>([\s\S]*?)<\/programme>/g;
    while ((m = pr.exec(xml))) {
      var ch = attr(m[1], 'channel'); if (!want[ch]) continue;
      var s = time(attr(m[1], 'start')), e = time(attr(m[1], 'stop'));
      if (isNaN(s) || isNaN(e) || e < now - WINDOW_BACK || s > now + WINDOW_FWD) continue;
      (store.progs[ch] = store.progs[ch] || []).push([s, e, tag(m[2], 'title'), tag(m[2], 'desc')]);
    }
    Object.keys(store.progs).forEach(function (c) { store.progs[c].sort(function (a, b) { return a[0] - b[0]; }); });
    return store;
  }

  function idFor(store, item) {
    if (!store || !item) return '';
    if (item.tvgId && store.ids[item.tvgId]) return item.tvgId;
    return store.names[norm(item.name)] || '';
  }

  function list(store, item, now) {
    var id = idFor(store, item); now = now || Date.now();
    return ((store && store.progs[id]) || []).filter(function (p) { return p[1] > now; });
  }
  function nowNext(store, item, now) {
    now = now || Date.now();
    var l = list(store, item, now), cur = l[0] && l[0][0] <= now ? l[0] : null;
    return { now: cur, next: cur ? l[1] : l[0] };
  }

  var api = { parse: parse, idFor: idFor, list: list, nowNext: nowNext, norm: norm, time: time };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Epg = api;
})(this);
