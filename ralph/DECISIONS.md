# DECISIONS.md — Changelog ustaleń z trybu interaktywnego

<!--
Plik tworzony i uzupełniany automatycznie przez Claude w trybie interaktywnym
(po RALPH COMPLETE / RALPH BLOCKED, gdy user prowadzi rozmowę manualnie).

Każda wymiana user↔Claude w tym trybie = jeden wpis poniżej.
Format wpisu (sekcja 10 w templates/RALPH_INSTRUCTIONS.md):

## YYYY-MM-DD HH:MM — [krótki temat]
**Rodzaj**: błąd | korekta | rozwój | pytanie | operacje
**Źródło błędu**: [tylko przy błędzie: zadanie X.Y, które to zbudowało | nieznane]
**Wykryte przez**: [tylko przy błędzie: test | scenariusz | review | ralph | właściciel | produkcja]
**Pytanie/kontekst**: [parafraza co user pytał, 1-2 zdania]
**Ustalenie**: [esencja decyzji/wyjaśnienia, 2-4 zdania, bez kodu]
**Wpływ** (opcjonalnie): [zadanie X.Y / plik / faza]

Plik jest WRITE-ONLY — Ralph go nie czyta w żadnym innym procesie.
To changelog dla człowieka, żeby pamiętać "co i dlaczego ustaliliśmy w trakcie".
-->


## 2026-10-13 18:32 — Wydanie wersji v0.1.0
**Rodzaj**: operacje
**Pytanie/kontekst**: User zatwierdził propozycję wydania po Fazie 1 i polecił kontynuować pracę.
**Ustalenie**: Utworzono wersję v0.1.0 (commit 9abf426) — fundament aplikacji: start na iOS 16.4+/Android 10, lokalna baza, ekrany-szkielety, polski UI, motyw za systemem. Scenariusze testerów w docs/test-scenarios/v0.1.0.md, migawka Specky 01M4V1NPKW6SJPW042NE9J52SG, tag wypchnięty do origin.
**Wpływ**: Faza 1; dalej zadanie 2.1.

## 2026-10-14 09:20 — Wersja v0.2.0 odłożona, start Fazy 3
**Rodzaj**: operacje
**Pytanie/kontekst**: Po Fazie 2 zaproponowano wydanie v0.2.0 (czat tekstowy). User odpowiedział „nie wydawaj, realizuj kolejną fazę według propozycji".
**Ustalenie**: Wersja v0.2.0 nie powstaje; propozycja wraca po następnej fazie. Faza 3 startuje od sprawdzenia bibliotek z propozycji — obie odpadły (brak AEC na Androidzie, VAD-zaślepka i brak KWS), więc zgodnie z intencją propozycji (systemowe AEC, sherpa-onnx) wybrano własny moduł natywny i oficjalne sherpa-onnx; decyzja czeka na akceptację w Specky.
**Wpływ**: Faza 3, zadania 3.1–3.4; Faza 4 (KWS).
