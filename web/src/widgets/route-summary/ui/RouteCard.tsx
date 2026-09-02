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
  /** 利用者が選んだ車両。有料道路料金の前提と異なる場合に注記します。 */
  vehicleType?: string;
}

/** 経路プロバイダが返す有料道路料金が前提としている車両区分。 */
const TOLL_BASIS_VEHICLE_TYPE = "普通車";

/**
 * 1つの経路候補について、時間・費用・距離・交通状況とおすすめ状態を表示します。
 *
 * @summary 単一の経路候補を比較用カードで表示
 */
export function RouteCard({ routeType, route, recommended, vehicleType }: RouteCardProps) {
  const title = routeType === "expressway" ? "高速優先ルート" : "一般道ルート";
  const comparisonRole = recommended ? "おすすめ" : "比較対象";
  const totalCostTone = route.totalCostYen === null ? "warn" : "neutral";
  const hasToll = route.tollYen !== null && route.tollConfidence !== "unavailable";
  const tollBasisMismatch =
    hasToll && vehicleType !== undefined && vehicleType !== TOLL_BASIS_VEHICLE_TYPE;
  const tollTone = !hasToll || tollBasisMismatch ? "warn" : "neutral";
  const tollLabel = tollBasisMismatch ? "有料道路料金（普通車基準）" : "有料道路料金";

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
        <Metric label={tollLabel} value={formatYen(route.tollYen)} tone={tollTone} />
        <Metric label="ガソリン代" value={formatYen(route.fuelCostYen)} />
        <Metric label="距離" value={formatDistanceKm(route.distanceKm)} />
      </div>
      {tollBasisMismatch ? (
        <div className="route-card__notice">
          有料道路料金と総額は普通車基準です。{vehicleType}の実際の料金は異なります。
        </div>
      ) : null}
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
