# ralph/SPEC_INDEX.md — Indeks dokumentacji

## Statystyki

- **Plików w spec/**: 4 (w tym 2 niewypełnione szablony)
- **Łącznie linii**: 236 (APP_FLOW.md 100, WYTYCZNE_TECHNICZNE.md 86, spec.md 22, ux_ui/LINKS.md 28)
- **Treść merytoryczna**: spec.md (22 linie) + 1 linia w WYTYCZNE_TECHNICZNE.md (integracje)
- **Data indeksowania**: 2026-10-13

---

## Dokumenty

### spec.md (22 linie)
Jedyny dokument merytoryczny: wizja aplikacji mobilnej MobiVoice do głosowych rozmów z LLM — tematy rozmów, tryby ciągły/przerywany, słowa kluczowe „odbiór"/„STOP", lokalne modele STT/TTS/LLM oraz klucze API do chmurowych LLM.

#### Sekcje:
| Linie | Sekcja | Kotwica | Opis |
|-------|--------|---------|------|
| 1-3 | Nazwa i cel | # MobiVoice | Aplikacja mobilna do rozmów z LLM; wynik: historia rozmowy + podsumowanie w formie wybranej przez usera |
| 5-9 | Platforma i tematy | ## Funkcjonalności i wymagania techniczne | Android/iOS; tworzenie tematów, wejście w temat, kontynuacja rozmowy |
| 10-11 | Nawigacja głosowa po tematach | 4. Przejście do tematów może być manualne lub używając polecenia do LLM przełączany jest temat | Przełączanie tematu ręcznie lub poleceniem głosowym; przegląd tematów poleceniem |
| 12-15 | Tryby konwersacji i słowa kluczowe | 6. Konwersacja powinna mieć dwa tryby - ciągły i przerywany | Tryb ciągły (3 s ciszy → wysyłka całej historii), przerywany („odbiór"), przerwanie TTS słowem „STOP" |
| 16-19 | Modele STT/TTS | 10. Używane modele to: | whisper.small (STT); Piper TTS z wyborem głosu pl_PL-darkzar-medium / pl_PL-gosia-medium |
| 21 | Lokalne LLM | 11. Model językowy LLM powinien być przez użytkownika do wyboru. | Pobierane na urządzenie: Qwen 2.5 (1.5B/3B), Llama 3.2 (1B/3B), Gemma 2 (2B) |
| 22 | Chmurowe LLM | 12. Oprócz modeli LLM hostowanych na telefonie jest możliwość podpięcia swojego klucza do API najbardziej popularnych firm takich jak OpenAI, Antropic czy Google lub Facebook. | Własny klucz API: OpenAI, Anthropic, Google, Facebook (Meta) |

#### Słowa kluczowe: mobile, Android, iOS, LLM, temat rozmowy, tryb ciągły, tryb przerywany, odbiór, STOP, whisper, Piper TTS, Qwen, Llama, Gemma, klucz API, podsumowanie

---

### WYTYCZNE_TECHNICZNE.md (86 linii)
Szablon odstępstw od domyślnych wytycznych technicznych. Prawie w całości niewypełniony — jedyna treść to lista integracji zewnętrznych (linia 44). Puste pola = defaulty z `ralph-guidelines/`.

#### Sekcje:
| Linie | Sekcja | Kotwica | Opis |
|-------|--------|---------|------|
| 1-18 | Instrukcja szablonu | # Wytyczne techniczne projektu | Jak wypełniać — puste pole oznacza default z guidelines |
| 20-30 | Stack — odstępstwa | ## Stack — odstępstwa od defaultów | Puste: język, framework, baza, ORM, test runner |
| 32-38 | Hosting i infrastruktura | ## Hosting i infrastruktura | Puste: środowisko, kontenery, CI/CD, sekrety, monitoring |
| 40-52 | Integracje zewnętrzne | ## Integracje zewnętrzne | „API do: OpenAI, Antropic, Google, Facebook"; szablon systemu niewypełniony |
| 54-66 | Wymagania niefunkcjonalne | ## Wymagania niefunkcjonalne (gdy odbiegają od defaultów) | Puste: wydajność, SLA, compliance, i18n, a11y, offline |
| 68-72 | Inne ograniczenia | ## Inne ograniczenia | Puste |
| 74-86 | Wymagania biznesowe — odsyłacz | ## Wymagania biznesowe i funkcjonalne | Wskazówka: wymagania biznesowe jako osobne pliki w spec/ |

#### Słowa kluczowe: stack, hosting, integracje, OpenAI, Anthropic, Google, Facebook, wymagania niefunkcjonalne, defaulty

---

### APP_FLOW.md (100 linii)
**Niewypełniony szablon** (marker `RALPH_APP_FLOW_TEMPLATE` w linii 1). Przykładowe kroki (rejestracja, projekty) NIE dotyczą MobiVoice — nie są źródłem wymagań.

#### Sekcje:
| Linie | Sekcja | Kotwica | Opis |
|-------|--------|---------|------|
| 1-13 | Marker + opis pliku | <!-- RALPH_APP_FLOW_TEMPLATE: usuń tę linię gdy zaczniesz wypełniać szablon --> | Cel pliku: scenariusze user→system, Krok = test e2e + nagranie |
| 16-24 | Zasady wypełniania | ## Zasady wypełniania | Reguły pisania Kroków, podścieżek, edge case'ów |
| 28-32 | Persony (przykład) | ## Persony (przykład — dostosuj do projektu lub usuń) | Przykładowe role Admin/User/Guest — szablon |
| 36-54 | Krok 1 (przykład) | ## Krok 1 — Rejestracja i pierwsze logowanie | Przykład szablonowy — nie dotyczy projektu |
| 58-81 | Krok 2 (przykład) | ## Krok 2 — Utworzenie pierwszego obiektu (projekt / dokument / cokolwiek) | Przykład szablonowy — nie dotyczy projektu |
| 85-91 | Krok 3 (placeholder) | ## Krok 3 — [Tytuł kolejnego procesu] | Pusty placeholder |
| 95-100 | Notatki dla Ralpha | ## Notatki dla Ralpha (czytaj jako AI) | Mapowanie Kroków na testy e2e i nagrania |

#### Słowa kluczowe: szablon, user flow, e2e, nagranie, persony

---

## Wytyczne UX/UI

`spec/ux_ui/` zawiera wyłącznie `LINKS.md` — **niewypełniony szablon rejestru linków** (marker `RALPH_UX_LINKS_TEMPLATE` w linii 1, 28 linii, jedyny wpis jest wykomentowanym przykładem). Brak mockupów plikowych i linkowych → brak tagów `(ui-*: ...)` do generowania; ekrany będą projektowane na podstawie wytycznych `react-native` i odpowiedzi na pytania.

| Id | Typ | Link | Opis |
|----|-----|------|------|

---

## Procesy

Nie wystawiono: `Nagrania: nie` w ralph/config.md, a `spec/APP_FLOW.md` ma marker `RALPH_APP_FLOW_TEMPLATE` (niewypełniony szablon).

---

## Ocena jakości dokumentacji

- **Kompletność**: ~20%
  - Wymagania funkcjonalne: zarys (12 punktów) — bez kryteriów akceptacji i bez opisu funkcji „podsumowanie" zapowiedzianej w celu
  - Niefunkcjonalne (wydajność/latencja, prywatność, wymagania sprzętowe, wsparcie OS): brak
  - Integracje zewnętrzne: tylko nazwy dostawców, bez modeli, limitów, obsługi błędów
  - Model danych: brak (temat, wiadomość, podsumowanie — do wywnioskowania)
  - Kryteria akceptacji, obsługa błędów, deployment/dystrybucja, testy: brak
  - UX/UI: brak mockupów i listy ekranów
- **Jednoznaczność**: niska — rozpoznawanie poleceń głosowych („przełącz temat", „pokaż tematy"), wykrywanie słów kluczowych podczas odtwarzania TTS, forma podsumowania, zarządzanie kontekstem przy małych modelach — wszystko do interpretacji
- **Spójność**: średnia — brak sprzeczności między dokumentami, ale wymaganie „cała historia chatu" koliduje z oknem kontekstu lokalnych modeli 1–3B; nazwa głosu Piper „pl_PL-darkzar-medium" nie odpowiada znanym głosom Piper (prawdopodobnie „pl_PL-darkman-medium")
- **Wielkość projektu**: średni/duży — mało ekranów, ale wysoka złożoność techniczna: on-device STT (whisper.cpp), TTS (Piper/ONNX), LLM (llama.cpp/GGUF), VAD, detekcja słów kluczowych z barge-in, 4 dostawców chmurowych, 2 platformy natywne
- **Luki tematyczne**:
  - Funkcja podsumowania rozmowy (forma, wyzwalanie, eksport)
  - Mechanizm rozpoznawania poleceń głosowych (intencje vs gramatyka)
  - Echo/barge-in — nasłuchiwanie „STOP" w trakcie odtwarzania TTS
  - Zarządzanie kontekstem rozmowy dla małych modeli
  - Pobieranie i zarządzanie modelami (źródło, kwantyzacja, miejsce, Wi-Fi)
  - Wymagania sprzętowe i minimalne wersje iOS/Android
  - Przechowywanie danych, prywatność, bezpieczeństwo kluczy API
  - Lista ekranów / UX, język interfejsu
  - Praca w tle / przy zablokowanym ekranie
  - Dystrybucja (sklepy vs wewnętrznie) i licencje modeli
  - Strategia testów dla potoku audio
- **Rekomendacja**: spec wystarczy do startu tylko po rozstrzygnięciu pytań z ralph/QUESTIONS.md (szczególnie stack natywnych silników, podsumowania i barge-in) — bez tego plan oprze się na zbyt wielu domysłach.

<!-- RALPH_SPEC_CHECKSUMS (generowane przez ralph-start.sh — nie edytuj)
1320014640 5363 spec/APP_FLOW.md
3429089938 4048 spec/WYTYCZNE_TECHNICZNE.md
2012822040 1972 spec/spec.md
-->
