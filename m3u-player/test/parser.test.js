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
