import type {
  CompareRoutesResult,
  RouteAnalysisRequest,
  RouteAnalysisResult,
  RouteCostSummary
} from "../entities/route/model";
import type { FuelPriceAveragesResponse } from "../shared/lib/routeIqApi";

export const defaultRouteInput = {
  origin: "東京都世田谷区用賀1丁目",
  destination: "静岡県御殿場市新橋",
  fuelEfficiencyKmPerLiter: 14.5,
  fuelPriceYenPerLiter: 175,
  vehicleType: "普通車",
  prioritize: "balanced",
  question: "現在の道路状況を確認して"
} satisfies RouteAnalysisRequest;

export const expresswayRoute = {
  distanceKm: 103.2,
  durationMinutes: 75,
  tollYen: 1800,
  tollConfidence: "api",
  fuelCostYen: 1246,
  totalCostYen: 3046,
  trafficSummary: "首都高速の一部に混雑傾向があります。"
} satisfies RouteCostSummary;

export const localRoute = {
  distanceKm: 91.4,
  durationMinutes: 112,
  tollYen: 0,
  tollConfidence: "api",
  fuelCostYen: 1103,
  totalCostYen: 1103,
  trafficSummary: "市街地区間で通常より速度が低下しています。"
} satisfies RouteCostSummary;

export const tollUnavailableRoute = {
  ...expresswayRoute,
  tollYen: null,
  tollConfidence: "unavailable",
  tollFallbackMessage: "有料道路料金を取得できなかったため、総額は未確認です。",
  totalCostYen: null
} satisfies RouteCostSummary;

export const expresswayRecommendedResult = {
  input: defaultRouteInput,
  recommendedRoute: "expressway",
  recommendationReason: "37分の短縮に対する追加費用が、判断基準の範囲内です。",
  expresswayRoute,
  localRoute,
  comparison: {
    timeDifferenceMinutes: 37,
    costDifferenceYen: 1943,
    valueOfTimeSavedYenPerMinute: 52.5
  },
  trafficIncidents: [],
  warnings: [],
  dataSources: ["Google Routes API（Storybook fixture）"],
  apiFailures: []
} satisfies CompareRoutesResult;

export const localRecommendedResult = {
  ...expresswayRecommendedResult,
  recommendedRoute: "local",
  recommendationReason: "時間差に対して追加費用が大きいため、一般道をおすすめします。",
  expresswayRoute: {
    ...expresswayRoute,
    tollYen: 3180,
    totalCostYen: 4426
  },
  comparison: {
    timeDifferenceMinutes: 18,
    costDifferenceYen: 3323,
    valueOfTimeSavedYenPerMinute: 184.6
  }
} satisfies CompareRoutesResult;

export const resultWithApiFailures = {
  ...expresswayRecommendedResult,
  apiFailures: [
    "一部区間の交通状況を取得できませんでした。",
    "料金所別の内訳は確認できませんでした。"
  ]
} satisfies CompareRoutesResult;

export const resultWithUnavailableToll = {
  ...localRecommendedResult,
  expresswayRoute: tollUnavailableRoute,
  comparison: {
    timeDifferenceMinutes: 37,
    costDifferenceYen: null,
    valueOfTimeSavedYenPerMinute: null
  },
  apiFailures: ["高速優先ルートの有料道路料金を取得できませんでした。"]
} satisfies CompareRoutesResult;

export const successfulAnalysis = {
  contextId: "storybook-success",
  input: defaultRouteInput,
  answer: "高速優先ルートと一般道ルートを比較しました。",
  routeComparison: expresswayRecommendedResult,
  dataSources: expresswayRecommendedResult.dataSources,
  warnings: [],
  apiFailures: []
} satisfies RouteAnalysisResult;

export const failedAnalysis = {
  contextId: "storybook-failure",
  input: defaultRouteInput,
  answer:
    "Google Routes API did not include a route for the requested conditions.\n住所や施設名を詳しくして再試行してください。",
  dataSources: [],
  warnings: [],
  apiFailures: ["Google Routes API did not include a route for the requested conditions."]
} satisfies RouteAnalysisResult;

export const fuelPriceAverages = {
  prices: [
    {
      label: "レギュラー",
      value: 175.2,
      unit: "円/L",
      surveyedAt: "2026年7月6日",
      sourceUrl: "https://www.enecho.meti.go.jp/"
    },
    {
      label: "ハイオク",
      value: 186.1,
      unit: "円/L",
      surveyedAt: "2026年7月6日",
      sourceUrl: "https://www.enecho.meti.go.jp/"
    },
    {
      label: "軽油",
      value: 154.8,
      unit: "円/L",
      surveyedAt: "2026年7月6日",
      sourceUrl: "https://www.enecho.meti.go.jp/"
    }
  ],
  sourceLabel: "資源エネルギー庁 石油製品価格調査（Storybook fixture）",
  fetchedAt: "2026-07-06T00:00:00.000Z"
} satisfies FuelPriceAveragesResponse;
