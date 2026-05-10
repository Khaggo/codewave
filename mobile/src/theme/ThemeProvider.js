import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { palettes, spacing, radius, type, elevation } from './tokens';

const ThemeContext = createContext(null);

export function ThemeProvider({ children, initialMode = 'dark' }) {
  const [mode, setModeState] = useState(initialMode === 'light' ? 'light' : 'dark');

  const setMode = useCallback((nextMode) => {
    setModeState(nextMode === 'light' ? 'light' : 'dark');
  }, []);

  const toggleMode = useCallback(() => {
    setModeState((current) => (current === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = useMemo(() => {
    const colors = palettes[mode] ?? palettes.dark;
    return {
      mode,
      setMode,
      toggleMode,
      colors,
      spacing,
      radius,
      type,
      elevation,
    };
  }, [mode, setMode, toggleMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (ctx) {
    return ctx;
  }
  return {
    mode: 'dark',
    setMode: () => {},
    toggleMode: () => {},
    colors: palettes.dark,
    spacing,
    radius,
    type,
    elevation,
  };
}
