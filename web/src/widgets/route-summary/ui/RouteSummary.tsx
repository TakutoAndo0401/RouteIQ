import { AlertTriangle, Zap } from "lucide-react";
import {
  formatYen,
  formatMinutes,
  type CompareRoutesResult
} from "../../../entities/route/model";
import { RouteCard } from "./RouteCard";

interface RouteSummaryProps {
  /** 高速優先と一般道の比較結果、おすすめ、未確認項目を含む解析結果。 */
  result: CompareRoutesResult;
}

function buildTimeDifferenceValue(value: number): string {
  if (value > 0) return `高速が${formatMinutes(value)}短い`;
  if (value < 0) return `一般道が${formatMinutes(Math.abs(value))}短い`;
  return "差なし";
}

function buildCostDifferenceValue(value: number | null): string {
  if (value === null) return "未確認";
  if (value > 0) return `高速が${formatYen(value)}高い`;
  if (value < 0) return `高速が${formatYen(Math.abs(value))}安い`;
  return "差なし";
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

/**
 * 経路比較のおすすめ理由、判断指標、各候補の費用・時間・未確認項目をまとめて表示します。
 *
 * @summary 高速優先と一般道の比較結果を要約
 */
export function RouteSummary({ result }: RouteSummaryProps) {
  const hasApiFailures = result.apiFailures.length > 0;
  const recommendedLabel = result.recommendedRoute === "expressway" ? "高速優先" : "一般道";
  const timeDifference = buildTimeDifferenceValue(result.comparison.timeDifferenceMinutes);
  const costDifference = buildCostDifferenceValue(result.comparison.costDifferenceYen);

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
          <span className="recommendation-band__reason">{result.recommendationReason}</span>
        </div>
        <div className="recommendation-band__metrics" aria-label="判断の要点">
          <div>
            <span>時間差</span>
            <strong className="recommendation-band__metric-value recommendation-band__metric-value--directional">
              {timeDifference}
            </strong>
          </div>
          <div>
            <span>費用差</span>
            <strong className="recommendation-band__metric-value recommendation-band__metric-value--directional">
              {costDifference}
            </strong>
          </div>
        </div>
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
