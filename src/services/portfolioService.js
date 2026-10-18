// Operacje na bazie danych Cloud Firestore.
//
// Struktura danych:
//   users/{uid}                     — profil i portfel użytkownika
//     displayName, email, createdAt,
//     balances:  { PLN: 10000, USD: 120.5, ... }
//     avgPrices: { USD: 3.71, ... }  — średni kurs zakupu (do liczenia zysku)
//     realizedPnl, tradesCount, startingBalance
//   users/{uid}/transactions/{id}  — historia transakcji
//     type ('buy' | 'sell'), code, amount, rate, total, pnl, createdAt
import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';

import { db } from '../config/firebase';
import { TradeError, applyTrade, createInitialPortfolio } from '../logic/trading';

const userRef = (uid) => doc(db, 'users', uid);
const transactionsRef = (uid) => collection(db, 'users', uid, 'transactions');

// Tworzy dokument użytkownika z portfelem startowym, jeśli jeszcze nie istnieje.
export async function ensureUserProfile(user, displayName) {
  const ref = userRef(user.uid);
  await runTransaction(db, async (tx) => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists()) {
      tx.set(ref, {
        ...createInitialPortfolio(),
        displayName: displayName || user.displayName || user.email.split('@')[0],
        email: user.email,
        createdAt: serverTimestamp(),
      });
    } else if (displayName && snapshot.data().displayName !== displayName) {
      tx.update(ref, { displayName });
    }
  });
}

export function subscribeToPortfolio(uid, onData, onError) {
  return onSnapshot(
    userRef(uid),
    (snapshot) => onData(snapshot.exists() ? snapshot.data({ serverTimestamps: 'estimate' }) : null),
    onError,
  );
}

export function subscribeToTransactions(uid, onData, onError, max = 100) {
  const q = query(transactionsRef(uid), orderBy('createdAt', 'desc'), limit(max));
  return onSnapshot(
    q,
    (snapshot) =>
      onData(
        snapshot.docs.map((d) => {
          const data = d.data({ serverTimestamps: 'estimate' });
          return { id: d.id, ...data, createdAt: data.createdAt?.toDate?.() ?? new Date() };
        }),
      ),
    onError,
  );
}

// Kupno/sprzedaż w transakcji Firestore — saldo i historia zapisują się razem
// albo wcale, więc nie da się np. wydać tych samych pieniędzy dwa razy.
export async function executeTrade(uid, trade) {
  const ref = userRef(uid);
  const txRef = doc(transactionsRef(uid));

  return runTransaction(db, async (tx) => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists()) throw new TradeError('Portfel nie jest jeszcze gotowy. Spróbuj ponownie.');
    const { portfolio, transaction } = applyTrade(snapshot.data(), trade);

    // update() podmienia całe mapy balances/avgPrices (set z merge by je scalił
    // i nie usunąłby walut sprzedanych w całości).
    tx.update(ref, {
      balances: portfolio.balances,
      avgPrices: portfolio.avgPrices,
      realizedPnl: portfolio.realizedPnl,
      tradesCount: portfolio.tradesCount,
    });
    tx.set(txRef, { ...transaction, createdAt: serverTimestamp() });
    return transaction;
  });
}

// Przywraca portfel startowy i usuwa całą historię transakcji.
export async function resetPortfolio(uid) {
  const snapshot = await getDocs(transactionsRef(uid));
  const docs = snapshot.docs;
  for (let i = 0; i < docs.length; i += 400) {
    const batch = writeBatch(db);
    docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  const initial = createInitialPortfolio();
  await updateDoc(userRef(uid), {
    balances: initial.balances,
    avgPrices: initial.avgPrices,
    realizedPnl: initial.realizedPnl,
    tradesCount: initial.tradesCount,
    startingBalance: initial.startingBalance,
  });
}
