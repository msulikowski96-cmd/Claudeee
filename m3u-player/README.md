# M3U Player dla LG webOS TV

Pełna aplikacja webOS (vanilla JS, bez zależności) do odtwarzania playlist M3U/M3U8.
Przeznaczona do instalacji na telewizorze z [webOS Brew / Homebrew Channel](https://www.webosbrew.org/).

## Funkcje
- Parser M3U/M3U8 (`tvg-logo`, `group-title`, `tvg-id`, `#EXTGRP`, `#EXTVLCOPT`)
- Playlisty z adresu URL lub wklejone z tekstu, zapisywane lokalnie (cache offline)
- Grupy, wyszukiwarka, ulubione ★, ostatnio używana playlista
- Natywne odtwarzanie HLS / TS / MP4 w `<video>`, OSD, przełączanie kanałów
- Pełna obsługa pilota Magic Remote

## Pilot
| Przycisk | Przeglądarka | Odtwarzacz |
|---|---|---|
| ↑↓←→ / OK | nawigacja / odtwórz | ↑↓ zmiana kanału, OK – info |
| CH+/CH− | – | zmiana kanału |
| ◀◀ ▶▶ / ←→ | – | przewijanie (VOD) |
| Zielony | ulubione | ulubione |
| Żółty | szukaj | – |
| Niebieski | lista playlist | lista playlist |
| Czerwony | usuń playlistę (w liście) | – |
| Back | wróć do odtwarzania | wróć do listy |
| Stop | – | zatrzymaj |

## Środowisko (wg przewodnika webOS Brew)
```sh
npm i -g @webos-tools/cli          # ares-cli
ares-setup-device --search         # włącz Developer Mode na TV, potem dodaj urządzenie "tv"
ares-novacom --device tv --getkey  # pobranie klucza SSH (passphrase z aplikacji Developer Mode)
```

## Budowa i instalacja
```sh
npm test                 # test parsera
npm run package          # ares-package . -> com.webosbrew.m3uplayer_1.0.0_all.ipk
npm run install-tv       # ares-install na urządzeniu "tv"
npm run launch           # uruchom
npm run inspect          # debugger w Chrome DevTools
```
Pliki z `.aresignore` (testy, README) nie trafiają do paczki.

## Uwagi
- Pobieranie playlist z sieci używa XHR; serwer musi pozwalać na CORS albo użyj opcji wklejenia treści.
- Strumienie wymagające własnych nagłówków (`User-Agent`, `Referer`) nie są obsługiwane przez `<video>`.
