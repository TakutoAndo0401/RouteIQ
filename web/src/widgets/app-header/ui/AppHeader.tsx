import { Moon, Sun } from "lucide-react";

type AppHeaderProps = {
  isDarkMode: boolean;
  onToggleTheme: () => void;
};

export function AppHeader({ isDarkMode, onToggleTheme }: AppHeaderProps) {
  const Icon = isDarkMode ? Sun : Moon;
  const label = isDarkMode ? "ライトモードに切り替え" : "ダークモードに切り替え";

  return (
    <header className="app-header">
      <div>
        <p>RouteIQ</p>
        <h1>道路状況チェック</h1>
      </div>
      <button
        type="button"
        className="theme-toggle"
        aria-label={label}
        title={label}
        aria-pressed={isDarkMode}
        onClick={onToggleTheme}
      >
        <Icon aria-hidden="true" size={34} strokeWidth={2.35} />
      </button>
    </header>
  );
}
