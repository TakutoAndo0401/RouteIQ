import { AlertTriangle, Zap } from "lucide-react";
import {
  formatYen,
  formatDistanceKm,
  formatMinutes,
  type CompareRoutesResult
} from "../../../entities/route/model";
import { RouteCard } from "./RouteCard";

interface RouteSummaryProps {
  /** 高速優先と一般道の比較結果、おすすめ、未確認項目を含む解析結果。 */
  result: CompareRoutesResult;
}

interface DifferenceCopy {
  sentence: string;
  metricValue: string;
}

function buildTimeDifferenceCopy(value: number): DifferenceCopy {
  if (value > 0) {
    const duration = formatMinutes(value);
    return {
      sentence: `高速優先は一般道より${duration}短時間です`,
      metricValue: `高速が${duration}短い`
    };
  }

  if (value < 0) {
    const duration = formatMinutes(Math.abs(value));
    return {
      sentence: `一般道は高速優先より${duration}短時間です`,
      metricValue: `一般道が${duration}短い`
    };
  }

  return {
    sentence: "所要時間に差はありません",
    metricValue: "差なし"
  };
}

function buildCostDifferenceCopy(value: number | null): DifferenceCopy {
  if (value === null) {
    return {
      sentence: "費用差は未確認です",
      metricValue: "未確認"
    };
  }

  if (value > 0) {
    const cost = formatYen(value);
    return {
      sentence: `高速優先は一般道より${cost}高くなります`,
      metricValue: `高速が${cost}高い`
    };
  }

  if (value < 0) {
    const cost = formatYen(Math.abs(value));
    return {
      sentence: `高速優先は一般道より${cost}安くなります`,
      metricValue: `高速が${cost}安い`
    };
  }

  return {
    sentence: "総額に差はありません",
    metricValue: "差なし"
  };
}

function buildRecommendationLead(
  recommendedLabel: "高速優先" | "一般道",
  timeDifference: DifferenceCopy,
  costDifference: DifferenceCopy
) {
  return `今回は${recommendedLabel}がおすすめです。${timeDifference.sentence}。${costDifference.sentence}。`;
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
    <section className="list-block list-block--warning">
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

/**
 * 経路比較のおすすめ理由、判断指標、各候補の費用・時間・未確認項目をまとめて表示します。
 *
 * @summary 高速優先と一般道の比較結果を要約
 */
export function RouteSummary({ result }: RouteSummaryProps) {
  const hasApiFailures = result.apiFailures.length > 0;
  const recommendedLabel = result.recommendedRoute === "expressway" ? "高速優先" : "一般道";
  const timeDifference = buildTimeDifferenceCopy(result.comparison.timeDifferenceMinutes);
  const costDifference = buildCostDifferenceCopy(result.comparison.costDifferenceYen);
  const recommendationLead = buildRecommendationLead(
    recommendedLabel,
    timeDifference,
    costDifference
  );

  return (
    <div className="summary-stack">
      <section className="recommendation-band">
        <div>
          <p className="recommendation-band__eyebrow">おすすめの判断</p>
          <h2>
            <Zap size={15} aria-hidden="true" className="recommendation-band__icon" />
            <span className="recommendation-band__title">
              {recommendedLabel}で進むのが良さそうです
            </span>
          </h2>
          <p className="recommendation-band__lead">{recommendationLead}</p>
          <span className="recommendation-band__reason">{result.recommendationReason}</span>
        </div>
        <div className="recommendation-band__metrics" aria-label="判断の要点">
          <div>
            <span>おすすめ</span>
            <strong>{recommendedLabel}</strong>
          </div>
          <div>
            <span>時間差</span>
            <strong className="recommendation-band__metric-value recommendation-band__metric-value--directional">
              {timeDifference.metricValue}
            </strong>
          </div>
          <div>
            <span>費用差</span>
            <strong className="recommendation-band__metric-value recommendation-band__metric-value--directional">
              {costDifference.metricValue}
            </strong>
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

      {hasApiFailures ? (
        <ListBlock
          title="未確認の項目"
          items={result.apiFailures}
          icon={<AlertTriangle size={16} aria-hidden="true" />}
        />
      ) : null}

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
    </div>
  );
}
