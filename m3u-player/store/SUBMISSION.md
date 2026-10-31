# Zgłoszenie do LG Seller Lounge – materiały i lista kontrolna

Na podstawie przewodnika LG Seller Lounge (User Guide: Register New App, File Upload, Images Upload, Enter Your App Info., How to Submit). Przed wysłaniem przejrzyj aktualną wersję przewodnika i **Self-check list** w Seller Lounge – mogły się zmienić.

## 0. Zanim zaczniesz
- [ ] **Przetestuj paczkę na swoim telewizorze** (tryb dewelopera, `npm run package && npm run install-tv && npm run launch`): dodanie playlisty z URL pilotem, odtwarzanie HLS, Magic Remote (wskaźnik + kółko), przycisk BACK (z listy kanałów zamyka aplikację), brak sieci, ponowne uruchomienie. Najlepiej na modelu Full HD i UHD.
- [ ] Odinstaluj starą wersję testową: `ares-install --device tv --remove com.webosbrew.m3uplayer`.
- [ ] **App ID**: `com.msulikowski96.m3uplayer` (w `appinfo.json`). Dozwolone znaki: `a-z 0-9 - .`. **Po wysłaniu do QA nie można go zmienić** – jeśli chcesz inne, zmień je teraz (w `appinfo.json` i `package.json`).
- [ ] `vendor` w `appinfo.json` (`msulikowski96`) – wpisz swoją nazwę/firmę, jeśli wolisz.

## 1. File Upload (obowiązkowe)
- Plik: `dist/com.msulikowski96.m3uplayer_1.1.0_all.ipk` (`npm run package`).
- Chipset: **Web → All**.
- Resolution: **1920×1080** (układ skaluje się do 1280×720 na modelach Full HD, więc wystarczy jedna paczka).
- File Version: `1.1.0` (przy każdej aktualizacji podnieś `version` w `appinfo.json`).

## 2. Images (obowiązkowe)
| Pole | Plik | Wymóg LG |
|---|---|---|
| App Icon | `store/app-icon-400.png` | min. 400×400 |
| App Tile Color | **#1565C0** | musi pasować do tła ikony |
| Screenshots | `store/screenshots/01…04` (1920×1080) | do 6 szt., 1920×1080 lub 1280×720 |
| Splash Screen | `images/splash.png` (już w `appinfo.json` jako `splashBackground`) | 1920×1080, nie może być czarny |

Brakuje zrzutu **z odtwarzanym obrazem** – zrób go na telewizorze z playlistą testową (tu, w środowisku bez kodeka H.264, nie dało się).

## 3. Service Country Info. (obowiązkowe)
- Kraje: **Polska** (interfejs jest po polsku). Usługa globalna wymaga angielskiego interfejsu – do zrobienia w kolejnej wersji.
- App Service Language: **Polish**.

## 4. Display Info. (obowiązkowe)
**Tytuł:** M3U Player

**Opis (PL):**
> Odtwarzacz własnych playlist IPTV w formacie M3U / M3U8. Aplikacja nie zawiera żadnych kanałów ani treści – dodajesz własną playlistę, podając jej adres URL lub wklejając treść.
> • Grupy kanałów, wyszukiwarka i ulubione
> • Program TV (EPG) z plików XMLTV (.xml / .xml.gz)
> • Obsługa strumieni HLS, MPEG-TS i MP4
> • Sterowanie pilotem standardowym i Magic Remote
> • Wiele playlist, zapis lokalny, praca bez konta
> Treści odtwarzane w aplikacji pochodzą wyłącznie z playlist dostarczonych przez użytkownika. Autor aplikacji nie dostarcza ani nie sprzedaje żadnych kanałów.

**Description (EN), jeśli potrzebny:**
> Player for your own M3U / M3U8 IPTV playlists. The app contains no channels or content – add your own playlist by entering its URL or pasting its contents.
> • Channel groups, search and favourites • TV guide (EPG) from XMLTV (.xml / .xml.gz) • HLS, MPEG-TS and MP4 streams • Standard remote and Magic Remote • Multiple playlists, stored locally, no account needed
> All content played in the app comes solely from playlists supplied by the user. The developer does not provide or sell any channels.

## 5. Service Info. (obowiązkowe)
- Category: wybierz kategorię wideo / rozrywka najbliższą odtwarzaczom.
- App Version: `1.1.0`.
- App Rating: najniższa dostępna (aplikacja sama nie zawiera treści); Content Rating: **brak treści dla dorosłych**.
- Tag Keywords: `m3u m3u8 iptv playlist player hls epg xmltv`
- Contact Seller information: **e-mail lub strona wsparcia** (min. jedno).
- Collection of data: wymagane tylko przy Wielkiej Brytanii – aplikacja **nie zbiera danych**; polityka: `store/PRIVACY.md` (opublikuj ją pod stałym adresem i uzupełnij kontakt). Skrót polityki jest też w aplikacji (Ustawienia).

## 6. Feature Info. (obowiązkowe)
- Device Requirement(s): **None**.
- Remote Controller: **Both Magic and general remote**.
- DIAL: nie.

## 7. Test Info. (obowiązkowe)
- UX Scenario File: pobierz szablon w Seller Lounge („Download Template”) i opisz: start → dodanie playlisty z URL → wybór grupy → odtwarzanie → zmiana kanału CH+/CH− → ulubione (zielony) → program TV (czerwony) → BACK.
- Test Account: **Not applicable**. Billing: **Not applicable**. In-App Ad: **Not applicable**. Geo IP Block: **No**.
- **Note for Tester** (EN):
> The app ships without any channels. To test playback, on the start screen press OK → "Dodaj playlistę" (Add playlist), enter the test playlist URL below in "Adres URL" and choose "Zapisz i wczytaj" (Save and load). The playlist contains public HLS test streams (Big Buck Bunny, Apple bipbop, Tears of Steel, Akamai live test).
> Test playlist URL: **[WSTAW: publiczny, krótki adres pliku `store/qa-test-playlist.m3u`]**
> Keys: OK – play, CH+/CH− or Up/Down in player – change channel, Green – favourite, Yellow – search, Red – TV guide, BACK – back / exit.
- Plik testowej playlisty: `store/qa-test-playlist.m3u`. Musi być dostępny publicznie (np. surowy plik z publicznego repozytorium GitHub albo własny serwer). Recenzent wpisuje adres pilotem, więc **najlepiej skrócony adres**.

## 8. Self-check list i Defect Info. (obowiązkowe)
Wypełnij w Seller Lounge zgodnie z wynikami własnych testów z punktu 0.

## Znane ograniczenia (warto wiedzieć przed QA)
- Interfejs tylko po polsku.
- Strumienie wymagające własnych nagłówków (`User-Agent`, `Referer`) nie zadziałają.
- Pobranie playlisty/EPG z serwera zależy od tego, czy webOS pozwala aplikacji na zapytanie do danego hosta (CORS) – sprawdź na telewizorze.
- Aplikacja nie była jeszcze uruchamiana na prawdziwym telewizorze.
