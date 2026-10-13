# MobiVoice

## Aplikacja mobilna do konwersacji z modelem LLM. Wynikiem konwersacji będzie historia rozmowy oraz podsumowanie w określonej przez użytownika formie

## Funkcjonalności i wymagania techniczne

1. Aplikacja mobilna Android/iOS
2. Można tworzyć nowe tematy rozmowy
3. Można wejść do dowolnego tematu i kontynuować rozmowę
4. Przejście do tematów może być manualne lub używając polecenia do LLM przełączany jest temat
5. Możliwy jest przegląd obecnych tematów poleceniem do LLM
6. Konwersacja powinna mieć dwa tryby - ciągły i przerywany
7. Tryb ciągły - użytkownik wypowiada się, jest przerwa powiedzmy 3 sekund. Po tym czasie wysyłany jest cała historia chatu do LLM. Odpowiedź jest przekazywana w formie pisemnej i słownej
8. Tryb przerywany - Użytkownik wypowiada się, jeżeli uzna, że skończył, mówi odbiór. Odbiór jest to słowo kluczowe, które aktywuje model LLM, gdzie przekazywany jest kontekst rozmowy. LLM odpowiada i tak jak w trybie ciągłym przekazywana jest odpowiedź w formie pisemnej i słownej.
9. W momencie kiedy przekazywana jest odpowiedź w formie ustnej, użytkownik może przerwać ją wypowiadając słowo STOP. I tak jak w przypadku słowa kluczowego odbiór, tak w tym przypadku słowo STOP zatrzymuje wypowiedź i przechodzi w tryb nasłuchiwania na użytkownika.
10. Używane modele to:

- whisper.small
- Piper TTS (dać użytkownikowi wybór: pl_PL-darkzar-medium czy pl_PL-gosia-medium)

11. Model językowy LLM powinien być przez użytkownika do wyboru. Będzie miał albo możliwość wyboru lokalnego, który pobierze na urządzenie i na pewno w tej liście będzie Qwen 2.5, 1.5B lub 3B parametrów. Drugim będzie Llama 3.2, wersja 1B i 3B parametrów. Trzeci rodzina to Gemma 2, 2B parametrów.
12. Oprócz modeli LLM hostowanych na telefonie jest możliwość podpięcia swojego klucza do API najbardziej popularnych firm takich jak OpenAI, Antropic czy Google lub Facebook.
