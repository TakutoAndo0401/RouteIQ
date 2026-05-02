import { useEffect, useState } from "react";
import { RouteComparisonPage } from "../pages/route-comparison/ui";
import "../lib/css/index.css";
import "./styles.css";

type ThemeMode = "light" | "dark";

const THEME_STORAGE_KEY = "routeiq-theme";
const DARK_THEME_CLASS = "routeiq-theme-dark";

function getInitialTheme(): ThemeMode {
  const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

  if (savedTheme === "light" || savedTheme === "dark") {
    return savedTheme;
  }

  return "light";
}

export function App() {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const isDark = theme === "dark";

  useEffect(() => {
    document.documentElement.classList.toggle(DARK_THEME_CLASS, isDark);
    document.body.classList.toggle(DARK_THEME_CLASS, isDark);
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [isDark, theme]);

  return (
    <RouteComparisonPage
      isDarkMode={isDark}
      onToggleTheme={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
    />
  );
}
