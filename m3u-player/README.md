# M3U Player dla LG webOS TV

Pełna aplikacja webOS (vanilla JS, bez zależności) do odtwarzania playlist M3U/M3U8.
Przeznaczona do instalacji na telewizorze z [webOS Brew / Homebrew Channel](https://www.webosbrew.org/).

## Funkcje
- Parser M3U/M3U8 (`tvg-logo`, `group-title`, `tvg-id`, `#EXTGRP`, `#EXTVLCOPT`)
- Playlisty z adresu URL lub wklejone z tekstu, zapisywane lokalnie (cache offline)
- Grupy, wyszukiwarka, ulubione ★, ostatnio używana playlista
- Natywne odtwarzanie HLS / TS / MP4 w `<video>`, OSD, przełączanie kanałów
- Pełna obsługa pilota Magic Remote

## Playlista Ace Stream (wbudowana)
Aplikacja zawiera playlistę `playlists/polska_ace_stream2.m3u8` (61 kanałów, wczytywana przy pierwszym uruchomieniu,
automatycznie pogrupowana: TVP, TVN, Polsat, Sport, Informacje, Muzyka, Filmy i seriale, Kamery PL, Inne).

Adresy w tej playliście wskazują `127.0.0.1:6878` – czyli silnik Ace Stream na **tym samym urządzeniu**.
Na telewizorze nie ma silnika, więc:
1. Uruchom Ace Stream Engine na komputerze / Android boxie / NAS w tej samej sieci (port 6878, dostęp z LAN).
2. W aplikacji: **Ustawienia → adres silnika** (np. `192.168.1.50:6878`).
3. Tryb **HLS** (domyślny, `/ace/manifest.m3u8`) jest natywnie odtwarzany przez webOS; **TS** używa `/ace/getstream`.

Obsługiwane są też linki `acestream://<id>`. Własne playliście dodasz przyciskiem „+ Dodaj playlistę”.
Po zmianie pliku w `playlists/` uruchom `npm run build:playlist` (generuje `js/builtin.js`).

## EPG (program TV)
- Źródło: **Ustawienia → Adres EPG** (XMLTV, `.xml` lub `.xml.gz`). Gdy puste, używany jest `url-tvg` / `x-tvg-url` z nagłówka playlisty.
- Kanały są dopasowywane po `tvg-id`, a gdy go brak – po znormalizowanej nazwie (bez `HD`, `[PL]`, spacji, polskich znaków), np. „TVP 1 HD [PL]” ↔ „TVP 1”.
- Na liście kanałów widać bieżący program, w odtwarzaczu pasek postępu i „następnie”, a **czerwony** (lub INFO w odtwarzaczu) otwiera program na 36 h z opisami.
- Dane (tylko dopasowane kanały, okno −1 h…+36 h) są cache'owane lokalnie 6 h; „Odśwież EPG” wymusza pobranie.
- Pliki `.gz` wymagają `DecompressionStream` (nowsze webOS); na starszych użyj nieskompresowanego XML. Serwer EPG musi zezwalać na CORS.

## Gdy kanały się nie łączą
1. **Ustawienia → „Testuj silnik”** – sprawdza, czy pod podanym adresem w ogóle odpowiada Ace Stream Engine.
2. Adres `127.0.0.1:6878` z playlisty działa tylko na urządzeniu, na którym stoi silnik. Na TV wpisz **IP komputera/boxa/NAS-a** z silnikiem.
3. Silnik musi nasłuchiwać w LAN, a nie tylko na localhost: Ace Stream na PC uruchom z opcją `--bind-all` (albo użyj obrazu Docker z proxy HTTP) i otwórz port 6878 w zaporze.
4. Pierwsze uruchomienie kanału może trwać 10–30 s (silnik szuka peerów). Komunikat błędu pokazuje, z którym hostem aplikacja próbowała się połączyć.
5. W przeglądarce desktopowej HLS gra przez dołączone `hls.js` (ładowane tylko, gdy przeglądarka nie ma natywnego HLS; na webOS nie jest potrzebne). Tryb **TS** nie zadziała w Chrome/Firefox – używaj trybu HLS. Silnik musi zezwalać na CORS.

## Sterowanie bez strzałek (PC / mysz / Magic Remote w trybie wskaźnika)
- **Mysz / wskaźnik:** klik w grupę, kanał, playlistę lub pozycję programu; kółko przewija listy (w odtwarzaczu zmienia kanał); klik w obraz pokazuje pasek informacji.
- **Klawisze zamienne:** `W A S D` = strzałki, `Q`/`E` = strona w górę/w dół, `R G Y B` = czerwony/zielony/żółty/niebieski, `I` = info, `P` = play, `X` = stop, `Backspace`/`Esc` = Back, spacja = pauza. W polach tekstowych litery piszą się normalnie.

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
