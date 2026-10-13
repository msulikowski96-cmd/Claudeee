/* M3U / M3U8 parser – works in browser (window.M3U) and Node (module.exports). */
(function (root) {
  function attrs(str) {
    var out = {}, re = /([\w-]+)="([^"]*)"/g, m;
    while ((m = re.exec(str))) out[m[1].toLowerCase()] = m[2];
    return out;
  }

  function parse(text) {
    var lines = String(text).replace(/^﻿/, '').split(/\r?\n/);
    var items = [], cur = null, opts = {};
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) continue;
      if (line.indexOf('#EXTINF:') === 0) {
        var body = line.slice(8);
        // title is after the last comma that is not inside quotes
        var inQ = false, comma = -1;
        for (var c = 0; c < body.length; c++) {
          if (body[c] === '"') inQ = !inQ;
          else if (body[c] === ',' && !inQ) { comma = c; break; }
        }
        var meta = comma >= 0 ? body.slice(0, comma) : body;
        var a = attrs(meta);
        var dur = parseFloat(meta);
        cur = {
          name: (comma >= 0 ? body.slice(comma + 1).trim() : '') || a['tvg-name'] || '',
          logo: a['tvg-logo'] || '',
          group: a['group-title'] || '',
          tvgId: a['tvg-id'] || '',
          duration: isNaN(dur) ? -1 : dur,
          headers: {}
        };
      } else if (line.indexOf('#EXTGRP:') === 0) {
        if (!cur) cur = { headers: {} };
        cur.group = cur.group || line.slice(8).trim();
      } else if (line.indexOf('#EXTVLCOPT:') === 0) {
        var kv = line.slice(11).split('=');
        if (!cur) cur = { headers: {} };
        var k = kv.shift().toLowerCase(), v = kv.join('=');
        if (k === 'http-user-agent') cur.headers['User-Agent'] = v;
        if (k === 'http-referrer') cur.headers['Referer'] = v;
      } else if (line.charAt(0) === '#') {
        continue;
      } else {
        var it = cur || { headers: {} };
        it.url = line;
        it.name = it.name || line.split('/').pop().replace(/\?.*$/, '') || line;
        it.group = it.group || 'Bez grupy';
        it.logo = it.logo || '';
        items.push(it);
        cur = null;
      }
    }
    return items;
  }

  function groups(items) {
    var map = {}, order = [];
    items.forEach(function (it) {
      if (!map[it.group]) { map[it.group] = 0; order.push(it.group); }
      map[it.group]++;
    });
    return order.map(function (g) { return { name: g, count: map[g] }; });
  }

  var api = { parse: parse, groups: groups };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.M3U = api;
})(this);
