import { useCallback, useState } from "react";
import type { RouteAnalysisRequest, RouteAnalysisResult } from "../../../entities/route/model";
import { analyzeRoute } from "../../../shared/lib/routeIqApi";

export function useRouteAnalysis() {
  const [analysis, setAnalysis] = useState<RouteAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = useCallback(async (input: RouteAnalysisRequest) => {
    setBusy(true);
    setError(null);
    try {
      setAnalysis(await analyzeRoute(input));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "道路状況の確認に失敗しました。");
    } finally {
      setBusy(false);
    }
  }, []);

  return {
    analysis,
    busy,
    error,
    submit
  };
}
