const FALLBACK_FUEL_PRICE_YEN_PER_LITER = 175;

export interface FuelPriceResolution {
  fuelPriceYenPerLiter: number;
  warning?: string;
}

export function estimateFuelCostYen(
  distanceKm: number,
  fuelEfficiencyKmPerLiter: number,
  fuelPriceYenPerLiter: number
): number {
  if (distanceKm < 0) {
    throw new Error("distanceKm must be greater than or equal to 0.");
  }
  if (fuelEfficiencyKmPerLiter <= 0) {
    throw new Error("fuelEfficiencyKmPerLiter must be greater than 0.");
  }
  if (fuelPriceYenPerLiter < 0) {
    throw new Error("fuelPriceYenPerLiter must be greater than or equal to 0.");
  }

  return Math.round((distanceKm / fuelEfficiencyKmPerLiter) * fuelPriceYenPerLiter);
}

export function resolveFuelPrice(
  userFuelPriceYenPerLiter: number | undefined,
  envFuelPriceYenPerLiter: number | undefined
): FuelPriceResolution {
  if (typeof userFuelPriceYenPerLiter === "number") {
    return { fuelPriceYenPerLiter: userFuelPriceYenPerLiter };
  }
  if (typeof envFuelPriceYenPerLiter === "number") {
    return { fuelPriceYenPerLiter: envFuelPriceYenPerLiter };
  }

  return {
    fuelPriceYenPerLiter: FALLBACK_FUEL_PRICE_YEN_PER_LITER,
    warning:
      "ガソリン価格が未入力で DEFAULT_FUEL_PRICE_YEN_PER_LITER も未設定のため、175円/Lで概算しました。"
  };
}
