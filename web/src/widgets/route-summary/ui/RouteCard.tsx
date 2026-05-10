import { Fuel, Gauge, ReceiptText, Route } from "lucide-react";
import {
  formatDistanceKm,
  formatMinutes,
  formatYen,
  type RouteCostSummary,
  type RouteType
} from "../../../entities/route/model";
import { Metric } from "../../../shared/ui";

interface RouteCardProps {
  routeType: RouteType;
  route: RouteCostSummary;
  recommended: boolean;
}

export function RouteCard({ routeType, route, recommended }: RouteCardProps) {
  const title = routeType === "expressway" ? "高速優先ルート" : "一般道ルート";

  return (
    <article className={`route-card route-card--${routeType}`}>
      <div className="route-card__header">
        <div>
          <h3>{title}</h3>
          {recommended && <span className="route-card__badge">おすすめ</span>}
        </div>
        <Route size={18} aria-hidden="true" />
      </div>
      <div className="metric-grid">
        <Metric label="距離" value={formatDistanceKm(route.distanceKm)} />
        <Metric label="時間" value={formatMinutes(route.durationMinutes)} />
        <Metric label="有料道路料金" value={formatYen(route.tollYen)} tone="warn" />
        <Metric label="ガソリン代" value={formatYen(route.fuelCostYen)} />
        <Metric label="総額" value={formatYen(route.totalCostYen)} tone="good" />
      </div>
      {route.tollFallbackMessage ? (
        <div className="route-card__notice">{route.tollFallbackMessage}</div>
      ) : null}
      <div className="route-card__traffic">
        <Gauge size={16} aria-hidden="true" />
        <span>{route.trafficSummary}</span>
      </div>
      <div className="route-card__icons" aria-hidden="true">
        <Fuel size={15} />
        <ReceiptText size={15} />
      </div>
    </article>
  );
}
