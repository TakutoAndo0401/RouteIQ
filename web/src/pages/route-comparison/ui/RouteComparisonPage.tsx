import { ChevronDown, History, Menu, Trash2, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent
} from "react";
import type { RouteAnalysisRequest } from "../../../entities/route/model";
import { RouteForm } from "../../../features/route-form/ui";
import { LoadingSpinner } from "../../../shared/ui";
import { AppHeader } from "../../../widgets/app-header";
import { GoogleRouteMap } from "../../../widgets/route-map";
import { RouteSummary } from "../../../widgets/route-summary/ui";
import { useRouteAnalysis } from "../model/useRouteAnalysis";

function formatMessage(text: string) {
  return text.split("\n").map((line, index) => (
    <span key={`${line}-${index}`}>
      {line}
      <br />
    </span>
  ));
}

const HISTORY_STORAGE_KEY = "routeiq-route-history";
const HISTORY_LIMIT = 10;
const DEFAULT_MAP_WIDTH_PERCENT = 62;
const MIN_MAP_WIDTH_PERCENT = 44;
const MAX_MAP_WIDTH_PERCENT = 74;
const MOBILE_VIEW_QUERY = "(max-width: 760px)";

type RouteHistoryEntry = {
  id: string;
  key: string;
  searchedAt: string;
  input: RouteAnalysisRequest;
};

function isRouteAnalysisRequest(value: unknown): value is RouteAnalysisRequest {
  if (!value || typeof value !== "object") return false;
  const input = value as Partial<RouteAnalysisRequest>;
  return (
    typeof input.origin === "string" &&
    typeof input.destination === "string" &&
    typeof input.fuelEfficiencyKmPerLiter === "number" &&
    Number.isFinite(input.fuelEfficiencyKmPerLiter) &&
    (input.fuelPriceYenPerLiter === undefined ||
      (typeof input.fuelPriceYenPerLiter === "number" &&
        Number.isFinite(input.fuelPriceYenPerLiter))) &&
    (input.vehicleType === undefined || typeof input.vehicleType === "string")
  );
}

function isRouteHistoryEntry(value: unknown): value is RouteHistoryEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<RouteHistoryEntry>;
  return (
    typeof entry.id === "string" &&
    typeof entry.key === "string" &&
    typeof entry.searchedAt === "string" &&
    isRouteAnalysisRequest(entry.input)
  );
}

function loadRouteHistory(): RouteHistoryEntry[] {
  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter(isRouteHistoryEntry).slice(0, HISTORY_LIMIT) : [];
  } catch {
    return [];
  }
}

function saveRouteHistory(entries: RouteHistoryEntry[]) {
  try {
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    return;
  }
}

function createHistoryKey(input: RouteAnalysisRequest) {
  return JSON.stringify({
    origin: input.origin,
    destination: input.destination,
    fuelEfficiencyKmPerLiter: input.fuelEfficiencyKmPerLiter,
    fuelPriceYenPerLiter: input.fuelPriceYenPerLiter ?? null,
    vehicleType: input.vehicleType ?? "",
    prioritize: input.prioritize ?? "balanced"
  });
}

function upsertRouteHistory(current: RouteHistoryEntry[], input: RouteAnalysisRequest) {
  const key = createHistoryKey(input);
  const nextEntry: RouteHistoryEntry = {
    id: `route-history-${Date.now().toString(36)}`,
    key,
    searchedAt: new Date().toISOString(),
    input
  };

  return [nextEntry, ...current.filter((entry) => entry.key !== key)].slice(0, HISTORY_LIMIT);
}

function formatHistoryDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";

  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function clampMapWidthPercent(value: number) {
  return Math.min(MAX_MAP_WIDTH_PERCENT, Math.max(MIN_MAP_WIDTH_PERCENT, value));
}

function isMobileView() {
  return window.matchMedia(MOBILE_VIEW_QUERY).matches;
}

type RouteComparisonPageProps = {
  isDarkMode: boolean;
  onToggleTheme: () => void;
};

type RouteHistoryPanelProps = {
  compact: boolean;
  disabled: boolean;
  entries: RouteHistoryEntry[];
  onClear: () => void;
  onDelete: (entryId: string) => void;
  onSelect: (input: RouteAnalysisRequest) => void;
};

type RouteHistoryContentProps = Pick<
  RouteHistoryPanelProps,
  "disabled" | "entries" | "onDelete" | "onSelect"
>;

function RouteHistoryContent({
  disabled,
  entries,
  onDelete,
  onSelect
}: RouteHistoryContentProps) {
  return entries.length > 0 ? (
    <ol className="route-history__list">
      {entries.map((entry) => (
        <li className="route-history__item" key={entry.id}>
          <button
            type="button"
            className="route-history__restore"
            disabled={disabled}
            onClick={() => onSelect(entry.input)}
          >
            <span className="route-history__route">
              <strong>{entry.input.origin}</strong>
              <span aria-hidden="true">→</span>
              <strong>{entry.input.destination}</strong>
            </span>
            <span className="route-history__meta">
              <span>{entry.input.vehicleType ?? "普通車"}</span>
              <span>{entry.input.fuelEfficiencyKmPerLiter}km/L</span>
              <span>
                {typeof entry.input.fuelPriceYenPerLiter === "number"
                  ? `${entry.input.fuelPriceYenPerLiter}円/L`
                  : "全国平均"}
              </span>
            </span>
            <span className="route-history__date">{formatHistoryDate(entry.searchedAt)}</span>
          </button>
          <button
            type="button"
            className="route-history__delete"
            disabled={disabled}
            aria-label={`${entry.input.origin} から ${entry.input.destination} の履歴を削除`}
            title="履歴を削除"
            onClick={() => onDelete(entry.id)}
          >
            <Trash2 size={18} aria-hidden="true" />
          </button>
        </li>
      ))}
    </ol>
  ) : (
    <p className="route-history__empty">比較した条件がここに残ります。</p>
  );
}

function RouteHistoryTitle() {
  return (
    <div>
      <p>Trip History</p>
      <h2>検索履歴</h2>
    </div>
  );
}

function RouteHistoryActions({
  disabled,
  hasEntries,
  onClear
}: {
  disabled: boolean;
  hasEntries: boolean;
  onClear: () => void;
}) {
  if (!hasEntries) return null;

  return (
    <div className="route-history__actions">
      <button type="button" disabled={disabled} onClick={onClear}>
        全削除
      </button>
    </div>
  );
}

function RouteHistoryHeader({
  disabled,
  entries,
  onClear
}: Pick<RouteHistoryPanelProps, "disabled" | "entries" | "onClear">) {
  return (
    <div className="route-history__header">
      <RouteHistoryTitle />
      <div className="route-history__header-tools">
        <RouteHistoryActions
          disabled={disabled}
          hasEntries={entries.length > 0}
          onClear={onClear}
        />
        <History size={18} aria-hidden="true" />
      </div>
    </div>
  );
}

function RouteHistoryPanel({
  compact,
  disabled,
  entries,
  onClear,
  onDelete,
  onSelect
}: RouteHistoryPanelProps) {
  if (compact) {
    return (
      <details className="route-history route-history--compact">
        <summary className="route-history__compact-header" aria-label="検索履歴を開閉">
          <RouteHistoryTitle />
          <span className="route-history__compact-toggle" aria-hidden="true">
            <ChevronDown size={24} aria-hidden="true" />
          </span>
        </summary>
        <div className="route-history__compact-actions">
          <RouteHistoryActions
            disabled={disabled}
            hasEntries={entries.length > 0}
            onClear={onClear}
          />
        </div>
        <RouteHistoryContent
          disabled={disabled}
          entries={entries}
          onDelete={onDelete}
          onSelect={onSelect}
        />
      </details>
    );
  }

  return (
    <section className="route-history" aria-label="検索履歴">
      <RouteHistoryHeader disabled={disabled} entries={entries} onClear={onClear} />

      <RouteHistoryContent
        disabled={disabled}
        entries={entries}
        onDelete={onDelete}
        onSelect={onSelect}
      />
    </section>
  );
}

export function RouteComparisonPage({ isDarkMode, onToggleTheme }: RouteComparisonPageProps) {
  const { analysis, busy, error, submit } = useRouteAnalysis();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isCompactHistory, setIsCompactHistory] = useState(isMobileView);
  const [selectedFormDraft, setSelectedFormDraft] = useState<RouteAnalysisRequest | null>(null);
  const [routeHistory, setRouteHistory] = useState<RouteHistoryEntry[]>(loadRouteHistory);
  const [mapWidthPercent, setMapWidthPercent] = useState(DEFAULT_MAP_WIDTH_PERCENT);
  const dashboardRef = useRef<HTMLDivElement | null>(null);
  const resultPaneRef = useRef<HTMLElement | null>(null);
  const isResizingMap = useRef(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_VIEW_QUERY);
    const updateCompactState = () => {
      setIsCompactHistory(mediaQuery.matches);
    };

    updateCompactState();
    mediaQuery.addEventListener("change", updateCompactState);

    return () => {
      mediaQuery.removeEventListener("change", updateCompactState);
    };
  }, []);

  const showResultsOnMobile = useCallback(() => {
    if (!isMobileView()) return;

    setIsSidebarOpen(false);
    requestAnimationFrame(() => {
      resultPaneRef.current?.scrollIntoView({ block: "start" });
    });
  }, []);

  const handleSubmit = useCallback(
    async (input: RouteAnalysisRequest) => {
      const result = await submit(input);
      if (!result) return;

      showResultsOnMobile();

      setRouteHistory((current) => {
        const next = upsertRouteHistory(current, input);
        saveRouteHistory(next);
        return next;
      });
    },
    [showResultsOnMobile, submit]
  );

  const clearHistory = useCallback(() => {
    setRouteHistory([]);
    saveRouteHistory([]);
  }, []);

  const deleteHistoryEntry = useCallback((entryId: string) => {
    setRouteHistory((current) => {
      const next = current.filter((entry) => entry.id !== entryId);
      saveRouteHistory(next);
      return next;
    });
  }, []);

  const restoreHistory = useCallback((input: RouteAnalysisRequest) => {
    setSelectedFormDraft({ ...input });
  }, []);

  const updateMapWidth = useCallback((clientX: number) => {
    const dashboard = dashboardRef.current;
    if (!dashboard) return;

    const rect = dashboard.getBoundingClientRect();
    if (rect.width <= 0) return;

    const nextMapWidth = ((rect.right - clientX) / rect.width) * 100;
    setMapWidthPercent(clampMapWidthPercent(nextMapWidth));
  }, []);

  const handleResizePointerDown = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      isResizingMap.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      updateMapWidth(event.clientX);
    },
    [updateMapWidth]
  );

  const handleResizePointerMove = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      if (!isResizingMap.current) return;
      updateMapWidth(event.clientX);
    },
    [updateMapWidth]
  );

  const handleResizePointerEnd = useCallback((event: PointerEvent<HTMLButtonElement>) => {
    isResizingMap.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const handleResizeKeyDown = useCallback((event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setMapWidthPercent((current) => clampMapWidthPercent(current + 2));
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      setMapWidthPercent((current) => clampMapWidthPercent(current - 2));
    }

    if (event.key === "Home") {
      event.preventDefault();
      setMapWidthPercent(MIN_MAP_WIDTH_PERCENT);
    }

    if (event.key === "End") {
      event.preventDefault();
      setMapWidthPercent(MAX_MAP_WIDTH_PERCENT);
    }
  }, []);

  return (
    <main className="app-shell app-shell--route-status">
      <AppHeader isDarkMode={isDarkMode} onToggleTheme={onToggleTheme} />

      <section className={`status-layout${isSidebarOpen ? "" : " status-layout--sidebar-closed"}`}>
        {isSidebarOpen ? (
          <aside className="condition-pane" aria-label="ルート検索条件">
            <div className="condition-pane__header">
              <div>
                <p>Route Planner</p>
                <h2>条件入力</h2>
              </div>
              <button
                type="button"
                className="sidebar-toggle"
                aria-label="条件入力を閉じる"
                title="条件入力を閉じる"
                onClick={() => setIsSidebarOpen(false)}
              >
                <X size={34} aria-hidden="true" />
              </button>
            </div>
            <RouteForm disabled={busy} initialValues={selectedFormDraft} onSubmit={handleSubmit} />
            <RouteHistoryPanel
              compact={isCompactHistory}
              disabled={busy}
              entries={routeHistory}
              onClear={clearHistory}
              onDelete={deleteHistoryEntry}
              onSelect={restoreHistory}
            />
          </aside>
        ) : null}

        <section ref={resultPaneRef} className="result-pane" aria-label="道路状況の確認結果">
          {!isSidebarOpen ? (
            <button
              type="button"
              className="result-pane__sidebar-open"
              aria-label="条件入力を表示"
              title="条件入力を表示"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={24} aria-hidden="true" />
              検索条件
            </button>
          ) : null}
          {busy ? (
            <div className="result-pane__busy">
              <LoadingSpinner label="道路状況を確認中" />
              <span>道路状況を確認しています</span>
            </div>
          ) : null}
          {error ? <div className="error-banner">{error}</div> : null}
          {analysis ? (
            analysis.routeComparison ? (
              <div
                ref={dashboardRef}
                className="result-dashboard result-dashboard--comparison"
                style={{ "--routeiq-map-column": `${mapWidthPercent}%` } as CSSProperties}
              >
                <RouteSummary result={analysis.routeComparison} />
                <button
                  type="button"
                  className="result-dashboard__resize"
                  aria-label="Google マップの横幅を調整"
                  aria-orientation="vertical"
                  aria-valuemin={MIN_MAP_WIDTH_PERCENT}
                  aria-valuemax={MAX_MAP_WIDTH_PERCENT}
                  aria-valuenow={Math.round(mapWidthPercent)}
                  role="separator"
                  title="Google マップの横幅を調整"
                  onDoubleClick={() => setMapWidthPercent(DEFAULT_MAP_WIDTH_PERCENT)}
                  onKeyDown={handleResizeKeyDown}
                  onPointerCancel={handleResizePointerEnd}
                  onPointerDown={handleResizePointerDown}
                  onPointerMove={handleResizePointerMove}
                  onPointerUp={handleResizePointerEnd}
                />
                <GoogleRouteMap input={analysis.input} />
              </div>
            ) : (
              <div className="result-dashboard result-dashboard--fallback">
                <GoogleRouteMap input={analysis.input} />
                <article className="result-answer" aria-label="道路状況の確認内容">
                  <div>{formatMessage(analysis.answer)}</div>
                </article>
              </div>
            )
          ) : (
            <section className="empty-state">
              <h2>条件を入力すると、現在の道路状況を確認します</h2>
            </section>
          )}
        </section>
      </section>
    </main>
  );
}
