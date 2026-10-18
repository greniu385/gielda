# 💱 Giełda Walut

Aplikacja internetowa **do przeglądarki na komputerze**, napisana w **React Native (Expo + react-native-web)**,
do handlu walutami na **symulowanym rynku**.
Użytkownik zakłada konto (**Firebase Authentication**), dostaje 10 000 zł wirtualnych
środków i kupuje / sprzedaje waluty, których kursy zmieniają się na żywo.
Portfel i historia transakcji zapisują się w chmurze (**Cloud Firestore**).
Aplikacja ma **tryb nocny i jasny** przełączany jednym przyciskiem.

---

## ✨ Funkcje

**Konto użytkownika**
- rejestracja (imię/nick, e-mail, hasło z miernikiem siły, powtórzenie hasła),
- logowanie, wylogowanie, reset hasła e-mailem,
- walidacja formularzy i komunikaty błędów Firebase po polsku,
- sesja zapamiętywana po zamknięciu aplikacji.

**Giełda**
- 8 walut: USD, EUR, GBP, CHF, JPY, CAD, NOK, CZK (kursy w PLN),
- kupno po kursie *ask* i sprzedaż po kursie *bid* (spread jak w kantorze),
- kwota w walucie albo w złotówkach, szybkie przyciski 25% / 50% / 75% / MAX,
- blokada zakupu ponad saldo i sprzedaży ponad stan,
- transakcje Firestore — saldo i historia zapisują się razem albo wcale.

**Symulacja rynku**
- kursy zmieniają się co tick (domyślnie co 1,5 s),
- start z aktualnych kursów **NBP** (gdy brak internetu — kursy wbudowane),
- losowe **wiadomości rynkowe** (np. „Fed podnosi stopy”), które poruszają kursami,
- ustawienia: prędkość (wolno / normalnie / szybko), zmienność (spokojny / normalny / burzliwy), pauza, nowa sesja.

**Portfel i historia**
- łączna wartość portfela, zysk/strata względem startu,
- zysk zrealizowany i bieżący, średni kurs zakupu każdej waluty,
- wykres struktury portfela, lista aktywów,
- historia transakcji z filtrem kupno / sprzedaż.

**Wygląd**
- układ pod komputer: boczne menu, tabele kursów i transakcji, kilka kolumn na szerokim ekranie,
  efekty po najechaniu myszką, tytuły kart w przeglądarce,
- ciemny i jasny motyw — przełącznik „Ciemny | Jasny” w nagłówku każdej strony (oraz w Profilu),
- wybór motywu jest zapamiętywany,
- wykresy kursów (SVG), gradienty, animacje, powiadomienia,
- w węższym oknie (lub na telefonie) układ automatycznie przechodzi w jedną kolumnę z dolnym menu.

---

## 🚀 Uruchomienie

Wymagania: [Node.js](https://nodejs.org) 22.13+ (lub 24) i dowolna przeglądarka (Chrome, Edge, Firefox).

```bash
npm install
cp .env.example .env      # potem uzupełnij .env — patrz niżej
npm start                 # uruchamia stronę w przeglądarce
```

Aplikacja otworzy się pod adresem **http://localhost:8081**. Zmiany w kodzie
widać od razu po zapisaniu pliku.

> Bez uzupełnionego pliku `.env` aplikacja pokaże ekran „Konfiguracja” z instrukcją.

<details>
<summary>Dodatkowo: uruchomienie na telefonie</summary>

Ten sam kod działa też jako aplikacja mobilna: `npx expo start`, a potem zeskanuj kod QR
w aplikacji **Expo Go** ([Android](https://play.google.com/store/apps/details?id=host.exp.exponent) /
[iOS](https://apps.apple.com/app/expo-go/id982107779)).
</details>

---

## 🔥 Podłączenie Firebase (ok. 5 minut)

1. Wejdź na <https://console.firebase.google.com> → **Dodaj projekt** (Google Analytics można wyłączyć).
2. **Authentication** → *Rozpocznij* → zakładka **Sign-in method** → włącz **E-mail/hasło**.
3. **Firestore Database** → *Utwórz bazę danych* → wybierz lokalizację (np. `eur3`) → tryb produkcyjny.
4. W Firestore przejdź do zakładki **Reguły**, wklej zawartość pliku [`firestore.rules`](firestore.rules) i kliknij **Opublikuj**.
5. **Ustawienia projektu** (⚙️) → sekcja *Twoje aplikacje* → ikona **`</>`** (Web) → zarejestruj aplikację.
   Firebase pokaże obiekt `firebaseConfig`.
6. Przepisz wartości z `firebaseConfig` do pliku `.env`:

   | `firebaseConfig`    | `.env`                                     |
   |---------------------|--------------------------------------------|
   | `apiKey`            | `EXPO_PUBLIC_FIREBASE_API_KEY`             |
   | `authDomain`        | `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`         |
   | `projectId`         | `EXPO_PUBLIC_FIREBASE_PROJECT_ID`          |
   | `storageBucket`     | `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`      |
   | `messagingSenderId` | `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` |
   | `appId`             | `EXPO_PUBLIC_FIREBASE_APP_ID`              |

7. Uruchom aplikację ponownie z czyszczeniem pamięci podręcznej: `npx expo start --web -c`.

Po rejestracji pierwszego użytkownika zobaczysz go w **Authentication → Users**,
a jego portfel w **Firestore → users**.

> Plik `.env` jest w `.gitignore`, więc dane projektu nie trafią do repozytorium.
> Reguły można też wgrać z terminala: `npx firebase-tools deploy --only firestore:rules --project <id-projektu>`.

### Struktura bazy danych

```
users/{uid}
  displayName, email, createdAt
  balances:   { PLN: 7072.92, USD: 250, EUR: 480.08 }
  avgPrices:  { USD: 3.69, EUR: 4.166 }        ← średni kurs zakupu
  realizedPnl, tradesCount, startingBalance

users/{uid}/transactions/{id}
  type: "buy" | "sell", code, amount, rate, total, pnl, createdAt
```

Reguły bezpieczeństwa pozwalają każdemu użytkownikowi czytać i zapisywać wyłącznie własne dane.

---

## 🌍 Publikacja strony w internecie (opcjonalnie)

Gotową stronę można opublikować za darmo w **Firebase Hosting** (ten sam projekt Firebase):

```bash
npm run build:web                                   # tworzy folder dist/ ze stroną
npx firebase-tools login                            # logowanie kontem Google
npx firebase-tools deploy --only hosting --project <id-projektu>
```

Strona będzie dostępna pod adresem `https://<id-projektu>.web.app` — wystarczy wysłać link
nauczycielowi. Konfiguracja hostingu jest już w pliku [`firebase.json`](firebase.json).

---

## 📈 Jak działa symulacja rynku

Plik [`src/simulation/marketEngine.js`](src/simulation/marketEngine.js). W każdym ticku kurs zmienia się według wzoru:

```
nowy_kurs = kurs × exp(trend + powrót_do_średniej + szum + wiadomości)
```

| Składnik            | Znaczenie |
|---------------------|-----------|
| **szum**            | losowe wahania z rozkładu normalnego (metoda Boxa-Mullera), siła zależna od zmienności waluty |
| **trend**           | tendencja wzrostowa/spadkowa, która co jakiś czas losowo się zmienia (hossa/bessa) |
| **powrót do średniej** | kurs jest delikatnie przyciągany do kursu bazowego (NBP), więc nie „ucieka” w nieskończoność |
| **wiadomości**      | losowe wydarzenia (stopy procentowe, ropa, rating Polski…) — 60% efektu od razu, reszta wygasa w kolejnych tickach |

Kurs kupna = kurs średni × (1 + spread/2), kurs sprzedaży = kurs średni × (1 − spread/2).
Silnik to czyste funkcje bez efektów ubocznych, dlatego jest pokryty testami.

---

## 🗂️ Struktura projektu

```
src/
├── app/                      ← ekrany (Expo Router, routing plikowy)
│   ├── _layout.js            ← providery + ochrona tras (Stack.Protected)
│   ├── setup.js              ← instrukcja, gdy brak konfiguracji Firebase
│   ├── (auth)/               ← login, register, forgot-password
│   └── (app)/                ← tylko dla zalogowanych (+ boczne menu)
│       ├── (tabs)/           ← Rynek, Portfel, Historia, Profil
│       └── currency/[code].js← wykres + kupno/sprzedaż waluty
├── components/               ← boczne menu, przyciski, pola, wykresy, tabele, dialogi…
├── config/firebase.js        ← inicjalizacja Firebase (dane z .env)
├── context/                  ← stan globalny: Auth, Market, Portfolio
├── hooks/useResponsive.js    ← układ zależny od szerokości okna
├── logic/trading.js          ← obliczenia portfela i transakcji
├── services/                 ← Firebase Auth, Firestore, API NBP
├── simulation/               ← silnik rynku, waluty, wiadomości
├── theme/                    ← kolory trybu ciemnego/jasnego + ThemeContext
└── utils/                    ← formatowanie liczb, walidacja
tests/                        ← testy jednostkowe (node:test)
firestore.rules               ← reguły bezpieczeństwa bazy
```

## 🛠️ Technologie

Expo SDK 58 · React Native 0.88 + react-native-web · Expo Router · Firebase 13 (Auth + Firestore) ·
react-native-svg · expo-linear-gradient · AsyncStorage · API NBP

## ✅ Testy i jakość kodu

```bash
npm test        # testy silnika rynku i logiki portfela
npm run lint    # ESLint
```

### Testowanie bez prawdziwego projektu Firebase (opcjonalnie)

Można użyć lokalnych emulatorów Firebase (wymagana Java 11+):

```bash
npx firebase-tools emulators:start --only auth,firestore --project demo-gielda
```

i w pliku `.env` ustawić dowolne wartości `EXPO_PUBLIC_FIREBASE_*` (np. `PROJECT_ID=demo-gielda`) oraz:

```
EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true
EXPO_PUBLIC_FIREBASE_EMULATOR_HOST=localhost
```

---

*Projekt edukacyjny — wszystkie środki są wirtualne, a kursy (poza startowymi z NBP) są symulowane.*
