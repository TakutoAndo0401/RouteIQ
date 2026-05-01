import type { CongestionLevel } from "./types.js";

export interface SpeedReadingInterval {
  startPolylinePointIndex?: number;
  endPolylinePointIndex?: number;
  speed?: "NORMAL" | "SLOW" | "TRAFFIC_JAM" | string;
}

type SpeedCategory = "normal" | "slow" | "trafficJam" | "unknown";

interface TrafficCounts {
  normal: number;
  slow: number;
  trafficJam: number;
  unknown: number;
}

function speedCategory(speed: SpeedReadingInterval["speed"]): SpeedCategory {
  if (speed === "NORMAL") return "normal";
  if (speed === "SLOW") return "slow";
  if (speed === "TRAFFIC_JAM") return "trafficJam";
  return "unknown";
}

function incrementCount(counts: TrafficCounts, category: SpeedCategory, value: number): void {
  counts[category] += value;
}

function formatPercent(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

function rangeLength(interval: SpeedReadingInterval): number | null {
  const start = interval.startPolylinePointIndex ?? 0;
  const end = interval.endPolylinePointIndex;
  if (typeof end !== "number" || end <= start) return null;
  return end - start;
}

function weightedPosition(intervals: SpeedReadingInterval[]): string | null {
  let weightedMidpoint = 0;
  let totalWeight = 0;
  let maxEnd = 0;

  for (const interval of intervals) {
    const category = speedCategory(interval.speed);
    if (category !== "slow" && category !== "trafficJam") continue;

    const start = interval.startPolylinePointIndex ?? 0;
    const end = interval.endPolylinePointIndex;
    const length = rangeLength(interval);
    if (typeof end !== "number" || length === null) continue;

    maxEnd = Math.max(maxEnd, end);
    const weight = category === "trafficJam" ? length * 2 : length;
    weightedMidpoint += ((start + end) / 2) * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0 || maxEnd === 0) return null;

  const ratio = weightedMidpoint / totalWeight / maxEnd;
  if (ratio < 0.34) return "前半";
  if (ratio < 0.67) return "中盤";
  return "後半";
}

export function summarizeSpeedIntervals(intervals: SpeedReadingInterval[]): {
  congestionLevel: CongestionLevel;
  trafficSummary: string;
} {
  if (intervals.length === 0) {
    return {
      congestionLevel: "unknown",
      trafficSummary: "交通速度区間データは取得できませんでした。"
    };
  }

  const weightedCounts = { normal: 0, slow: 0, trafficJam: 0, unknown: 0 };
  const intervalCounts = { normal: 0, slow: 0, trafficJam: 0, unknown: 0 };
  let hasPolylineIndexes = false;

  for (const interval of intervals) {
    const category = speedCategory(interval.speed);
    incrementCount(intervalCounts, category, 1);

    const length = rangeLength(interval);
    if (length === null) continue;

    hasPolylineIndexes = true;
    incrementCount(weightedCounts, category, length);
  }

  const counts = hasPolylineIndexes ? weightedCounts : intervalCounts;
  const total = counts.normal + counts.slow + counts.trafficJam + counts.unknown;
  const detail = hasPolylineIndexes
    ? `速度区間の割合は通常 ${formatPercent(counts.normal, total)}%、低速 ${formatPercent(counts.slow, total)}%、渋滞 ${formatPercent(counts.trafficJam, total)}%です。`
    : `速度区間の内訳は NORMAL: ${counts.normal}, SLOW: ${counts.slow}, TRAFFIC_JAM: ${counts.trafficJam} です。`;
  const position = weightedPosition(intervals);

  if (counts.trafficJam > 0) {
    return {
      congestionLevel: "high",
      trafficSummary: `渋滞区間が含まれます。${position ? `ルートの${position}に遅れが集中しています。` : ""}${detail}`
    };
  }
  if (counts.slow > 0) {
    return {
      congestionLevel: "moderate",
      trafficSummary: `一部で低速区間があります。${position ? `ルートの${position}に遅れが出ています。` : ""}${detail}`
    };
  }
  if (counts.normal > 0 && counts.unknown === 0) {
    return {
      congestionLevel: "low",
      trafficSummary: `大きな渋滞は検出されていません。${detail}`
    };
  }

  return {
    congestionLevel: "unknown",
    trafficSummary: "交通速度区間の一部または全部が不明です。"
  };
}
