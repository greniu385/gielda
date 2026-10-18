// Komunikacja z lokalnym serwerem (katalog server/) przez HTTP + JSON.
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'gielda.token';

// Adres serwera:
// - zbudowana strona (npm run preview) jest udostępniana przez sam serwer, więc łączy się
//   z adresem, z którego została otwarta (dowolny port),
// - w trybie deweloperskim (npm start) strona działa na porcie 8081, a serwer na 4000.
// Można go zmienić w pliku .env: EXPO_PUBLIC_API_URL=http://192.168.1.10:4000
function defaultApiUrl() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    if (!__DEV__) return window.location.origin;
    return `${window.location.protocol}//${window.location.hostname}:4000`;
  }
  return 'http://localhost:4000';
}

export const API_URL = process.env.EXPO_PUBLIC_API_URL || defaultApiUrl();

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

let token = null;
let onUnauthorized = null;

// Token sesji zapisujemy w pamięci urządzenia, żeby użytkownik pozostał zalogowany.
export async function loadToken() {
  token = await AsyncStorage.getItem(TOKEN_KEY).catch(() => null);
  return token;
}

export async function saveToken(value) {
  token = value;
  try {
    if (value) await AsyncStorage.setItem(TOKEN_KEY, value);
    else await AsyncStorage.removeItem(TOKEN_KEY);
  } catch {
    // Brak dostępu do pamięci (np. tryb prywatny) — sesja wygaśnie po zamknięciu strony.
  }
}

// Wywoływane, gdy serwer odrzuci token (np. sesja wygasła) — aplikacja wyloguje użytkownika.
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

async function request(method, path, body) {
  let response;
  try {
    response = await fetch(API_URL + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Brak połączenia z serwerem. Sprawdź, czy serwer jest uruchomiony (npm run server).', 0);
  }

  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && token) onUnauthorized?.();
    throw new ApiError(data?.error ?? `Błąd serwera (${response.status}).`, response.status);
  }
  return data;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
};
