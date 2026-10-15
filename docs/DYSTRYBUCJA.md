# Dystrybucja wewnętrzna MobiVoice

Co jest gotowe w repozytorium i czego potrzeba od właściciela kont, żeby testerzy dostali aplikację.

## Gotowe

- **Android — APK dla testerów**: workflow `internal-build` (Actions → internal-build → Run workflow,
  albo tag `v*`) buduje release APK na arm64 i zostawia go jako artefakt `mobivoice-android`
  (30 dni). APK instaluje się na Androidzie 10+ po zezwoleniu na instalację z nieznanych źródeł.
  Podpis kluczem debug z szablonu Expo — wystarcza do testów wewnętrznych, nie do Google Play.
- **iOS — kompilacja release**: ten sam workflow kompiluje wydanie na urządzenie (bez podpisu) — dowód,
  że wydanie się buduje. Podpisany build do TestFlight robi EAS (niżej).
- **EAS (`eas.json`)**: profile `development` (dev client), `preview` (instalacja wewnętrzna: APK,
  iOS ad hoc) i `testflight` (build sklepowy z automatycznym numerem builda).
- **Uprawnienia**: iOS `NSMicrophoneUsageDescription` po polsku (app.json); Android `RECORD_AUDIO`
  z pytaniem przy pierwszym włączeniu rozmowy głosowej.

## Do zrobienia przez właściciela kont

1. **Raporty awarii (opcjonalnie)** — projekt w Sentry (platforma React Native), jego DSN jako sekret
   repozytorium `SENTRY_DSN` (Settings → Secrets → Actions) i zmienna `EXPO_PUBLIC_SENTRY_DSN`
   w środowisku EAS. Bez DSN aplikacja nie uruchamia raportów nawet po zgodzie użytkownika.
2. **Firebase App Distribution (opcjonalnie, Android)** — projekt Firebase z aplikacją Android
   `app.mobivoice`, grupa testerów `testerzy`, sekrety `FIREBASE_APP_ID` i `FIREBASE_SERVICE_ACCOUNT`
   (JSON konta usługi z rolą Firebase App Distribution Admin). Z nimi workflow sam wyśle APK testerom.
3. **TestFlight (iOS)** — konto Apple Developer, potem lokalnie:
   ```
   npx eas-cli login
   npx eas-cli init                 # dopisze projectId do app.json
   npx eas-cli build -p ios --profile testflight
   npx eas-cli submit -p ios --profile testflight
   ```
   Przy pierwszym buildzie EAS założy certyfikat i profil (logowanie do Apple ID).
4. **Licencje przed dystrybucją poza zespołem** — dane wymowy eSpeak NG (głosy Piper) są na licencji
   GPL-3.0-or-later; wewnętrzne testy nie są dystrybucją publiczną, ale przed sklepem decyzja należy
   do właściciela (ekran Licencje w aplikacji wymienia wszystkie składniki).
