// Rejestracja, logowanie i zarządzanie kontem — przez lokalny serwer (server/auth.mjs).
import { api, saveToken } from './api';

export async function checkServer() {
  await api.get('/api/health');
}

export async function fetchCurrentUser() {
  const { user } = await api.get('/api/auth/me');
  return user;
}

export async function registerUser({ displayName, email, password }) {
  const { token, user } = await api.post('/api/auth/register', {
    displayName: displayName.trim(),
    email: email.trim(),
    password,
  });
  await saveToken(token);
  return user;
}

export async function loginUser({ email, password }) {
  const { token, user } = await api.post('/api/auth/login', { email: email.trim(), password });
  await saveToken(token);
  return user;
}

export async function logoutUser() {
  try {
    await api.post('/api/auth/logout');
  } finally {
    await saveToken(null);
  }
}

export function changePassword({ currentPassword, newPassword }) {
  return api.post('/api/auth/change-password', { currentPassword, newPassword });
}

// Serwer zwraca komunikaty błędów po polsku, więc wystarczy je pokazać.
export function getErrorMessage(error) {
  return error?.message || 'Wystąpił nieznany błąd.';
}
