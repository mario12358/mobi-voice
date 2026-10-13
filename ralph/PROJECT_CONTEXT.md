# PROJECT_CONTEXT.md

Ten plik przechowuje kontekst projektu który przetrwa `/compact`.

## Stack technologiczny

- Język: TypeScript (strict, noUncheckedIndexedAccess, noImplicitReturns)
- Framework: React Native + Expo (prebuild, dev client) — wchodzi w 1.2
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
| 2026-10-13 | Jest + ts-jest w 1.1, w 1.2 przejście na preset Expo z zachowaniem jest-junit i `testMatch` | CI i raport JUnit od pierwszego PR-a |

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

## Zależności między komponentami

- `src/core/networkPolicy` ← klient HTTP dostawców (6.1), ModelDownloadService (2.2), raporty awarii (9.1)
- `src/core/errors` ← wszystkie serwisy i adaptery; UI pokazuje `userMessage`

## Aktualny stan

<!-- STAN BIEŻĄCY — NADPISUJ. To ma być odpowiedź na „gdzie jesteśmy DZIŚ", a nie kronika  -->
<!-- tur: historia realizacji ma własne miejsce w REPORT.md i tam się rotuje, a tutaj nie  -->
<!-- rotuje się nic. Dopisywanie kolejnych akapitów „tura z 19.08 domknięta" zamienia tę   -->
<!-- sekcję w drugi, nieograniczony raport w prompcie każdej sesji.                        -->

- Ostatnie ukończone zadanie: 1.1 (PR otwarty — patrz PLAN.md)
- Następne zadanie: 1.2 Inicjalizacja projektu Expo
- Blokery: brak
