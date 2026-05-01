export function formatYen(value: number | null): string {
  if (value === null) return "未確認";
  return `${new Intl.NumberFormat("ja-JP").format(value)}円`;
}

export function formatMinutes(value: number): string {
  if (value >= 60) {
    const hours = Math.floor(value / 60);
    const minutes = value % 60;
    return minutes === 0 ? `${hours}時間` : `${hours}時間${minutes}分`;
  }
  return `${value}分`;
}

export function formatDistanceKm(value: number): string {
  return `${new Intl.NumberFormat("ja-JP", {
    maximumFractionDigits: 1
  }).format(value)}km`;
}
