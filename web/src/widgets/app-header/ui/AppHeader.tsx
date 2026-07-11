import { Moon, PanelLeftClose, PanelLeftOpen, Sun } from "lucide-react";

type AppHeaderProps = {
  /** 現在ダークテーマが有効かどうか。 */
  isDarkMode: boolean;
  /** 検索条件サイドバーが開いているかどうか。 */
  isSidebarOpen: boolean;
  /** 検索条件サイドバーの開閉操作で呼ばれます。 */
  onToggleSidebar: () => void;
  /** ライト／ダークテーマの切り替え操作で呼ばれます。 */
  onToggleTheme: () => void;
};

/**
 * RouteIQのブランド、検索条件サイドバーの開閉、テーマ切り替えを提供します。
 *
 * @summary アプリ全体の操作をまとめるヘッダー
 */
export function AppHeader({
  isDarkMode,
  isSidebarOpen,
  onToggleSidebar,
  onToggleTheme
}: AppHeaderProps) {
  const ThemeIcon = isDarkMode ? Sun : Moon;
  const themeLabel = isDarkMode ? "ライトモードに切り替え" : "ダークモードに切り替え";
  const SidebarIcon = isSidebarOpen ? PanelLeftClose : PanelLeftOpen;
  const sidebarLabel = isSidebarOpen ? "検索条件を閉じる" : "検索条件を開く";

  return (
    <header className="app-header">
      <div className="app-header__left">
        <button
          type="button"
          className={`app-header__menu-toggle${isSidebarOpen ? " app-header__menu-toggle--open" : ""}`}
          aria-label={sidebarLabel}
          title={sidebarLabel}
          aria-expanded={isSidebarOpen}
          onClick={onToggleSidebar}
        >
          <SidebarIcon aria-hidden="true" size={24} strokeWidth={2.35} />
        </button>
        <div className="app-header__brand">
          <div className="app-header__brand-copy">
            <p>RouteIQ</p>
            <h1>道路状況チェック</h1>
          </div>
        </div>
      </div>
      <button
        type="button"
        className="theme-toggle"
        aria-label={themeLabel}
        title={themeLabel}
        aria-pressed={isDarkMode}
        onClick={onToggleTheme}
      >
        <ThemeIcon aria-hidden="true" size={22} strokeWidth={2} />
      </button>
    </header>
  );
}
