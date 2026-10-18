import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';

import { auth } from '../config/firebase';
import { ensureUserProfile } from './portfolioService';

export async function registerUser({ displayName, email, password }) {
  const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await updateProfile(user, { displayName: displayName.trim() });
  await ensureUserProfile(user, displayName.trim());
  return user;
}

export async function loginUser({ email, password }) {
  const { user } = await signInWithEmailAndPassword(auth, email.trim(), password);
  return user;
}

export function logoutUser() {
  return signOut(auth);
}

export function resetPassword(email) {
  return sendPasswordResetEmail(auth, email.trim());
}

const AUTH_ERRORS = {
  'auth/email-already-in-use': 'Konto z tym adresem e-mail już istnieje.',
  'auth/invalid-email': 'Nieprawidłowy adres e-mail.',
  'auth/weak-password': 'Hasło jest za słabe — użyj co najmniej 6 znaków.',
  'auth/user-not-found': 'Nie znaleziono konta z tym adresem e-mail.',
  'auth/wrong-password': 'Nieprawidłowe hasło.',
  'auth/invalid-credential': 'Nieprawidłowy e-mail lub hasło.',
  'auth/invalid-login-credentials': 'Nieprawidłowy e-mail lub hasło.',
  'auth/too-many-requests': 'Zbyt wiele prób. Spróbuj ponownie za chwilę.',
  'auth/network-request-failed': 'Brak połączenia z internetem.',
  'auth/user-disabled': 'To konto zostało zablokowane.',
  'auth/operation-not-allowed': 'Logowanie e-mailem jest wyłączone w konsoli Firebase (Authentication → Sign-in method).',
  'auth/missing-password': 'Podaj hasło.',
  'auth/missing-email': 'Podaj adres e-mail.',
  'auth/invalid-api-key': 'Nieprawidłowy klucz API Firebase — sprawdź plik .env.',
  'permission-denied': 'Brak uprawnień do bazy danych — sprawdź reguły Firestore.',
  unavailable: 'Baza danych jest chwilowo niedostępna. Sprawdź połączenie z internetem.',
};

export function getErrorMessage(error) {
  return AUTH_ERRORS[error?.code] ?? error?.message ?? 'Wystąpił nieznany błąd.';
}
