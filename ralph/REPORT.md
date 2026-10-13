# ralph/REPORT.md - Raport realizacji projektu

<!-- Plik trafia W CAŁOŚCI do promptu startowego każdej sesji. Dwa rodzaje sekcji:            -->
<!--   • stan bieżący (Podsumowanie) — NADPISUJ, to ma być jeden aktualny opis;             -->
<!--   • kronika (Stan testów, Historia realizacji, Historia zmian, Log problemów,           -->
<!--     Artefakty) — DOPISUJ jeden wpis; starsze rotują się do ralph/REPORT_ARCHIVE.md      -->
<!--     przy starcie (Stan testów: 3 ostatnie przebiegi).                                   -->
<!-- Nie zakładaj własnych sekcji `## ` na podsumowania sesji — KAŻDA sekcja `## ` spoza      -->
<!-- tego szablonu jest doraźna i zostają z nich tylko 3 najnowsze.                          -->
<!-- Rotacja przenosi CAŁE wpisy, także wielolinijkowe. Wpis musi mieć rozpoznawalny         -->
<!-- początek (wiersz tabeli, `### …`, `- [data] …`, `- **Nazwa …**`), a akapit doklejony     -->
<!-- pod wpisem liczy się jako jego ciąg dalszy i pojedzie do archiwum razem z nim.           -->

## Podsumowanie

- **Start**: 2026-10-13
- **Status**: W trakcie
- **Postęp**: 7/57 zadań zmergowanych (1.1–1.4 z testami); 1.5 + Test 1.5 w PR #5
- Specky: pracuję jako mariusz.iskra (mariusz.iskra@gmail.com), organizacja mariusz.iskra's Organization
- Specky 2026-10-13: synchronizacja — 0 pozycji w kolejce (to_fix 0), kursor 810

## Stan testów

<!--
Tabela to stan bieżący — PODMIENIAJ liczby, nie dokładaj drugiej tabeli.
Nad tabelą jeden akapit per przebieg pełnego suite'u, otwarty pogrubieniem z datą:

**Regresja po Fazie 12 (2026-08-20) — ZIELONA:** backend `pytest -q` 340/0, frontend 210/0.
Względem 328/205 po Fazie 11: +12 testów backendu. Tag `ralph/faza-12`.

Data w pierwszej linii jest OBOWIĄZKOWA — po niej rotacja rozpoznaje, które przebiegi
zostawić (3 ostatnie), a które przenieść do ralph/REPORT_ARCHIVE.md. Akapit bez daty
jest traktowany jako ciąg dalszy przebiegu powyżej. Bez daty blok zostaje w pliku
na zawsze i rośnie w prompcie każdej sesji.
-->

| Metryka | Wartość |
|---------|---------|
| Łącznie testów | 55 |
| Pass | 55 |
| Fail | 0 |
| Skip | 0 |
| Ostatnie uruchomienie | 2026-10-13 (gałąź zadanie-1.5-ustawienia-sekrety) |

## Historia realizacji

| Zadanie | Status | Testy | Próby | Commit | Czas |
|---------|--------|-------|-------|--------|------|
| 1.1 Szkielet architektury i konwencje | ✅ zmergowane (PR #1) | 20/20 | 2 | 0a8d01d | 2026-10-13 |
| 1.2 Inicjalizacja projektu Expo + Test 1.2 | ✅ zmergowane (PR #2) | 24/24 | 1 | 4a767cf | 2026-10-13 |
| 1.3 Baza SQLite + migracje + Test 1.3 | ✅ zmergowane (PR #3) | 34/34 | 2 | 562d090 | 2026-10-13 |
| 1.4 Repozytoria tematów i wiadomości + Test 1.4 | ✅ zmergowane (PR #4) | 44/44 | 1 | 0dc6097 | 2026-10-13 |
| 1.5 Ustawienia (Zustand) i SecretStore + Test 1.5 | PR #5 otwarty | 55/55 | 1 | — | 2026-10-13 |

## Historia zmian

<!--
Wpisy dodawane przez Ralpha po przetworzeniu pliku z changes/.
Format wpisu (jeden ### na każdą zmianę):

### YYYY-MM-DD <nazwa-pliku>.md
- **Rodzaj**: błąd | korekta | rozwój
- **Źródło błędu**: [tylko przy błędzie: zadanie X.Y, które to zbudowało | nieznane]
- **Wykryte przez**: [tylko przy błędzie: test | scenariusz | review | ralph | właściciel | produkcja]
- **Priorytet**: krytyczny | normalny
- **Dotyczy**: [pole dotyczy z frontmattera lub "ogólne"]
- **Streszczenie**: [1-2 zdania co się zmienia i dlaczego]
- **Zmodyfikowane zadania pending**: [lista numerów, np. 4.2, 5.1] lub "brak"
- **Nowa faza rework**: [np. Faza 6.Z1 z 3 zadaniami] lub "brak"
- **Nowe zadania**: [lista numerów, np. 7.4, 7.5] lub "brak"

Plik źródłowy zmiany żyje w changes/processed/<nazwa-pliku>.md (audyt w gicie).
-->

## Artefakty wizualne

<!--
Sekcja uzupełniana TYLKO gdy w ralph/config.md sekcja `## Artefakty wizualne` ma
`screeny: tak` lub `nagrania: tak`. Pełna procedura: sekcja 0.5 instrukcji.

Format wiersza:
| Faza | Typ | ID | Plik artefaktu | Spec source |
|------|-----|----|--------------:|-------------|
| 1    | screen | B1_ProjectOverview | artifacts/screens/B1_ProjectOverview.png | spec/ux_ui/screens-b1-b2.jsx:52-200 |
| 1    | flow   | krok-1             | artifacts/flows/krok-1-rejestracja.webm  | spec/APP_FLOW.md:11-30 |

Info-warningi (brak APP_FLOW.md mimo nagrania:tak, brak flow_files, itp.) zapisuj
poniżej tabeli z prefiksem `> ⚠ Info:` tak żeby user widział co poszło "po cichu".
-->

| Faza | Typ | ID | Plik artefaktu | Spec source |
|------|-----|----|----------------|-------------|
| | | | | |

## Log problemów

<!-- Format: [data] Zadanie X.X: opis problemu - rozwiązanie/status -->
<!-- Listy zmienionych plików NIE prowadzimy — git zna ją lepiej: git log --stat -->

- [2026-10-13] Zadanie 1.1: zdalne repo było puste (brak gałęzi main) — wypchnięto istniejący commit doprecyzowania jako main, żeby PR-y miały bazę.
- [2026-10-13] Zadanie 1.1: brak `.github/workflows/specky-ci.yml` w repo — skopiowany z szablonu Ralpha i dopasowany (Node 22, tsc, jest + jest-junit).
- [2026-10-13] Zadanie 1.1: `networkPolicy.assertAllowedOutboundUrl` nie ma jeszcze wejścia — podepną je 2.2 (pobieranie modeli), 6.1 (klient HTTP) i 9.1 (raporty awarii).
- [2026-10-13] [check] PR #1 — Specky contract check: kryteria „CI go nie uruchomił", bo jest-junit dawał name = describe + tytuł; Specky dopasowuje plik + ostatni segment po ` > ` — classNameTemplate `{filepath}`, titleTemplate `{title}`.
- [2026-10-13] Zadanie 1.1: `npm audit` — 34 podatności (5 moderate, 29 high) w zależnościach deweloperskich Jest 29 (braces, sprintf-js itp.), naprawa tylko `--force`; zestaw zależności testowych wymieni 1.2 (preset Expo), wtedy audyt ponownie.
- [2026-10-13] Zadanie 1.2: Expo SDK 57 wymaga `ios.deploymentTarget` ≥ 16.4 (spec: iOS 16+) — ustawione 16.4, propozycja decyzji technicznej w Specky (01M4TTARHWPFRM2N8PZPGMZDNV) czeka na człowieka.
- [2026-10-13] Zadanie 1.2: lokalny build iOS niemożliwy — Xcode 26.6 bez komponentu platformy iOS 26.5; build obu platform przeniesiony do CI (`native-build.yml`). Android lokalnie: `assembleDebug` BUILD SUCCESSFUL.
- [2026-10-13] Zadanie 1.2: kryteria MV-PLAT-1 (build obu platform, uruchomienie na iOS 16 / Android 10) bez testu JUnit — dowód: workflow native-build + sprawdzenie ręczne; brak lokalnie emulatora API 29 i symulatora iOS 16.
- [2026-10-13] Zadanie 1.3: testy SQL na better-sqlite3 padały tylko przy równoległych workerach Jest (błąd z innego realmu, `toThrow` go nie widzi) — adapter testowy przepakowuje błędy w `Error`; asercje bez zmian.
- [2026-10-13] Zadanie 1.3: mutacja `PRAGMA foreign_keys = OFF` → 4 testy czerwone (kaskada, pragma) — reguła pilnowana.
- [2026-10-13] Zadanie 1.3: ostrzeżenie testy/test-przypiety (App.test.tsx, odcisk fa8182898c4c) — App czeka teraz na otwarcie bazy, więc test dostał atrapę openAppDatabase; asercja nagłówka zachowana, dopisane przypadki bramki startowej i błędu bazy.
- [2026-10-13] Zadanie 1.4: wyszukiwanie tematów po tytule filtrowane w JS (`toLocaleLowerCase('pl')`), bo LIKE/lower() w SQLite składają tylko ASCII; mutacja aktualizacji last_activity_at → 2 testy czerwone.
- [2026-10-13] Zadanie 1.5: `jest.mock` z fabryką odwołującą się do stałej modułu testu łamie się na hoistingu importów (TDZ) — fabryka wywołuje `require('./support/…')`, uchwyt przez `jest.requireMock`. Testowe klucze bez prefiksów `sk-…`, żeby nie wyglądały jak prawdziwe dla kontroli `sekrety`.
