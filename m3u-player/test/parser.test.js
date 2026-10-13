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
