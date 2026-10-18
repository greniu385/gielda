import { Platform } from 'react-native';

// Natywny sterownik animacji działa tylko na telefonie — w przeglądarce
// animacje i tak wykonuje JavaScript, więc wyłączamy go, żeby uniknąć ostrzeżeń.
export const NATIVE_DRIVER = Platform.OS !== 'web';
