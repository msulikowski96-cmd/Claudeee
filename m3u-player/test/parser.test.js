const assert = require('assert');
const M3U = require('../js/parser.js');
const items = M3U.parse(`﻿#EXTM3U
#EXTINF:-1 tvg-id="a" tvg-logo="http://x/l.png" group-title="News, World",TVP Info
#EXTVLCOPT:http-user-agent=Foo
http://example.com/1.m3u8
#EXTINF:123,Film
#EXTGRP:Movies
http://example.com/2.mp4
http://example.com/3.ts
`);
assert.strictEqual(items.length, 3);
assert.strictEqual(items[0].name, 'TVP Info');
assert.strictEqual(items[0].group, 'News, World');
assert.strictEqual(items[0].logo, 'http://x/l.png');
assert.strictEqual(items[0].headers['User-Agent'], 'Foo');
assert.strictEqual(items[1].group, 'Movies');
assert.strictEqual(items[1].duration, 123);
assert.strictEqual(items[2].name, '3.ts');
assert.strictEqual(items[2].group, 'Bez grupy');
assert.strictEqual(M3U.groups(items).length, 3);
console.log('parser OK');

const Ace = require('../js/ace.js');
const u = 'http://127.0.0.1:6878/ace/getstream?infohash=abc&pid=1';
assert.strictEqual(Ace.resolve(u, { engine: '192.168.1.5:6878', aceMode: 'hls' }), 'http://192.168.1.5:6878/ace/manifest.m3u8?infohash=abc&pid=1');
assert.strictEqual(Ace.resolve(u, { engine: 'http://10.0.0.2:6878/', aceMode: 'ts' }), 'http://10.0.0.2:6878/ace/getstream?infohash=abc&pid=1');
assert.strictEqual(Ace.resolve('acestream://deadbeef', { engine: 'h:1', aceMode: 'hls' }), 'http://h:1/ace/manifest.m3u8?id=deadbeef');
assert.strictEqual(Ace.resolve('http://x/y.m3u8', { engine: 'h:1' }), 'http://x/y.m3u8');
const pl = M3U.autoGroup(M3U.parse(require('fs').readFileSync(__dirname + '/../playlists/polska_ace_stream2.m3u8', 'utf8')));
assert.strictEqual(pl.length, 61);
const g = Object.fromEntries(M3U.groups(pl).map(x => [x.name, x.count]));
assert.ok(g['Kamery PL'] >= 10 && g['Sport'] >= 7 && !g['Bez grupy'], JSON.stringify(g));
console.log('ace + autoGroup OK', JSON.stringify(g));

// ---- EPG ----
const Epg = require('../js/epg.js');
assert.strictEqual(M3U.header('#EXTM3U url-tvg="http://e/x.xml.gz,http://y"\n').tvgUrl, 'http://e/x.xml.gz');
assert.strictEqual(M3U.header('#EXTM3U\n').tvgUrl, '');
assert.strictEqual(Epg.time('20240131203000 +0100'), Date.UTC(2024, 0, 31, 19, 30, 0));
assert.strictEqual(Epg.norm('TVP 1 HD [PL]'), 'tvp1');
assert.strictEqual(Epg.norm('Polsat Sport Premium 1'), 'polsatsportpremium1');
const NOW = Date.UTC(2024, 0, 31, 20, 0, 0);
const xml = `<?xml version="1.0"?><tv>
<channel id="TVP1.pl"><display-name lang="pl">TVP 1</display-name></channel>
<channel id="x"><display-name>Other</display-name></channel>
<programme start="20240131185000 +0000" stop="20240131201500 +0000" channel="TVP1.pl"><title lang="pl">Wiadomo&#347;ci &amp; Sport</title><desc><![CDATA[Opis <b>1</b>]]></desc></programme>
<programme start="20240131201500 +0000" stop="20240131213000 +0000" channel="TVP1.pl"><title>Film</title></programme>
<programme start="20240203201500 +0000" stop="20240203213000 +0000" channel="TVP1.pl"><title>Za daleko</title></programme>
<programme start="20240131201500 +0000" stop="20240131213000 +0000" channel="x"><title>Niechciany</title></programme>
</tv>`;
const st = Epg.parse(xml, [{ name: 'TVP 1 HD [PL]' }, { name: 'Brak', tvgId: 'nope' }], NOW);
assert.deepStrictEqual(Object.keys(st.progs), ['TVP1.pl']);
const nn = Epg.nowNext(st, { name: 'TVP 1 HD [PL]' }, NOW);
assert.strictEqual(nn.now[2], 'Wiadomości & Sport');
assert.strictEqual(nn.now[3], 'Opis <b>1</b>');
assert.strictEqual(nn.next[2], 'Film');
assert.strictEqual(Epg.list(st, { name: 'TVP 1' }, NOW).length, 2);
assert.strictEqual(Epg.nowNext(st, { name: 'Brak' }, NOW).now, null);
console.log('epg OK');
