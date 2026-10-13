# ralph/SPECKY.md — synchronizacja ze Specky

- **Projekt**: 01M4TJBZFPYV3AFM4CN0P3HNQ1 (MobiVoice)
- **Kursor since_seq**: 810
- **Ostatnia synchronizacja**: 2026-10-13 (sesja implementacji: 0 pozycji w kolejce, 33 wymagania to_build) — wcześniej: zaproponowano wsad 33 wymagań (batch 01M4TP4PE3J84T7AGZAX2R73BZ), zaakceptowane 2026-10-13 (33/33); kotwice dopisane w PLAN.md
- **Przegląd wsadu**: https://app.specky.app/projects/01M4TJBZFPYV3AFM4CN0P3HNQ1?batch=01M4TP4PE3J84T7AGZAX2R73BZ

## Mapa wymagań → zadania

<!-- Kolumna Zadania = zadania z kotwicą `- Specky: (req: …)` w PLAN.md. Nowe/zmienione wymagania     -->
<!-- dochodzą przez synchronizację (18.1) i kotwice zadań (18.2).                                      -->

| Wymaganie | Wersja @hash7 | Zadania | Uwagi |
|-----------|---------------|---------|-------|
| 01M4TPSAN97DVJH98SGHWK0JB5 (MV-PLAT-1) | v1.0 @4c3b1e3 | 1.2, 9.2 | platforma iOS/Android, Expo |
| 01M4TPSAWRTTG99VMV7T9TC89Y (MV-PLAT-2) | v1.0 @c05a0d4 | 1.1 | bez backendu i kont |
| 01M4TPSB35CE08M2G3KTB8CBV8 (MV-DATA-1) | v1.0 @fad5a6a | 1.3, 1.4 | SQLite + migracje |
| 01M4TPSBA2GXAHZ7W4734NBAEC (MV-TOP-1) | v1.0 @6f3590a | 1.7, 2.6 | tworzenie/kontynuacja tematu |
| 01M4TPSBGVNJP0KXVH4T0EJH2C (MV-TOP-2) | v1.0 @e538957 | 2.6 | lista, wyszukiwanie, nazwa, usuwanie |
| 01M4TPSBMNDK44C94VSYQGXZSZ (MV-TOP-3) | v1.0 @fa3165a | 2.8 | automatyczny tytuł |
| 01M4TPSBQ1QA9Z56Q3AQX604VT (MV-CHAT-1) | v1.0 @0a469e7 | 2.7, 3.5, 3.6 | odpowiedź pisemna + głosowa |
| 01M4TPSBSFSQB42EM1EPJXWZAB (MV-CHAT-2) | v1.0 @f2ad1a6 | 2.4 | budżet kontekstu (S1) |
| 01M4TPSBVARMFASRVTYM6ERQB3 (MV-CHAT-3) | v1.0 @9adb713 | 2.7, 3.1 | wejście tekstowe |
| 01M4TPSBXRAA4FKEE3X2EG9P27 (MV-CHAT-4) | v1.0 @61d158e | 2.9 | prompt systemowy |
| 01M4TPSBZZJG8NWC1W3NMD6C9W (MV-VOICE-1) | v1.0 @87b9583 | 3.2, 3.6 | tryb ciągły |
| 01M4TPSC2EFRVGNM2PKQFX8K6T (MV-VOICE-2) | v1.0 @f83d3f9 | 4.1, 4.2 | tryb przerywany „odbiór" |
| 01M4TPSC52ZQ05FHN0CAWF2MYX (MV-VOICE-3) | v1.0 @4eb389f | 4.3, 4.4 | STOP |
| 01M4TPSC7RSRB8XX9FM7EHZSXS (MV-VOICE-4) | v1.0 @990c4e5 | 3.7 | przełącznik trybu, wskaźnik stanu |
| 01M4TPSC9XQS0B0N608Z41T867 (MV-VOICE-5) | v1.0 @efdc982 | 3.3 | whisper small/base, PL |
| 01M4TPSCBZ4Q3DS9SXE5RGS8DA (MV-VOICE-6) | v1.0 @ee2f323 | 3.4, 5.4 | Piper darkman/gosia |
| 01M4TPSCEP4B390R81AQSKZWEX (MV-VOICE-7) | v1.0 @c8b0845 | 3.1 | mikrofon, AEC, przerwania audio |
| 01M4TPSCJAAVY8EMNC2X7SAZ3Y (MV-VOICE-8) | v1.0 @32b1379 | 3.8, 9.3 | opóźnienia, tryb diagnostyczny |
| 01M4TPSCN9WC02W8F3WJEFP4FF (MV-MOD-1) | v1.0 @8cd370f | 2.1, 2.3 | lista 5 modeli lokalnych |
| 01M4TPSCQHCPGKAQAJ8E6QGB2M (MV-MOD-2) | v1.0 @aeb1edd | 2.2, 5.2 | menedżer modeli, pobieranie |
| 01M4TPSCT6VW2MN48Y3MP3WBXC (MV-MOD-3) | v1.0 @aab204b | 5.3 | kreator pierwszego uruchomienia |
| 01M4TPSCXEM39JMQZK36SNGGPN (MV-MOD-4) | v1.0 @10581f5 | 5.1, 5.2 | RAM → „niezalecane" |
| 01M4TPSCZHV54NDW1AVW7EMMWZ (MV-MOD-5) | v1.0 @b9ecbc6 | 5.5 | model globalny + per temat |
| 01M4TPSD35MNH049EAZG93F7GG (MV-CLOUD-1) | v1.0 @6affb18 | 6.2, 6.3, 6.4, 6.5, 6.6, 6.7 | 4 dostawców, klucze |
| 01M4TPSD5ZN6JEWY5Q25XPBFH1 (MV-CLOUD-2) | v1.0 @dd8d9cc | 6.1 | timeout, ponowienia, komunikaty |
| 01M4TPSD8Z5ZMZVRA1HNQPSQ6H (MV-CMD-1) | v1.0 @c878c58 | 7.1, 7.2, 7.3 | polecenia głosowe tematów |
| 01M4TPSDBF9Y2BDFX8X4Q6AEZY (MV-SUM-1) | v1.0 @bc832e9 | 8.1, 8.2, 8.3, 8.5 | podsumowania |
| 01M4TPSDDANXP2VV3MH759N7PA (MV-SUM-2) | v1.0 @ba61374 | 8.4 | eksport tematu |
| 01M4TPSDF9ATEYND8AHKATHQM2 (MV-SEC-1) | v1.0 @4019d77 | 1.5, 6.1 | klucze w Keychain/Keystore |
| 01M4TPSDHTZC5AEGMSK9NKR4X2 (MV-SEC-2) | v1.0 @580efcb | 5.4, 9.1 | prywatność, raporty awarii opt-in |
| 01M4TPSDM116PMW5YJJ4B6A34X (MV-UI-1) | v1.0 @178a85c | 1.7 | język PL, motyw |
| 01M4TPSDPBEDTZZQQMS63N2YES (MV-UI-2) | v1.0 @5f3694f | 5.4 | ekran licencji |
| 01M4TPSDRNSQRH4K99TGP5FCHK (MV-OOS-1) | out_of_scope | poza zakresem MVP | out_of_scope, bez zadań |
