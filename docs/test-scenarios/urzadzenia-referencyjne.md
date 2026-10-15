# Scenariusze ręczne na urządzeniach referencyjnych

- **Zakres:** to, czego emulator i atrapy w e2e nie sprawdzą — prawdziwy mikrofon i głośnik, słowa
  kluczowe „odbiór” i „stop”, echo, czasy odpowiedzi, przerwania audio, duże modele na telefonie.
- **Kiedy:** przed każdym wydaniem wewnętrznym; wyniki przepisz do scenariuszy danej wersji
  (`docs/test-scenarios/vX.Y.Z.md`).
- **Testy automatyczne:** e2e Detox (Fazy 1–8) na emulatorze z plikami WAV i atrapami silników — nie
  mierzą skuteczności rozpoznawania ani opóźnień na telefonie.

**Oznaczanie wyniku:** `[x]` = sprawdzone i działa · `[-]` = sprawdzone i NIE działa · `[ ]` = niesprawdzone.
**Jeden scenariusz = jeden checkbox** (linia `Wynik N.M`). Przy `[-]` dopisz jedno zdanie: co się stało.

---

## 0. Przygotowanie

- [ ] Urządzenie referencyjne iOS (iPhone z iOS 16.4+, najlepiej 6 GB RAM) i Android (Android 10+, arm64, 6–8 GB RAM) — wpisz modele: …
- [ ] Na obu: pobrane w kreatorze whisper small, głos Gosia i Qwen 2.5 1.5B; w Menedżerze modeli także model 3B (np. Llama 3.2 3B)
- [ ] Klucz API co najmniej jednego dostawcy chmurowego (Ustawienia → Klucze API) — do pomiarów chmury
- [ ] Ustawienia → Tryb diagnostyczny włączony (czasy pod panelem głosowym)
- [ ] Ciche pomieszczenie; do części scenariuszy przewodowe lub Bluetooth słuchawki z mikrofonem

---

## 1. Słowa kluczowe przez głośnik i w słuchawkach

### 1.1 „Stop” przerywa odpowiedź czytaną przez głośnik

**Kroki:** tryb ciągły, pytanie o dłuższą odpowiedź („Opowiedz o historii Krakowa”); gdy asystent czyta, powiedz normalnym głosem „stop” z odległości ~40 cm.

**Oczekiwane:** czytanie urywa się w ciągu ~1 s, dymek odpowiedzi ma oznaczenie „przerwano”, stan wraca do „Słucham…”.
**Sygnał porażki:** asystent czyta dalej; trzeba powtarzać „stop” więcej niż 2 razy.

- [ ] Wynik 1.1 (iOS) · [ ] Wynik 1.1 (Android)

### 1.2 „Stop” w słuchawkach

**Kroki:** jak 1.1, ze słuchawkami z mikrofonem (przewodowe i Bluetooth, jeśli są).

**Oczekiwane:** jak 1.1; dźwięk odpowiedzi w słuchawkach, nie w głośniku.

- [ ] Wynik 1.2

### 1.3 Brak fałszywych „stop”

**Kroki:** w trakcie czytania odpowiedzi powiedz zdania bez słowa „stop”: „to mi się podoba”, „stoper leży na stole”, „bolą mnie stopy”, „autostop”.

**Oczekiwane:** odpowiedź czyta się dalej. (Znane ryzyko: „stoper”, „stopę” mogą zadziałać jak „stop” — zapisz, które).

- [ ] Wynik 1.3

### 1.4 Echo: głos asystenta nie jest brany za wypowiedź

**Kroki:** tryb ciągły, głośnik na pełnej głośności, odpowiedź zawierająca słowo „stop” (zapytaj: „Powiedz zdanie ze słowem stop”).

**Oczekiwane:** asystent nie przerywa sam siebie; po odpowiedzi nie pojawia się „Ty: …” z jego własnymi słowami.

- [ ] Wynik 1.4

### 1.5 „Odbiór” w trybie przerywanym

**Kroki:** tryb przerywany; powiedz zdanie, zrób 5 s przerwy, dokończ i zakończ „odbiór”. Powtórz 5 razy, raz w słuchawkach.

**Oczekiwane:** wysyłka dopiero po „odbiór” (co najmniej 4 z 5 razy), słowo „odbiór” nie trafia do historii; podczas pauzy podgląd „Ty: …” rośnie.

- [ ] Wynik 1.5

---

## 2. Opóźnienia względem celów (MV-VOICE-8)

Cele orientacyjne od końca wypowiedzi do pierwszego audio: **chmura < 3 s**, **lokalny 1–2B < 5 s**.
Odczytuj wiersz trybu diagnostycznego (STT · pierwszy token · pierwsze audio) dla 5 krótkich pytań;
zapisz medianę.

### 2.1 Model lokalny Qwen 2.5 1.5B

- [ ] Wynik 2.1 (iOS: mediana … s) · [ ] Wynik 2.1 (Android: mediana … s)

### 2.2 Model chmurowy (domyślny model dostawcy)

- [ ] Wynik 2.2 (dostawca …, mediana … s)

### 2.3 Długa rozmowa na modelu lokalnym

**Kroki:** w jednym temacie ~30 wymian (możesz pisać), potem 3 pytania głosem.

**Oczekiwane:** czas do pierwszego audio nie rośnie wyraźnie ponad 2.1 (kontekst jest streszczany); odpowiedź pamięta wcześniejsze ustalenia.

- [ ] Wynik 2.3

---

## 3. Przerwania audio

### 3.1 Połączenie telefoniczne w trakcie rozmowy głosowej

**Kroki:** sesja głosowa aktywna; zadzwoń na telefon z innego numeru, odbierz, rozłącz po 10 s.

**Oczekiwane:** sesja zatrzymuje się na czas połączenia (bez czytania w tle), po rozłączeniu da się ją wznowić przyciskiem; aplikacja nie zamyka się.

- [ ] Wynik 3.1 (iOS) · [ ] Wynik 3.1 (Android)

### 3.2 Inna aplikacja przejmuje dźwięk

**Kroki:** w trakcie sesji odtwórz film lub muzykę w innej aplikacji (przez powiadomienie / centrum sterowania), wróć.

**Oczekiwane:** sesja przerwana jak w 3.1; po powrocie mikrofon działa po ponownym włączeniu.

- [ ] Wynik 3.2

### 3.3 Odłączenie słuchawek i ekran

**Kroki:** w trakcie odpowiedzi odłącz słuchawki; osobno — zostaw sesję na 3 minuty bez dotykania ekranu.

**Oczekiwane:** odpowiedź nie leci nagle głośno w nieoczekiwane miejsce (albo jest przerwana); ekran nie gaśnie w trakcie sesji.

- [ ] Wynik 3.3

---

## 4. Modele 3B na urządzeniu referencyjnym

### 4.1 Ostrzeżenie „niezalecane” zgodne z pamięcią telefonu

**Kroki:** Menedżer modeli na telefonie z 4 GB i z 6+ GB RAM (jeśli są oba).

**Oczekiwane:** na 4 GB modele 3B mają oznaczenie „niezalecane” i pytanie przed pobraniem; na 6+ GB bez oznaczenia.

- [ ] Wynik 4.1

### 4.2 Rozmowa na modelu 3B

**Kroki:** temat z modelem 3B (przycisk „Model: …”), 5 pytań głosem.

**Oczekiwane:** aplikacja nie zamyka się (brak braku pamięci), odpowiedzi po polsku; zapisz medianę czasu do pierwszego audio: … s.

- [ ] Wynik 4.2

---

## 5. Podsumowania i polecenia na prawdziwych modelach

### 5.1 Podsumowanie długiej rozmowy modelem lokalnym

**Kroki:** temat z ~30 wymianami (2.3) → Podsumuj → „Lista zadań”.

**Oczekiwane:** podsumowanie obejmuje ustalenia z początku i z końca rozmowy; generowanie da się przerwać.

- [ ] Wynik 5.1

### 5.2 Polecenia głosowe

**Kroki:** „nowy temat zakupy”, „przełącz na temat zakupy” (przy dwóch podobnych tematach — odpowiedz na dopytanie), „jakie mam tematy”, „podsumuj rozmowę”; na modelu chmurowym także nietypowo: „wróćmy do rozmowy o zakupach”.

**Oczekiwane:** polecenia działają głosem; nietypowe sformułowanie na modelu chmurowym przełącza temat (function calling), na lokalnym trafia do modelu jako pytanie.

- [ ] Wynik 5.2
