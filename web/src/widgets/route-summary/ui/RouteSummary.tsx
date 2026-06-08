import { AlertTriangle, Clock, TrendingUp, Zap } from "lucide-react";
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

function buildRecommendationLead(result: CompareRoutesResult) {
  const timeDifference = formatMinutes(result.comparison.timeDifferenceMinutes);
  const costDifference = formatYen(result.comparison.costDifferenceYen);

  if (result.recommendedRoute === "expressway") {
    return `今回は高速優先がおすすめです。一般道より ${timeDifference} 早く、追加費用は ${costDifference} です。`;
  }

  if (result.comparison.timeDifferenceMinutes > 0) {
    return `今回は一般道がおすすめです。高速優先でも短縮は ${timeDifference} で、${costDifference} 余計にかかります。`;
  }

  return `今回は一般道がおすすめです。所要時間差がほぼなく、${costDifference} の追加費用を避けられます。`;
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
  const recommendationLead = buildRecommendationLead(result);
  const recommendedLabel = result.recommendedRoute === "expressway" ? "高速優先" : "一般道";

  return (
    <div className="summary-stack">
      <section className="recommendation-band">
        <div>
          <p className="recommendation-band__eyebrow">おすすめの判断</p>
          <h2>
            <Zap size={15} aria-hidden="true" className="recommendation-band__icon" />
            {recommendedLabel}で進むのが良さそうです
          </h2>
          <p className="recommendation-band__lead">{recommendationLead}</p>
          <span>{result.recommendationReason}</span>
        </div>
        <div className="recommendation-band__metrics" aria-label="判断の要点">
          <div>
            <span>おすすめ</span>
            <strong>{recommendedLabel}</strong>
          </div>
          <div>
            <span>時間差</span>
            <strong>{formatMinutes(result.comparison.timeDifferenceMinutes)}</strong>
          </div>
          <div>
            <span>追加費用</span>
            <strong>{formatYen(result.comparison.costDifferenceYen)}</strong>
          </div>
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

      <section className="comparison-panel" aria-label="比較メトリクス">
        <h3>判断の目安</h3>
        <p className="comparison-panel__lead">
          時間短縮に対してどれだけ費用差があるかを先に確認すると、意思決定が速くなります。
        </p>
        <div className="comparison-grid">
          <Metric
            label="高速優先の短縮時間"
            value={formatMinutes(result.comparison.timeDifferenceMinutes)}
            tone={result.comparison.timeDifferenceMinutes > 0 ? "good" : "neutral"}
            icon={<Clock size={15} aria-hidden="true" />}
          />
          <Metric
            label="高速優先の追加費用"
            value={formatYen(result.comparison.costDifferenceYen)}
            tone="warn"
            icon={<TrendingUp size={15} aria-hidden="true" />}
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

      <div className="route-grid" aria-label="各ルートの詳細">
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
        <ListBlock
          title="API取得に失敗した項目"
          items={result.apiFailures}
          icon={<AlertTriangle size={16} aria-hidden="true" />}
        />
      ) : null}
    </div>
  );
}
