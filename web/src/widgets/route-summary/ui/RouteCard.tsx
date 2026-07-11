import { Gauge, Route } from "lucide-react";
import {
  formatDistanceKm,
  formatMinutes,
  formatYen,
  type RouteCostSummary,
  type RouteType
} from "../../../entities/route/model";
import { Metric } from "../../../shared/ui";

interface RouteCardProps {
  /** 高速優先または一般道のどちらを表示するか。 */
  routeType: RouteType;
  /** 時間、距離、料金、燃料費、交通状況を含む単一経路の集計。 */
  route: RouteCostSummary;
  /** この経路がおすすめとして選ばれているかどうか。 */
  recommended: boolean;
}

/**
 * 1つの経路候補について、時間・費用・距離・交通状況とおすすめ状態を表示します。
 *
 * @summary 単一の経路候補を比較用カードで表示
 */
export function RouteCard({ routeType, route, recommended }: RouteCardProps) {
  const title = routeType === "expressway" ? "高速優先ルート" : "一般道ルート";
  const comparisonRole = recommended ? "おすすめ" : "比較対象";
  const totalCostTone = route.totalCostYen === null ? "warn" : "neutral";
  const tollTone =
    route.tollYen === null || route.tollConfidence === "unavailable" ? "warn" : "neutral";

  return (
    <article className={`route-card route-card--${routeType}`}>
      <div className="route-card__header">
        <div>
          <div className="route-card__eyebrow">
            <span className={`route-card__role${recommended ? " route-card__role--recommended" : ""}`}>
              {comparisonRole}
            </span>
          </div>
          <h3>{title}</h3>
        </div>
        <Route size={18} aria-hidden="true" />
      </div>
      <div className="metric-grid">
        <Metric label="時間" value={formatMinutes(route.durationMinutes)} />
        <Metric label="総額" value={formatYen(route.totalCostYen)} tone={totalCostTone} />
        <Metric label="有料道路料金" value={formatYen(route.tollYen)} tone={tollTone} />
        <Metric label="ガソリン代" value={formatYen(route.fuelCostYen)} />
        <Metric label="距離" value={formatDistanceKm(route.distanceKm)} />
      </div>
      {route.tollFallbackMessage ? (
        <div className="route-card__notice">{route.tollFallbackMessage}</div>
      ) : null}
      <div className="route-card__traffic">
        <Gauge size={16} aria-hidden="true" />
        <span>{route.trafficSummary}</span>
      </div>
    </article>
  );
}
