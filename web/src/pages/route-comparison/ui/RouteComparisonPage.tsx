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

type RouteComparisonPageProps = {
  isDarkMode: boolean;
  onToggleTheme: () => void;
};

export function RouteComparisonPage({ isDarkMode, onToggleTheme }: RouteComparisonPageProps) {
  const { analysis, busy, error, submit } = useRouteAnalysis();

  return (
    <main className="app-shell app-shell--route-status">
      <AppHeader isDarkMode={isDarkMode} onToggleTheme={onToggleTheme} />

      <section className="status-layout">
        <div className="condition-pane">
          <RouteForm disabled={busy} onSubmit={submit} />
        </div>

        <section className="result-pane" aria-label="道路状況の確認結果">
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
                <article className="result-answer">
                  <p>判定理由</p>
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
