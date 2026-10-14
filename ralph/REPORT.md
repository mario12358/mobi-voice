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
- **Postęp**: Fazy 1–2 ukończone (33 pozycje planu zmergowane); Faza 1 wydana jako v0.1.0; v0.2.0 odłożona przez człowieka; w toku: 3.1
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

**Regresja po Fazie 2 (2026-10-13) — ZIELONA:** main `0f60d41`: `npx tsc --noEmit`, `npm run lint`, `npm test` 165/165 (28 zestawów); e2e Detox 7/7 na Androidzie (lokalnie API 36, CI API 34) i iOS (CI). Kontrole fazowe bez blokad: te same 5 ostrzeżeń audytu zależności co po Fazie 1, `martwe-wejscie` tylko `validateCatalog` (przeniesiony do pomocników testów). Tag `ralph/faza-2`. Po drodze e2e iOS ujawnił 2 błędy produktu z 2.7/2.6 (klawiatura zasłaniała pole wiadomości; pierwsze dotknięcie przy otwartej klawiaturze tylko ją chowało) — naprawione w PR #20.

| Metryka | Wartość |
|---------|---------|
| Łącznie testów | 165 |
| Pass | 165 |
| Fail | 0 |
| Skip | 0 |
| Ostatnie uruchomienie | 2026-10-13 (main 0f60d41; e2e 7/7 Android i iOS) |

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
| 2.8 Automatyczny tytuł + Test 2.8 | ✅ zmergowane (PR #18) | 157/157 | 2 | 4b72425 | 2026-10-13 |
| 2.9 Prompt systemowy + Test 2.9 | ✅ zmergowane (PR #19) | 165/165 | 1 | 4db9e34 | 2026-10-13 |
| 2.10 Test e2e Fazy 2 (Detox) | ✅ zmergowane (PR #20) | 165/165 + e2e 7/7 Android i iOS | 8 | 0f60d41 | 2026-10-13 |
| 3.1 AudioSessionService + Test 3.1 | ✅ zmergowane (PR #22) | 175/175 | 1 | bbf2528 | 2026-10-14 |
| 3.5 SpeechText + Test 3.5 | ✅ zmergowane (PR #27) | 201/201 | 1 | 0e11204 | 2026-10-14 |
| 3.2 VadEngine (Silero, sherpa-onnx) + Test 3.2 | ✅ zmergowane (PR #24) | 211/211 | 4 | 73c2a69 | 2026-10-14 |
| 3.3 WhisperSttEngine + Test 3.3 | ✅ zmergowane (PR #25) | 216/216 | 2 | 6c8351b | 2026-10-14 |
| 3.4 PiperTtsEngine + Test 3.4 | ✅ zmergowane (PR #26) | 222/222 | 1 | 38fb5a7 | 2026-10-14 |
| 3.6–3.9 Sesja głosowa, ekran, metryki, e2e | ✅ zmergowane (PR #28) | 238/238 + e2e 9/9 Android i iOS | 4 | c9eeba8 | 2026-10-14 |

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
- [2026-10-13] Zadanie 2.8: kontrola lint-typy zablokowała commit — typograficzne cudzysłowy w wyrażeniu regularnym `cleanTitle`; narzędzie Edit zamieniło ucieczki `\u201E` z powrotem na znaki, zapis przez skrypt.
- [2026-10-13] Zadanie 2.9: prompt domyślny przechowywany jako `null` (zmiana domyślnego dociera do osób, które go nie zmieniały); pusty prompt tematu = globalny. Mutacja kolejności w resolverze → 2 testy czerwone.
- [2026-10-13] Zadanie 2.10: atrapa LLM w buildzie e2e (`E2E_SCRIPT`) odpowiada stałym tytułem na prośbę o tytuł (echo promptu tytułującego dawało nieprzewidywalny tytuł) i długą odpowiedzią na pytanie z „długo" (STOP w trakcie strumienia, z wyłączoną synchronizacją Detox). Pierwszy przebieg: 3 testy czerwone przez założenia testu (tytuł, czekanie na tekst wewnątrz dymka, `toBeVisible` dla małej etykiety) — aplikacja działała poprawnie.
- [2026-10-13] [check] PR #20 — e2e ios: klawiatura zasłaniała pole wiadomości i Wyślij (stałe keyboardVerticalOffset 96 przy wyższym nagłówku z Dynamic Island) — błąd produktu z 2.7, offset = useHeaderHeight(); znacznik motywu w trybie testowym znikał na iOS (pusty widok spłaszczony) — collapsable={false}. Pozostałe czerwone iOS były skutkiem pierwszego.
- [2026-10-13] [check] PR #20 — e2e ios: systemowe okno Alert nieosiągalne stabilnie selektorami Detox na iOS (klasa akcji UIAlertController inna niż zakładana) — potwierdzenie usunięcia tematu przeniesione do własnego ConfirmDialog (testID, ten sam wygląd na obu platformach). Test jednostkowy usuwania przepięty z atrapy Alert na przyciski okna (zmiana implementacji, reguła ta sama); mutacja usuwania bez potwierdzenia → test czerwony.
- [2026-10-13] [check] PR #20 — e2e ios niestabilny na STOP: na wolnym symulatorze CI odpowiedź 60 tokenów kończyła się przed tapnięciem STOP (pozostałe testy padały kaskadowo) — długa odpowiedź atrapy wydłużona do 300 tokenów (~18 s, STOP przerywa od razu).
- [2026-10-13] [check] PR #20 — e2e ios: okno potwierdzenia nie otwierało się, bo iOS nie prezentuje nowego Modala, dopóki poprzedni (zmiana nazwy) się chowa — test czeka na zniknięcie okna zmiany nazwy. Do rozważenia w UX: szybkie otwarcie drugiego okna zaraz po zamknięciu pierwszego na iOS zostanie zignorowane.
- [2026-10-13] [check] PR #20 — e2e ios: przyczyną nieotwierającego się okna usuwania był błąd z 2.6/2.7 — FlatList z domyślnym keyboardShouldPersistTaps=never zużywał pierwsze dotknięcie na schowanie klawiatury (po wyszukiwaniu „Usuń" nie reagował); ustawione handled na liście tematów i wiadomości.
- [2026-10-13] [check] PR #20 — e2e ios: po restarcie aplikacja poprawnie otwiera ostatni temat z historią (zrzut), ale kontener ekranu nie spełniał heurystyki widoczności Detox (75%) — test sprawdza istnienie ekranu i widoczność treści.
- [2026-10-14] Zadanie 3.1: sprawdzone paczki odrzucone — @siteed/audio-studio nagrywa na Androidzie z AudioSource.MIC bez AcousticEchoCanceler; react-native-sherpa-onnx 0.4.4 ma VAD jako zaślepkę rzucającą błąd i nie ma KWS. Zamiast nich lokalny moduł Expo `modules/mobi-audio` (Swift: AVAudioEngine z voice processing; Kotlin: AudioRecord VOICE_COMMUNICATION + AcousticEchoCanceler, przerwania przez utratę audio focus) — decyzja techniczna zgłoszona w Specky (01M4WKFKSXWNW7ZJ71XBMQCR7V). AEC i przerwania sprawdzalne tylko na urządzeniu; build Androida lokalnie zielony, iOS w CI.
- [2026-10-14] Zadanie 3.1: zmiana testu `EngineRegistry.test.ts` — produkcyjne `audioSource()` zwraca `NativeMicrophone` zamiast `engine_unavailable` (zmiana zachowania z planu); brak silnika sprawdzany na `stt()`. Pierwsza mutacja (przerwanie bez zatrzymania TTS) przeżyła, bo test czekał na koniec odczytu atrapy — test sprawdza teraz stan TTS przed jego końcem; mutant zabity. Ostrzeżenia `act(...)` w ConversationScreen.test istniały przed zadaniem (9 na main). Ostrzeżenie test-przypiety dla ConversationScreen.test: dodane nowe testy nowego zachowania (komunikat o odmowie mikrofonu, pisanie bez uprawnienia) i parametr portów audio w pomocniku renderowania — istniejące asercje bez zmian.
- [2026-10-14] Zadanie 3.5: `SpeechText` (src/services/speech) — `toSpeakable` (Markdown, emoji z flagami/odcieniami/keycapami, tabele, kod) i `SentenceSplitter` (granica: . ! ? … z cudzysłowami + spacja + słowo nie od małej litery; wyjątki: polskie skróty, liczby i daty, liczebnik porządkowy przed miesiącem; nowa linia też tnie, poza blokiem kodu). Gałąź od main (zadanie niezależne od 3.2–3.4). Kryteria MV-CHAT-1 K2/K3 (czytanie przed końcem generowania, Markdown zostaje w czacie) dostaną dowód w 3.6, gdzie spotykają się czat i TTS. Mutacja skrótów → 4 testy czerwone.
- [2026-10-14] Zadanie 3.2: sherpa-onnx oficjalne v1.13.8 — Android AAR (classes.jar + jniLibs) i iOS statyczny xcframework + onnxruntime 1.28.2 pobierane wspólnym skryptem `modules/mobi-audio/scripts/fetch-sherpa.sh` z weryfikacją SHA-256 (z gradle i z podspec — development pods nie uruchamiają prepare_command); podspec przeniesiony do katalogu modułu (`podspecPath`), model `silero_vad.onnx` (644 KB, SHA-256 zgodny z wydaniem) w `modules/mobi-audio/assets`. Sherpa mówi tylko „jest mowa / nie ma" (min. cisza 0,25 s); koniec wypowiedzi liczy `EndpointingVad` w TS, próg zatrzaskiwany na starcie wypowiedzi (zmiana działa od następnej). `EnergyVadEngine` to teraz `EndpointingVad` z detektorem energii — testy atrapy bez zmian. VadEngine dostał `load()` (wczytanie modelu przed startem). Lokalnie: build Androida zielony (biblioteki i model w APK), `pod install` zielony; kompilacja Swift tylko w CI — workflow native-build uruchamia się teraz także przy zmianach `modules/**`.
- [2026-10-14] [check] PR #23 (3.2, łańcuchowy na 3.1) zamknięty automatycznie przez GitHub, gdy merge #22 z `--delete-branch` usunął jego gałąź bazową — gałąź 3.2 przeniesiona na main (`rebase --onto`), nowy PR #24. Na przyszłość: przed merge bazy przepiąć PR łańcuchowy na main (`gh pr edit --base main`).
- [2026-10-14] [check] PR #24 — ios (native-build): `source_files = 'ios/**/*.{h,m,swift}'` łapał nagłówki C++ z pobranego onnxruntime.xcframework (w `ios/Frameworks`) do nagłówka zbiorczego modułu Swift → „'cmath' file not found". Binarki przeniesione do `modules/mobi-audio/vendor/ios`, `source_files` tylko `ios/*.swift`; lokalnie `pod install` daje nagłówek zbiorczy bez onnxruntime.
- [2026-10-14] [check] PR #24 — ios: po poprawce nagłówków Swift kompiluje się, ale linker: „framework 'sherpa-onnx' not found" — CocoaPods linkuje vendored xcframework po nazwie katalogu, a w środku jest `SherpaOnnxC.framework`; skrypt zmienia nazwę katalogu na `SherpaOnnxC.xcframework`.
- [2026-10-14] Zadanie 3.3: whisper.rn 0.7.4 — `exports` paczki nie ma wpisu „.", tylko ścieżki podrzędne, więc import z `whisper.rn/index` (TS bundler i Metro); atrapa w `jest-setup.ts`. `transcribeData(ArrayBuffer)` czyta 16-bit PCM LE (wbrew opisowi „float32" w typach — sprawdzone w RNWhisperJSI.cpp). Akceleracja: Metal (`useGpu`) na iOS; Core ML pominięty — wymaga osobnego pliku encodera `.mlmodelc`, którego katalog modeli nie ma (do rozważenia po pomiarach na urządzeniu). Zmiana testu `EngineRegistry.test.ts` — produkcyjne `stt()` to teraz `WhisperSttEngine`; brak silnika sprawdzany na `tts()`. Build Androida lokalnie zielony. Mutacja przełączania wariantu → test czerwony.
- [2026-10-14] Zadanie 3.4: Piper przez sherpa-onnx OfflineTts w module mobi-audio (`loadTts`, `synthesize` → PCM16 base64, `play`, `stopPlayback`). Odtwarzanie tą samą ścieżką co mikrofon: iOS — AVAudioPlayerNode w tym samym AVAudioEngine z voice processing (stan silnika tylko na kolejce głównej); Android — AudioTrack z USAGE_VOICE_COMMUNICATION, tryb MODE_IN_COMMUNICATION i głośnik jako urządzenie komunikacyjne (inaczej dźwięk szedłby do słuchawki rozmów). Kolejka w TS (`PiperTtsEngine`): synteza następnego zdania w trakcie odtwarzania poprzedniego, `stop()` ucisza i porzuca kolejkę, głos zatrzaskiwany na odpowiedź (`TtsEngine.beginAnswer()` — nowa metoda interfejsu, atrapa bez zmian zachowania). Wybór głosu w Ustawieniach (`TextButton` z `selected`). Zmiana testu `EngineRegistry.test.ts` — produkcyjne `tts()` to `PiperTtsEngine`; brak silnika sprawdzany na `keywordSpotter()`. Mutacja zatrzaskiwania głosu → test czerwony. AEC, głośność i trasa dźwięku do sprawdzenia na urządzeniu.
- [2026-10-14] [check] PR #25 — android (native-build): „Could not find org.jetbrains.kotlin:kotlin-stdlib:2.2.21" z Maven Central w kroku konfiguracji gradle — chwilowa awaria repozytorium, nie kod (lokalnie `assembleDebug` zielony, iOS zielony); ponowienie joba zielone.
- [2026-10-14] Zadanie 3.6: `VoiceSessionController` (src/services/voice) — tryb ciągły: dźwięk liczy się tylko w stanie „słucham" (odpowiedź asystenta nie jest wypowiedzią), koniec wypowiedzi z VAD → STT → `ConversationService.send` z kontekstem tematu → tokeny do czatu bez zmian, zdania z `SentenceSplitter` do TTS od pierwszego pełnego zdania → po przeczytaniu powrót do nasłuchu z progiem ciszy z ustawień (zmiana działa od następnej wypowiedzi). Test ujawnił błąd atrapy `FakeTtsEngine` — kolejne `speak()` nadpisywało poprzednie (pierwsze zdanie nigdy się nie kończyło); atrapa kolejkuje teraz zdania jak prawdziwy silnik (nowe testy atrapy, stare bez zmian). Mutacja czytania w trakcie generowania → 3 testy czerwone.
- [2026-10-14] Zadanie 3.7: panel głosowy na ekranie Rozmowa — duży przycisk start/stop sesji, wskaźnik stanu (Słucham/Przetwarzam/Mówię, `accessibilityLiveRegion`), ostatnia rozpoznana wypowiedź, przełącznik trybu ciągły/przerywany (ustawienie globalne; zachowanie trybu przerywanego w Fazie 4). Odpowiedź z głosu idzie do tego samego dymka strumieniowego co pisana; po wymianie historia tematu przeładowywana (`useConversation.reload`). Odmowa mikrofonu przy starcie głosu pokazuje ten sam komunikat z linkiem do ustawień. „Transkrypcja na żywo" = tekst wypowiedzi zaraz po rozpoznaniu (whisper rozpoznaje cały segment, nie słowo po słowie). Mutacja przekazywania stanu → test czerwony.
- [2026-10-14] Zadanie 3.8: metryki opóźnień liczone od końca wypowiedzi (moment zdarzenia końca z VAD): czas STT, do pierwszego tokenu, do pierwszego audio (nowy opcjonalny `onStart` w `TtsEngine.speak` — Piper woła go tuż przed `play`, atrapa przy starcie zdania). Zapis lokalny: `useLatencyStore` (AsyncStorage, 50 ostatnich), nigdzie nie wysyłany. Widok: przełącznik „Tryb diagnostyczny" w Ustawieniach → linia czasów ostatniej wymiany na ekranie Rozmowa. Uwaga: pierwsze zdanie jest pewne dopiero, gdy zaczyna się następne słowo — wliczone w czas do pierwszego audio. Formatowanie sekund przez zaokrąglenie do 0,1 s (`toFixed` na 0,85 dawał 0,8). Mutacja punktu odniesienia → test czerwony.
- [2026-10-14] Zadanie 3.9: e2e fazy 3 — build e2e dostał haki tylko dla trybu testowego (`src/e2e`): przycisk „Test: wypowiedź" wstrzykuje 0,8 s tonu + 3,2 s ciszy do `WavAudioSource` (nowa metoda `enqueueAudio`), „Test: odmowa mikrofonu" ustawia odmowę w `FakeAudioPorts` (jedna instancja `e2eAudioPorts`). Atrapa STT w trybie testowym „słyszy" stałe zdanie (`E2E_TRANSCRIPT`, parametr `fallback` w `FakeSttEngine`). Lokalnie Android: faza3 2/2 za pierwszym razem.
- [2026-10-14] [check] PR #28 — test: „answers in the chat and aloud, then is listening again" niestabilny w CI (lokalnie zielony) — pomocnik `until` liczył 200 obrotów pętli zdarzeń, za mało na wolniejszym runnerze (zapisy SQLite + timery atrapy TTS). Wspólny `until` z limitem czasu 5 s; 5 przebiegów lokalnie zielonych. Czerwony K3 z #28 zaczerwienił też kontrakt Specky w #24 (dowody są na poziomie projektu).
- [2026-10-14] [check] PR #28 — e2e android (CI, API 34): przycisk haka `e2e.deny-mic` widoczny w mniej niż 75% na mniejszym ekranie emulatora (panel głosowy na dole) — haki testowe przeniesione pod górny pasek ekranu Rozmowa (tylko build e2e). iOS e2e zielony.
- [2026-10-14] Zadanie 4.3+4.4 (jeden PR — 4.4 to obsługa zdarzenia z 4.3): „stop" przez sherpa-onnx KWS, model angielski GigaSpeech zipformer 3.3M (int8 enkoder i joiner, ~5,3 MB, pobierany przy buildzie z SHA-256, słowo `▁ST O P`). Sprawdzone w Pythonie (sherpa-onnx 1.13.8) na polskim głosie macOS Zosia: wykrywa „stop", „Dobrze, stop", „Proszę, stop", „Stop, wystarczy", „Stop stop"; brak trafień dla „autostop", „stopień", „postój", „odbiór paczki", zwykłych zdań; fałszywe trafienia na „stopę", „stoper" (początek słowa) — do strojenia progów na urządzeniu (scenariusz ⛔ 4.4). Wersja „-mobile" modelu nie działa z sherpa-onnx 1.13.8 (błąd Reshape w enkoderze) — użyta pełna paczka. KWS słucha tylko w stanach „przetwarzam/mówię" (mikrofon wtedy nie trafia do VAD); „stop" lub przycisk STOP przerywa generowanie (AbortSignal → odpowiedź częściowa zapisana z oznaczeniem „przerwano", w kontekście kolejnych pytań) i TTS, sesja od razu słucha; licznik tur blokuje dokończenie starej odpowiedzi. Zmiana interfejsu `KeywordSpotter` (+`load`, `accept`). Zmiana testu `EngineRegistry.test.ts` — w produkcji już żaden silnik nie zwraca `engine_unavailable` (usunięta funkcja `unavailable`). Mutacja przerwania bez abortu generowania → 2 testy czerwone.
- [2026-10-14] Zadanie 4.3+4.4 — ostrzeżenia kontroli: `EngineRegistry.test.ts` mniej asercji (17→15), bo zniknął ostatni silnik `engine_unavailable` — dwie asercje rzucania zastąpione sprawdzeniem typu KWS i braku atrapy VAD (zmiana zachowania z planu); `VoiceSessionController.test.ts` — nowa zależność `keywordSpotter` w konstrukcji i atrapa modelu reagująca na AbortSignal (potrzebne do testów przerwania), dotychczasowe asercje bez zmian.
- [2026-10-14] Zadanie 4.2: tryb przerywany w `VoiceSessionController` — segmenty po ciszy są rozpoznawane i doklejane do bufora bez limitu czasu (podgląd „Ty: …" przez `onHeard`), wysyłka dopiero gdy rozpoznany segment kończy się „odbiór" (`matchEndWord` z 4.1, słowo wycięte — nie trafia do historii ani modelu); nasłuch „stop" startuje dopiero przy odpowiedzi, nie przy rozpoznawaniu części. Gałąź na 4.3–4.4 z plikami 4.1 (PR #29 jeszcze niezmergowany — te same zmiany, scalą się bez konfliktu). W testach dźwięk z WAV przychodzi naraz, więc kolejne części wypowiedzi podawane po powrocie do nasłuchu (w aplikacji mikrofon płynie w czasie rzeczywistym). Mutacja „wysyłaj bez odbiór" → 3 testy czerwone.
- [2026-10-14] Zadanie 4.5: e2e fazy 4 (Detox) — haki testowe: części wypowiedzi ze scenariuszem transkrypcji (`injectUtterance(engines, transcript)` dokłada tekst do atrapy STT), długie pytanie („długo" → 300 zdań atrapy LLM) i „stop" z atrapy KWS. Lokalnie Android 3/3 za pierwszym razem. Ręczny scenariusz ⛔ 4.4 (skuteczność „odbiór"/„STOP" przez głośnik i słuchawki) zostaje dla człowieka.
- [2026-10-14] PR #29 (4.1) zamknięty bez merge — ten sam kod jest w PR #31 (4.2 od niego zależy); osobny merge do main znów rozjechałby łańcuch PR-ów (konflikty w ralph/*, ponowne CI natywne ~15 min). PLAN: 4.1 → (pr: #31).
- [2026-10-14] Zadanie 5.1: `isNotRecommended` (src/models/deviceCapabilities) — tylko modele LLM, próg z `minRamGb` katalogu (3B: 6 GB, 1–2B: 4 GB) z zapasem 15% na pamięć zarezerwowaną przez system (telefon „4 GB" raportuje ~3,7 GB i nie dostaje ostrzeżenia dla modelu 1,5B); nieznany RAM → bez ostrzeżenia. RAM z `expo-device` (`totalMemory`). Oznaczenie i potwierdzenie pobrania (kryteria MV-MOD-4) pojawią się na ekranie Menedżera modeli w 5.2. Gałąź na końcu łańcucha (4.2).
- [2026-10-14] Zadanie 5.2: ekran Menedżer modeli (LLM, whisper small/base, głosy Gosia/Darkman; dane eSpeak ukryte — pobierają się z głosem) — rozmiar, stan, postęp, anulowanie i wznowienie, usuwanie z potwierdzeniem, „niezalecane" z pytaniem przed pobraniem, zgoda na sieć komórkową (własne okno zamiast systemowego Alert) i przełącznik „tylko Wi-Fi". RAM jako port `memoryBytes` w `DevicePorts` (atrapa w testach). Testy ekranu na `CatalogFileSystem` — udaje pobieranie plików katalogu bez trzymania gigabajtów (rozmiary i sumy kontrolne z katalogu). Dopiero od tego ekranu na telefonie da się pobrać whisper i głosy, czyli uruchomić rozmowę głosową. Mutacja pomijania pytania o model niezalecany → test czerwony.
- [2026-10-14] Zadanie 5.3: kreator pierwszego uruchomienia — whisper small, wybrany głos (Gosia/Darkman), Qwen 2.5 1.5B; „Pobierz wszystko" po kolei z tymi samymi pytaniami co Menedżer (wspólny hook `useDownloadQuestions`), „Gotowe" albo „Pomiń na razie" ustawia `onboardingDone`. Pokazuje się tylko przy pierwszym starcie, gdy brakuje domyślnych modeli (przy komplecie od razu oznaczony jako przebyty); decyzja czeka na wczytanie ustawień z AsyncStorage (`settingsLoaded`). Build e2e (atrapy silników) nigdy go nie pokazuje. Zmiana testu `App.test.tsx` — testy startu działają jako powracający użytkownik (`onboardingDone: true`), bo zwykły build bez modeli zaczyna teraz od kreatora (zmiana zachowania z planu); atrapa react-native-blob-util dostała `fs.exists`/`stat`. Mutacja pomijania flagi → test czerwony.
- [2026-10-14] Zadanie 5.4: Ustawienia — domyślny model językowy (lista z katalogu), głos, tryb rozmowy, próg ciszy (Krócej/Dłużej co 0,5 s w granicach 1,5–6 s), wariant whisper, prompt globalny, tryb diagnostyczny, informacja o prywatności (gdzie trafia treść rozmów), ekran Licencje (każdy model katalogu + biblioteki na urządzeniu, w tym eSpeak NG GPL-3.0). Wspólny komponent wyboru jednej opcji. Kryterium MV-SEC-2 K1/K2 (raporty awarii) bez zmian — aplikacja nie ma raportowania awarii; przełącznik zgody pojawi się z nim (Faza 6).
- [2026-10-14] Zadanie 5.5: model per temat — przycisk „Model: …" na ekranie Rozmowa z wyborem („Jak w ustawieniach" albo konkretny model), zapis w `topics.model_override`. Wcześniej nadpisanie istniało w bazie i w budżecie kontekstu, ale silnik lokalny zawsze ładował model globalny — `LlmRequest` dostał `model` (id z katalogu), `LocalLlmEngine` ładuje model tematu. Zmiana testu `LocalLlmEngine.test.ts` — atrapa resolvera przyjmuje żądany model (nowy argument interfejsu). Mutacja „zawsze model globalny" → test czerwony.
- [2026-10-14] [check] PR #28 — e2e android (CI, API 34): przycisk haka `e2e.deny-mic` widoczny w mniej niż 75% na mniejszym ekranie emulatora (panel głosowy na dole) — haki testowe przeniesione pod górny pasek ekranu Rozmowa (tylko build e2e), a ich rząd się zawija — drugi przycisk wychodził poza prawą krawędź wąskiego ekranu (x=178 px + 213 px). iOS e2e zielony.
- [2026-10-14] Zadanie 6.1: `CloudHttpClient` (src/cloud) — tylko hosty dostawców z polityki sieci, timeout 60 s na próbę (przerwanie przez własny AbortController powiązany z sygnałem rozmowy), do 2 ponowień z backoffem 0,5 s / 1 s dla 5xx i błędów sieci (timeout = błąd sieci), 401/403 → „Nieprawidłowy klucz API", 429 → „Przekroczony limit", pozostałe → błąd dostawcy, bez ponowień dla 4xx i po STOP. Log tylko „METODA host → status". `SseParser` odporny na cięcie linii między kawałkami i CRLF; `readEvents` czyta strumień (expo/fetch) albo cały tekst, gdy platforma nie strumieniuje. Gałąź od main (zadanie niezależne). Kryterium „bez przełączenia na model lokalny" dostanie dowód w 6.7 (wybór silnika). Mutacja mapowania 429 → test czerwony.
- [2026-10-14] Zadanie 6.2: `OpenAiCompatibleEngine` (src/cloud) — strumieniowe chat completions przez `CloudHttpClient`, prompt systemowy jako pierwsza wiadomość, `max_tokens`, model z `LlmRequest.model` albo domyślny; STOP w trakcie strumienia zwraca dotychczasowy tekst jako przerwany; lista modeli z `/v1/models` (tylko modele czatu) z wbudowaną listą jako zapasem; walidacja klucza zapytaniem o listę modeli. Nieczytelne zdarzenie strumienia jest pomijane. Testy na nagranych odpowiedziach (`recordedServer`). Ta sama klasa obsłuży Meta Llama API (endpoint zgodny z OpenAI) w 6.5. `LlmRequest.model` dodany identycznie jak w 5.5 (scali się bez konfliktu).
- [2026-10-14] Zadanie 6.3: `AnthropicEngine` — Messages API ze strumieniem (zdarzenia `content_block_delta`/`text_delta`), prompt systemowy w polu `system`, wymagany `max_tokens` (domyślnie 1024), nagłówki `x-api-key` + `anthropic-version`. Domyślny model `claude-haiku-5-5` (szybki do głosu), zapas: haiku/sonnet/opus 5.5. 6.3–6.5 w jednym PR #40 (osobne commity) — podobne adaptery na wspólnym kliencie.
- [2026-10-14] Zadanie 6.4: `GeminiEngine` — `streamGenerateContent?alt=sse`, klucz w nagłówku `x-goog-api-key` (nie w URL — nie trafia do logów adresów), role assistant→model, prompt w `systemInstruction`, `maxOutputTokens`. Google zwraca na zły klucz HTTP 400 (API_KEY_INVALID), nie 401 — walidacja klucza mapuje 400 na „Nieprawidłowy klucz API". Domyślnie `gemini-2.5-flash`.
- [2026-10-14] Zadanie 6.5: Meta Llama API ("Facebook" ze spec) przez endpoint zgodny z OpenAI `https://api.llama.com/compat/v1` — konfiguracja `META_LLAMA_CONFIG` dla `OpenAiCompatibleEngine`, domyślnie Llama 4 Maverick; host już był w polityce sieci.
- [2026-10-14] [check] PR #31 — e2e Android i iOS w CI: 7 testów czerwonych na małym domyślnym ekranie emulatora (lokalnie 16/16 na dużym) — sześć pełnowymiarowych przycisków haków testowych zawijało się w 2–3 rzędy i spychało rozmowę poza ekran (widoczność < 75%, „not hittable"). Haki jako małe przyciski (czcionka 11, minimalny odstęp). Pozostawiony mały ekran w CI — to też realny przypadek małych telefonów.
- [2026-10-14] Zadanie 5.3 — e2e na małym ekranie (lokalny AVD Small_Phone): przycisk „Pobierz wszystko" kreatora był poniżej zgięcia ekranu; akcje kreatora przeniesione do stałej stopki pod przewijaną listą kroków (błąd UX, nie tylko testu). Strażnik tłumaczeń wziął wyrażenie `missing.length > 0 && !downloading &&` w JSX za tekst UI (po tej zmianie puściłem tylko testy kreatora, nie cały zestaw — błąd złapany przy scalaniu) — warunek w zmiennej `canSkip`.
- [2026-10-14] Zadanie 6.6: ekran Klucze API (z Ustawień) — dla OpenAI, Anthropic, Google Gemini i Meta Llama: pole klucza (ukryte), „Sprawdź i zapisz" (najpierw zapytanie testowe o listę modeli; odrzucony klucz nie trafia do magazynu i pokazuje polski komunikat), usuwanie, lista modeli dostawcy. `DevicePorts` dostały `apiKeys` (SecretStore w aplikacji, pamięć w testach) i `fetch` (`expo/fetch` — strumieniuje body, wbudowany fetch RN nie); usługi budują po jednym adapterze na dostawcę. Gałąź: 6.3–6.5 + scalony main (Fazy 3–5). Mutacja zapisu bez sprawdzenia → 2 testy czerwone.
