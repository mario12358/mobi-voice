# MobiVoice

Aplikacja mobilna (iOS i Android) do rozmowy głosowej po polsku z modelem językowym. Rozmowy są
porządkowane w tematy z pełną historią; temat można podsumować i wyeksportować. Rozpoznawanie mowy,
synteza głosu i model językowy mogą działać w całości na telefonie, bez internetu — albo model językowy
w chmurze (OpenAI, Anthropic, Google Gemini, Meta Llama) z własnym kluczem API.

## Co potrafi

- **Tematy** — lista z wyszukiwaniem, automatyczny tytuł po pierwszej wymianie, zmiana nazwy, usuwanie,
  własny prompt systemowy i własny model dla tematu.
- **Rozmowa tekstem i głosem** — odpowiedź pojawia się słowo po słowie i jest czytana na głos od
  pierwszych słów.
  - **Tryb ciągły:** wypowiedź wysyła się po chwili ciszy (próg ustawiany 1,5–6 s).
  - **Tryb przerywany:** pauzy nie wysyłają; wypowiedź kończysz słowem **„stop”**.
  - **„Stop”** (albo przycisk STOP) przerywa też odpowiedź asystenta; częściowa odpowiedź zostaje
    w historii oznaczona „przerwano”.
- **Polecenia głosowe** — „nowy temat …”, „przełącz na temat …” (z dopytaniem przy podobnych nazwach),
  „jakie mam tematy”, „podsumuj rozmowę”. Modele chmurowe rozumieją też swobodniejsze sformułowania.
- **Podsumowania** — całej historii tematu (także dłuższej niż kontekst modelu) w formie: notatka,
  punkty i decyzje, lista zadań, e-mail albo własna instrukcja zapisana jako szablon; kopiowanie,
  udostępnianie jako Markdown, odsłuch.
- **Eksport tematu** do Markdown przez systemowe „Udostępnij” (bez kluczy API).
- **Prywatność** — rozmowy, nagrania i transkrypcje zostają na telefonie; przy modelu w chmurze treść
  trafia tylko do jego dostawcy. Bez analityki. Raporty awarii tylko po zgodzie w Ustawieniach, bez treści
  rozmów i kluczy. Klucze API w bezpiecznym magazynie systemu.

## Modele na telefonie

Pobierane w kreatorze pierwszego uruchomienia albo w Ustawienia → Modele (z wznawianiem i sprawdzaniem
sumy SHA-256). Domyślnie tylko przez Wi-Fi.

### Model językowy (llama.rn / llama.cpp, GGUF Q4_K_M)

| Model                        | Rozmiar | RAM telefonu | Licencja                    |
| ---------------------------- | ------- | ------------ | --------------------------- |
| **Qwen 2.5 1.5B** (domyślny) | 1,1 GB  | od 4 GB      | Apache 2.0                  |
| Qwen 2.5 3B                  | 2,1 GB  | od 6 GB      | Apache 2.0                  |
| Llama 3.2 1B                 | 0,8 GB  | od 4 GB      | Llama 3.2 Community License |
| Llama 3.2 3B                 | 2,0 GB  | od 6 GB      | Llama 3.2 Community License |
| Gemma 2 2B                   | 1,7 GB  | od 4 GB      | Gemma Terms of Use          |

Model za duży na pamięć telefonu jest oznaczony „niezalecany” (można go pobrać po potwierdzeniu).
Małe modele (1–2B) słabiej radzą sobie z polszczyzną — przy wyższych wymaganiach lepszy jest model 3B
albo model w chmurze.

### Rozpoznawanie mowy (whisper.rn / whisper.cpp)

| Model                        | Rozmiar | Uwagi         | Licencja |
| ---------------------------- | ------- | ------------- | -------- |
| **Whisper small** (domyślny) | 0,5 GB  | dokładniejszy | MIT      |
| Whisper base                 | 0,15 GB | szybszy       | MIT      |

Wykrywanie mowy: Silero VAD; słowo „stop” w trakcie odpowiedzi: sherpa-onnx KWS (GigaSpeech zipformer)
— oba wbudowane w aplikację.

### Głos asystenta (Piper przez sherpa-onnx)

| Głos                 | Rozmiar | Licencja           |
| -------------------- | ------- | ------------------ |
| **Gosia** (domyślny) | 0,06 GB | MIT (nagrania CC0) |
| Darkman              | 0,06 GB | MIT (nagrania CC0) |

Głosy korzystają z danych wymowy eSpeak NG (polski podzbiór, GPL-3.0-or-later) — do rozważenia przed
dystrybucją poza zespołem. Pełna lista w aplikacji: Ustawienia → Licencje.

### Modele w chmurze

Ustawienia → Klucze API: OpenAI, Anthropic, Google Gemini, Meta Llama API. Klucz jest sprawdzany przed
zapisem; modele dostawcy pojawiają się w wyborze modelu (globalnie i w temacie). Rozpoznawanie mowy
i głos zostają na telefonie.

## Wymagania

- iOS 16.4+ lub Android 10+ (arm64).
- Na komplet domyślnych modeli ok. 1,7 GB wolnego miejsca; zalecane 6 GB RAM i więcej.

## Uruchomienie dla deweloperów

```bash
npm ci
npm run android        # albo: npm run ios (Mac z Xcode)
npx tsc --noEmit && npm run lint && npm test
```

Binaria sherpa-onnx pobiera skrypt `modules/mobi-audio/scripts/fetch-sherpa.sh` (z weryfikacją SHA-256)
przy pierwszym buildzie. Testy e2e (Detox): `npm run e2e:build:android && npm run e2e:test:android`.

Build dla testerów: workflow `internal-build` (APK arm64 jako artefakt) — szczegóły i kroki TestFlight /
Firebase w [docs/DYSTRYBUCJA.md](docs/DYSTRYBUCJA.md). Scenariusze testów ręcznych:
[docs/test-scenarios/](docs/test-scenarios/).

## Technologie

React Native + Expo (prebuild), TypeScript, SQLite (expo-sqlite), Zustand, React Navigation; lokalny moduł
Expo `modules/mobi-audio` (mikrofon z redukcją echa, VAD, TTS, KWS przez sherpa-onnx), llama.rn,
whisper.rn, Sentry (opcjonalnie, za zgodą).
