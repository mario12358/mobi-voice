# Mapa powierzchni ataku

<!-- Deklaracja intencji: kto ma dostęp do czego. Kontrola `intencja` porównuje z nią kod przy     -->
<!-- każdym commicie, kontrola `red-team` — testy na koniec fazy. Plik pisze Ralph (nowa trasa =    -->
<!-- nowy wiersz w tym samym commicie), człowiek widzi zmiany w propozycji wydania i w diffie PR.  -->
<!-- Nie idzie do prompta startowego.                                                               -->

- **Sesja**: nagłówek
  <!-- MobiVoice nie ma backendu ani tras HTTP (A1, A2, A7): aplikacja mobilna bez kont i sesji.   -->
  <!-- Klucze API dostawców LLM idą w nagłówkach żądań wychodzących (Bearer / x-api-key).          -->

## Role

| Rola | Kto | Strażnik w kodzie |
|---|---|---|
| anonim | bez sesji | — |
| właściciel urządzenia | jedyny użytkownik aplikacji (brak kont — A2) | (globalny) — dostęp do urządzenia/aplikacji, brak uwierzytelniania w kodzie |

## Granice własności

| Zasób | Kto może | Granica |
|---|---|---|
| Tematy, wiadomości, podsumowania (SQLite) | właściciel urządzenia | dane tylko w sandboxie aplikacji; eksport wyłącznie akcją usera (Udostępnij) |
| Klucze API dostawców | właściciel urządzenia | tylko Keychain/Keystore (SecretStore); nigdy w SQLite, logach, eksporcie ani raportach awarii |
| Treść rozmowy wysyłana do chmury | właściciel urządzenia | wyłącznie do dostawcy wybranego dla tematu; nigdy do innych hostów (raporty awarii bez treści) |

## Trasy

<!-- Brak tras HTTP — aplikacja nie wystawia serwera. -->

| Trasa | Role | Własność | Plik |
|---|---|---|---|

## Wyjścia

| Rodzaj | Wartość | Po co |
|---|---|---|
| host | api.openai.com | adapter OpenAI (6.2) — klucz usera |
| host | api.anthropic.com | adapter Anthropic (6.3) — klucz usera |
| host | generativelanguage.googleapis.com | adapter Google Gemini (6.4) — klucz usera |
| host | api.llama.com | adapter Meta Llama API (6.5) — klucz usera |
| host | huggingface.co | pobieranie modeli GGUF, whisper i głosów Piper (2.2) |
| host | sentry.io | raporty awarii opt-in, bez treści rozmów i kluczy (9.1) |
