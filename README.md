# Writer

Lokalny warsztat do tworzenia powiesci: edytor ciaglego tekstu, planowanie rozdzialow, baza swiata i asystent AI pomagajacy pilnowac kontinuum.

## Status

Projekt jest na etapie prototypu frontendowego. Dzialajacy interfejs prowadzi przez pelny cykl:

- `Przygotowanie` zamyslu, bohaterow i swiata;
- `Writer` do pisania bez wymuszania podzialu;
- `Plan` do pozniejszego dzielenia materialu na rozdzialy i sceny;
- biblioteka bohaterow, miejsc, watkow i notatek;
- `Eksport i import` przenosnego projektu.

Warstwa Tauri/SQLite i eksport EPUB sa kolejnymi etapami. Prototyp ma juz trwaly zapis przegladarkowy przez `localStorage`, dynamiczne elementy biblioteki swiata, adapter czatu do lokalnej Ollamy oraz generowanie DOCX/PDF.

### Ostatnie elementy prototypu

- symetryczny layout z lewa nawigacja, glowna trescia i prawa szyna Asystenta;
- panel Asystenta wysuwany poziomo z prawej strony;
- czat z historia wiadomosci, wysylaniem Enterem i szybkim podpowiedziami;
- akcje tekstowe: kontinuum, rozwiniecie opisu, korekta i tlumaczenie EN;
- osobny ekran eksportu z pakietem projektu oraz opcjami DOCX, PDF i EPUB;
- generowanie DOCX i PDF po kliknieciu, z lazy loadingiem bibliotek eksportu;
- lokalny autosave tytulu, tekstu i biblioteki swiata;
- dodawanie bohaterow, miejsc, watkow i notatek z poziomu biblioteki;
- czat Asystenta korzystajacy z `http://localhost:11434/api/chat` i modelu `llama3.2:3b`;
- prompt Asystenta zawiera tytul, tryb pracy, tekst roboczy i biblioteke swiata;
- zaznaczony fragment w edytorze jest przekazywany jako priorytetowy kontekst pracy;
- odpowiedzi moga byc po polsku lub angielsku i sa oczyszczane z surowych znacznikow Markdown przed wyswietleniem;
- Asystent proponuje konkretne kierunki i gotowe fragmenty zamiast prowadzenia dlugiego wywiadu;
- widoki podstron korzystaja ze wspolnych wymiarow i responsywnego layoutu.

## Ustalenia produktu

- Aplikacja docelowo bedzie desktopowa i lokalna.
- Rekomendowany stack: Tauri 2, React, TypeScript i lokalny zapis projektu.
- AI ma dzialac lokalnie przez Ollame, bez obowiazkowego zewnetrznego API.
- Interfejs i prompty beda po polsku.
- Zaznaczony tekst bedzie mozna tlumaczyc na angielski.
- Dane powiesci nie maja opuszczac komputera.
- Ollama jest opcjonalna: edytor i baza swiata musza dzialac bez modelu.

## Model pracy

Uzytkownik nie musi od razu wiedziec, gdzie zaczyna sie scena ani rozdzial. Moze pisac ciagiem w trybie `Writer`, a dopiero pozniej przejsc do `Plan` i uporzadkowac surowy material. Tryb `Skupienie` ukrywa nawigacje i zostawia tylko tekst.

Pelny przeplyw:

1. `Przygotowanie`: zamysl fabuly, bohaterowie, swiat, miejsca, watki i zasady opowiesci.
2. `Writer`: ciagle pisanie bez wymuszania podzialu na rozdzialy i sceny.
3. `Asystent`: korekta, opisy, pytania o kontinuum i ostrzezenia o mozliwych sprzecznosciach.
4. `Plan`: dzielenie surowego tekstu na rozdzialy i sceny, kiedy material jest gotowy.
5. `Eksport`: przygotowanie rekopisu do wyslania lub pakietu do przeniesienia na inne urzadzenie.

Asystent powinien dzialac zadaniowo: gdy uzytkownik sie blokuje, proponuje kilka mozliwych dalszych ruchow wraz z konsekwencjami fabularnymi i rekomendacja. Gdy potrzebny jest opis, generuje przykladowy fragment na podstawie tekstu i kanonu. Zadaje najwyzej jedno pytanie, tylko gdy bez niego nie mozna sensownie ruszyc.

## Przenoszenie projektu

Projekt Writer nie moze zalezec od konkretnej lokalnej bazy danych. Aplikacja eksportuje wersjonowany pakiet projektu, ktory mozna otworzyc na innym urzadzeniu:

- prototyp uzywa pliku `.writer.json`, a docelowo moze uzywac `.writer` jako archiwum ZIP;
- pakiet zawiera manifest: identyfikator formatu, wersje schematu i date eksportu;
- zawiera tytul projektu i tekst roboczy;
- docelowo zawiera rozdzialy, sceny, bohaterow, miejsca, fakty, relacje, watki, wydarzenia, os czasu, notatki i ustawienia;
- import waliduje wersje i moze uruchamiac migracje starszych pakietow.

Pakiet `.writer` sluzy do przenoszenia calego warsztatu miedzy instalacjami Writer. Nie jest tym samym co `DOCX` lub `PDF`, ktore sa eksportem rekopisu do czytania albo wyslania.

## Eksport dla wydawnictwa

Nie ma jednego formatu wymaganego przez wszystkie wydawnictwa. Rekomendowany kierunek:

- `DOCX` jako podstawowy, edytowalny rekopis;
- `PDF` jako podglad wygladu i wersja do czytania;
- `EPUB` jako pozniejszy format publikacji cyfrowej.

Pakiet projektu i rekopis wydawniczy powinny pozostac dwoma osobnymi eksportami.

## Plan MVP

1. Zbudowac wygodny edytor ciaglego tekstu z trybem skupienia.
2. Dodac trwaly lokalny zapis projektu i autosave.
3. Dodac dynamiczne formularze faktow, relacji i osi czasu oraz rozbudowac obecne formularze biblioteki.
4. Dodac dzielenie tekstu na rozdzialy i sceny.
5. Wydzielic interfejs `AiProvider` i rozbudowac adapter Ollamy o kontekst projektu.
6. Dodac korekte interpunkcji, redakcje, rozwijanie opisow i tlumaczenie.
7. Dodac analize kontinuum z ustrukturyzowanymi ostrzezeniami i odwolaniami do zrodel.
8. Dodac eksport EPUB i przeniesc zapis projektu do katalogu Tauri.

Poza MVP pozostaja synchronizacja chmurowa, konta, wspolpraca realtime i wieloagentowe workflow.

## Uruchomienie

Wymagania: Node.js 20+ i npm.

```bash
npm install
npm run dev
```

Build produkcyjny i lint:

```bash
npm run build
npm run lint
```

## Testy i weryfikacja

`npm run build` wykonuje kompilacje TypeScript i produkcyjny bundling Vite. `npm run lint` uruchamia Oxlint. Nie ma jeszcze osobnego test runnera, dlatego interakcje prototypu trzeba sprawdzic recznie w przegladarce.

Scenariusz smoke testu:

1. Uruchom `npm run dev` i otworz adres pokazany przez Vite.
2. Przejdz z `Przygotowanie` do `Writer`, wlacz `Skupienie` i wpisz tekst.
3. Otworz `Plan`, potem zakladki bohaterow, miejsc, watkow i notatek.
4. Otworz `Eksport i import` i pobierz plik `.writer.json`.
5. Zmien tytul lub tekst, a nastepnie otworz pobrany plik przez `Otworz projekt z pliku`.
6. Sprawdz, czy tytul i tekst wracaja do wartosci zapisanych w pakiecie.

Aktualny prototyp przenosi tytul, tekst roboczy i dynamiczna biblioteke swiata. Lokalny autosave odtwarza te dane po ponownym uruchomieniu w tej samej przegladarce. Eksport rekopisu generuje DOCX i PDF, a zapis docelowo zostanie przeniesiony do przenosnego katalogu projektu Tauri.

Ostatnia walidacja projektu:

- `npm run build` — przechodzi;
- `npm run lint` — przechodzi;
- diagnostyka TypeScript i CSS — bez bledow;
- test struktury widokow — sprawdzone `Przygotowanie`, `Writer`, `Plan`, `Eksport`, `Bohaterowie`, `Miejsca`, `Watki` i `Notatki`;
- test klas layoutu — wszystkie podstrony maja odpowiadajace klasy CSS;
- smoke test HTTP — Vite zwraca poprawny punkt montowania Reacta.

Nie wykonujemy jeszcze automatycznego testu screenshotowego, poniewaz Playwright nie jest obecnie zainstalowany. Weryfikacja wizualna odbywa sie recznie w przegladarce.

## Tauri i Ollama

Tauri wymaga Rust i Cargo. Na macOS nalezy zainstalowac Rust przez rustup, a nastepnie dodac zaleznosci Tauri do projektu. Aby wlaczyc rozmowe z Asystentem, zainstaluj Ollame i model `llama3.2:3b`:

```bash
ollama serve
ollama pull llama3.2:3b
```

Ollama powinna dzialac lokalnie na domyslnym endpointcie `http://localhost:11434`. Bez niej edytor, autosave i kanon nadal dzialaja, a czat pokazuje czytelny komunikat o braku polaczenia.

## Zasady dla kolejnych modeli

- Czytaj ten plik przed zmiana architektury lub zakresu.
- Zachowuj lokalnosc danych i opcjonalnosc AI.
- Nie przedstawiaj odpowiedzi modelu jako pewnego faktu.
- Nie nadpisuj tekstu bez wyraznej akceptacji uzytkownika.
- Przy zmianie modelu danych aktualizuj ten README i testy.
- Utrzymuj osobny adapter AI, aby Ollama mogla zostac wymieniona bez przebudowy UI.
