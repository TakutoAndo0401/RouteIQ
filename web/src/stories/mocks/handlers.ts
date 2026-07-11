import { http } from "msw/core/http";
import { fuelPriceAverages, successfulAnalysis } from "../fixtures";

export const defaultMswHandlers = {
  clientConfig: http.get("/api/client-config", () =>
    Response.json({
      googleMapsBrowserApiKey: null
    })
  ),
  fuelPrices: http.get("/api/fuel-prices", () => Response.json(fuelPriceAverages)),
  routeAnalysis: http.post("/api/route-analysis", () => Response.json(successfulAnalysis))
};
