/**
 * Velocis — Theme Context
 * Handles dark/light mode state globally with localStorage persistence.
 * Theme preference is maintained across all pages until switched.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

const THEME_KEY = 'velocis-theme-mode';

interface ThemeContextValue {
  isDarkMode: boolean;
  setIsDarkMode: (isDark: boolean) => void;
  toggleDarkMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/**
 * Initializes theme from localStorage or system preference
 */
function getInitialTheme(): boolean {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored !== null) {
      return stored === 'true';
    }
  } catch {
    // localStorage might be unavailable in some environments
  }

  // Default to dark mode if no preference stored
  return true;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDarkMode, setIsDarkModeState] = useState<boolean>(getInitialTheme());

  // Persist theme to localStorage whenever it changes
  const setIsDarkMode = useCallback((isDark: boolean) => {
    setIsDarkModeState(isDark);
    try {
      localStorage.setItem(THEME_KEY, JSON.stringify(isDark));
    } catch {
      // localStorage might be unavailable in some environments
    }
  }, []);

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode(!isDarkMode);
  }, [isDarkMode, setIsDarkMode]);

  const value: ThemeContextValue = {
    isDarkMode,
    setIsDarkMode,
    toggleDarkMode,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

/**
 * Hook to access the theme context
 */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
