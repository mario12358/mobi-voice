# PROJECT_CONTEXT.md

Ten plik przechowuje kontekst projektu który przetrwa `/compact`.

## Stack technologiczny

- Język: TypeScript (strict, noUncheckedIndexedAccess, noImplicitReturns)
- Framework: React Native 0.86 + Expo SDK 57 (prebuild/CNG, expo-dev-client); punkt wejścia `index.ts` → `src/App.tsx`
- Lint: ESLint (eslint-config-expo/flat + prettier), Prettier; `npm run lint`
- Baza danych: SQLite (expo-sqlite), wersjonowane migracje (1.3)
- Testy: Jest (ts-jest do 1.2, potem preset Expo) + jest-junit → `reports/junit.xml`; e2e Detox
- Silniki natywne: llama.rn (LLM), whisper.rn (STT), sherpa-onnx (VAD, Piper TTS, KWS)
- CI: `.github/workflows/specky-ci.yml` (job `test`: tsc + jest, artefakt `junit-reports`)

## Architektura

Aplikacja wyłącznie na urządzeniu — bez backendu i kont (MV-PLAT-2). Warstwy, zależności tylko w dół:

```
UI (src/screens, src/components, src/navigation)
  → hooki/stan (src/features/<f>/use*.ts, src/state — Zustand)
    → serwisy domenowe (src/services — ConversationService, VoiceSessionController, SummaryService…)
      → repozytoria (src/db/repositories) | silniki (src/engines) | sieć (src/net)
        → src/core (błędy domenowe, polityka sieci, typy wspólne) — bez zależności od React/RN
```

| Katalog | Zawartość |
|---|---|
| `src/core/` | `errors.ts` (DomainError), `networkPolicy.ts` (dozwolone hosty wychodzące), czyste typy/narzędzia |
| `src/db/` | połączenie SQLite, `migrations/NNN_nazwa.ts`, `repositories/<Encja>Repository.ts` |
| `src/engines/` | interfejsy `SttEngine`/`TtsEngine`/`LlmEngine`/`VadEngine`/`KeywordSpotter`, adaptery natywne, atrapy (`fakes/`), `EngineRegistry` |
| `src/net/` | klient HTTP dostawców (6.1), adaptery chmurowe `providers/<dostawca>.ts` |
| `src/services/` | logika domenowa łącząca repozytoria i silniki |
| `src/state/` | magazyny Zustand (ustawienia), `SecretStore` (expo-secure-store) |
| `src/features/<f>/` | ekran + hooki + komponenty jednej funkcji (topics, conversation, summary, models, settings) |
| `src/navigation/` | stack + `ParamList` |
| `src/i18n/pl.ts` | wszystkie teksty UI |

Konwencje:
- Pliki: komponenty/klasy PascalCase (`TopicListScreen.tsx`, `TopicRepository.ts`), moduły funkcyjne camelCase (`networkPolicy.ts`); testy w `__tests__/<plik>.test.ts(x)` obok kodu.
- Tabele/kolumny SQLite snake_case; w TS camelCase, mapowanie w repozytorium.
- Błędy domenowe: `throw new DomainError(code, detail?, {cause})` — `code` to unia `DomainErrorCode`, `userMessage` po polsku idzie do UI, `message`/`detail` tylko do diagnostyki (bez treści rozmów i kluczy). UI rozpoznaje przez `isDomainError`.
- Każde żądanie wychodzące przechodzi przez `assertAllowedOutboundUrl(url, purpose)` z `src/core/networkPolicy.ts`; nowy host = wpis w `ALLOWED_HOSTS` i w `ralph/BEZPIECZENSTWO.md` → Wyjścia w tym samym commicie.
- Testy-strażniki w `src/core/__tests__/`: literały URL w kodzie produkcyjnym tylko do dozwolonych hostów; brak przepływu logowania/rejestracji/hasła.

## Kluczowe decyzje

<!-- Tabela rośnie z każdą sesją, a plik trafia w całości do promptu startowego, więc         -->
<!-- ralph-start.sh trzyma w niej 40 ostatnich wierszy — starsze idą do ralph/CONTEXT_ARCHIVE.md -->
<!-- (write-only). Decyzję wciąż OBOWIĄZUJĄCĄ — taką, której złamanie zepsułoby projekt —     -->
<!-- oznacz 📌 w kolumnie Decyzja: wiersz z 📌 nie podlega rotacji nigdy.                      -->

| Data | Decyzja | Powód |
|------|---------|-------|
| 2026-10-13 | 📌 Warstwy UI → hooki/stan → serwisy → repozytoria/silniki/sieć → core; core bez React/RN | testowalność serwisów bez natywnych modułów, atrapy silników w e2e |
| 2026-10-13 | 📌 Wszystkie żądania wychodzące przez `assertAllowedOutboundUrl`; lista hostów = BEZPIECZENSTWO.md → Wyjścia | MV-PLAT-2 / MV-SEC-2: treść rozmów tylko do wybranego dostawcy |
| 2026-10-13 | 📌 Błędy domenowe jako `DomainError` z kodem z unii i komunikatem PL | jeden format dla UI i dla mapowania błędów dostawców (6.1) |
| 2026-10-13 | Jest preset `jest-expo` + RNTL 14 (`await render`) + jest-junit (`{filepath}` / `{title}`) | dopasowanie testów kryteriów przez Specky |
| 2026-10-13 | 📌 Expo SDK 57 (RN 0.86), CNG: `ios/` i `android/` generowane `npm run prebuild`, nie w repo; natywna konfiguracja tylko przez app.json/config plugins | odtwarzalny build z jednej bazy kodu |
| 2026-10-13 | 📌 Minimalnie iOS 16.4 (wymóg SDK 57), Android API 29, tylko arm64-v8a — propozycja decyzji w Specky 01M4TTARHWPFRM2N8PZPGMZDNV | MV-PLAT-1 mówi iOS 16+; czeka na akceptację człowieka |
| 2026-10-13 | 📌 Dostęp do bazy przez interfejs `SqlDatabase` (src/db); w aplikacji adapter expo-sqlite, w Jest better-sqlite3 (`src/db/__tests__/support/nodeSqlDatabase.ts`) | repozytoria testowalne na prawdziwym SQLite bez modułu natywnego |
| 2026-10-13 | 📌 Migracje: `src/db/migrations/NNN_nazwa.ts` z `up`/`down`, wersje kolejne od 1, każda w transakcji, rejestr w `schema_migrations`; nigdy nie edytuj zastosowanej migracji | MV-DATA-1, idempotencja |
| 2026-10-13 | Znaczniki czasu w SQLite jako INTEGER (ms epoki); `PRAGMA foreign_keys = ON` w `prepareDatabase` przy każdym otwarciu | sortowanie po last_activity_at, kaskady FK |
| 2026-10-13 | Repozytoria (`src/db/repositories`) zwracają encje camelCase, brak wiersza przy update/delete → `DomainError('topic_not_found')`; dodanie wiadomości aktualizuje `last_activity_at` w tej samej transakcji | spójność listy tematów |
| 2026-10-13 | 📌 Ustawienia: `useSettingsStore` (Zustand persist → AsyncStorage, klucz `mobivoice-settings`, `update(partial)`), bez sekretów; klucze API wyłącznie przez `SecretStore` (expo-secure-store, `apiKey.<dostawca>`, WHEN_UNLOCKED_THIS_DEVICE_ONLY) | MV-SEC-1 |
| 2026-10-13 | 📌 Silniki za interfejsami `src/engines/types.ts`; `EngineProvider`/`useEngines()` w App; `EXPO_PUBLIC_E2E=1` (build e2e) → atrapy (`src/engines/fakes`, WAV zamiast mikrofonu), inaczej adaptery natywne — `PRODUCTION_FACTORIES` uzupełniają 2.3/3.x, brak adaptera → `engine_unavailable`, nigdy cichy fallback na atrapę | e2e deterministyczne, produkcja bez atrap |
| 2026-10-13 | 📌 Teksty UI tylko z `src/i18n/pl.ts` (strażnik: `src/i18n/__tests__/translations.test.ts`); kolory z `usePalette()` (`src/theme/theme.ts`, za systemem); wspólne `Screen`/`BodyText`/`TextButton` w `src/components` | MV-UI-1 |
| 2026-10-13 | 📌 Nawigacja: native-stack `RootStackParamList` (TopicList, Conversation{topicId}, Summary{topicId}, Settings, Models); start = ostatnio aktywny temat nad listą (`resolveStartState`) | MV-TOP-1 |
| 2026-10-13 | 📌 e2e: Detox, release z EXPO_PUBLIC_E2E=1 (`npm run e2e:build:android` / `e2e:test:android`, iOS analogicznie), testy w `e2e/*.e2e.ts`, selektory tylko testID, motyw widoczny przez `theme-<scheme>` w trybie testowym; CI `e2e.yml` (Android API 34 x86_64, iOS macos-latest) | 1.8 |
| 2026-10-13 | 📌 Katalog modeli `src/models/catalog.ts` (zamknięta lista, `validateCatalog`): pliki z huggingface.co `resolve/main` z rozmiarem i SHA256, `requires` dla wspólnych składników (eSpeak NG pl dla głosów), w `displayName` tylko nazwy własne (etykiety z pl.ts); LLM: GGUF Q4_K_M, kontekst 4096, minRamGb 4/6 | MV-MOD-1, MV-UI-1 |
| 2026-10-13 | `DatabaseProvider` w App otwiera bazę i migruje przed pierwszym ekranem; `useDatabase()` dla ekranów | AC 1.3 wejście |
| 2026-10-13 | Build natywny obu platform w CI (`native-build.yml`), tylko przy zmianie package.json/app.json | lokalny Xcode 26.6 bez platformy iOS 26.5 |

## Znane problemy i rozwiązania

<!-- Znane pułapki: destylowane z Logu problemów przy checkpoincie końca fazy (sekcja 7    -->
<!-- instrukcji). Tylko wzorce POWTARZALNE — błąd jednorazowy zostaje w Logu problemów     -->
<!-- w REPORT.md. Jeden wiersz = jedna pułapka, w JEDNEJ linii i zwięźle: plik idzie       -->
<!-- w całości do promptu każdej sesji.                                                     -->
<!-- ralph-start.sh trzyma tu 30 ostatnich wierszy, starsze → ralph/CONTEXT_ARCHIVE.md.    -->
<!-- Pułapkę, która WRACA mimo zapisu (powtórzyła się ≥2 razy), oznacz 📌 — taki wiersz    -->
<!-- nie rotuje się nigdy. Jednorazową wpadkę zostaw bez znacznika.                        -->

| Problem | Rozwiązanie |
|---------|-------------|
| Pomocnik testów w `__tests__/` traktowany przez Jest jako pusty suite | `testMatch` tylko `*.test.ts(x)` w jest.config.js |
| SQLite LIKE/lower() nie składa polskich liter (Ł/ł) | porównania bez wielkości liter w JS przez `toLocaleLowerCase('pl')` |
| `jest.mock` z fabryką używającą stałej z pliku testu → TDZ przy hoistingu | fabryka `() => require('./support/x').create()`, uchwyt `jest.requireMock(...)`; AsyncStorage mockowany globalnie w `jest-setup.ts` |
| Tytuł ekranu native-stack nie jest `<Text>` w testach | odczyt `RNSScreenStackHeaderConfig.props.title` widocznego `RNSScreen` z `screen.toJSON()` |
| `assembleAndroidTest` w całym projekcie pada na modułach bibliotek Expo | buduj `:app:assembleRelease :app:assembleAndroidTest -DtestBuildType=release` |
| npm „deduped", a pakietu brak w node_modules | usuń `node_modules/.package-lock.json` i `npm install` |
| Błędy better-sqlite3 przy równoległych workerach Jest z innego realmu — `rejects.toThrow` ich nie widzi | adapter `nodeSqlDatabase` przepakowuje je w `Error` (`sameRealm`) |

## Zależności między komponentami

- `src/core/networkPolicy` ← klient HTTP dostawców (6.1), ModelDownloadService (2.2), raporty awarii (9.1)
- `src/core/errors` ← wszystkie serwisy i adaptery; UI pokazuje `userMessage`

## Aktualny stan

<!-- STAN BIEŻĄCY — NADPISUJ. To ma być odpowiedź na „gdzie jesteśmy DZIŚ", a nie kronika  -->
<!-- tur: historia realizacji ma własne miejsce w REPORT.md i tam się rotuje, a tutaj nie  -->
<!-- rotuje się nic. Dopisywanie kolejnych akapitów „tura z 19.08 domknięta" zamienia tę   -->
<!-- sekcję w drugi, nieograniczony raport w prompcie każdej sesji.                        -->

- Ostatnie ukończone zadanie: 1.8 — Faza 1 ukończona, wydana jako v0.1.0 (tag 9abf426); 2.1 w PR #11
- Następne zadanie: 2.2 ModelDownloadService
- Blokery: brak; czeka na człowieka: decyzja iOS 16.4 w Specky (01M4TTARHWPFRM2N8PZPGMZDNV), licencja GPL eSpeak NG przed dystrybucją zewnętrzną. Lokalnie iOS tylko przez CI (Xcode bez platformy iOS 26.5)
