import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { lightColors, darkColors, ColorTokens, Theme } from '../../lib/theme';

function toLegacyTheme(c: ColorTokens): Theme {
  return {
    background:       c.background,
    cardBackground:   c.surface,
    searchBackground: c.inputBackground,
    text:             c.textPrimary,
    secondaryText:    c.textSecondary,
    accent:           c.accent,
    border:           c.border,
    tabBarBackground: c.tabBarBackground,
    tabBarInactive:   c.tabBarInactive,
    icon:             c.icon,
    iconSecondary:    c.iconSecondary,
  };
}

export const lightTheme: Theme = toLegacyTheme(lightColors);
export const darkTheme: Theme  = toLegacyTheme(darkColors);

interface ThemeContextType {
  isDarkMode:           boolean;
  theme:                Theme;
  colors:               ColorTokens;
  toggleTheme:          () => void;
  followSystemTheme:    boolean;
  setFollowSystemTheme: (follow: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [isDarkMode,        setIsDarkMode]   = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [followSystemTheme, setFollowSystem] = useState(true);

  useEffect(() => {
    try {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)');
      const savedTheme  = localStorage.getItem('isDarkMode');
      const savedFollow = localStorage.getItem('followSystemTheme');
      const shouldFollow = savedFollow !== null ? JSON.parse(savedFollow) : true;
      setFollowSystem(shouldFollow);
      if (shouldFollow) {
        setIsDarkMode(systemPrefersDark.matches);
      } else if (savedTheme !== null) {
        setIsDarkMode(JSON.parse(savedTheme));
      }
    } catch {
      // ignore
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      if (followSystemTheme) setIsDarkMode(e.matches);
    };
    systemPrefersDark.addEventListener('change', handler);
    return () => systemPrefersDark.removeEventListener('change', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [followSystemTheme]);

  const toggleTheme = () => {
    try {
      const next = !isDarkMode;
      setIsDarkMode(next);
      setFollowSystem(false);
      localStorage.setItem('isDarkMode',        JSON.stringify(next));
      localStorage.setItem('followSystemTheme', JSON.stringify(false));
    } catch { /* ignore */ }
  };

  const handleSetFollowSystemTheme = (follow: boolean) => {
    try {
      setFollowSystem(follow);
      localStorage.setItem('followSystemTheme', JSON.stringify(follow));
      if (follow && typeof window !== 'undefined') {
        setIsDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
      }
    } catch { /* ignore */ }
  };

  const colors = isDarkMode ? darkColors : lightColors;
  const theme  = isDarkMode ? darkTheme  : lightTheme;

  return (
    <ThemeContext.Provider
      value={{
        isDarkMode,
        theme,
        colors,
        toggleTheme,
        followSystemTheme,
        setFollowSystemTheme: handleSetFollowSystemTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
};
