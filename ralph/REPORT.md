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
- **Postęp**: Faza 1 wydana jako v0.1.0; 28 pozycji planu zmergowanych (Faza 1, 2.1–2.7 z testami); 2.8 + Test 2.8 w PR #18
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

**Regresja po Fazie 1 (2026-10-13) — ZIELONA:** main `1237d1a`: `npx tsc --noEmit`, `npm run lint`, `npm test` 84/84 (18 zestawów); e2e Detox 3/3 na Androidzie (lokalnie API 36, CI API 34) i iOS (CI). Kontrole fazowe bez blokad: 5 ostrzeżeń audytu zależności (braces, node-forge, sprintf-js bez poprawek; stream-json dev; uuid 7.0.3 medium) i 6 `martwe-wejscie` — wejścia podepną zadania Fazy 2 (networkPolicy → 2.2/6.1, MessageRepository → 2.5, useSettingsStore → 2.9/3.x, rollbackTo zostaje jako `down` migracji), `encodeWav` przeniesiony do pomocników testów. Tag `ralph/faza-1`.

| Metryka | Wartość |
|---------|---------|
| Łącznie testów | 157 |
| Pass | 157 |
| Fail | 0 |
| Skip | 0 |
| Ostatnie uruchomienie | 2026-10-13 (gałąź zadanie-2.8-auto-tytul) |

## Historia realizacji

| Zadanie | Status | Testy | Próby | Commit | Czas |
|---------|--------|-------|-------|--------|------|
| 1.1 Szkielet architektury i konwencje | ✅ zmergowane (PR #1) | 20/20 | 2 | 0a8d01d | 2026-10-13 |
| 1.2 Inicjalizacja projektu Expo + Test 1.2 | ✅ zmergowane (PR #2) | 24/24 | 1 | 4a767cf | 2026-10-13 |
| 1.3 Baza SQLite + migracje + Test 1.3 | ✅ zmergowane (PR #3) | 34/34 | 2 | 562d090 | 2026-10-13 |
| 1.4 Repozytoria tematów i wiadomości + Test 1.4 | ✅ zmergowane (PR #4) | 44/44 | 1 | 0dc6097 | 2026-10-13 |
| 1.5 Ustawienia (Zustand) i SecretStore + Test 1.5 | ✅ zmergowane (PR #5) | 55/55 | 1 | 53368a9 | 2026-10-13 |
| 1.6 Interfejsy silników, atrapy, EngineRegistry + Test 1.6 | ✅ zmergowane (PR #6) | 76/76 | 1 | 95973c2 | 2026-10-13 |
| 1.7 Nawigacja, teksty PL, motyw + Test 1.7 | ✅ zmergowane (PR #7) | 84/84 | 2 | e39fa63 | 2026-10-13 |
| 1.8 Test e2e fazy 1 (Detox) | ✅ zmergowane (PR #8) | 84/84 + e2e 3/3 Android i iOS | 4 | 1237d1a | 2026-10-13 |
| Wydanie v0.1.0 (scenariusze testerów, PR #10) | ✅ tag v0.1.0, migawka Specky | — | 1 | 9abf426 | 2026-10-13 |
| 2.1 Katalog modeli + Test 2.1 | ✅ zmergowane (PR #11) | 96/96 | 1 | 9cf016c | 2026-10-13 |
| 2.2 ModelDownloadService + Test 2.2 | ✅ zmergowane (PR #12) | 115/115 | 1 | f074ceb | 2026-10-13 |
| 2.6 Ekran listy tematów + Test 2.6 | ✅ zmergowane (PR #13) | 121/121 na main | 3 | 9d16d57 | 2026-10-13 |
| 2.3 LocalLlmEngine (llama.rn) + Test 2.3 | ✅ zmergowane (PR #14) | 127/127 | 1 | 4a8ccd3 | 2026-10-13 |
| 2.4 ContextBuilder + Test 2.4 | ✅ zmergowane (PR #15) | 134/134 | 1 | d097231 | 2026-10-13 |
| 2.5 ConversationService + Test 2.5 | ✅ zmergowane (PR #16) | 141/141 | 1 | 0f959db | 2026-10-13 |
| 2.7 Ekran Rozmowa (tekstowy) + Test 2.7 | ✅ zmergowane (PR #17) | 147/147 | 2 | 825ec83 | 2026-10-13 |
| 2.8 Automatyczny tytuł + Test 2.8 | PR #18 otwarty | 157/157 | 1 | — | 2026-10-13 |

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
- [2026-10-13] Zadanie 1.6: mutacja `resolveEngineMode` (flaga e2e ignorowana) → 2 testy czerwone, w tym test App przez wejście (badge „Tryb testowy").
- [2026-10-13] [check] PR #6 — Specky contract check: brak trailera w zadaniu bez wymagania — dopisane `Specky-Req: none` (status neutral jest dla tej deklaracji zamierzony). Przy okazji opis PR poprawiony przez `gh pr edit --body`, czego 17.5 nie przewiduje — od teraz `Specky-Req: none` od razu w commicie i opisie.
- [2026-10-13] Zadanie 1.7: tytuły native-stack są propem `RNSScreenStackHeaderConfig`, nie `<Text>` — test czyta tytuł widocznego ekranu z drzewa JSON. App.test zmieniony (pierwszy ekran to lista tematów zamiast nagłówka „MobiVoice") — zmiana zachowania, nie dopasowanie do implementacji. Mutacja motywu → test czerwony.
- [2026-10-13] [check] PR #7 — ios (native-build): job anulowany, bo GitHub nie przydzielił runnera macOS (braki pojemności) — ponowienie zielone; to nie błąd kodu.
- [2026-10-13] Zadanie 1.8: `@config-plugins/detox` wymaga expo@^53 — zamiast wymuszać peer deps przeniesiona do lokalnej wtyczki `plugins/withDetox.js`, aktywnej tylko przy EXPO_PUBLIC_E2E=1 (app.config.js).
- [2026-10-13] Zadanie 1.8: `assembleAndroidTest` dla wszystkich modułów padał na `:expo-dev-client:mergeExtDexDebugAndroidTest` — build ograniczony do `:app:`. Brakujące zależności e2e: tslib (nieaktualny `node_modules/.package-lock.json` udawał instalację — usunięty, reinstalacja) i babel-preset-expo jako jawna devDependency.
- [2026-10-13] Zadanie 1.8: iOS e2e lokalnie niemożliwe (Xcode bez platformy iOS 26.5) — tylko workflow `e2e.yml` (macos-latest); Android lokalnie na emulatorze API 36, w CI API 34 x86_64 z `-PreactNativeArchitectures=x86_64` tylko dla buildu e2e.
- [2026-10-13] Zadanie 1.8: ostrzeżenie zaleznosci/skrypty-instalacyjne (detox: postinstall, odcisk 13b0e02a7844) — skrypt Detoxa przygotowuje framework iOS przy instalacji; zależność tylko deweloperska, zostaje.
- [2026-10-13] [check] PR #8 — e2e ios: Detox wymaga applesimutils, a nowy Homebrew odmawia formuł z niezaufanego tapu (`brew trust wix/brew`); wybór symulatora z listy dostępnych urządzeń zamiast typów. e2e Android w CI zielony za pierwszym razem.
- [2026-10-13] Zadanie 2.1: głosy Piper w sherpa-onnx (csukuangfj/vits-piper-pl_PL-*) wymagają danych eSpeak NG; katalog zawiera tylko polski podzbiór (6 plików, 724 KB: phontab, phonindex, phondata, intonations, pl_dict, lang/zlw/pl) jako wspólny składnik obu głosów — założenie do potwierdzenia w 3.4 na prawdziwym silniku. SHA256 plików spoza LFS policzone z pobranych plików.
- [2026-10-13] Zadanie 2.1: eSpeak NG (dane i biblioteka w sherpa-onnx) jest na licencji GPL-3.0-or-later — do rozważenia przez człowieka przed dystrybucją poza wewnętrzną (ekran licencji 5.4).
- [2026-10-13] Zadanie 2.2: SHA256 plików do 2 GB liczy natywnie react-native-blob-util (`fs.hash`); wznawianie przez HTTP Range do bocznego pliku `.chunk`, dopisywanego do `.part` także po przerwaniu. Hugging Face przekierowuje duże pliki na `*.hf.co` (zakresy działają, 206) — host dodany do polityki sieci i mapy. Mutacja wznawiania → test czerwony. Wejście (przycisk „Pobierz") powstanie w 2.7.
- [2026-10-13] Zadanie 2.6: zrobione równolegle z PR #12 (2.3 czekało na merge 2.2). Zmiana testu `translations.test.ts` — regex strażnika łapał fragmenty kodu (`> 0 ? …`, `=> setTitle(…)`) jako tekst JSX; zawężony do jednej linii bez znaków kodu, przykład wykrywania rozszerzony o przypadek fałszywy (spec: MV-UI-1 — teksty UI, nie kod). RNTL 14: `fireEvent` jest asynchroniczny — bez `await` zmiana pola nie zdążyła przed „Zapisz"; wszystkie `fireEvent` w testach mają `await`. Mutacja usuwania bez potwierdzenia → test czerwony.
- [2026-10-13] Zadanie 2.3: llama.rn 0.12.9 (najnowsze stabilne; `latest` wskazuje rc 0.13). Jeden model w pamięci (`LlamaContextSlot`), Metal na iOS (99 warstw), CPU na Androidzie. Zmiana testu `EngineRegistry.test.ts` — produkcyjne `llm()` zwraca teraz `LocalLlmEngine` zamiast `engine_unavailable` (zmiana zachowania z planu 1.6/2.3); nadal sprawdza, że to nie atrapa. llama.rn i react-native-blob-util mockowane globalnie w `jest-setup.ts`. Mutacja zwalniania modelu → test czerwony.
- [2026-10-13] Zadanie 2.3: ostrzeżenie zaleznosci/skrypty-instalacyjne (llama.rn: postinstall, odcisk 5a921a28fbcf) — skrypt pobiera prebudowane biblioteki llama.cpp i sprawdza je SHA-256 z manifestu paczki; zostaje.
- [2026-10-13] Zadanie 2.4: PR łańcuchowy na gałęzi 2.3 (plan: wymaga 2.3, brak zadań niezależnych) — po merge #14 przepiąć #15 na main (17.5). Tokeny szacowane 3 znaki/token (bez tokenizera modelu w JS, z zapasem dla polskiego); streszczenie kroczące w nowej tabeli `context_summaries` (migracja 002), odświeżane tylko dla niepokrytych wiadomości. Testy migracji oparte na liście `MIGRATIONS` zamiast stałej 1 (dodanie migracji to zmiana zachowania, nie dopasowanie). Mutacja budżetu → 4 testy czerwone.
- [2026-10-13] Zadanie 2.5: PR łańcuchowy na 2.4 (#15). Pusta odpowiedź (stop przed pierwszym tokenem) nie zapisuje wiadomości asystenta; błąd modelu zostawia pytanie w historii. Mutacja flagi interrupted → test czerwony. Wejścia (ekran Rozmowa, potok głosowy) w 2.7/3.6.
- [2026-10-13] Zadanie 2.7: `ServicesProvider` składa usługi aplikacji (rozmowa, pobieranie, gotowość modelu; w trybie e2e model zawsze gotowy). Testy ekranów renderują przez `TestProviders` (prawdziwy SQLite, silniki testowe, pobieranie w pamięci) — RootNavigator.test i TopicListScreen.test przełączone z samego DatabaseProvider, bo Rozmowa potrzebuje usług. Test kończący się w trakcie generowania zamykał bazę przed zapisem odpowiedzi — testy kończą odpowiedź przed sprzątaniem. Mutacja STOP → test czerwony; zestaw 3× stabilny.
- [2026-10-13] Zadanie 2.8: migracja 003 `title_source` (default/auto/manual) z migracją danych tematów o tytule „Nowa rozmowa" na `default`; `applyAutoTitle` atomowo tylko przy `default`. Test repozytorium uzupełniony o nowe pole `titleSource` (zmiana kształtu encji). Mutacja warunku → test wyścigu czerwony.
