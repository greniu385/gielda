import { useWindowDimensions } from 'react-native';

// Punkty przełamania układu: na szerokim ekranie (komputer) pokazujemy
// boczne menu i kilka kolumn, na wąskim (telefon, małe okno) — jedną kolumnę.
export const WIDE_BREAKPOINT = 900;
export const DESKTOP_BREAKPOINT = 1200;

export function useResponsive() {
  const { width } = useWindowDimensions();
  return {
    width,
    isWide: width >= WIDE_BREAKPOINT,
    isDesktop: width >= DESKTOP_BREAKPOINT,
  };
}
