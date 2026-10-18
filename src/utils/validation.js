// Walidacja formularzy logowania i rejestracji. Każda funkcja zwraca
// komunikat błędu albo null, gdy wartość jest poprawna.

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEmail(email) {
  if (!email.trim()) return 'Podaj adres e-mail.';
  if (!EMAIL_REGEX.test(email.trim())) return 'Nieprawidłowy adres e-mail.';
  return null;
}

export function validatePassword(password) {
  if (!password) return 'Podaj hasło.';
  if (password.length < 6) return 'Hasło musi mieć co najmniej 6 znaków.';
  if (!/\d/.test(password)) return 'Hasło musi zawierać co najmniej jedną cyfrę.';
  return null;
}

export function validateDisplayName(name) {
  if (!name.trim()) return 'Podaj imię lub nick.';
  if (name.trim().length < 2) return 'Nazwa musi mieć co najmniej 2 znaki.';
  if (name.trim().length > 30) return 'Nazwa może mieć maksymalnie 30 znaków.';
  return null;
}

// Prosta ocena siły hasła: 0 (brak) – 4 (bardzo silne).
export function getPasswordStrength(password) {
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;
  return score;
}
