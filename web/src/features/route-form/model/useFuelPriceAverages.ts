import { useEffect, useState } from "react";
import {
  getFuelPriceAverages,
  type FuelPriceAveragesResponse
} from "../../../shared/lib/routeIqApi";

export function useFuelPriceAverages() {
  const [fuelPriceAverages, setFuelPriceAverages] =
    useState<FuelPriceAveragesResponse | null>(null);
  const [fuelPriceError, setFuelPriceError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    getFuelPriceAverages()
      .then((response) => {
        if (!ignore) setFuelPriceAverages(response);
      })
      .catch(() => {
        if (!ignore) setFuelPriceError("全国平均価格を取得できませんでした。");
      });
    return () => {
      ignore = true;
    };
  }, []);

  return {
    fuelPriceAverages,
    fuelPriceError
  };
}
