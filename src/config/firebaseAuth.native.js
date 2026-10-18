// Android / iOS: sesja logowania zapisywana jest w AsyncStorage,
// dzięki czemu użytkownik pozostaje zalogowany po ponownym uruchomieniu aplikacji.
import { getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function createAuth(app) {
  try {
    return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch {
    // Przy szybkim odświeżaniu (Fast Refresh) Auth może być już zainicjalizowane.
    return getAuth(app);
  }
}
