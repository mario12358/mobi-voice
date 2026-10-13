# PROJECT_CONTEXT.md

Ten plik przechowuje kontekst projektu który przetrwa `/compact`.

## Stack technologiczny

- Język: [np. Python 3.11]
- Framework: [np. FastAPI]
- Baza danych: [np. PostgreSQL]
- Testy: [np. pytest]

## Architektura

[Krótki opis struktury projektu]

## Kluczowe decyzje

<!-- Tabela rośnie z każdą sesją, a plik trafia w całości do promptu startowego, więc         -->
<!-- ralph-start.sh trzyma w niej 40 ostatnich wierszy — starsze idą do ralph/CONTEXT_ARCHIVE.md -->
<!-- (write-only). Decyzję wciąż OBOWIĄZUJĄCĄ — taką, której złamanie zepsułoby projekt —     -->
<!-- oznacz 📌 w kolumnie Decyzja: wiersz z 📌 nie podlega rotacji nigdy.                      -->

| Data | Decyzja | Powód |
|------|---------|-------|
| | | |

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
| | |

## Zależności między komponentami

[Opis jak komponenty ze sobą współpracują]

## Aktualny stan

<!-- STAN BIEŻĄCY — NADPISUJ. To ma być odpowiedź na „gdzie jesteśmy DZIŚ", a nie kronika  -->
<!-- tur: historia realizacji ma własne miejsce w REPORT.md i tam się rotuje, a tutaj nie  -->
<!-- rotuje się nic. Dopisywanie kolejnych akapitów „tura z 19.08 domknięta" zamienia tę   -->
<!-- sekcję w drugi, nieograniczony raport w prompcie każdej sesji.                        -->

- Ostatnie ukończone zadanie: [numer/nazwa]
- Następne zadanie: [numer/nazwa]
- Blokery: [jeśli są]
