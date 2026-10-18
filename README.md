# 💱 Giełda Walut

Aplikacja internetowa **do przeglądarki na komputerze**, napisana w **React Native (Expo + react-native-web)**,
do handlu walutami na **symulowanym rynku**.
Użytkownik zakłada konto, dostaje 10 000 zł wirtualnych środków i kupuje / sprzedaje waluty,
których kursy zmieniają się na żywo. Konta, portfele i historia transakcji są zapisywane
w **lokalnej bazie danych SQLite**, którą obsługuje własny serwer w **Node.js (Express)**.
Aplikacja ma **tryb nocny i jasny** przełączany jednym przyciskiem.

---

## ✨ Funkcje

**Konto użytkownika**
- rejestracja (imię/nick, e-mail, hasło z miernikiem siły, powtórzenie hasła),
- logowanie, wylogowanie, zmiana hasła w Profilu,
- hasła zapisane w bazie wyłącznie jako hash (scrypt + losowa sól),
- walidacja formularzy w aplikacji i na serwerze, komunikaty błędów po polsku,
- sesja zapamiętywana po zamknięciu przeglądarki (token, ważny 30 dni).

**Giełda**
- 8 walut: USD, EUR, GBP, CHF, JPY, CAD, NOK, CZK (kursy w PLN),
- kupno po kursie *ask* i sprzedaż po kursie *bid* (spread jak w kantorze),
- kwota w walucie albo w złotówkach, szybkie przyciski 25% / 50% / 75% / MAX,
- serwer sprawdza saldo i blokuje zakup ponad stan konta oraz sprzedaż ponad posiadaną ilość,
- transakcje SQL — saldo i historia zapisują się razem albo wcale.

**Symulacja rynku**
- kursy zmieniają się co tick (domyślnie co 1,5 s),
- start z aktualnych kursów **NBP** (gdy brak internetu — kursy wbudowane),
- losowe **wiadomości rynkowe** (np. „Fed podnosi stopy”), które poruszają kursami,
- ustawienia: prędkość (wolno / normalnie / szybko), zmienność (spokojny / normalny / burzliwy), pauza, nowa sesja.

**Portfel i historia**
- łączna wartość portfela, zysk/strata względem startu,
- zysk zrealizowany i bieżący, średni kurs zakupu każdej waluty,
- wykres struktury portfela, tabela aktywów,
- historia transakcji z filtrem kupno / sprzedaż.

**Wygląd**
- układ pod komputer: boczne menu, tabele kursów i transakcji, kilka kolumn na szerokim ekranie,
  efekty po najechaniu myszką, tytuły kart w przeglądarce,
- ciemny i jasny motyw — przełącznik „Ciemny | Jasny” w nagłówku każdej strony (oraz w Profilu),
- wybór motywu jest zapamiętywany,
- wykresy kursów (SVG), gradienty, animacje, powiadomienia,
- w węższym oknie układ automatycznie przechodzi w jedną kolumnę z dolnym menu.

---

## 🚀 Uruchomienie

Wymagania: [Node.js](https://nodejs.org) **22.13+** (lub 24) i dowolna przeglądarka (Chrome, Edge, Firefox).
Bazy danych nie trzeba instalować — SQLite jest wbudowane w Node.js.

```bash
npm install
npm start
```

`npm start` uruchamia jednocześnie:
- **serwer z bazą danych** — http://localhost:4000 (API),
- **stronę** — **http://localhost:8081** ← to otwórz w przeglądarce.

Przy pierwszym uruchomieniu serwer sam utworzy plik bazy `server/data/gielda.db` ze wszystkimi tabelami.
Konto można od razu założyć na ekranie rejestracji albo dodać konto demonstracyjne:

```bash
npm run db:seed          # e-mail: demo@gielda.pl, hasło: demo123
```

> Jeśli serwer nie działa, aplikacja pokaże ekran „Brak połączenia” z instrukcją i przyciskiem „Spróbuj ponownie”.

### Wersja do prezentacji (jeden adres)

```bash
npm run preview
```

Buduje gotową stronę i uruchamia serwer, który udostępnia ją razem z API pod jednym adresem:
**http://localhost:4000**. Inne komputery w tej samej sieci (np. w szkolnej pracowni) mogą wejść
na `http://<adres-IP-komputera>:4000`.

| Polecenie           | Co robi |
|---------------------|---------|
| `npm start`         | serwer + strona w trybie deweloperskim (zmiany w kodzie widać od razu) |
| `npm run server`    | tylko serwer z bazą danych (port 4000) |
| `npm run web`       | tylko strona (port 8081) |
| `npm run preview`   | gotowa strona + serwer pod http://localhost:4000 |
| `npm run db:seed`   | dodaje konto demo |
| `npm test`          | testy (silnik rynku, logika portfela, API serwera) |
| `npm run lint`      | sprawdzenie kodu (ESLint) |

---

## 🗄️ Baza danych (SQLite)

Cała baza to jeden plik: **`server/data/gielda.db`** (nie trafia do repozytorium — jest w `.gitignore`).
Schemat tabel jest w [`server/db.mjs`](server/db.mjs) i tworzy się automatycznie.

```
users                         sessions
├─ id (PK)                    ├─ token (PK)
├─ email (UNIQUE)             ├─ user_id → users.id
├─ display_name               └─ created_at
├─ password_hash   (scrypt)
└─ created_at                 portfolios                 (1 wiersz na użytkownika)
                              ├─ user_id (PK) → users.id
balances                      ├─ starting_balance
├─ user_id → users.id         ├─ realized_pnl
├─ currency    (PLN, USD…)    └─ trades_count
├─ amount
└─ avg_price   (średni kurs   transactions
               zakupu)        ├─ id (PK)
                              ├─ user_id → users.id
PK (user_id, currency)        ├─ type  ('buy' | 'sell')
                              ├─ currency, amount, rate, total, pnl
                              └─ created_at
```

- Relacje mają klucze obce z `ON DELETE CASCADE` — usunięcie użytkownika usuwa jego dane.
- Kupno/sprzedaż wykonuje się w transakcji SQL (`BEGIN … COMMIT`) — przy błędzie nic się nie zapisuje.
- Zawartość bazy można podejrzeć programem [DB Browser for SQLite](https://sqlitebrowser.org)
  (otwórz plik `server/data/gielda.db`).
- Żeby zacząć od zera, zatrzymaj serwer i usuń folder `server/data/`.

### API serwera

| Metoda | Adres                       | Opis |
|--------|-----------------------------|------|
| POST   | `/api/auth/register`        | rejestracja → token + dane użytkownika |
| POST   | `/api/auth/login`           | logowanie → token + dane użytkownika |
| POST   | `/api/auth/logout`          | wylogowanie (usuwa sesję) |
| GET    | `/api/auth/me`              | dane zalogowanego użytkownika |
| POST   | `/api/auth/change-password` | zmiana hasła |
| GET    | `/api/portfolio`            | portfel (salda, średnie kursy, wyniki) |
| POST   | `/api/portfolio/reset`      | przywrócenie 10 000 zł i usunięcie historii |
| GET    | `/api/transactions`         | historia transakcji (najnowsze najpierw) |
| POST   | `/api/trades`               | kupno / sprzedaż `{ type, code, amount, rate }` |

Zapytania wymagające logowania wysyłają nagłówek `Authorization: Bearer <token>`.

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

Obliczenia portfela ([`src/logic/trading.js`](src/logic/trading.js)) są wspólne dla aplikacji i serwera —
aplikacja używa ich do podglądu transakcji, a serwer do jej wykonania i zapisu w bazie.

---

## 🗂️ Struktura projektu

```
server/                       ← serwer Node.js + baza SQLite
├── index.mjs                 ← uruchomienie serwera (port 4000)
├── app.mjs                   ← adresy API (Express)
├── db.mjs                    ← połączenie z bazą i schemat tabel
├── auth.mjs                  ← rejestracja, logowanie, hashowanie haseł, sesje
├── portfolio.mjs             ← portfel, transakcje, reset
├── seed.mjs                  ← konto demo
└── data/gielda.db            ← plik bazy (tworzy się sam)
src/                          ← aplikacja (React Native / Expo)
├── app/                      ← ekrany (Expo Router, routing plikowy)
│   ├── _layout.js            ← providery + ochrona tras (Stack.Protected)
│   ├── offline.js            ← ekran „Brak połączenia z serwerem”
│   ├── (auth)/               ← logowanie, rejestracja
│   └── (app)/                ← tylko dla zalogowanych (+ boczne menu)
│       ├── (tabs)/           ← Rynek, Portfel, Historia, Profil
│       └── currency/[code].js← wykres + kupno/sprzedaż waluty
├── components/               ← boczne menu, przyciski, pola, wykresy, tabele, dialogi…
├── context/                  ← stan globalny: Auth, Market, Portfolio
├── hooks/useResponsive.js    ← układ zależny od szerokości okna
├── logic/trading.js          ← obliczenia portfela i transakcji (wspólne z serwerem)
├── services/                 ← komunikacja z serwerem (api.js), API NBP
├── simulation/               ← silnik rynku, waluty, wiadomości
├── theme/                    ← kolory trybu ciemnego/jasnego + ThemeContext
└── utils/                    ← formatowanie liczb, walidacja (wspólna z serwerem)
scripts/                      ← loader pozwalający serwerowi używać modułów z src/
tests/                        ← testy (node:test)
```

## 🛠️ Technologie

Expo SDK 58 · React Native 0.88 + react-native-web · Expo Router · Node.js · Express 5 ·
SQLite (`node:sqlite`) · react-native-svg · expo-linear-gradient · AsyncStorage · API NBP

<details>
<summary>Dodatkowo: uruchomienie na telefonie</summary>

Ten sam kod działa też jako aplikacja mobilna. Uruchom serwer (`npm run server`), utwórz plik `.env`
z adresem IP komputera (`EXPO_PUBLIC_API_URL=http://192.168.1.10:4000`), a potem `npx expo start`
i zeskanuj kod QR w aplikacji **Expo Go** (telefon i komputer muszą być w tej samej sieci Wi-Fi).
</details>

---

*Projekt edukacyjny — wszystkie środki są wirtualne, a kursy (poza startowymi z NBP) są symulowane.*
