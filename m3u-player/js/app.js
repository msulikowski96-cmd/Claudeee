/* M3U Player – UI & remote control logic */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var KEY = { LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, ENTER: 13, BACK: 461, ESC: 27, BS: 8,
    CH_UP: 427, CH_DN: 428, PGUP: 33, PGDN: 34, PLAY: 415, PAUSE: 19, STOP: 413, FF: 417, RW: 412,
    RED: 403, GREEN: 404, YELLOW: 405, BLUE: 406 };
  var MOBILE = document.documentElement.classList.contains('mobile');
  var ROWS = 10;
  var ALL = 1e9; // phone: render whole list and let the browser scroll it natively
  var SIDE = ['btnPlaylists', 'btnAdd', 'btnSettings'];
  var settings = Store.settings();
  var epg = null; // parsed XMLTV store for the current playlist

  var state = {
    playlist: null, items: [], groups: [], group: '__all__', filter: '',
    view: [], favs: Store.favorites(), playing: null, playingUrl: null, zone: 'channels',
    mode: 'browser', dialog: null
  };

  /* ---------- helpers ---------- */
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var toastT;
  function toast(msg, ms) {
    var t = $('toast'); t.textContent = msg; t.classList.remove('hidden');
    clearTimeout(toastT); toastT = setTimeout(function () { t.classList.add('hidden'); }, ms || 3000);
  }

  /* ---------- EPG ---------- */
  function hm(t) { var d = new Date(t); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
  function epgLine(c) {
    if (!epg) return '';
    var nn = Epg.nowNext(epg, c); if (!nn.now && !nn.next) return '';
    var p = nn.now || nn.next;
    return '<span class="epg">' + (nn.now ? '' : 'wkrótce ') + hm(p[0]) + ' ' + esc(p[2]) + '</span>';
  }
  function gunzip(buf, cb) {
    if (typeof DecompressionStream === 'undefined') return cb(new Error('ta wersja webOS nie obsługuje .gz – użyj nieskompresowanego XML'));
    try {
      var ds = new DecompressionStream('gzip');
      new Response(new Blob([buf]).stream().pipeThrough(ds)).text().then(function (t) { cb(null, t); }, cb);
    } catch (e) { cb(e); }
  }
  function fetchEpg(url, cb) {
    var x = new XMLHttpRequest(); x.open('GET', url, true); x.responseType = 'arraybuffer'; x.timeout = 120000;
    x.onload = function () {
      if (x.status < 200 || x.status >= 300) return cb(new Error('HTTP ' + x.status));
      var u = new Uint8Array(x.response), gz = u[0] === 0x1f && u[1] === 0x8b;
      if (gz) return gunzip(x.response, cb);
      try { cb(null, new TextDecoder('utf-8').decode(u)); } catch (e) { cb(e); }
    };
    x.onerror = function () { cb(new Error('błąd sieci / CORS')); };
    x.ontimeout = function () { cb(new Error('przekroczono czas')); };
    x.send();
  }
  function loadEpg(pl, force) {
    epg = null;
    var url = settings.epg || (pl && pl.tvgUrl) || '';
    if (!pl || !url) { chList.render(); return; }
    var c = Store.epgCache(pl.id);
    if (c && c.url === url && Date.now() - c.t < 6 * 3600e3 && !force) { epg = c; chList.render(); return; }
    if (c && c.url === url) { epg = c; chList.render(); } // show stale data while refreshing
    toast('Pobieranie EPG…', 4000);
    fetchEpg(url, function (err, xml) {
      if (state.playlist !== pl) return;
      if (err) return toast('EPG: ' + err.message, 6000);
      setTimeout(function () {
        var st = Epg.parse(xml, state.items); st.url = url;
        epg = st; chList.render(); Store.saveEpgCache(pl.id, st);
        var n = Object.keys(st.progs).length;
        toast(n ? 'EPG: dopasowano kanałów ' + n : 'EPG pobrany, ale żaden kanał nie pasuje (sprawdź tvg-id / nazwy)', 4000);
        if (state.mode === 'player') showOsd();
      }, 50);
    });
  }

  /* ---------- windowed list ---------- */
  function List(el, rows, renderRow) {
    this.el = el; this.rows = rows; this.renderRow = renderRow; this.data = []; this.idx = 0; this.top = 0;
  }
  List.prototype.set = function (data, idx) { this.data = data; this.idx = Math.min(idx || 0, Math.max(0, data.length - 1)); this.top = 0; this.render(); };
  List.prototype.move = function (d) {
    if (!this.data.length) return;
    this.idx = Math.max(0, Math.min(this.data.length - 1, this.idx + d)); this.render();
  };
  List.prototype.render = function (focused) {
    if (this.idx < this.top) this.top = this.idx;
    if (this.idx >= this.top + this.rows) this.top = this.idx - this.rows + 1;
    var html = '', end = Math.min(this.data.length, this.top + this.rows), st = this.el.scrollTop;
    for (var i = this.top; i < end; i++) html += this.renderRow(this.data[i], i, i === this.idx && this.focused);
    this.el.innerHTML = html;
    if (this.rows === ALL) this.el.scrollTop = st; // keep touch-scroll position across re-renders
  };
  // pointer support: click picks a row, wheel scrolls
  List.prototype.bind = function (onPick) {
    var self = this;
    this.el.addEventListener('click', function (e) {
      var li = e.target; while (li && li.parentNode !== self.el) li = li.parentNode;
      if (!li) return;
      self.idx = self.top + Array.prototype.indexOf.call(self.el.children, li);
      self.render(); onPick(self.cur());
    });
    if (!MOBILE) this.el.addEventListener('wheel', function (e) { e.preventDefault(); self.move(e.deltaY > 0 ? 3 : -3); if (self.onMove) self.onMove(); });
  };
  List.prototype.focus = function (on) { this.focused = on; this.render(); };
  List.prototype.cur = function () { return this.data[this.idx]; };

  var groupList = new List($('groups'), ROWS, function (g, i, f) {
    return '<li class="' + (f ? 'focus' : '') + (g.id === state.group ? ' active' : '') + '"><span class="name">' + esc(g.name) + '</span><span class="num">' + g.count + '</span></li>';
  });
  var chList = new List($('channels'), MOBILE ? ALL : ROWS, function (c, i, f) {
    var fav = state.favs[c.url] ? '<span class="fav">★</span>' : '';
    var playing = c.url === state.playingUrl;
    return '<li class="' + (f ? 'focus' : '') + (playing ? ' active' : '') + '"><span class="num">' + (c.n) + '</span>' +
      (c.logo ? '<img src="' + esc(c.logo) + '" loading="lazy" onerror="this.style.display=\'none\'">' : '<img class="ph" style="visibility:hidden">') +
      '<span class="name"><span>' + esc(c.name) + '</span>' + epgLine(c) + '</span>' + fav + '</li>';
  });
  var plList = new List($('plList'), MOBILE ? ALL : 7, function (p, i, f) {
    return '<li class="' + (f ? 'focus' : '') + '"><span class="name">' + esc(p.name) + '</span><span class="num">' + (p.url ? 'URL' : 'tekst') + '</span></li>';
  });

  /* ---------- playlist loading ---------- */
  function fetchText(url, cb) {
    var x = new XMLHttpRequest();
    x.open('GET', url, true);
    x.timeout = 30000;
    x.onload = function () { (x.status >= 200 && x.status < 300 || x.status === 0) && x.responseText ? cb(null, x.responseText) : cb(new Error('HTTP ' + x.status)); };
    x.onerror = function () { cb(new Error('błąd sieci / CORS')); };
    x.ontimeout = function () { cb(new Error('przekroczono czas')); };
    x.send();
  }

  function loadPlaylist(pl) {
    state.playlist = pl;
    toast('Wczytywanie: ' + pl.name + '…', 15000);
    var done = function (text, fromCache) {
      pl.tvgUrl = M3U.header(text).tvgUrl;
      var items = M3U.autoGroup(M3U.parse(text));
      if (!items.length) { toast('Playlista jest pusta lub niepoprawna'); return; }
      items.forEach(function (it, i) { it.n = i + 1; });
      state.items = items;
      var gs = M3U.groups(items).map(function (g) { return { id: g.name, name: g.name, count: g.count }; });
      state.groups = [{ id: '__all__', name: 'Wszystkie', count: items.length }, { id: '__fav__', name: '★ Ulubione', count: 0 }].concat(gs);
      state.group = '__all__'; state.filter = ''; $('search').value = '';
      Store.saveLast({ id: pl.id });
      refreshGroups(); applyFilter();
      toast((fromCache ? '(offline) ' : '') + 'Załadowano kanałów: ' + items.length);
      setZone('channels');
      loadEpg(pl);
    };
    if (pl.text) return done(pl.text);
    fetchText(pl.url, function (err, text) {
      if (err) {
        var c = Store.cache(pl.id);
        if (c) return done(c, true);
        return toast('Błąd pobierania: ' + err.message, 6000);
      }
      Store.saveCache(pl.id, text); done(text);
    });
  }

  function refreshGroups() {
    state.groups[1].count = state.items.filter(function (c) { return state.favs[c.url]; }).length;
    var i = 0; state.groups.forEach(function (g, n) { if (g.id === state.group) i = n; });
    groupList.set(state.groups, i);
    $('groupSel').innerHTML = state.groups.map(function (g) {
      return '<option value="' + esc(g.id) + '"' + (g.id === state.group ? ' selected' : '') + '>' + esc(g.name) + ' (' + g.count + ')</option>';
    }).join('');
  }
  $('groupSel').addEventListener('change', function () { state.group = this.value; groupList.render(); applyFilter(); $('channels').scrollTop = 0; });

  function applyFilter(keepIdx) {
    var q = state.filter.toLowerCase(), g = state.group;
    state.view = state.items.filter(function (c) {
      if (g === '__fav__' && !state.favs[c.url]) return false;
      if (g !== '__all__' && g !== '__fav__' && c.group !== g) return false;
      return !q || c.name.toLowerCase().indexOf(q) !== -1;
    });
    chList.set(state.view, keepIdx);
    $('count').textContent = state.view.length + ' kanałów';
  }

  /* ---------- zones & focus ---------- */
  function setZone(z) {
    state.zone = z;
    groupList.focus(z === 'groups');
    chList.focus(z === 'channels');
    ['search'].concat(SIDE).forEach(function (id) { $(id).blur(); });
    if (z === 'search' || SIDE.indexOf(z) >= 0) $(z).focus();
  }

  /* ---------- playback ---------- */
  function playChannel(c) {
    if (!c) return;
    state.playing = c; state.playingUrl = c.url;
    state.lastUrl = Ace.resolve(c.url, settings);
    Player.play(state.lastUrl);
    Store.saveLast({ id: state.playlist && state.playlist.id, url: c.url });
    showOsd();
    setMode('player');
  }
  function zap(d) {
    var list = state.view.length ? state.view : state.items;
    var i = list.indexOf(state.playing);
    if (i < 0) i = 0;
    var next = list[(i + d + list.length) % list.length];
    chList.idx = list.indexOf(next); chList.render();
    playChannel(next);
  }
  var osdT;
  function showOsd() {
    var c = state.playing; if (!c) return;
    $('osdTitle').textContent = c.n + '. ' + c.name;
    $('osdSub').textContent = c.group + (state.favs[c.url] ? '  ★' : '');
    var l = $('osdLogo'); if (c.logo) l.src = c.logo; else l.removeAttribute('src');
    var nn = epg ? Epg.nowNext(epg, c) : {}, p = nn.now, line = '';
    if (p) line = hm(p[0]) + '–' + hm(p[1]) + '  ' + p[2] + (nn.next ? '   ▸ ' + hm(nn.next[0]) + ' ' + nn.next[2] : '');
    else if (nn.next) line = 'Następnie: ' + hm(nn.next[0]) + ' ' + nn.next[2];
    $('osdEpg').textContent = line;
    $('osdBar').style.display = p ? '' : 'none';
    if (p) $('osdBar').firstChild.style.width = Math.max(0, Math.min(100, (Date.now() - p[0]) / (p[1] - p[0]) * 100)) + '%';
    tick(); $('osd').classList.remove('hidden');
    if (MOBILE) { $('ctl').classList.remove('hidden'); $('ctlFav').textContent = state.favs[c.url] ? '★' : '☆'; }
    clearTimeout(osdT); osdT = setTimeout(hideOsd, 4000);
  }
  function hideOsd() { $('osd').classList.add('hidden'); $('ctl').classList.add('hidden'); }
  function tick() { if (epg) { chList.render(); }  var d = new Date(); $('osdTime').textContent = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }

  // History: Android/iOS Back should leave the player or close a dialog instead of leaving the page.
  var hist = 0, skipPop = 0;
  function pushH() { if (!MOBILE) return; history.pushState({ m: 1 }, ''); hist++; }
  function leaveH() { if (MOBILE && hist > 0) { hist--; skipPop++; history.back(); } }
  window.addEventListener('popstate', function () {
    if (skipPop > 0) { skipPop--; return; }
    hist = Math.max(0, hist - 1);
    if (state.dialog) closeDialog(true); else if (state.mode === 'player') setMode('browser', true);
  });
  var wake = null;
  function requestWake() { try { if (navigator.wakeLock && !wake) navigator.wakeLock.request('screen').then(function (w) { wake = w; w.addEventListener('release', function () { wake = null; }); }, function () {}); } catch (e) {} }
  function releaseWake() { try { if (wake) wake.release(); } catch (e) {} wake = null; }
  document.addEventListener('visibilitychange', function () { if (!document.hidden && state.mode === 'player') requestWake(); });

  function setMode(m, fromHist) {
    if (m === 'player' && state.mode !== 'player') { pushH(); requestWake(); }
    if (m === 'browser' && state.mode === 'player' && !fromHist) leaveH();
    state.mode = m;
    if (m === 'player' && document.activeElement && document.activeElement.blur) document.activeElement.blur();
    $('browser').classList.toggle('hidden', m === 'player');
    if (m === 'browser') { hideOsd(); releaseWake(); chList.render(); setZone(state.zone); }
  }

  function toggleFav(c) {
    if (!c) return;
    if (state.favs[c.url]) delete state.favs[c.url]; else state.favs[c.url] = 1;
    Store.saveFavorites(state.favs);
    toast(state.favs[c.url] ? '★ Dodano do ulubionych' : 'Usunięto z ulubionych', 1500);
    var idx = chList.idx; refreshGroups(); applyFilter(idx);
    if (state.mode === 'player') showOsd();
  }

  groupList.bind(function (g) {
    setZone('groups'); state.group = g.id; groupList.render(); applyFilter(); setZone('channels');
  });
  chList.bind(function (c) { state.zone = 'channels'; playChannel(c); });
  plList.bind(function (p) { closeDialog(); loadPlaylist(p); });
  $('channels').addEventListener('wheel', function () { state.zone = 'channels'; chList.focus(true); groupList.focus(false); });
  $('video').addEventListener('click', function () { if (state.mode === 'player') showOsd(); });
  $('video').addEventListener('wheel', function (e) { if (state.mode === 'player') zap(e.deltaY > 0 ? 1 : -1); });

  Player.onError(function (msg) {
    var hint = state.playing && Ace.isAce(state.playing.url) && Ace.isLocal(settings)
      ? ' – ustaw adres silnika Ace Stream w Ustawieniach (niebieski → Ustawienia)' : '';
    var host = (state.lastUrl || '').replace(/^https?:\/\//, '').split('/')[0];
    toast('Błąd odtwarzania: ' + msg + (host ? ' [' + host + ']' : '') + hint, 9000);
    if (state.mode === 'player') { setMode('browser'); setZone('channels'); }
  });

  /* ---------- program guide ---------- */
  var guideList = new List($('guideList'), MOBILE ? ALL : 7, function (p, i, f) {
    return '<li class="' + (f ? 'focus' : '') + (i === 0 && p[0] <= Date.now() ? ' active' : '') + '"><span class="num">' + hm(p[0]) + '</span><span class="name"><span>' + esc(p[2]) + '</span></span></li>';
  });
  guideList.bind(function () { guideDesc(); });
  guideList.onMove = function () { guideDesc(); };
  function guideDesc() { var p = guideList.cur(); $('guideDesc').textContent = p ? (hm(p[0]) + '–' + hm(p[1]) + (p[3] ? ' · ' + p[3] : '')) : ''; }
  function openGuide(c) {
    if (!c) return;
    var l = epg ? Epg.list(epg, c) : [];
    if (!l.length) return toast(epg ? 'Brak programu dla tego kanału' : 'EPG niedostępny – ustaw adres w Ustawieniach', 3000);
    $('guideTitle').textContent = 'Program TV – ' + c.name;
    openDialog('Guide'); guideList.set(l); guideList.focus(true); guideDesc();
  }

  /* ---------- dialogs ---------- */
  function openDialog(name) {
    if (!state.dialog) pushH();
    state.dialog = name; $('dlg' + name).classList.remove('hidden');
    if (name === 'Add') { $('addName').focus(); }
    if (name === 'Settings') { $('setEngine').value = settings.engine; $('setEpg').value = settings.epg; renderMode(); $('setEngine').focus(); }
    if (name === 'Playlists') { plList.set(Store.playlists()); plList.focus(true); }
  }
  function closeDialog(fromHist) {
    if (!state.dialog) return;
    if (fromHist !== true) leaveH();
    $('dlg' + state.dialog).classList.add('hidden'); state.dialog = null;
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    setZone(state.zone);
  }
  $('addCancel').onclick = function () { closeDialog(); };
  $('plClose').onclick = function () { closeDialog(); };
  $('addOk').onclick = function () {
    var name = $('addName').value.trim(), url = $('addUrl').value.trim(), text = $('addText').value.trim();
    if (!url && !text) return toast('Podaj adres URL lub wklej zawartość');
    var pl = { id: 'pl' + Date.now(), name: name || (url ? url.replace(/^https?:\/\//, '').split('/')[0] : 'Playlista'), url: url, text: url ? '' : text };
    var all = Store.playlists(); all.push(pl); Store.savePlaylists(all);
    closeDialog(); loadPlaylist(pl);
  };
  function renderMode() { $('setMode').textContent = 'Tryb Ace: ' + (settings.aceMode === 'ts' ? 'TS (getstream)' : 'HLS (manifest)'); }
  $('setMode').onclick = function () { settings.aceMode = settings.aceMode === 'ts' ? 'hls' : 'ts'; renderMode(); };
  $('setRestore').onclick = function () {
    var all = Store.playlists();
    BUILTIN_PLAYLISTS.forEach(function (b) { if (!all.some(function (p) { return p.id === b.id; })) all.push(b); });
    Store.savePlaylists(all); toast('Przywrócono wbudowane playlisty', 2000);
  };
  $('setRefresh').onclick = function () {
    settings.epg = $('setEpg').value.trim(); Store.saveSettings(settings); closeDialog(); loadEpg(state.playlist, true);
  };
  $('setTest').onclick = function () {
    var host = ($('setEngine').value.trim() || '127.0.0.1:6878').replace(/^https?:\/\//i, '').replace(/\/+$/, '');
    if (!window.fetch) return toast('Ten webOS nie obsługuje testu – spróbuj odtworzyć kanał', 4000);
    toast('Łączenie z ' + host + '…', 8000);
    var ctl = window.AbortController ? new AbortController() : null, t = setTimeout(function () { ctl && ctl.abort(); }, 6000);
    // no-cors: we only care whether the TCP/HTTP connection succeeds, not about reading the reply
    fetch('http://' + host + '/webui/api/service?method=get_version', { mode: 'no-cors', cache: 'no-store', signal: ctl && ctl.signal })
      .then(function () { clearTimeout(t); toast('✔ Silnik Ace Stream odpowiada: ' + host, 5000); })
      .catch(function () {
        clearTimeout(t);
        toast('✘ Brak połączenia z ' + host + '. Sprawdź adres/port, zaporę oraz czy silnik nasłuchuje w sieci LAN (nie tylko 127.0.0.1).', 9000);
      });
  };
  $('setCancel').onclick = function () { settings = Store.settings(); closeDialog(); };
  $('setOk').onclick = function () {
    var oldEpg = settings.epg;
    settings.engine = $('setEngine').value.trim() || '127.0.0.1:6878';
    settings.epg = $('setEpg').value.trim();
    Store.saveSettings(settings);
    if (settings.epg !== oldEpg) loadEpg(state.playlist, true); toast('Zapisano ustawienia', 2000); closeDialog();
  };
  $('btnSettings').onclick = function () { openDialog('Settings'); };
  $('btnAdd').onclick = function () { openDialog('Add'); };
  $('btnPlaylists').onclick = function () { openDialog('Playlists'); };
  // pointer (Magic Remote) can focus the search box without going through setZone
  $('search').addEventListener('focus', function () {
    if (state.zone !== 'search') { state.zone = 'search'; groupList.focus(false); chList.focus(false); }
  });
  $('search').addEventListener('input', function () { state.filter = this.value; applyFilter(); });

  /* ---------- key handling ---------- */
  var dlgFocus = function () {
    var order = state.dialog === 'Settings' ? ['setEngine', 'setEpg', 'setTest', 'setMode', 'setRefresh', 'setRestore', 'setOk', 'setCancel']
      : ['addName', 'addUrl', 'addText', 'addOk', 'addCancel'];
    return { order: order, i: order.indexOf(document.activeElement && document.activeElement.id) };
  };

  function onDialogKey(e) {
    var k = e.keyCode;
    if (k === KEY.BACK || k === KEY.ESC) { closeDialog(); return true; }
    if (state.dialog === 'Guide') {
      if (k === KEY.UP) guideList.move(-1); else if (k === KEY.DOWN) guideList.move(1);
      else if (k === KEY.PGUP) guideList.move(-7); else if (k === KEY.PGDN) guideList.move(7);
      else if (k === KEY.ENTER || k === KEY.RED) closeDialog();
      guideDesc(); return true;
    }
    if (state.dialog === 'Playlists') {
      if (k === KEY.UP) plList.move(-1); else if (k === KEY.DOWN) plList.move(1);
      else if (k === KEY.ENTER) { var p = plList.cur(); if (p) { closeDialog(); loadPlaylist(p); } else closeDialog(); }
      else if (k === KEY.RED) {
        var p2 = plList.cur(); if (!p2) return true;
        var all = Store.playlists().filter(function (x) { return x.id !== p2.id; }); Store.savePlaylists(all);
        plList.set(all, plList.idx); toast('Usunięto playlistę', 1500);
      }
      return true;
    }
    if (state.dialog === 'Add' || state.dialog === 'Settings') {
      var f = dlgFocus(), tag = document.activeElement && document.activeElement.tagName;
      var inText = tag === 'TEXTAREA' || tag === 'INPUT';
      if (k === KEY.UP || k === KEY.DOWN) {
        var n = f.i + (k === KEY.DOWN ? 1 : -1);
        if (n >= 0 && n < f.order.length) $(f.order[n]).focus();
        e.preventDefault(); return true;
      }
      if ((k === KEY.LEFT || k === KEY.RIGHT) && !inText) {
        var n2 = f.i + (k === KEY.RIGHT ? 1 : -1);
        var lo = state.dialog === 'Add' ? 3 : 2;
        if (n2 >= lo && n2 < f.order.length) $(f.order[n2]).focus();
        return true;
      }
      if (k === KEY.ENTER && !inText) { document.activeElement.click(); return true; }
    }
    return false;
  }

  function onBrowserKey(e) {
    var k = e.keyCode, z = state.zone;
    if ((k === KEY.BACK || k === KEY.ESC) && z === 'search') { setZone('channels'); return; }
    if (k === KEY.BACK || k === KEY.ESC) {
      if (state.playing) { setMode('player'); showOsd(); Player.el.paused && Player.el.play(); }
      else if (window.webOS && webOS.platformBack) webOS.platformBack();
      else if (window.PalmSystem && PalmSystem.platformBack) PalmSystem.platformBack();
      return;
    }
    if (k === KEY.YELLOW) { setZone('search'); return; }
    if (k === KEY.RED && z === 'channels') { openGuide(chList.cur()); return; }
    if (k === KEY.GREEN && z === 'channels') { toggleFav(chList.cur()); return; }
    if (k === KEY.BLUE) { openDialog('Playlists'); return; }
    if (z === 'search') {
      if (k === KEY.DOWN || k === KEY.ENTER) { setZone('channels'); e.preventDefault(); }
      else if (k === KEY.LEFT && $('search').selectionStart === 0) setZone('groups');
      return;
    }
    if (z === 'groups') {
      if (k === KEY.UP) groupList.move(-1);
      else if (k === KEY.DOWN) { if (groupList.idx === groupList.data.length - 1) setZone(SIDE[0]); else groupList.move(1); }
      else if (k === KEY.PGUP) groupList.move(-ROWS); else if (k === KEY.PGDN) groupList.move(ROWS);
      else if (k === KEY.RIGHT) setZone('channels');
      else if (k === KEY.ENTER) { state.group = groupList.cur().id; groupList.render(); applyFilter(); setZone('channels'); }
      return;
    }
    if (SIDE.indexOf(z) >= 0) {
      var si = SIDE.indexOf(z);
      if (k === KEY.UP) setZone(si === 0 ? 'groups' : SIDE[si - 1]);
      else if (k === KEY.DOWN && si < SIDE.length - 1) setZone(SIDE[si + 1]);
      else if (k === KEY.RIGHT) setZone('channels');
      else if (k === KEY.ENTER) $(z).click();
      return;
    }
    // channels
    if (k === KEY.UP) { if (chList.idx === 0) setZone('search'); else chList.move(-1); }
    else if (k === KEY.DOWN) chList.move(1);
    else if (k === KEY.PGUP) chList.move(-ROWS); else if (k === KEY.PGDN) chList.move(ROWS);
    else if (k === KEY.LEFT) setZone('groups');
    else if (k === KEY.ENTER) playChannel(chList.cur());
    else if (k === KEY.PLAY && state.playing) setMode('player');
  }

  function onPlayerKey(e) {
    var k = e.keyCode;
    switch (k) {
      case KEY.BACK: case KEY.ESC: case KEY.BS: setMode('browser'); break;
      case KEY.UP: case KEY.CH_UP: zap(-1); break;
      case KEY.DOWN: case KEY.CH_DN: zap(1); break;
      case KEY.LEFT: case KEY.RW: Player.isVod() ? Player.seek(-10) : showOsd(); break;
      case KEY.RIGHT: case KEY.FF: Player.isVod() ? Player.seek(10) : showOsd(); break;
      case KEY.ENTER: showOsd(); break;
      case KEY.PLAY: Player.el.play(); break;
      case KEY.PAUSE: Player.el.pause(); break;
      case 32: Player.toggle(); break;
      case KEY.STOP: Player.stop(); state.playing = state.playingUrl = null; setMode('browser'); break;
      case KEY.GREEN: toggleFav(state.playing); break;
      case KEY.RED: case 457: openGuide(state.playing); break;
      case KEY.BLUE: setMode('browser'); openDialog('Playlists'); break;
    }
  }

  // Keyboard aliases for setups without a D-pad / colour keys (PC browser, small remotes)
  var ALIAS = { w: KEY.UP, s: KEY.DOWN, a: KEY.LEFT, d: KEY.RIGHT, q: KEY.PGUP, e: KEY.PGDN,
    r: KEY.RED, g: KEY.GREEN, y: KEY.YELLOW, b: KEY.BLUE, i: 457, p: KEY.PLAY, x: KEY.STOP, Backspace: KEY.BACK };
  function aliased(e) {
    var tag = e.target.tagName;
    if ((tag === 'INPUT' || tag === 'TEXTAREA') && e.key !== 'Escape') return e;
    var code = e.ctrlKey || e.altKey || e.metaKey ? 0 : ALIAS[e.key.length === 1 ? e.key.toLowerCase() : e.key];
    return code ? { keyCode: code, target: e.target, key: e.key, preventDefault: function () { e.preventDefault(); } } : e;
  }

  document.addEventListener('keydown', function (e) {
    var handled = true;
    e = aliased(e);
    if (state.dialog) handled = onDialogKey(e);
    else if (state.mode === 'player') onPlayerKey(e);
    else onBrowserKey(e);
    if (handled && !(e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') ) e.preventDefault();
    else if (handled && (e.keyCode === KEY.UP || e.keyCode === KEY.DOWN)) e.preventDefault();
  });
  // webOS "back" may arrive as a history event on some firmware
  document.addEventListener('webOSRelaunch', function () { window.focus && window.focus(); });
  setInterval(tick, 30000);

  /* ---------- phone: file picker, touch controls ---------- */
  $('addFile').addEventListener('change', function () {
    var f = this.files && this.files[0]; if (!f) return;
    var r = new FileReader();
    r.onload = function () { $('addText').value = String(r.result); $('addUrl').value = ''; if (!$('addName').value) $('addName').value = f.name.replace(/\.[^.]+$/, ''); toast('Wczytano plik: ' + f.name, 2500); };
    r.onerror = function () { toast('Nie udało się odczytać pliku'); };
    r.readAsText(f);
  });
  $('ctlBack').onclick = function () { setMode('browser'); };
  $('ctlPrev').onclick = function () { zap(-1); };
  $('ctlNext').onclick = function () { zap(1); };
  $('ctlFav').onclick = function () { toggleFav(state.playing); };
  $('ctlGuide').onclick = function () { openGuide(state.playing); };
  $('ctlFs').onclick = function () {
    var d = document, el = d.documentElement;
    if (d.fullscreenElement || d.webkitFullscreenElement) return (d.exitFullscreen || d.webkitExitFullscreen).call(d);
    var go = el.requestFullscreen || el.webkitRequestFullscreen; if (!go) return toast('Pełny ekran niedostępny w tej przeglądarce', 2500);
    var p = go.call(el); var lock = function () { try { screen.orientation.lock('landscape').catch(function () {}); } catch (e) {} };
    p && p.then ? p.then(lock, function () {}) : lock();
  };

  /* ---------- boot ---------- */
  var pls = Store.playlists(), last = Store.last();
  if (!settings.seeded) {
    BUILTIN_PLAYLISTS.forEach(function (b) { if (!pls.some(function (p) { return p.id === b.id; })) pls.push(b); });
    Store.savePlaylists(pls); settings.seeded = true; Store.saveSettings(settings);
  }
  var start = pls.filter(function (p) { return p.id === last.id; })[0] || pls[0];
  setMode('browser'); setZone('channels');
  if (start) loadPlaylist(start);
  else { toast('Dodaj pierwszą playlistę (przycisk w lewym menu)', 6000); setZone('btnAdd'); }
  if (start && start.builtin && Ace.isLocal(settings)) toast('Ustaw adres silnika Ace Stream: Ustawienia w lewym menu', 8000);
})();
