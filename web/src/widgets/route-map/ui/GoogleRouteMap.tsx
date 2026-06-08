import { ArrowRight, ExternalLink, MapPinned } from "lucide-react";
import { useEffect, useState } from "react";
import type { RouteInput } from "../../../entities/route/model";
import {
  getClientConfig,
  getGoogleMapsBrowserApiKey
} from "../../../shared/lib/routeIqApi";

interface GoogleRouteMapProps {
  input: RouteInput;
}

function buildDirectionsUrl(input: RouteInput): string {
  const url = new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api", "1");
  url.searchParams.set("origin", input.origin);
  url.searchParams.set("destination", input.destination);
  url.searchParams.set("travelmode", "driving");
  return url.toString();
}

function buildEmbedUrl(input: RouteInput, apiKey: string | null): string | null {
  if (!apiKey) return null;
  const url = new URL("https://www.google.com/maps/embed/v1/directions");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("origin", input.origin);
  url.searchParams.set("destination", input.destination);
  url.searchParams.set("mode", "driving");
  url.searchParams.set("language", "ja");
  url.searchParams.set("region", "JP");
  return url.toString();
}

function formatLocationLabel(value: string): string {
  return value
    .replace(/^日本、?/, "")
    .replace(/〒\d{3}-\d{4}\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function GoogleRouteMap({ input }: GoogleRouteMapProps) {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const directionsUrl = buildDirectionsUrl(input);
  const embedUrl = buildEmbedUrl(input, apiKey);
  const originLabel = formatLocationLabel(input.origin);
  const destinationLabel = formatLocationLabel(input.destination);

  useEffect(() => {
    let ignore = false;
    getClientConfig()
      .then((config) => {
        if (!ignore) setApiKey(getGoogleMapsBrowserApiKey(config));
      })
      .catch(() => {
        if (!ignore) setApiKey(null);
      });
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <section className="route-map" aria-label="Google マップ">
      <div className="route-map__header">
        <div className="route-map__heading">
          <p>経路表示</p>
          <h2>地図でルートを確認</h2>
        </div>
        <a className="route-map__link" href={directionsUrl} target="_blank" rel="noreferrer">
          <ExternalLink size={16} aria-hidden="true" />
          Google マップで開く
        </a>
        <div className="route-map__waypoints" aria-label="表示中の経路">
          <div className="route-map__waypoint">
            <span className="route-map__waypoint-tag">出発地</span>
            <strong title={input.origin}>{originLabel}</strong>
          </div>
          <span className="route-map__waypoint-arrow" aria-hidden="true">
            <ArrowRight size={16} />
          </span>
          <div className="route-map__waypoint route-map__waypoint--destination">
            <span className="route-map__waypoint-tag">目的地</span>
            <strong title={input.destination}>{destinationLabel}</strong>
          </div>
        </div>
      </div>

      {embedUrl ? (
        <iframe
          title={`${input.origin} から ${input.destination} までの経路`}
          src={embedUrl}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      ) : (
        <div className="route-map__fallback">
          <MapPinned size={20} aria-hidden="true" />
          <span>埋め込み表示には GOOGLE_MAPS_BROWSER_API_KEY と Maps Embed API の有効化が必要です。</span>
        </div>
      )}
    </section>
  );
}
