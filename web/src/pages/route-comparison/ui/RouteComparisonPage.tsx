import { History, Menu, X } from "lucide-react";
import { useCallback, useState } from "react";
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

type RouteComparisonPageProps = {
  isDarkMode: boolean;
  onToggleTheme: () => void;
};

type RouteHistoryPanelProps = {
  disabled: boolean;
  entries: RouteHistoryEntry[];
  onSelect: (input: RouteAnalysisRequest) => void;
};

function RouteHistoryPanel({ disabled, entries, onSelect }: RouteHistoryPanelProps) {
  return (
    <section className="route-history" aria-label="検索履歴">
      <div className="route-history__header">
        <div>
          <p>Trip History</p>
          <h2>検索履歴</h2>
        </div>
        <History size={18} aria-hidden="true" />
      </div>

      {entries.length > 0 ? (
        <ol className="route-history__list">
          {entries.map((entry) => (
            <li key={entry.id}>
              <button type="button" disabled={disabled} onClick={() => onSelect(entry.input)}>
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
            </li>
          ))}
        </ol>
      ) : (
        <p className="route-history__empty">比較した条件がここに残ります。</p>
      )}
    </section>
  );
}

export function RouteComparisonPage({ isDarkMode, onToggleTheme }: RouteComparisonPageProps) {
  const { analysis, busy, error, submit } = useRouteAnalysis();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedFormDraft, setSelectedFormDraft] = useState<RouteAnalysisRequest | null>(null);
  const [routeHistory, setRouteHistory] = useState<RouteHistoryEntry[]>(loadRouteHistory);

  const handleSubmit = useCallback(
    async (input: RouteAnalysisRequest) => {
      const result = await submit(input);
      if (!result) return;

      setRouteHistory((current) => {
        const next = upsertRouteHistory(current, input);
        saveRouteHistory(next);
        return next;
      });
    },
    [submit]
  );

  const restoreHistory = useCallback((input: RouteAnalysisRequest) => {
    setSelectedFormDraft({ ...input });
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
                <X size={28} aria-hidden="true" />
              </button>
            </div>
            <RouteForm disabled={busy} initialValues={selectedFormDraft} onSubmit={handleSubmit} />
            <RouteHistoryPanel disabled={busy} entries={routeHistory} onSelect={restoreHistory} />
          </aside>
        ) : null}

        <section className="result-pane" aria-label="道路状況の確認結果">
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
              <div className="result-dashboard result-dashboard--comparison">
                <RouteSummary result={analysis.routeComparison} />
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
