import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

import { darkPalette, lightPalette } from '../theme';

const ThemeCtx = createContext({
  dark: false,
  palette: lightPalette,
  toggleDark: () => {},
  ready: false,
});

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [dark, setDark] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('@mypet_theme')
      .then((v) => {
        if (v === 'dark') setDark(true);
        else if (v === 'light') setDark(false);
        else setDark(systemScheme === 'dark');
      })
      .catch(() => {
        setDark(systemScheme === 'dark');
      })
      .finally(() => setReady(true));
  }, []);

  const toggleDark = useCallback(() => {
    setDark((d) => {
      const next = !d;
      AsyncStorage.setItem('@mypet_theme', next ? 'dark' : 'light').catch(() => {});
      return next;
    });
  }, []);

  return (
    <ThemeCtx.Provider value={{ dark, palette: dark ? darkPalette : lightPalette, toggleDark, ready }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeCtx);
}
