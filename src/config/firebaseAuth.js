// Przeglądarka (wersja web): Firebase sam zapamiętuje sesję w IndexedDB.
import { getAuth } from 'firebase/auth';

export function createAuth(app) {
  return getAuth(app);
}
