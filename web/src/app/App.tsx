import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { RouteComparisonPage } from "../pages/route-comparison/ui";
import "../lib/css/index.css";
import "./styles.css";

type ThemeMode = "light" | "dark";

const THEME_STORAGE_KEY = "routeiq-theme";
const DARK_THEME_CLASS = "routeiq-theme-dark";
const LIGHT_THEME_CLASS = "routeiq-theme-light";

function getStoredTheme(): ThemeMode | null {
  try {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return savedTheme === "light" || savedTheme === "dark" ? savedTheme : null;
  } catch {
    return null;
  }
}

function getInitialTheme(): ThemeMode {
  return (
    getStoredTheme() ??
    (document.documentElement.classList.contains(DARK_THEME_CLASS) ||
    window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light")
  );
}

function applyTheme(theme: ThemeMode) {
  const isDark = theme === "dark";
  const colorSchemeMeta = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');

  document.documentElement.classList.toggle(DARK_THEME_CLASS, isDark);
  document.documentElement.classList.toggle(LIGHT_THEME_CLASS, !isDark);
  document.body.classList.toggle(DARK_THEME_CLASS, isDark);
  document.body.classList.toggle(LIGHT_THEME_CLASS, !isDark);
  colorSchemeMeta?.setAttribute("content", theme);
}

export function App() {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const hasManualThemeSelection = useRef(false);
  const isDark = theme === "dark";

  useLayoutEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (getStoredTheme()) return;

    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = (event: MediaQueryListEvent) => {
      if (!hasManualThemeSelection.current) {
        setTheme(event.matches ? "dark" : "light");
      }
    };

    systemTheme.addEventListener("change", handleSystemThemeChange);
    return () => systemTheme.removeEventListener("change", handleSystemThemeChange);
  }, []);

  const toggleTheme = () => {
    hasManualThemeSelection.current = true;
    setTheme((current) => {
      const nextTheme = current === "dark" ? "light" : "dark";

      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
      } catch {
        // Storage may be unavailable; the selected theme still applies for this session.
      }

      return nextTheme;
    });
  };

  return (
    <RouteComparisonPage
      isDarkMode={isDark}
      onToggleTheme={toggleTheme}
    />
  );
}
