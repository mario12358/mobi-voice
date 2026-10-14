# ralph/PLAN.md - Lista zadań projektu

## Informacje o projekcie

- **Nazwa**: MobiVoice — mobilna aplikacja (Android/iOS) do głosowych rozmów z LLM
- **Stack**: React Native + TypeScript (strict), Expo dev client / prebuild; SQLite (expo-sqlite); Zustand; React Navigation; llama.rn (GGUF), whisper.rn (ggml-small/base), sherpa-onnx (Silero VAD, Piper TTS, KWS); expo-secure-store; Jest + RNTL; Detox
- **Klient**: jeden (mobile, iOS 16+ / Android 10+ arm64), bez backendu — dostawcy LLM wołani z urządzenia (A1, A7)
- **Specky**: projekt 01M4TJBZFPYV3AFM4CN0P3HNQ1 — 32 wymagania do realizacji + 1 poza zakresem (zaakceptowane 2026-10-13); kotwice `Specky:` pod zadaniami, mapa w ralph/SPECKY.md

## Zadania

<!-- Linia zadania ≤ 400 znaków (walidator ralph-start.sh ostrzega powyżej). Plan mówi CO     -->
<!-- jest do zrobienia; uzasadnienia, ustalenia z realizacji i „dlaczego tak" idą do          -->
<!-- ralph/REPORT.md (Log problemów) albo ralph/PROJECT_CONTEXT.md (Kluczowe decyzje).        -->
<!-- Powód: plan jest czytany i edytowany przy KAŻDYM zadaniu i w całości trafia do prompta,  -->
<!-- a tamte pliki rotują się do archiwum. Kryteria akceptacji zapisuj jako `- AC:` pod       -->
<!-- zadaniem, nie doklejaj ich do jego linii.                                                -->
<!--                                                                                          -->
<!-- Każda pozycja `- [ ]` MUSI zaczynać się od słowa `Zadanie` albo `Test` (znacznik stanu     -->
<!-- przed nim jest OK: `- [ ] ⛔ Zadanie 4.2: …`). Pozycja bez tego słowa jest dla pętli        -->
<!-- niewidzialna — nie da się jej wybrać i nie liczy się do postępu fazy, a wygląda jak         -->
<!-- zrobiona robota; walidator ostrzega. Notatkę zapisz w ralph/REPORT.md.                      -->
<!-- `⛔` znaczy „czeka na człowieka" (test manualny na produkcji, decyzja właściciela):          -->
<!-- zadanie liczy się do kompletności fazy, ale podpowiedź startowa je pomija, żeby pętla       -->
<!-- nie wskazywała co sesję tego samego, czego sama nie zrobi.                                  -->
<!--                                                                                          -->
<!-- Nagłówek `### Faza N: … — ✅ ukończona` z komentarzem `ralph-archived` pod spodem to ślad   -->
<!-- fazy przeniesionej do ralph/PLAN_ARCHIVE.md przez rotację plików stanu. Nie edytuj go     -->
<!-- ręcznie — zależności (wymaga: X.Y) do wymienionych tam zadań nadal się rozwiązują.        -->

### Faza 1: Fundament aplikacji

- [x] Zadanie 1.1: Szkielet architektury i konwencje — mapa modułów (src/features, services/engines, db, navigation), wzorzec warstw (UI → serwisy → repozytoria/silniki), format błędów domenowych, konwencje nazw; wynik do PROJECT_CONTEXT.md; dopasuj .github/workflows/specky-ci.yml (szablon Ralpha) do Jest + raport JUnit (tech: typescript, react-native) (pr: #1)
  - Specky: (req: 01M4TPSAWRTTG99VMV7T9TC89Y v1.0 @c05a0d4)
  - Specky kryteria: (crit: 01M4TPSAXFSFAKMYTR66T2XE10) (crit: 01M4TPSAXFZS7QFASVK9MH6MTT)
- [x] Zadanie 1.2: Inicjalizacja projektu Expo (prebuild, dev client) w TypeScript strict — iOS 16+, Android API 29+, tylko arm64; Jest + React Native Testing Library, ESLint + Prettier; uzupełnij komendy testów/lintera/typów w ralph/config.md (wymaga: 1.1) (spec: spec.md) (tech: react-native, typescript) (pr: #2)
  - AC: build dev clienta przechodzi na iOS i Android (iOS 16.4+ — wymóg SDK 57); `npx tsc --noEmit` i `npm test` zielone
  - Specky: (req: 01M4TPSAN97DVJH98SGHWK0JB5 v1.0 @4c3b1e3)
  - Specky kryteria: (crit: 01M4TPSANWZWEE880DMAXVXJC1) (crit: 01M4TPSANWRF6MW9YG8DYN8NVE)
- [x] Test: 1.2 — test dymny renderu komponentu App (pr: #2)
- [x] Zadanie 1.3: Baza SQLite + wersjonowane migracje — tabele topics, messages, summaries, summary_templates (snake_case, FK z ON DELETE CASCADE) (wymaga: 1.2) (spec: spec.md) (tech: sql, typescript) (pr: #3)
  - AC: temat ma tytuł, created_at, last_activity_at, system_prompt (opcjonalny), model_override (opcjonalny)
  - AC: wiadomość ma rolę (user/assistant), treść, created_at i flagę interrupted
  - AC: wejście — migracje uruchamiane przy starcie aplikacji przed pierwszym ekranem
  - Specky: (req: 01M4TPSB35CE08M2G3KTB8CBV8 v1.0 @fad5a6a)
  - Specky kryteria: (crit: 01M4TPSB43B3FSN8QSKBQJTABH) (crit: 01M4TPSB44R4TGWZV7K4HZT7HV)
- [x] Test: 1.3 — migracje na czystej bazie i ponowne uruchomienie bez zmian (pr: #3)
- [x] Zadanie 1.4: Repozytoria TopicRepository i MessageRepository (CRUD, lista tematów po last_activity_at, wyszukiwanie po tytule, historia tematu) (wymaga: 1.3) (spec: spec.md) (tech: typescript, sql) (pr: #4)
  - AC: usunięcie tematu usuwa jego wiadomości i podsumowania
  - AC: dodanie wiadomości aktualizuje last_activity_at tematu
  - Specky: (req: 01M4TPSB35CE08M2G3KTB8CBV8 v1.0 @fad5a6a)
  - Specky kryteria: (crit: 01M4TPSB44SA09NE6D546BP4WB)
- [x] Test: 1.4 — repozytoria na bazie w pamięci (pr: #4)
- [x] Zadanie 1.5: Magazyn ustawień (Zustand + persist w AsyncStorage) i SecretStore na klucze API przez expo-secure-store — klucze nigdy w SQLite, logach ani eksporcie (wymaga: 1.2) (tech: react-native, typescript) (pr: #5)
  - AC: klucz API zapisany i odczytany przez SecretStore; brak klucza w AsyncStorage i SQLite
  - Specky: (req: 01M4TPSDF9ATEYND8AHKATHQM2 v1.0 @4019d77)
  - Specky kryteria: (crit: 01M4TPSDFM4FPPHT855MEXC1P9)
- [x] Test: 1.5 — persystencja ustawień i SecretStore z atrapą secure-store (pr: #5)
- [x] Zadanie 1.6: Interfejsy silników SttEngine, TtsEngine, LlmEngine, VadEngine, KeywordSpotter + atrapy deterministyczne i EngineRegistry z trybem testowym (wstrzykiwanie plików WAV zamiast mikrofonu) (wymaga: 1.1) (tech: typescript) (pr: #6)
  - AC: wejście — EngineRegistry wybiera atrapy, gdy aplikacja działa w trybie testowym (flaga buildu e2e)
- [x] Test: 1.6 — atrapy spełniają kontrakty interfejsów (strumień tokenów, abort, segmenty VAD) (pr: #6)
- [x] Zadanie 1.7: Nawigacja (stack: Lista tematów, Rozmowa, Podsumowanie, Ustawienia, Modele), plik tekstów PL (gotowość i18n), motyw jasny/ciemny wg systemu, ekrany-szkielety (wymaga: 1.2, 1.5) (spec: spec.md) (tech: react-native, typescript) (pr: #7)
  - AC: przy starcie aplikacja otwiera ostatnio aktywny temat, a bez tematów — Listę tematów
  - Specky: (req: 01M4TPSBA2GXAHZ7W4734NBAEC v1.0 @6f3590a)
  - Specky kryteria: (crit: 01M4TPSBAVNP2W68X6ATSBXC2C)
  - Specky: (req: 01M4TPSDM116PMW5YJJ4B6A34X v1.0 @178a85c)
  - Specky kryteria: (crit: 01M4TPSDMBK9W28VSKZWA1MT4Y) (crit: 01M4TPSDMB35F61TVKWA51MDVV)
- [x] Test: 1.7 — nawigacja między ekranami i wybór ekranu startowego (pr: #7)
- [x] Zadanie 1.8: Test e2e — start aplikacji, przejścia Lista tematów → Ustawienia → Modele → powrót, motyw wg systemu (wymaga: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7) (spec: spec.md) (tech: detox, typescript) (pr: #8)

### Faza 2: Tematy i czat tekstowy z modelem lokalnym

- [x] Zadanie 2.1: Katalog modeli w pliku konfiguracyjnym — LLM GGUF Q4_K_M: Qwen 2.5 1.5B/3B, Llama 3.2 1B/3B, Gemma 2 2B; whisper ggml-small i base; głosy Piper pl_PL-darkman-medium i pl_PL-gosia-medium; URL, rozmiar, SHA256, licencja, min. RAM (wymaga: 1.1) (spec: spec.md) (tech: typescript) (pr: #11)
  - AC: katalog zawiera dokładnie 5 wariantów LLM ze spec i 2 głosy (darkman, gosia)
  - AC: źródła Llama 3.2 bez bramki licencyjnej HF (nie wymagają tokena)
  - Specky: (req: 01M4TPSCN9WC02W8F3WJEFP4FF v1.0 @8cd370f)
  - Specky kryteria: (crit: 01M4TPSCNMTHEHN090MN55X0HD)
- [x] Test: 2.1 — walidacja schematu katalogu (unikalne id, poprawny SHA256, URL https) (pr: #11)
- [x] Zadanie 2.2: ModelDownloadService — pobieranie do katalogu dokumentów aplikacji z postępem, wznawianiem, weryfikacją SHA256, flagą „tylko Wi-Fi"; usuwanie pliku modelu (wymaga: 2.1) (tech: react-native, typescript) (pr: #12)
  - AC: przerwane pobieranie wznawia się od miejsca przerwania; zła suma SHA256 → plik usunięty, błąd
  - AC: wejście — akcja „Pobierz" (CTA w Rozmowie, potem Menedżer modeli 5.2)
  - Specky: (req: 01M4TPSCQHCPGKAQAJ8E6QGB2M v1.0 @aeb1edd)
  - Specky kryteria: (crit: 01M4TPSCQV28RW1SM9HX2Y25E7) (crit: 01M4TPSCQVVZ0CY1K7VS5PGGQW) (crit: 01M4TPSCQVX5S8GVFJ4EG4PWMG)
- [x] Test: 2.2 — wznowienie, błędna suma, blokada bez Wi-Fi (atrapy sieci i systemu plików) (pr: #12)
- [x] Zadanie 2.3: LocalLlmEngine na llama.rn — ładowanie GGUF, strumieniowanie tokenów, przerwanie generowania, zwalnianie pamięci przy zmianie modelu (wymaga: 1.6, 2.2) (spec: spec.md) (tech: react-native, typescript) (pr: #14)
  - AC: tokeny przychodzą strumieniowo; abort zatrzymuje generowanie i zwraca tekst do momentu przerwania
  - Specky: (req: 01M4TPSCN9WC02W8F3WJEFP4FF v1.0 @8cd370f)
  - Specky kryteria: (crit: 01M4TPSCNMGEE6WVQX15T9B7CV)
- [x] Test: 2.3 — adapter z atrapą natywnego modułu (strumień, abort, przeładowanie modelu) (pr: #14)
- [x] Zadanie 2.4: ContextBuilder — prompt systemowy + streszczenie starszej części tematu + ostatnie wiadomości w budżecie tokenów modelu (budżet per model w katalogu); aktualizacja streszczenia, gdy historia wychodzi poza budżet (wymaga: 1.4, 2.3) (spec: spec.md) (tech: typescript) (pr: #15)
  - AC: pełna historia zawsze zapisana w bazie; do modelu trafia kontekst ≤ budżetu tokenów
  - AC: dla modeli z dużym budżetem (chmura) wysyłana jest cała historia
  - Specky: (req: 01M4TPSBSFSQB42EM1EPJXWZAB v1.0 @f2ad1a6)
  - Specky kryteria: (crit: 01M4TPSBSQMMJJXSTTVE150DAW) (crit: 01M4TPSBSQR8MDHPK0NX5E7WCM) (crit: 01M4TPSBSQ1783VCEV6RBY62XS)
- [x] Test: 2.4 — przycinanie przy różnych budżetach, obecność streszczenia, kolejność wiadomości (pr: #15)
- [x] Zadanie 2.5: ConversationService — wysłanie wiadomości usera, budowa kontekstu, strumień odpowiedzi, zapis wiadomości; przerwanie zapisuje tekst częściowy z flagą interrupted (wymaga: 2.4) (spec: spec.md) (tech: typescript) (pr: #16)
  - AC: przerwana odpowiedź zostaje w historii z flagą interrupted i jest częścią kolejnego kontekstu
  - AC: wejście — wysłanie tekstu z ekranu Rozmowa (2.7) i zakończona wypowiedź z potoku głosowego (3.6)
- [x] Test: 2.5 — pełny cykl z atrapą LLM, przerwanie w trakcie (pr: #16)
- [x] Zadanie 2.6: Ekran Lista tematów — FlatList po ostatniej aktywności, wyszukiwanie po tytule, „Nowy temat", zmiana nazwy, usunięcie z potwierdzeniem (wymaga: 1.4, 1.7) (spec: spec.md) (tech: react-native, typescript) (pr: #13)
  - AC: można utworzyć nowy temat i wejść do dowolnego istniejącego, by kontynuować rozmowę
  - AC: usunięcie wymaga potwierdzenia
  - Specky: (req: 01M4TPSBA2GXAHZ7W4734NBAEC v1.0 @6f3590a)
  - Specky kryteria: (crit: 01M4TPSBAVP0JTTN6KFJ401ECW) (crit: 01M4TPSBAVEH57XMG9P1Z3BJ8B)
  - Specky: (req: 01M4TPSBGVNJP0KXVH4T0EJH2C v1.0 @e538957)
  - Specky kryteria: (crit: 01M4TPSBHTWE0PKKEXKEDAYGTK) (crit: 01M4TPSBHTKV9C661RVDKGZJZP) (crit: 01M4TPSBHTZD1GCPMPGTCWKPPG) (crit: 01M4TPSBHTQ3Y0DS0QSMZQJAXM)
- [x] Test: 2.6 — render listy, wyszukiwanie, tworzenie, zmiana nazwy, usuwanie (pr: #13)
- [x] Zadanie 2.7: Ekran Rozmowa (tekstowy) — dymki czatu, strumieniowany tekst odpowiedzi, pole tekstowe, przycisk STOP przerywający generowanie, CTA pobrania modelu, gdy brak modelu lokalnego (wymaga: 2.2, 2.5, 2.6) (spec: spec.md) (tech: react-native, typescript) (pr: #17)
  - AC: odpowiedź pojawia się na bieżąco w dymku; STOP przerywa generowanie
  - AC: odpowiedź przerwana ma oznaczenie „przerwano"
  - Specky: (req: 01M4TPSBVARMFASRVTYM6ERQB3 v1.0 @9adb713)
  - Specky kryteria: (crit: 01M4TPSBVHVSTT9FRBA7G3CJCD)
  - Specky: (req: 01M4TPSBQ1QA9Z56Q3AQX604VT v1.0 @0a469e7)
  - Specky kryteria: (crit: 01M4TPSBQDHM1ENPJ1BSBYH39A)
- [x] Test: 2.7 — wysyłka tekstu, strumień, przerwanie, stan bez modelu (pr: #17)
- [x] Zadanie 2.8: Automatyczny tytuł tematu generowany przez LLM po pierwszej wymianie (tylko gdy user nie nadał nazwy ręcznie) (wymaga: 2.5) (tech: typescript) (pr: #18)
  - AC: wejście — zapis pierwszej odpowiedzi asystenta w temacie z tytułem domyślnym
  - Specky: (req: 01M4TPSBMNDK44C94VSYQGXZSZ v1.0 @fa3165a)
  - Specky kryteria: (crit: 01M4TPSBN0GQJGEGSSKYGGKXAP) (crit: 01M4TPSBN0DRTYPHEH2TNZAC6A)
- [x] Test: 2.8 — tytuł nadany raz, nie nadpisuje nazwy nadanej ręcznie (pr: #18)
- [x] Zadanie 2.9: Prompt systemowy — domyślny po polsku (zwięzłe odpowiedzi do odczytu), edycja globalna w Ustawieniach i nadpisanie per temat (wymaga: 2.4, 2.6) (tech: react-native, typescript) (pr: #19)
  - AC: prompt tematu ma pierwszeństwo przed globalnym; pusty → globalny
  - Specky: (req: 01M4TPSBXRAA4FKEE3X2EG9P27 v1.0 @61d158e)
  - Specky kryteria: (crit: 01M4TPSBY57E67QRW2PBZ737AJ) (crit: 01M4TPSBY58VX983CNTS28VG7P)
- [x] Test: 2.9 — wybór promptu w ContextBuilder, edycja w UI (pr: #19)
- [x] Zadanie 2.10: Test e2e — utworzenie tematu, rozmowa tekstowa z atrapą LLM (strumień), przerwanie STOP, automatyczny tytuł, zmiana nazwy, wyszukiwanie, usunięcie, powrót do tematu po restarcie (wymaga: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9) (spec: spec.md) (tech: detox, typescript) (pr: #20)

### Faza 3: Potok głosowy — tryb ciągły

- [x] Zadanie 3.1: AudioSessionService — przechwytywanie mikrofonu w trybie z systemowym AEC (iOS VoiceProcessingIO, Android AcousticEchoCanceler), obsługa przerwań audio, uprawnienie mikrofonu, ekran nie gaśnie w trakcie rozmowy (wymaga: 1.6) (tech: react-native, typescript) (pr: #22)
  - AC: odmowa mikrofonu → komunikat z linkiem do ustawień systemu, rozmowa tekstem nadal działa
  - AC: połączenie telefoniczne wstrzymuje nasłuch i TTS; po powrocie stan nasłuchu bez wznawiania odczytu
  - Specky: (req: 01M4TPSCEP4B390R81AQSKZWEX v1.0 @c8b0845)
  - Specky kryteria: (crit: 01M4TPSCFBD729TD4DGRJNHKRW) (crit: 01M4TPSCFBKVXWKN61HZM7D781) (crit: 01M4TPSCFB2Z3N9PPK993P4VX6)
  - Specky: (req: 01M4TPSBVARMFASRVTYM6ERQB3 v1.0 @9adb713)
  - Specky kryteria: (crit: 01M4TPSBVH4RAMAQ7GSXN6R8NK)
- [x] Test: 3.1 — reakcje na przerwania i odmowę uprawnień (atrapy modułów natywnych) (pr: #22)
- [x] Zadanie 3.2: VadEngine na sherpa-onnx (Silero VAD) — segmentacja mowy, koniec wypowiedzi po progu ciszy z ustawień (1,5–6 s, domyślnie 3 s) (wymaga: 3.1) (spec: spec.md) (tech: react-native, typescript) (pr: #24)
  - AC: po ciszy równej progowi emitowane jest zdarzenie końca wypowiedzi
  - Specky: (req: 01M4TPSBZZJG8NWC1W3NMD6C9W v1.0 @87b9583)
  - Specky kryteria: (crit: 01M4TPSC0BNXA9C4VKYN7C7HRN)
- [x] Test: 3.2 — segmentacja nagranych plików WAV (mowa, cisza, szum) (pr: #24)
- [x] Zadanie 3.3: WhisperSttEngine na whisper.rn — język wymuszony `pl`, model small domyślnie, wariant base z ustawień, akceleracja Core ML/Metal na iOS (wymaga: 1.6, 2.2) (spec: spec.md) (tech: react-native, typescript) (pr: #25)
  - AC: segment audio zamieniany na tekst polski; wybór small/base z ustawień
  - Specky: (req: 01M4TPSC9XQS0B0N608Z41T867 v1.0 @efdc982)
  - Specky kryteria: (crit: 01M4TPSCA6KQW1NH3DSRYASVF3) (crit: 01M4TPSCA6EWAV8RB7HWB6XR17)
- [x] Test: 3.3 — adapter z atrapą modułu natywnego, wybór wariantu (pr: #25)
- [x] Zadanie 3.4: PiperTtsEngine na sherpa-onnx — głosy pl_PL-darkman-medium i pl_PL-gosia-medium, kolejka odtwarzania zdań, natychmiastowe zatrzymanie (wymaga: 1.6, 2.2) (spec: spec.md) (tech: react-native, typescript) (pr: #26)
  - AC: user wybiera jeden z dwóch głosów; stop() przerywa odtwarzanie i czyści kolejkę
  - Specky: (req: 01M4TPSCBZ4Q3DS9SXE5RGS8DA v1.0 @ee2f323)
  - Specky kryteria: (crit: 01M4TPSCC9WQ6ZKBQT91ANM77J)
- [x] Test: 3.4 — kolejka zdań, stop, zmiana głosu (pr: #26)
- [x] Zadanie 3.5: SpeechText — usuwanie markdown i emoji przed TTS (w czacie zostają) i podział strumienia tokenów na pełne zdania (wymaga: 1.1) (tech: typescript) (pr: #27)
  - AC: pierwsze pełne zdanie trafia do TTS przed końcem generowania
  - Specky: (req: 01M4TPSBQ1QA9Z56Q3AQX604VT v1.0 @0a469e7)
  - Specky kryteria: (crit: 01M4TPSBQDA2ZHEJR7GGB3Z4DX)
- [x] Test: 3.5 — czyszczenie markdown, podział zdań (skróty, liczby, wielokropki) (pr: #27)
- [ ] Zadanie 3.6: VoiceSessionController — maszyna stanów (bezczynny/słucham/przetwarzam/mówię), tryb ciągły: koniec wypowiedzi → STT → ConversationService → TTS zdaniami → powrót do nasłuchu (wymaga: 2.5, 3.2, 3.3, 3.4, 3.5) (spec: spec.md) (tech: typescript) (pr: #28)
  - AC: po ciszy ≥ progu wypowiedź wysyłana z kontekstem tematu; odpowiedź pisemnie i głosowo
  - AC: wejście — przycisk mikrofonu na ekranie Rozmowa (3.7)
  - Specky: (req: 01M4TPSBZZJG8NWC1W3NMD6C9W v1.0 @87b9583)
  - Specky kryteria: (crit: 01M4TPSC0B8HYJGGA7VFMDNQMS) (crit: 01M4TPSC0B4E53VDY3GZ4AXK4A) (crit: 01M4TPSC0BAH62JP9VCR54D90J)
  - Specky: (req: 01M4TPSBQ1QA9Z56Q3AQX604VT v1.0 @0a469e7)
  - Specky kryteria: (crit: 01M4TPSBQDRJ1KPTAXYXJAQKVQ)
- [ ] Test: 3.6 — przejścia stanów z atrapami silników (pr: #28)
- [ ] Zadanie 3.7: Ekran Rozmowa — tryb głosowy: duży przycisk mikrofonu, wskaźnik stanu (słucham / przetwarzam / mówię), transkrypcja na żywo, przełącznik trybu ciągły/przerywany (wymaga: 2.7, 3.6) (spec: spec.md) (tech: react-native, typescript) (pr: #28)
  - AC: wskaźnik pokazuje bieżący stan sesji; tryb przełączany jednym dotknięciem (ustawienie globalne)
  - Specky: (req: 01M4TPSC7RSRB8XX9FM7EHZSXS v1.0 @990c4e5)
  - Specky kryteria: (crit: 01M4TPSC85Q9KY04JF3KEEC2XM) (crit: 01M4TPSC85FNP5ZTJ00E05C140)
- [ ] Test: 3.7 — render stanów i przełącznik trybu (pr: #28)
- [ ] Zadanie 3.8: Metryki opóźnień — czas STT, czas do pierwszego tokenu, czas do pierwszego audio, zapisywane lokalnie i widoczne w trybie diagnostycznym (wymaga: 3.6) (tech: react-native, typescript) (pr: #28)
  - AC: wejście — przełącznik „Tryb diagnostyczny" w Ustawieniach
  - Specky: (req: 01M4TPSCJAAVY8EMNC2X7SAZ3Y v1.0 @32b1379)
  - Specky kryteria: (crit: 01M4TPSCJV5Y6488ZMZ28DRVZT)
- [ ] Test: 3.8 — pomiar z atrapami o zadanych opóźnieniach (pr: #28)
- [ ] Zadanie 3.9: Test e2e — tryb ciągły: wstrzyknięty WAV → transkrypcja → odpowiedź atrapy LLM tekstem i (atrapą) TTS → powrót do nasłuchu; odmowa mikrofonu → rozmowa tekstem (wymaga: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8) (spec: spec.md) (tech: detox, typescript) (pr: #28)

### Faza 4: Tryb przerywany i przerwanie STOP

- [ ] Zadanie 4.1: KeywordMatcher — normalizacja (wielkość liter, polskie znaki, interpunkcja), tolerancja wariantów („odbior", „odbiur"), „odbiór" tylko jako ostatnie słowo segmentu, wycinanie słowa z transkrypcji (wymaga: 1.1) (spec: spec.md) (tech: typescript)
  - AC: „odbiór paczki jutro" nie wyzwala wysyłki; „to wszystko, odbiór." wyzwala
  - AC: słowo „odbiór" nie trafia do historii ani do LLM
  - Specky: (req: 01M4TPSC2EFRVGNM2PKQFX8K6T v1.0 @f83d3f9)
  - Specky kryteria: (crit: 01M4TPSC2XEXCWD5H24XGWKY9M) (crit: 01M4TPSC2X3N2VSTTSH6ZVT7FM)
- [ ] Test: 4.1 — tabela przypadków dopasowania
- [ ] Zadanie 4.2: Tryb przerywany w VoiceSessionController — gromadzenie segmentów bez timeoutu, wysyłka całej wypowiedzi po końcowym „odbiór" (wymaga: 3.6, 4.1) (spec: spec.md) (tech: typescript) (pr: #31)
  - AC: pauzy w trybie przerywanym nie wysyłają wypowiedzi; „odbiór" wysyła całość
  - Specky: (req: 01M4TPSC2EFRVGNM2PKQFX8K6T v1.0 @f83d3f9)
  - Specky kryteria: (crit: 01M4TPSC2XBWSY7997NWZGCE5K) (crit: 01M4TPSC2XMDVW605VXF879XN8)
- [ ] Test: 4.2 — sekwencje segmentów z i bez słowa kluczowego (pr: #31)
- [ ] Zadanie 4.3: KeywordSpotter „stop" na sherpa-onnx KWS — aktywny w trakcie generowania i odtwarzania TTS, przy włączonym AEC (wymaga: 3.1, 1.6) (spec: spec.md) (tech: react-native, typescript) (pr: #30)
  - AC: wejście — VoiceSessionController włącza nasłuch KWS przy wejściu w stan „przetwarzam"/„mówię"
  - Specky: (req: 01M4TPSC52ZQ05FHN0CAWF2MYX v1.0 @4eb389f)
- [ ] Test: 4.3 — adapter KWS z atrapą, włączanie/wyłączanie wg stanu (pr: #30)
- [ ] Zadanie 4.4: Obsługa STOP (głosowego i przycisku) — przerwanie TTS i generowania, zapis odpowiedzi częściowej z oznaczeniem „przerwano", natychmiastowy powrót do nasłuchu (wymaga: 2.5, 4.3, 3.7) (spec: spec.md) (tech: react-native, typescript) (pr: #30)
  - AC: „STOP" w trakcie mowy zatrzymuje TTS i przechodzi w nasłuch
  - AC: „STOP" w trakcie generowania przerywa generowanie; tekst częściowy w historii
  - Specky: (req: 01M4TPSC52ZQ05FHN0CAWF2MYX v1.0 @4eb389f)
  - Specky kryteria: (crit: 01M4TPSC5K3QATGJG1DNDG5JWZ) (crit: 01M4TPSC5K6T07CB28MAEV4VWZ) (crit: 01M4TPSC5KA9NT3SHJ61SKQA26) (crit: 01M4TPSC5KZ6SEVP3V2QJ1JE61)
- [ ] Test: 4.4 — STOP w stanach „przetwarzam" i „mówię" (pr: #30)
- [ ] ⛔ Test: 4.4 — ręcznie na urządzeniach referencyjnych: skuteczność „odbiór"/„STOP" przez głośnik i słuchawki (scenariusz w ralph/TEST_SCENARIOS)
- [ ] Zadanie 4.5: Test e2e — tryb przerywany: WAV z pauzami bez „odbiór" (brak wysyłki), WAV z końcowym „odbiór" (wysyłka), STOP głosowy (zdarzenie atrapy KWS) i przyciskiem w trakcie mowy (wymaga: 4.1, 4.2, 4.3, 4.4) (spec: spec.md) (tech: detox, typescript) (pr: #31)

### Faza 5: Menedżer modeli i ustawienia

- [ ] Zadanie 5.1: DeviceCapabilities — odczyt RAM urządzenia, oznaczenie modeli „niezalecane na tym urządzeniu" (3B < 6 GB, 1–2B < 4 GB) bez blokady (wymaga: 2.1) (tech: react-native, typescript) (pr: #32)
  - AC: model niezalecany nadal można pobrać po potwierdzeniu
  - Specky: (req: 01M4TPSCXEM39JMQZK36SNGGPN v1.0 @10581f5)
  - Specky kryteria: (crit: 01M4TPSCXRZQ1S7977M866Q4DY)
- [ ] Test: 5.1 — klasyfikacja dla różnych ilości RAM (pr: #32)
- [ ] Zadanie 5.2: Ekran Menedżer modeli — LLM, whisper, głosy: rozmiar, stan, pobierz/usuń, postęp, wznowienie, „tylko Wi-Fi" ze zgodą na sieć komórkową, oznaczenie „niezalecane" (wymaga: 2.2, 5.1, 1.7) (spec: spec.md) (tech: react-native, typescript) (pr: #33)
  - AC: user pobiera wybrany model lokalny na urządzenie i może go usunąć
  - Specky: (req: 01M4TPSCQHCPGKAQAJ8E6QGB2M v1.0 @aeb1edd)
  - Specky kryteria: (crit: 01M4TPSCQVTNAKJ3XXG6PS1DZF)
  - Specky: (req: 01M4TPSCXEM39JMQZK36SNGGPN v1.0 @10581f5)
  - Specky kryteria: (crit: 01M4TPSCXRQYNMQH707Z7NFVT5)
- [ ] Test: 5.2 — render stanów pobierania, usuwanie, zgoda na sieć komórkową (pr: #33)
- [ ] Zadanie 5.3: Kreator pierwszego uruchomienia — pobranie whisper, jednego głosu i jednego modelu LLM (domyślnie Qwen 2.5 1.5B) (wymaga: 5.2) (spec: spec.md) (tech: react-native, typescript)
  - AC: wejście — pierwsze uruchomienie aplikacji bez pobranych modeli
  - Specky: (req: 01M4TPSCT6VW2MN48Y3MP3WBXC v1.0 @aab204b)
  - Specky kryteria: (crit: 01M4TPSCTRFJVN1RZX3P717BYQ) (crit: 01M4TPSCTRC2WYRFBHHV417XND)
- [ ] Test: 5.3 — przejście kreatora i pominięcie go przy kolejnym starcie
- [ ] Zadanie 5.4: Ekran Ustawienia — domyślny model LLM, głos TTS, tryb ciągły/przerywany, próg ciszy (1,5–6 s), wariant whisper, prompt globalny, tryb diagnostyczny, informacja o prywatności, licencje modeli (wymaga: 1.5, 2.9, 3.8, 5.2) (spec: spec.md) (tech: react-native, typescript)
  - AC: zmiana głosu, trybu i progu działa od następnej wypowiedzi
  - AC: ekran licencji wymienia Llama 3.2 Community License, Gemma Terms of Use, Apache 2.0 (Qwen), licencje głosów Piper
  - Specky: (req: 01M4TPSCBZ4Q3DS9SXE5RGS8DA v1.0 @ee2f323)
  - Specky kryteria: (crit: 01M4TPSCC9NRMPW7N35Z8GZXV7) (crit: 01M4TPSCC9BC53Y8CGF03ZF04R)
  - Specky: (req: 01M4TPSDHTZC5AEGMSK9NKR4X2 v1.0 @580efcb)
  - Specky kryteria: (crit: 01M4TPSDJ62M6TE9A5F0JVH4E3)
  - Specky: (req: 01M4TPSDPBEDTZZQQMS63N2YES v1.0 @5f3694f)
  - Specky kryteria: (crit: 01M4TPSDPP4W0NEMR8EHA2PQQP)
- [ ] Test: 5.4 — zmiana każdego ustawienia i jego persystencja
- [ ] Zadanie 5.5: Wybór modelu per temat — nadpisanie domyślnego modelu z ekranu Rozmowa; zmiana w trakcie tematu zachowuje historię, kontekst przycinany do budżetu nowego modelu (wymaga: 2.4, 5.4) (spec: spec.md) (tech: react-native, typescript)
  - AC: temat z nadpisanym modelem używa go; bez nadpisania — modelu globalnego
  - Specky: (req: 01M4TPSCZHV54NDW1AVW7EMMWZ v1.0 @b9ecbc6)
  - Specky kryteria: (crit: 01M4TPSD05YJQ92GQ33KMKKNKM) (crit: 01M4TPSD05K5NH3VE5Q66NVXJM)
- [ ] Test: 5.5 — wybór modelu i budżet kontekstu po zmianie
- [ ] Zadanie 5.6: Test e2e — kreator pierwszego uruchomienia (atrapa pobierania), Menedżer modeli: pobranie, usunięcie, „niezalecane"; Ustawienia: głos, tryb, próg; model per temat (wymaga: 5.1, 5.2, 5.3, 5.4, 5.5) (spec: spec.md) (tech: detox, typescript)

### Faza 6: Dostawcy chmurowi LLM

- [ ] Zadanie 6.1: Wspólny klient HTTP dostawców — timeout 60 s, do 2 ponowień z backoffem dla 5xx/sieci, mapowanie błędów na komunikaty PL („Nieprawidłowy klucz API", „Przekroczony limit"), parser strumienia SSE, zero treści rozmów w logach (wymaga: 1.1) (spec: WYTYCZNE_TECHNICZNE.md) (tech: typescript)
  - AC: 401 → „Nieprawidłowy klucz API"; 429 → „Przekroczony limit"; brak automatycznego przełączenia na model lokalny
  - Specky: (req: 01M4TPSD5ZN6JEWY5Q25XPBFH1 v1.0 @dd8d9cc)
  - Specky kryteria: (crit: 01M4TPSD6AM5PRHDF9YP515MSQ) (crit: 01M4TPSD6AE4BW0DRNTTNKD58N) (crit: 01M4TPSD6AB72A3G4V786PZ9KZ)
  - Specky: (req: 01M4TPSDF9ATEYND8AHKATHQM2 v1.0 @4019d77)
  - Specky kryteria: (crit: 01M4TPSDFMFSQRK8VYVJPNVEKR)
- [ ] Test: 6.1 — ponowienia, timeout, mapowanie błędów, parser SSE
- [ ] Zadanie 6.2: Adapter OpenAI — strumieniowe chat completions, lista modeli, abort (wymaga: 6.1, 1.6) (spec: spec.md, WYTYCZNE_TECHNICZNE.md) (tech: typescript)
  - AC: implementuje LlmEngine (strumień, abort); lista modeli z /v1/models z fallbackiem na listę wbudowaną
  - Specky: (req: 01M4TPSD35MNH049EAZG93F7GG v1.0 @6affb18)
- [ ] Test: 6.2 — adapter na nagranych odpowiedziach HTTP
- [ ] Zadanie 6.3: Adapter Anthropic — strumieniowe Messages API, lista modeli, abort (wymaga: 6.1, 1.6) (spec: spec.md, WYTYCZNE_TECHNICZNE.md) (tech: typescript)
  - AC: implementuje LlmEngine; prompt systemowy przekazywany polem system
  - Specky: (req: 01M4TPSD35MNH049EAZG93F7GG v1.0 @6affb18)
- [ ] Test: 6.3 — adapter na nagranych odpowiedziach HTTP
- [ ] Zadanie 6.4: Adapter Google Gemini — strumieniowe generateContent, lista modeli, abort (wymaga: 6.1, 1.6) (spec: spec.md, WYTYCZNE_TECHNICZNE.md) (tech: typescript)
  - AC: implementuje LlmEngine; mapowanie ról user/assistant na user/model
  - Specky: (req: 01M4TPSD35MNH049EAZG93F7GG v1.0 @6affb18)
- [ ] Test: 6.4 — adapter na nagranych odpowiedziach HTTP
- [ ] Zadanie 6.5: Adapter Meta Llama API (api.llama.com) — strumieniowe chat completions, lista modeli, abort (wymaga: 6.1, 1.6) (spec: spec.md, WYTYCZNE_TECHNICZNE.md) (tech: typescript)
  - AC: implementuje LlmEngine; „Facebook" ze spec = Meta Llama API
  - Specky: (req: 01M4TPSD35MNH049EAZG93F7GG v1.0 @6affb18)
- [ ] Test: 6.5 — adapter na nagranych odpowiedziach HTTP
- [ ] Zadanie 6.6: Ekran Klucze API — per dostawca: wpisanie klucza, walidacja testowym zapytaniem przy zapisie, zapis w SecretStore, usunięcie, lista dostępnych modeli (wymaga: 1.5, 5.4, 6.2, 6.3, 6.4, 6.5) (spec: spec.md) (tech: react-native, typescript)
  - AC: nieprawidłowy klucz nie zostaje zapisany i pokazuje komunikat
  - AC: modele chmurowe dostawcy z poprawnym kluczem pojawiają się w wyborze modelu (globalnym i per temat)
  - Specky: (req: 01M4TPSD35MNH049EAZG93F7GG v1.0 @6affb18)
  - Specky kryteria: (crit: 01M4TPSD3NM3BC0R81WPKKS9GV) (crit: 01M4TPSD3NCRZBYB6MHAVGWTCR)
- [ ] Test: 6.6 — zapis, walidacja, usunięcie klucza, lista modeli
- [ ] Zadanie 6.7: Rozmowa na modelu chmurowym — EngineRegistry zwraca adapter dostawcy dla wybranego modelu, duży budżet kontekstu (cała historia), STT/TTS nadal lokalne (wymaga: 5.5, 6.6) (spec: spec.md) (tech: typescript)
  - AC: z modelem chmurowym rozmowa głosowa działa tak samo jak z lokalnym (oba tryby, STOP)
  - Specky: (req: 01M4TPSD35MNH049EAZG93F7GG v1.0 @6affb18)
  - Specky kryteria: (crit: 01M4TPSD3NTQ77B4DZMD45444S)
- [ ] Test: 6.7 — wybór silnika per model, przerwanie żądania HTTP przy STOP
- [ ] Zadanie 6.8: Test e2e — dodanie klucza (atrapa serwera dostawcy), błędny klucz, wybór modelu chmurowego w temacie, rozmowa tekstowa i głosowa, błąd sieci z komunikatem (wymaga: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7) (spec: spec.md) (tech: detox, typescript)

### Faza 7: Polecenia głosowe tematów

- [ ] Zadanie 7.1: VoiceCommandParser — gramatyka fraz na transkrypcji przed LLM: „przełącz na/otwórz temat X", „nowy temat X", „jakie mam tematy", „podsumuj rozmowę"; rozmyte dopasowanie nazwy tematu (wymaga: 1.4, 4.1) (spec: spec.md) (tech: typescript)
  - AC: „przełącz na temat wakacje" dopasowuje temat „Wakacje 2026"; brak dopasowania → przekazanie do LLM
  - Specky: (req: 01M4TPSD8Z5ZMZVRA1HNQPSQ6H v1.0 @c878c58)
  - Specky kryteria: (crit: 01M4TPSD985J6R5DR64N3QGXJD) (crit: 01M4TPSD981M9JE8DH1AAHE29F)
- [ ] Test: 7.1 — tabela fraz, wariantów i dopasowań
- [ ] Zadanie 7.2: Wykonanie poleceń w VoiceSessionController — przełączenie/utworzenie tematu, odczyt TTS listy 5–10 ostatnich tematów, dopytanie głosem przy niejednoznaczności (wymaga: 7.1, 3.6, 2.6) (spec: spec.md) (tech: react-native, typescript)
  - AC: „jakie mam tematy" odczytuje głosem i pokazuje listę ostatnich tematów
  - AC: wejście — każda zakończona wypowiedź usera przechodzi przez parser przed wysłaniem do LLM
  - Specky: (req: 01M4TPSD8Z5ZMZVRA1HNQPSQ6H v1.0 @c878c58)
  - Specky kryteria: (crit: 01M4TPSD984YDF8YSTV0EF3KY4) (crit: 01M4TPSD987TH60PDGRVVP5CGS) (crit: 01M4TPSD98AJYHCJKQ4XRCQ8YT)
- [ ] Test: 7.2 — przełączenie, utworzenie, lista, niejednoznaczność
- [ ] Zadanie 7.3: Fallback function calling dla modeli chmurowych — narzędzia switch_topic, create_topic, list_topics, gdy gramatyka nie rozpoznała polecenia (wymaga: 7.2, 6.7) (spec: spec.md) (tech: typescript)
  - AC: model chmurowy wywołujący switch_topic przełącza temat; modele lokalne nie dostają narzędzi
  - Specky: (req: 01M4TPSD8Z5ZMZVRA1HNQPSQ6H v1.0 @c878c58)
- [ ] Test: 7.3 — obsługa wywołań narzędzi w adapterach (nagrane odpowiedzi)
- [ ] Zadanie 7.4: Test e2e — polecenia głosowe (WAV): nowy temat, przełączenie, lista tematów, niejednoznaczna nazwa z dopytaniem (wymaga: 7.1, 7.2, 7.3) (spec: spec.md) (tech: detox, typescript)

### Faza 8: Podsumowania i eksport

- [ ] Zadanie 8.1: Szablony podsumowań — wbudowane (notatka, lista punktów/decyzji, lista zadań, e-mail) + własne instrukcje usera zapisywane jako szablony (wymaga: 1.3) (spec: spec.md) (tech: typescript, sql)
  - AC: własna instrukcja zapisana raz jest dostępna jako szablon w kolejnych tematach
  - Specky: (req: 01M4TPSDBF9Y2BDFX8X4Q6AEZY v1.0 @bc832e9)
  - Specky kryteria: (crit: 01M4TPSDBQ9JEYACQWXJW1SFEH)
- [ ] Test: 8.1 — CRUD szablonów, obecność wbudowanych
- [ ] Zadanie 8.2: SummaryService — generowanie podsumowania całej historii tematu wg szablonu (dla małych kontekstów etapami: fragmenty → scalenie), zapis przy temacie, ponowne generowanie (wymaga: 2.4, 8.1) (spec: spec.md) (tech: typescript)
  - AC: podsumowanie obejmuje całą historię także przy budżecie mniejszym niż historia
  - AC: wejście — przycisk „Podsumuj" (8.3) i polecenie głosowe „podsumuj rozmowę" (8.5)
  - Specky: (req: 01M4TPSDBF9Y2BDFX8X4Q6AEZY v1.0 @bc832e9)
  - Specky kryteria: (crit: 01M4TPSDBQ5F5ZY4NE2YVGSA2C) (crit: 01M4TPSDBQ2SFHKYMWB8NQJ2MT)
- [ ] Test: 8.2 — podsumowanie jednoetapowe i etapowe z atrapą LLM
- [ ] Zadanie 8.3: Ekran Podsumowanie — wybór szablonu lub własna instrukcja, generowanie, podgląd, kopiowanie, „Udostępnij" (tekst/Markdown), odczyt głosowy (wymaga: 8.2, 3.4, 1.7) (spec: spec.md) (tech: react-native, typescript)
  - AC: podsumowanie w wybranej formie zapisane przy temacie i dostępne po ponownym wejściu
  - Specky: (req: 01M4TPSDBF9Y2BDFX8X4Q6AEZY v1.0 @bc832e9)
  - Specky kryteria: (crit: 01M4TPSDBQC02027MG5MRTHCP4)
- [ ] Test: 8.3 — generowanie, ponowne generowanie, udostępnianie
- [ ] Zadanie 8.4: Eksport tematu (historia rozmowy) do tekstu/Markdown przez systemowe „Udostępnij" — bez kluczy API (wymaga: 1.4, 2.6) (spec: spec.md) (tech: react-native, typescript)
  - AC: wejście — akcja „Eksportuj" w menu tematu na Liście tematów i w Rozmowie
  - Specky: (req: 01M4TPSDDANXP2VV3MH759N7PA v1.0 @ba61374)
  - Specky kryteria: (crit: 01M4TPSDDKNPG4W9S9AY939Y4S) (crit: 01M4TPSDDKNG7GAK3ZAKTFG5W3)
- [ ] Test: 8.4 — format Markdown eksportu
- [ ] Zadanie 8.5: Polecenie głosowe „podsumuj rozmowę" — generuje podsumowanie ostatnio użytym szablonem i odczytuje je (wymaga: 7.2, 8.2) (spec: spec.md) (tech: typescript)
  - AC: polecenie zapisuje podsumowanie przy temacie i odtwarza je przez TTS
  - Specky: (req: 01M4TPSDBF9Y2BDFX8X4Q6AEZY v1.0 @bc832e9)
- [ ] Test: 8.5 — obsługa polecenia z atrapami
- [ ] Zadanie 8.6: Test e2e — podsumowanie wbudowanym szablonem, własną instrukcją, ponowne generowanie, udostępnienie, polecenie głosowe, eksport tematu (wymaga: 8.1, 8.2, 8.3, 8.4, 8.5) (spec: spec.md) (tech: detox, typescript)

### Faza 9: Wydanie wewnętrzne

- [ ] Zadanie 9.1: Raporty awarii opt-in (Sentry) — domyślnie wyłączone, zgoda w Ustawieniach, usuwanie treści rozmów i kluczy z raportów (wymaga: 5.4) (tech: react-native, typescript)
  - AC: bez zgody żaden raport nie jest wysyłany; raport nie zawiera treści wiadomości ani kluczy
  - Specky: (req: 01M4TPSDHTZC5AEGMSK9NKR4X2 v1.0 @580efcb)
  - Specky kryteria: (crit: 01M4TPSDJ6PJ22Z0HREFQQ1Z00) (crit: 01M4TPSDJ68G318A44NBBN2F31)
- [ ] Test: 9.1 — filtr beforeSend usuwa wrażliwe pola; brak inicjalizacji bez zgody
- [ ] Zadanie 9.2: Konfiguracja buildów dystrybucji wewnętrznej — EAS profile (development/preview), TestFlight (iOS) i Firebase App Distribution / APK (Android), opisy uprawnień mikrofonu (wymaga: 1.2) (tech: react-native)
  - Specky: (req: 01M4TPSAN97DVJH98SGHWK0JB5 v1.0 @4c3b1e3)
- [ ] Test: 9.2 — build preview przechodzi dla obu platform (lokalnie lub w CI)
- [ ] Zadanie 9.3: Scenariusze testów ręcznych — słowa kluczowe na głośniku/słuchawkach, opóźnienia vs cele (chmura < 3 s, lokalny 1–2B < 5 s), przerwania audio, modele 3B na urządzeniu referencyjnym (wymaga: 4.4, 3.8) (tech: react-native)
  - Specky: (req: 01M4TPSCJAAVY8EMNC2X7SAZ3Y v1.0 @32b1379)
- [ ] Zadanie 9.4: Test e2e — zgoda na raporty awarii w Ustawieniach, pełna ścieżka: kreator → temat → rozmowa głosowa → STOP → podsumowanie (wymaga: 9.1, 9.2, 9.3) (tech: detox, typescript)

## Pokrycie spec

| Plik | Sekcja | Zadania |
|------|--------|---------|
| spec.md | Nazwa i cel (historia + podsumowanie) | 1.3, 1.4, 8.1, 8.2, 8.3, 8.4, 8.5 |
| spec.md | Platforma i tematy | 1.2, 1.7, 2.6, 2.8, 2.10 |
| spec.md | Nawigacja głosowa po tematach | 7.1, 7.2, 7.3, 7.4 |
| spec.md | Tryby konwersacji i słowa kluczowe | 2.4 (S1), 3.2, 3.6, 3.7, 3.9, 4.1, 4.2, 4.3, 4.4, 4.5 |
| spec.md | Modele STT/TTS | 2.1, 3.3, 3.4, 5.2, 5.4 |
| spec.md | Lokalne LLM | 2.1, 2.2, 2.3, 5.1, 5.2, 5.3, 5.5 |
| spec.md | Chmurowe LLM | 6.1–6.8 |
| WYTYCZNE_TECHNICZNE.md | Integracje zewnętrzne | 6.1, 6.2, 6.3, 6.4, 6.5 |
| WYTYCZNE_TECHNICZNE.md | Instrukcja szablonu / Stack / Hosting / NFR / Inne / Odsyłacz | poza zakresem — pola puste (defaulty z ralph-guidelines); NFR ustalone w Q12, Q16, Q19, Q23 → 3.8, 5.1, 9.1, 9.3 |
| APP_FLOW.md | wszystkie sekcje | poza zakresem — niewypełniony szablon (marker RALPH_APP_FLOW_TEMPLATE), przykłady nie dotyczą projektu |
| ux_ui/LINKS.md | rejestr linków | poza zakresem — niewypełniony szablon, brak mockupów (UI wg Q18) |

Luki z oceny jakości spec:

| Luka | Zadania |
|------|---------|
| Podsumowanie rozmowy | 8.1–8.6 (Q2) |
| Rozpoznawanie poleceń głosowych | 7.1–7.3 (Q3) |
| Echo / barge-in „STOP" | 3.1, 4.3, 4.4 (Q4) |
| Zarządzanie kontekstem małych modeli | 2.4, 5.5 (S1) |
| Pobieranie i zarządzanie modelami | 2.1, 2.2, 5.2, 5.3 (Q10, Q11) |
| Wymagania sprzętowe / wersje OS | 1.2, 5.1 (Q12) |
| Dane, prywatność, klucze API | 1.5, 6.1, 8.4, 9.1 (A6, A16, Q23) |
| Lista ekranów / UX, język | 1.7, 2.6, 2.7, 3.7, 5.2, 5.4, 8.3 (Q9, Q18) |
| Praca w tle | poza zakresem MVP — tylko pierwszy plan, ekran nie gaśnie (3.1) (Q16) |
| Dystrybucja i licencje | 2.1, 5.4, 9.2 (Q22) |
| Strategia testów potoku audio | 1.6, e2e na końcu faz, 4.4 ręczny, 9.3 (Q21) |
| Własny endpoint zgodny z OpenAI (Groq, Ollama) | poza zakresem MVP — Q14 zostawiał to jako opcję do decyzji; dodać przez changes/ |
| Edycja transkrypcji przed wysłaniem, własny URL do GGUF | poza zakresem MVP (Q8, Q11) |

## Notatki

- Zależności: `(wymaga: X.X, Y.Y)` - Ralph pominie zadanie jeśli zależności nie są ukończone
- Numeracja faz: cyfra lub cyfra+litera (np. `Faza 2`, `Faza 2M`, `Faza 6.Z1`). Suffix `.Z<n>` = faza rework wynikła ze zmiany w `changes/`.
- Dokumentacja: `(spec: plik.md, inny-plik.md)` - Ralph załaduje TYLKO powiązane fragmenty z tych plików (przez ralph/SPEC_INDEX.md + Read z offset/limit)
- Technologia: `(tech: tag1, tag2)` - Ralph załaduje wytyczne stylu/konwencji z `ralph-guidelines/<tag>.md` + zawsze `general.md`.
- Zmiana: `(zmiana: <nazwa-pliku>.md)` — adnotacja na zadaniach zmodyfikowanych lub utworzonych przez plik z `changes/`.
- Każde zadanie implementacyjne ma adnotację `- [ ] Test: ...` (unit/integration) zaraz po sobie.
- E2E (Detox) uruchamiane na buildzie z trybem testowym: silniki natywne zastąpione atrapami z 1.6, mikrofon zastąpiony plikami WAV, LLM — deterministyczna atrapa, dostawcy chmurowi — lokalny serwer-atrapa.
- Specky: kotwice `- Specky: (req: …)` i `- Specky kryteria: (crit: …)` pod zadaniami; każde z 86 kryteriów ma przypisane zadanie (mapa w ralph/SPECKY.md).
