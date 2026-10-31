# M3U Player dla LG webOS TV

Pełna aplikacja webOS (vanilla JS, bez zależności) do odtwarzania playlist M3U/M3U8.
Działa na telewizorach LG webOS (instalacja w trybie dewelopera lub przez LG Content Store), w przeglądarce na telefonie i na komputerze.
Materiały do zgłoszenia w LG Seller Lounge: [`store/SUBMISSION.md`](store/SUBMISSION.md).

## Funkcje
- Parser M3U/M3U8 (`tvg-logo`, `group-title`, `tvg-id`, `#EXTGRP`, `#EXTVLCOPT`)
- Playlisty z adresu URL lub wklejone z tekstu, zapisywane lokalnie (cache offline)
- Grupy, wyszukiwarka, ulubione ★, ostatnio używana playlista
- Natywne odtwarzanie HLS / TS / MP4 w `<video>`, OSD, przełączanie kanałów
- Pełna obsługa pilota Magic Remote

## Własna playlista użytkownika
Aplikacja nie zawiera żadnych kanałów. Przy pierwszym uruchomieniu pokazuje ekran „Nie masz jeszcze żadnej playlisty”; OK otwiera okno **Dodaj playlistę**:
- **adres URL** pliku M3U/M3U8 (np. `http://…/playlista.m3u`; brak `http://` jest dopisywany),
- **wklejona treść** playlisty,
- **plik** z telefonu (tylko w przeglądarce mobilnej).

Playlisty z adresu są pobierane przy każdym wczytaniu (z kopią offline). Można mieć wiele playlist; „☰ Playlisty” przełącza między nimi, ✕ lub CZERWONY usuwa.

### Playlisty z linkami Ace Stream (opcjonalnie)
Linki `http://127.0.0.1:6878/ace/...` i `acestream://` wymagają silnika Ace Stream na innym urządzeniu w sieci: wpisz jego `IP:6878` w **Ustawieniach** i użyj „Testuj silnik”. Tryb **HLS** (`/ace/manifest.m3u8`) gra natywnie na webOS; **TS** używa `/ace/getstream`.

## EPG (program TV)
- Źródło: **Ustawienia → Adres EPG** (XMLTV, `.xml` lub `.xml.gz`). Gdy puste, używany jest `url-tvg` / `x-tvg-url` z nagłówka playlisty.
- Kanały są dopasowywane po `tvg-id`, a gdy go brak – po znormalizowanej nazwie (bez `HD`, `[PL]`, spacji, polskich znaków), np. „TVP 1 HD [PL]” ↔ „TVP 1”.
- Na liście kanałów widać bieżący program, w odtwarzaczu pasek postępu i „następnie”, a **czerwony** (lub INFO w odtwarzaczu) otwiera program na 36 h z opisami.
- Dane (tylko dopasowane kanały, okno −1 h…+36 h) są cache'owane lokalnie 6 h; „Odśwież EPG” wymusza pobranie.
- Pliki `.gz` wymagają `DecompressionStream` (nowsze webOS); na starszych użyj nieskompresowanego XML. Serwer EPG musi zezwalać na CORS.

## Gdy kanały się nie łączą
1. **Ustawienia → „Testuj silnik”** – sprawdza, czy pod podanym adresem odpowiada Ace Stream Engine oraz czy zezwala na CORS (potrzebny `hls.js`); podpowiada, czy przeglądarka gra HLS natywnie.
   - `127.0.0.1:6878` w aplikacji jest poprawne tylko wtedy, gdy silnik działa **na tym samym urządzeniu co przeglądarka**. Strona otwarta na telefonie z `http://IP_PC:8080` i silnik na PC → wpisz `IP_PC:6878`, nie `127.0.0.1`.
2. Adres `127.0.0.1:6878` z playlisty działa tylko na urządzeniu, na którym stoi silnik. Na TV wpisz **IP komputera/boxa/NAS-a** z silnikiem.
3. Silnik musi nasłuchiwać w LAN, a nie tylko na localhost: Ace Stream na PC uruchom z opcją `--bind-all` (albo użyj obrazu Docker z proxy HTTP) i otwórz port 6878 w zaporze.
4. Pierwsze uruchomienie kanału może trwać 10–30 s (silnik szuka peerów). Komunikat błędu pokazuje, z którym hostem aplikacja próbowała się połączyć.
5. W przeglądarce desktopowej HLS gra przez dołączone `hls.js` (ładowane tylko, gdy przeglądarka nie ma natywnego HLS; na webOS nie jest potrzebne). Tryb **TS** nie zadziała w Chrome/Firefox – używaj trybu HLS. Silnik musi zezwalać na CORS.

## Telefon (przeglądarka mobilna)
Na małych ekranach (szerokość < 900 px) i urządzeniach dotykowych aplikacja przełącza się na układ mobilny; telewizor i duże ekrany zachowują układ pod pilota.
- **Uruchomienie:** na komputerze w tej samej sieci Wi-Fi: `cd m3u-player && python3 -m http.server 8080`, potem na telefonie `http://IP_KOMPUTERA:8080`. „Dodaj do ekranu głównego” daje tryb aplikacji (manifest PWA).
- **Obsługa:** lista kanałów przewijana palcem, wybór grupy z listy rozwijanej, dotknięcie kanału go uruchamia, dotknięcie obrazu pokazuje przyciski (lista, poprzedni/następny, ulubione, program TV, pełny ekran). Przycisk Wstecz w telefonie wraca z odtwarzacza do listy i zamyka okna. Ekran nie wygasa podczas odtwarzania (Wake Lock, jeśli przeglądarka go ma).
- **Playlista z telefonu:** „＋ Dodaj playlistę” → „wybierz plik” (`.m3u`/`.m3u8`), adres URL albo wklejenie tekstu.
- **Silnik Ace Stream:** w Ustawieniach wpisz `IP:6878` urządzenia z silnikiem (komputer/box w sieci, uruchomiony z `--bind-all`). Użyj „Testuj silnik”.
- **HTTPS vs HTTP:** strona serwowana przez **HTTPS** (np. GitHub Pages) nie może ładować strumieni ani silnika po zwykłym `http://` (mixed content) – wtedy serwuj aplikację po `http://` z sieci lokalnej, jak wyżej.
- Android Chrome gra HLS przez dołączone `hls.js`; iOS Safari ma natywny HLS (iOS nie testowane).

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
npm run package          # -> dist/com.msulikowski96.m3uplayer_1.1.0_all.ipk
npm run install-tv       # ares-install na urządzeniu "tv"
npm run launch           # uruchom
npm run inspect          # debugger w Chrome DevTools
```
Do paczki trafiają tylko pliki aplikacji (`tools/package.sh`), bez testów, README i katalogu `store/`.
Układ TV jest projektowany w 1920×1080 i skalowany do okna (modele Full HD dają aplikacjom 1280×720).

## Uwagi
- Pobieranie playlist z sieci używa XHR; serwer musi pozwalać na CORS albo użyj opcji wklejenia treści.
- Strumienie wymagające własnych nagłówków (`User-Agent`, `Referer`) nie są obsługiwane przez `<video>`.
