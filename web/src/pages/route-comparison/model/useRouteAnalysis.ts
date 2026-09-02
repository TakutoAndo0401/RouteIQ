import { useCallback, useState } from "react";
import type { RouteAnalysisRequest, RouteAnalysisResult } from "../../../entities/route/model";
import { analyzeRoute, RouteIqApiError } from "../../../shared/lib/routeIqApi";

export interface RouteAnalysisError {
  /** 利用者に見せる日本語の説明。 */
  message: string;
  /** 次に取るべき操作の案内。 */
  recovery: string;
  /** 折りたたみで開示する元のエラー文字列。 */
  detail: string | null;
  /** 同じ条件で再試行する価値があるか。 */
  retryable: boolean;
}

function describeError(caught: unknown): RouteAnalysisError {
  const detail = caught instanceof Error ? caught.message : String(caught);

  if (caught instanceof RouteIqApiError) {
    switch (caught.kind) {
      case "network":
        return {
          message: "サーバーに接続できませんでした。",
          recovery: "ネットワーク接続を確認してから、もう一度お試しください。",
          detail,
          retryable: true
        };
      case "rate-limit":
        return {
          message: "リクエストが集中しています。",
          recovery: "1 分ほど待ってから再試行してください。",
          detail,
          retryable: true
        };
      case "invalid-request":
        return {
          message: "この条件では経路を判定できませんでした。",
          recovery: "出発地・目的地をより具体的な住所に変えるか、地図から選び直してください。",
          detail,
          retryable: false
        };
      case "server":
        return {
          message: "サーバー側で処理を完了できませんでした。",
          recovery: "時間をおいて再試行してください。続く場合は管理者に連絡してください。",
          detail,
          retryable: true
        };
      default:
        break;
    }
  }

  return {
    message: "道路状況の確認に失敗しました。",
    recovery: "入力内容を確認して、もう一度お試しください。",
    detail,
    retryable: true
  };
}

export function useRouteAnalysis() {
  const [analysis, setAnalysis] = useState<RouteAnalysisResult | null>(null);
  const [error, setError] = useState<RouteAnalysisError | null>(null);
  const [busy, setBusy] = useState(false);
  const [stale, setStale] = useState(false);

  /**
   * 直前の結果を残したまま「条件が変わった」ことだけを記録します。
   * 比較ツールでは前の答えが次の判断材料になるため、入力のたびに結果を破棄しません。
   * 結果が無いときの stale は利用側で無視されます。
   */
  const markStale = useCallback(() => {
    setError(null);
    setStale(true);
  }, []);

  const clear = useCallback(() => {
    setAnalysis(null);
    setError(null);
    setStale(false);
  }, []);

  const submit = useCallback(async (input: RouteAnalysisRequest) => {
    setBusy(true);
    setError(null);
    try {
      const nextAnalysis = await analyzeRoute(input);
      setAnalysis(nextAnalysis);
      setStale(false);
      return nextAnalysis;
    } catch (caught) {
      setError(describeError(caught));
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  return {
    analysis,
    busy,
    clear,
    error,
    markStale,
    stale,
    submit
  };
}
