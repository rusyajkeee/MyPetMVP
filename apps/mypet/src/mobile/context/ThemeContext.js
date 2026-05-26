import { createContext, useContext } from 'react';
import { lightPalette } from '../theme';

const ThemeCtx = createContext({
  dark: false,
  palette: lightPalette,
  toggleDark: () => {},
  ready: true,
});

export function ThemeProvider({ children }) {
  return (
    <ThemeCtx.Provider value={{ dark: false, palette: lightPalette, toggleDark: () => {}, ready: true }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeCtx);
}
