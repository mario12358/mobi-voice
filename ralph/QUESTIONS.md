# ralph/QUESTIONS.md - Doprecyzowanie projektu

## Status

- **Stan**: ukończony
- **Pytań łącznie**: 24
- **Odpowiedzianych**: 24
- **Założeń**: 16
- **Sprzeczności**: 2
- **Data generowania**: 2026-10-13

## Przeanalizowane dokumenty

- spec/spec.md (22 linie) — jedyny dokument merytoryczny
- spec/WYTYCZNE_TECHNICZNE.md (86 linii) — szablon, wypełniona tylko linia 44 (integracje)
- spec/APP_FLOW.md (100 linii) — niewypełniony szablon (marker RALPH_APP_FLOW_TEMPLATE), pominięty jako źródło wymagań
- spec/ux_ui/LINKS.md (28 linii) — niewypełniony szablon (marker RALPH_UX_LINKS_TEMPLATE), brak mockupów

## Sprzeczności w dokumentacji

### S1: „Cała historia chatu" wysyłana do LLM vs okno kontekstu lokalnych modeli 1–3B
- **Źródło A**: spec.md:13 — "Po tym czasie wysyłany jest cała historia chatu do LLM"
- **Źródło B**: spec.md:21 — lokalne modele Qwen 2.5 1.5B/3B, Llama 3.2 1B/3B, Gemma 2 2B (Gemma 2 ma okno 8k tokenów; na telefonie realnie 2–4k ze względu na RAM i czas prefillu)
- **Proponowane rozstrzygnięcie**: „cała historia" w sensie logicznym — zawsze zapisywana w całości, ale do modelu trafia: prompt systemowy + bieżące streszczenie starszej części tematu + ostatnie N wiadomości mieszczące się w budżecie tokenów danego modelu (budżet konfigurowany per model). Dla modeli chmurowych budżet duży (praktycznie cała historia). Tryby ciągły i przerywany korzystają z tego samego mechanizmu kontekstu (spec.md:14 mówi o „kontekście rozmowy").
- **Rozstrzygnięcie**: według propozycji
- **Status**: ✅

### S2: Nazwa głosu Piper „pl_PL-darkzar-medium" nie istnieje w katalogu Piper
- **Źródło A**: spec.md:19 — "pl_PL-darkzar-medium czy pl_PL-gosia-medium"
- **Źródło B**: katalog głosów Piper (rhasspy/piper-voices) — polskie głosy: pl_PL-darkman-medium, pl_PL-gosia-medium, pl_PL-mc_speech-medium
- **Proponowane rozstrzygnięcie**: literówka — chodzi o `pl_PL-darkman-medium`. Do wyboru: darkman + gosia (zgodnie z intencją spec).
- **Rozstrzygnięcie**: tak
- **Status**: ✅

## Założenia

### A1: Jeden klient — aplikacja mobilna Android + iOS z jednej bazy kodu, bez backendu-BFF i bez wariantu web
- **Kategoria**: architektura
- **Źródło**: spec.md:7
- **Uzasadnienie**: Spec wymienia wyłącznie aplikację mobilną; Android i iOS to dwie platformy tego samego klienta, nie dwa klienty — standardowa numeracja faz bez suffixów M/W.
- **Status**: ✅

### A2: Brak kont użytkowników i logowania — aplikacja jednoosobowa, dane lokalne na urządzeniu
- **Kategoria**: wymagania
- **Źródło**: spec.md:1-22 (brak wzmianki o kontach); APP_FLOW.md:36-54 to przykład szablonu, nie wymaganie
- **Uzasadnienie**: Klucze API są „swoje" (spec.md:22), modele lokalne — nie ma czego synchronizować ani autoryzować po stronie serwera.
- **Status**: ✅

### A3: TypeScript w trybie strict, struktura katalogów i konwencje wg `ralph-guidelines/react-native.md`
- **Kategoria**: technologia
- **Źródło**: konwencja stack-u (ralph-guidelines/react-native.md, typescript.md)
- **Uzasadnienie**: Spójne z defaultami Ralpha; dotyczy pod warunkiem przyjęcia React Native w Q1.
- **Status**: ✅

### A4: Dane rozmów w lokalnej bazie SQLite (tabele `topics`, `messages`, `summaries`; nazwy snake_case), migracje wersjonowane
- **Kategoria**: architektura
- **Źródło**: spec.md:3, 8-9 (historia rozmowy, tematy) + konwencja stack-u
- **Uzasadnienie**: Relacyjny model temat → wiadomości, wyszukiwanie i sortowanie po dacie; AsyncStorage nie nadaje się do rosnącej historii.
- **Status**: ✅

### A5: Temat = tytuł, data utworzenia, data ostatniej aktywności, opcjonalny prompt systemowy; przy starcie aplikacja wraca do ostatnio aktywnego tematu
- **Kategoria**: wymagania
- **Źródło**: spec.md:8-9
- **Uzasadnienie**: Minimalny model pozwalający tworzyć, wybierać i kontynuować rozmowy; „kontynuuj rozmowę" sugeruje powrót do ostatniego tematu.
- **Status**: ✅

### A6: Klucze API przechowywane w Keychain (iOS) / Keystore (Android), nigdy w SQLite, logach ani eksporcie
- **Kategoria**: bezpieczeństwo
- **Źródło**: spec.md:22 + standard branżowy (ralph-guidelines/react-native.md — secure store)
- **Uzasadnienie**: Klucz API = pieniądze usera; jedyne bezpieczne miejsce na urządzeniu.
- **Status**: ✅

### A7: Aplikacja wywołuje API dostawców LLM bezpośrednio z urządzenia (bez własnego serwera pośredniczącego)
- **Kategoria**: architektura
- **Źródło**: spec.md:22, WYTYCZNE_TECHNICZNE.md:44
- **Uzasadnienie**: Klucz należy do usera, więc nie ma potrzeby ukrywania go za proxy; brak backendu upraszcza projekt i prywatność.
- **Status**: ✅

### A8: STT i TTS zawsze działają lokalnie (whisper.small, Piper) — także gdy wybrany jest chmurowy LLM
- **Kategoria**: architektura
- **Źródło**: spec.md:16-19 (modele wymienione bez alternatyw chmurowych)
- **Uzasadnienie**: Spec wskazuje konkretne lokalne modele mowy; chmura dotyczy tylko LLM (spec.md:22).
- **Status**: ✅

### A9: Wykrywanie końca wypowiedzi w trybie ciągłym przez VAD (np. Silero VAD), nie przez prosty próg głośności; próg ciszy domyślnie 3 s
- **Kategoria**: technologia
- **Źródło**: spec.md:13
- **Uzasadnienie**: Próg amplitudy jest zawodny przy szumie tła; VAD to standard w potokach z whisperem.
- **Status**: ✅

### A10: Dopasowanie słów kluczowych „odbiór" i „STOP" bez rozróżniania wielkości liter i polskich znaków, z tolerancją typowych błędów transkrypcji („odbior", „odbiur", „stop.")
- **Kategoria**: wymagania
- **Źródło**: spec.md:14-15
- **Uzasadnienie**: whisper zwraca interpunkcję i warianty pisowni; ścisłe porównanie dawałoby fałszywe negatywy.
- **Status**: ✅

### A11: Słowo „odbiór" jest wycinane z transkrypcji przed wysłaniem do LLM i nie trafia do historii
- **Kategoria**: wymagania
- **Źródło**: spec.md:14
- **Uzasadnienie**: To sygnał sterujący, nie treść wypowiedzi — zaśmiecałby kontekst modelu.
- **Status**: ✅

### A12: Odpowiedź LLM jest strumieniowana: tekst pojawia się na bieżąco, a TTS zaczyna mówić po pierwszym pełnym zdaniu
- **Kategoria**: wymagania
- **Źródło**: spec.md:13-14 (odpowiedź pisemna i słowna)
- **Uzasadnienie**: Czekanie na pełną odpowiedź przed syntezą dodaje sekundy opóźnienia, szczególnie na modelach lokalnych.
- **Status**: ✅

### A13: Prompt systemowy (domyślny, po polsku) prosi o zwięzłe odpowiedzi nadające się do odczytu; markdown/emoji usuwane z tekstu przed TTS (w czacie zostają)
- **Kategoria**: wymagania
- **Źródło**: spec.md:13 + rozsądna interpretacja
- **Uzasadnienie**: TTS czytający „gwiazdka gwiazdka" i listy punktowane psuje odbiór głosowy.
- **Status**: ✅

### A14: Uprawnienie do mikrofonu prośbą przy pierwszym starcie rozmowy z uzasadnieniem; odmowa → komunikat z linkiem do ustawień i możliwość pisania tekstem
- **Kategoria**: wymagania
- **Źródło**: standard platform iOS/Android
- **Uzasadnienie**: Wymóg App Store/Google Play i podstawowa obsługa błędów.
- **Status**: ✅

### A15: Przerwania audio (połączenie telefoniczne, inna aplikacja przejmuje audio) wstrzymują nasłuch i TTS; po powrocie aplikacja jest w trybie nasłuchu, nie wznawia odczytu
- **Kategoria**: wymagania
- **Źródło**: standard platform (AVAudioSession / AudioFocus)
- **Uzasadnienie**: Bez obsługi przerwań aplikacja głosowa zachowuje się nieprzewidywalnie.
- **Status**: ✅

### A16: Błędy chmurowego LLM: timeout 60 s, do 2 ponowień z backoffem dla 5xx/sieci, czytelny komunikat (np. „Nieprawidłowy klucz API", „Przekroczony limit"); brak automatycznego przełączenia na model lokalny; treść rozmów nie trafia do logów
- **Kategoria**: wymagania
- **Źródło**: brak — nie opisano obsługi błędów; standard branżowy
- **Uzasadnienie**: Rozsądne defaulty; ciche przełączanie modelu zmieniałoby jakość odpowiedzi bez wiedzy usera.
- **Status**: ✅

## Pytania

### Q1: Jakiego stacku mobilnego i natywnych silników inferencji używamy?
- **Kategoria**: technologia
- **Źródło**: spec.md:7, 16-21; WYTYCZNE_TECHNICZNE.md:24-30 (puste)
- **Proponowana odpowiedź**: React Native + TypeScript z Expo (dev client / prebuild, bez Expo Go — potrzebne moduły natywne). Silniki: `llama.rn` (llama.cpp, modele GGUF), `whisper.rn` (whisper.cpp, ggml-small), Piper przez `sherpa-onnx` (react-native binding — obsługuje modele Piper VITS oraz VAD i keyword spotting w jednej bibliotece). Alternatywa: natywnie Kotlin + Swift (lepsza kontrola nad audio, ale 2× kod) lub Flutter. RN ma gotowe wytyczne (react-native, detox) w Ralphie.
- **Odpowiedź**:
- **Status**: ✅

### Q2: Jak ma działać „podsumowanie w określonej przez użytkownika formie"?
- **Kategoria**: wymagania
- **Źródło**: spec.md:3 (cel), brak — żaden punkt funkcjonalności nie opisuje podsumowania
- **Proponowana odpowiedź**: Podsumowanie per temat, wyzwalane przyciskiem „Podsumuj" lub poleceniem głosowym („podsumuj rozmowę"). User wybiera szablon formy: notatka, lista punktów/decyzji, lista zadań, e-mail — lub wpisuje własną instrukcję (zapamiętywaną jako szablon). Podsumowanie zapisywane przy temacie (można wygenerować ponownie), z możliwością kopiowania i udostępnienia (systemowe „Udostępnij", tekst/Markdown). Opcjonalnie odczyt głosowy.
- **Odpowiedź**:
- **Status**: ✅

### Q3: Jak rozpoznawać polecenia głosowe sterujące tematami (przełącz temat, utwórz temat, pokaż tematy)?
- **Kategoria**: architektura
- **Źródło**: spec.md:10-11
- **Proponowana odpowiedź**: Hybryda: (1) lokalna gramatyka fraz na transkrypcji przed wysłaniem do LLM — „przełącz na temat X", „otwórz temat X", „nowy temat X", „jakie mam tematy" — z dopasowaniem rozmytym nazwy tematu (np. podobieństwo tekstowe); niejednoznaczność → aplikacja dopytuje głosem; (2) dla modeli chmurowych dodatkowo function calling jako fallback, gdy gramatyka nie trafi. Małe modele lokalne (1–3B) słabo radzą sobie z tool calling, dlatego gramatyka jest ścieżką główną. Przegląd tematów = odczyt TTS listy ostatnich 5–10 tematów.
- **Odpowiedź**:
- **Status**: ✅

### Q4: Jak rozwiązać nasłuch „STOP" w trakcie odtwarzania TTS (echo głośnika → mikrofon)?
- **Kategoria**: technologia
- **Źródło**: spec.md:15
- **Proponowana odpowiedź**: W trakcie TTS mikrofon pracuje z systemowym AEC (iOS VoiceProcessingIO, Android AcousticEchoCanceler / tryb komunikacji), a nasłuch obsługuje lekki keyword spotter (sherpa-onnx KWS) rozpoznający tylko „stop" — nie pełny whisper. Dodatkowo przycisk STOP na ekranie jako niezawodna alternatywa. Słuchawki zalecane, ale nie wymagane. Akceptujemy, że na głośniku w hałasie skuteczność może być niższa.
- **Odpowiedź**:
- **Status**: ✅

### Q5: Jak wykrywać „odbiór" w trybie przerywanym — tylko na końcu wypowiedzi czy gdziekolwiek?
- **Kategoria**: wymagania
- **Źródło**: spec.md:14
- **Proponowana odpowiedź**: Whisper transkrybuje segmenty oddzielone pauzami (VAD); jeśli ostatnie słowo segmentu to „odbiór" → wysyłka całej zgromadzonej wypowiedzi. „Odbiór" w środku zdania (np. „odbiór paczki") nie wyzwala wysyłki. Bez limitu długości wypowiedzi; brak timeoutu wysyłki w trybie przerywanym.
- **Odpowiedź**:
- **Status**: ✅

### Q6: Czy STOP działa także w trakcie generowania odpowiedzi (przed rozpoczęciem mowy) i co trafia do historii po przerwaniu?
- **Kategoria**: wymagania
- **Źródło**: spec.md:15
- **Proponowana odpowiedź**: STOP przerywa zarówno TTS, jak i trwające generowanie. Do historii trafia pełny tekst już wygenerowany (przy przerwaniu generowania — tekst do momentu przerwania) z oznaczeniem „przerwano"; ten tekst jest częścią kontekstu kolejnych zapytań. Po STOP aplikacja natychmiast przechodzi w nasłuch.
- **Odpowiedź**:
- **Status**: ✅

### Q7: Czy tryb (ciągły/przerywany) jest ustawieniem globalnym czy per temat, i czy próg 3 s ma być konfigurowalny?
- **Kategoria**: wymagania
- **Źródło**: spec.md:12-13 ("przerwa powiedzmy 3 sekund")
- **Proponowana odpowiedź**: Tryb globalny, przełączany jednym dotknięciem na ekranie rozmowy i w ustawieniach. Próg ciszy konfigurowalny w ustawieniach (1,5–6 s, domyślnie 3 s).
- **Odpowiedź**:
- **Status**: ✅

### Q8: Czy poza głosem user może pisać wiadomości tekstem i edytować transkrypcję przed wysłaniem?
- **Kategoria**: wymagania
- **Źródło**: brak — spec opisuje tylko wejście głosowe
- **Proponowana odpowiedź**: Tak, pole tekstowe jako alternatywa (cicha sytuacja, brak uprawnień do mikrofonu). Edycja transkrypcji przed wysłaniem — poza MVP (tryb ciągły wysyła automatycznie).
- **Odpowiedź**:
- **Status**: ✅

### Q9: Język interfejsu i rozmów — tylko polski?
- **Kategoria**: wymagania
- **Źródło**: spec.md:14-15, 19 (polskie słowa kluczowe i głosy); WYTYCZNE_TECHNICZNE.md:63 (puste)
- **Proponowana odpowiedź**: MVP: interfejs i rozmowy po polsku; whisper z wymuszonym językiem `pl` (lepsza jakość i szybkość niż autodetekcja). Teksty UI w plikach tłumaczeń (gotowość na EN), ale bez tłumaczenia w MVP.
- **Odpowiedź**:
- **Status**: ✅

### Q10: Skąd i w jakiej formie pobierać modele lokalne (LLM, whisper, głosy Piper)?
- **Kategoria**: technologia
- **Źródło**: spec.md:16-21
- **Proponowana odpowiedź**: LLM w formacie GGUF z Hugging Face, kwantyzacja Q4_K_M (np. 1B ≈ 0,8 GB, 3B ≈ 2 GB); whisper ggml-small (~470 MB, ew. wariant q5 ~190 MB) i głosy Piper (~60 MB) też pobierane na żądanie, nie w paczce aplikacji. Ekran „Modele": pobierz/usuń, rozmiar, postęp, wznawianie przerwanego pobierania, weryfikacja sumy SHA256, domyślnie tylko przez Wi-Fi (z możliwością zgody na sieć komórkową). Pierwsze uruchomienie: kreator pobrania whisper + jednego głosu + jednego modelu.
- **Odpowiedź**:
- **Status**: ✅

### Q11: Czy lista lokalnych modeli jest zamknięta, czy user może dodać własny model?
- **Kategoria**: priorytety
- **Źródło**: spec.md:21 ("na pewno w tej liście będzie…")
- **Proponowana odpowiedź**: MVP: zamknięta, kuratorowana lista 5 wariantów (Qwen 2.5 1.5B i 3B, Llama 3.2 1B i 3B, Gemma 2 2B) zdefiniowana w pliku konfiguracyjnym (łatwo dopisać kolejne). Własny URL do GGUF — poza MVP.
- **Odpowiedź**:
- **Status**: ✅

### Q12: Jakie minimalne wersje systemów i wymagania sprzętowe?
- **Kategoria**: ograniczenia
- **Źródło**: brak — nie opisano wymagań sprzętowych
- **Proponowana odpowiedź**: iOS 16+, Android 10+ (API 29), tylko arm64. Modele 3B dostępne od 6 GB RAM, 1–2B od 4 GB; aplikacja sprawdza RAM i oznacza modele „niezalecane na tym urządzeniu" (bez twardej blokady). Urządzenia referencyjne do testów do wskazania przez usera.
- **Odpowiedź**:
- **Status**: ✅

### Q13: whisper.small może być wolny na słabszych telefonach — czy dopuszczamy mniejszy wariant?
- **Kategoria**: technologia
- **Źródło**: spec.md:18
- **Proponowana odpowiedź**: Domyślnie whisper small (zgodnie ze spec), w ustawieniach opcja „szybszy, mniej dokładny" (whisper base) dla słabszych urządzeń. Akceleracja: Core ML/Metal na iOS, wielowątkowy CPU na Androidzie.
- **Odpowiedź**:
- **Status**: ✅

### Q14: Jakich dostawców i jakie modele chmurowe obsługujemy? Co oznacza „Facebook"?
- **Kategoria**: technologia
- **Źródło**: spec.md:22; WYTYCZNE_TECHNICZNE.md:44
- **Proponowana odpowiedź**: OpenAI, Anthropic (Claude), Google (Gemini), Meta = Llama API (api.llama.com). Lista modeli pobierana z endpointu „list models" dostawcy po podaniu klucza (z fallbackiem na wbudowaną listę zalecanych). Walidacja klucza testowym zapytaniem przy zapisie. Dodatkowo (opcjonalnie) „własny endpoint zgodny z OpenAI" (Groq, Ollama w LAN) — do decyzji, czy w MVP.
- **Odpowiedź**:
- **Status**: ✅

### Q15: Czy wybór modelu LLM jest globalny czy per temat?
- **Kategoria**: wymagania
- **Źródło**: spec.md:21-22
- **Proponowana odpowiedź**: Globalny model domyślny w ustawieniach + możliwość nadpisania w temacie. Zmiana modelu w trakcie tematu jest dozwolona (historia zostaje, kontekst przycinany wg budżetu nowego modelu).
- **Odpowiedź**:
- **Status**: ✅

### Q16: Czy rozmowa ma działać w tle / przy zablokowanym ekranie?
- **Kategoria**: wymagania
- **Źródło**: brak — nie opisano
- **Proponowana odpowiedź**: MVP: tylko na pierwszym planie, ekran nie gaśnie w trakcie aktywnej rozmowy. Praca w tle (wymaga trybu audio w tle na iOS i foreground service na Androidzie, a lokalna inferencja w tle jest ograniczana przez system) — poza MVP.
- **Odpowiedź**:
- **Status**: ✅

### Q17: Jakie operacje na tematach i historii są potrzebne (zmiana nazwy, usuwanie, wyszukiwanie, eksport, kopia zapasowa)?
- **Kategoria**: wymagania
- **Źródło**: spec.md:8-9 (tylko tworzenie i kontynuacja)
- **Proponowana odpowiedź**: MVP: tworzenie (ręcznie lub głosem), automatyczny tytuł nadawany przez LLM po pierwszej wymianie (z możliwością zmiany), zmiana nazwy, usuwanie z potwierdzeniem, lista sortowana po ostatniej aktywności, wyszukiwanie po tytule. Eksport tematu do tekstu/Markdown przez „Udostępnij". Brak synchronizacji i kopii w chmurze (poza systemowym backupem urządzenia).
- **Odpowiedź**:
- **Status**: ✅

### Q18: Jakie ekrany i jaki styl wizualny, skoro nie ma mockupów?
- **Kategoria**: priorytety
- **Źródło**: spec/ux_ui/LINKS.md (pusty szablon); brak mockupów
- **Proponowana odpowiedź**: 5 ekranów: (1) Lista tematów, (2) Rozmowa — dymki czatu, duży przycisk mikrofonu, wskaźnik stanu (słucham / przetwarzam / mówię), przełącznik trybu, przycisk STOP, (3) Podsumowanie tematu, (4) Ustawienia — model, głos TTS, tryb, próg ciszy, klucze API, (5) Menedżer modeli. Prosty, natywny wygląd, motyw jasny/ciemny wg systemu. Jeśli powstaną mockupy (np. Claude Design), dopisz je do spec/ux_ui/LINKS.md przed generowaniem planu.
- **Odpowiedź**:
- **Status**: ✅

### Q19: Jakie są docelowe opóźnienia (od końca wypowiedzi do pierwszego słowa odpowiedzi)?
- **Kategoria**: wymagania
- **Źródło**: brak — WYTYCZNE_TECHNICZNE.md:58 (wydajność) puste
- **Proponowana odpowiedź**: Cele orientacyjne (nie blokujące): model chmurowy < 3 s, model lokalny 1–2B < 5 s na urządzeniu referencyjnym (plus 3 s ciszy w trybie ciągłym). Wydajność mierzona i logowana lokalnie (czas STT, pierwszy token, pierwsze audio) — widoczna w trybie diagnostycznym.
- **Odpowiedź**:
- **Status**: ✅

### Q20: Jaka kolejność realizacji / co jest MVP?
- **Kategoria**: priorytety
- **Źródło**: spec.md:7-22 (brak priorytetów)
- **Proponowana odpowiedź**: (1) Szkielet aplikacji + tematy + czat tekstowy z jednym modelem lokalnym; (2) potok głosowy: VAD + whisper + Piper, tryb ciągły; (3) tryb przerywany „odbiór" i przerwanie „STOP"; (4) menedżer modeli i wybór głosu; (5) dostawcy chmurowi; (6) polecenia głosowe tematów; (7) podsumowania. Obie platformy równolegle od początku.
- **Odpowiedź**:
- **Status**: ✅

### Q21: Jak testować potok głosowy w e2e?
- **Kategoria**: technologia
- **Źródło**: brak — nie opisano strategii testów
- **Proponowana odpowiedź**: Unit: Jest + React Native Testing Library, silniki natywne za interfejsami (STT/TTS/LLM/VAD) z implementacjami-atrapami. E2E: Detox z trybem testowym wstrzykującym nagrane pliki WAV zamiast mikrofonu i deterministycznym atrapowym LLM. Jakość rozpoznawania „odbiór"/„STOP" na prawdziwych urządzeniach — scenariusze testów ręcznych.
- **Odpowiedź**:
- **Status**: ✅

### Q22: Jak aplikacja będzie dystrybuowana i czy licencje modeli są zaakceptowane?
- **Kategoria**: ograniczenia
- **Źródło**: brak — nie opisano deploymentu
- **Proponowana odpowiedź**: MVP: dystrybucja wewnętrzna (TestFlight + APK/Firebase App Distribution), publikacja w sklepach później. Modele pobierane przez usera z Hugging Face (nie redystrybuowane w paczce), ekran z informacją o licencjach (Llama 3.2 Community License, Gemma Terms of Use, Qwen Apache 2.0, licencje głosów Piper). Uwaga: Llama 3.2 wymaga akceptacji licencji na HF — potrzebne źródło bez bramki (np. oficjalne re-uploady GGUF) albo token HF.
- **Odpowiedź**:
- **Status**: ✅

### Q23: Czy aplikacja zbiera telemetrię lub raporty błędów?
- **Kategoria**: ograniczenia
- **Źródło**: brak — WYTYCZNE_TECHNICZNE.md:38, 61 (monitoring, compliance) puste
- **Proponowana odpowiedź**: MVP: brak analityki. Raporty awarii (np. Sentry) tylko za zgodą usera i bez treści rozmów i kluczy. Treść rozmów nigdy nie opuszcza urządzenia poza wywołaniem wybranego przez usera dostawcy LLM — informacja o tym w ustawieniach.
- **Odpowiedź**:
- **Status**: ✅

### Q24: Czy prompt systemowy (persona/instrukcje dla modelu) ma być edytowalny przez usera?
- **Kategoria**: wymagania
- **Źródło**: brak — nie opisano; spec.md:3 (forma wyniku zależna od usera)
- **Proponowana odpowiedź**: Tak — globalny domyślny prompt systemowy w ustawieniach + opcjonalny prompt per temat (np. „jesteś trenerem języka angielskiego"). Domyślny prompt zgodny z założeniem A13.
- **Odpowiedź**:
- **Status**: ✅
