import { AlertTriangle } from "lucide-react";
import {
  formatYen,
  formatDistanceKm,
  formatMinutes,
  type CompareRoutesResult
} from "../../../entities/route/model";
import { Metric } from "../../../shared/ui";
import { RouteCard } from "./RouteCard";

interface RouteSummaryProps {
  result: CompareRoutesResult;
}

function ListBlock({
  title,
  items,
  icon
}: {
  title: string;
  items: string[];
  icon: React.ReactNode;
}) {
  if (items.length === 0) return null;
  return (
    <section className="list-block">
      <h3>
        {icon}
        {title}
      </h3>
      <ul>
        {items.map((item, index) => (
          <li key={`${title}-${index}`}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

function RouteOption({
  label,
  route,
  recommended
}: {
  label: string;
  route: CompareRoutesResult["expresswayRoute"];
  recommended: boolean;
}) {
  return (
    <article className={`route-option${recommended ? " route-option--recommended" : ""}`}>
      <div>
        <span>{label}</span>
        <strong>{recommended ? "おすすめ" : "比較対象"}</strong>
      </div>
      <dl>
        <div>
          <dt>時間</dt>
          <dd>{formatMinutes(route.durationMinutes)}</dd>
        </div>
        <div>
          <dt>距離</dt>
          <dd>{formatDistanceKm(route.distanceKm)}</dd>
        </div>
        <div>
          <dt>総額</dt>
          <dd>{formatYen(route.totalCostYen)}</dd>
        </div>
      </dl>
    </article>
  );
}

export function RouteSummary({ result }: RouteSummaryProps) {
  const hasApiFailures = result.apiFailures.length > 0;

  return (
    <div className="summary-stack">
      <section className="recommendation-band">
        <div>
          <p>おすすめ</p>
          <h2>
            {result.recommendedRoute === "expressway"
              ? "高速優先ルート"
              : "一般道ルート"}
          </h2>
          <span>{result.recommendationReason}</span>
        </div>
      </section>

      <section className="route-option-grid" aria-label="ルート比較">
        <RouteOption
          label="高速優先"
          route={result.expresswayRoute}
          recommended={result.recommendedRoute === "expressway"}
        />
        <RouteOption
          label="一般道"
          route={result.localRoute}
          recommended={result.recommendedRoute === "local"}
        />
      </section>

      <section className="comparison-panel">
        <div className="comparison-grid">
          <Metric
            label="高速優先の短縮時間"
            value={formatMinutes(result.comparison.timeDifferenceMinutes)}
            tone={result.comparison.timeDifferenceMinutes > 0 ? "good" : "neutral"}
          />
          <Metric
            label="高速優先の追加費用"
            value={formatYen(result.comparison.costDifferenceYen)}
            tone="warn"
          />
          <Metric
            label="1分短縮あたり"
            value={
              result.comparison.valueOfTimeSavedYenPerMinute === null
                ? "未確認"
                : `${result.comparison.valueOfTimeSavedYenPerMinute}円/分`
            }
          />
        </div>
      </section>

      <details className="route-detail-disclosure">
        <summary>詳細な内訳</summary>
        <div className="route-detail-disclosure__content">
          <div className="route-grid">
            <RouteCard
              routeType="expressway"
              route={result.expresswayRoute}
              recommended={result.recommendedRoute === "expressway"}
            />
            <RouteCard
              routeType="local"
              route={result.localRoute}
              recommended={result.recommendedRoute === "local"}
            />
          </div>
          {hasApiFailures ? (
            <div className="list-grid">
              <ListBlock
                title="API取得に失敗した項目"
                items={result.apiFailures}
                icon={<AlertTriangle size={16} aria-hidden="true" />}
              />
            </div>
          ) : null}
        </div>
      </details>
    </div>
  );
}
