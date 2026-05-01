const MINIMUM_DEPARTURE_OFFSET_MS = 5 * 60 * 1000;

export const departureTimeWindowMessage =
  "出発時刻は現在から5分後から当日中までを指定してください。";

function isSameLocalDate(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

export function isDepartureTimeWithinToday(value: string, now = new Date()): boolean {
  const departure = new Date(value);
  if (!Number.isFinite(departure.getTime())) return false;

  return (
    departure.getTime() > now.getTime() + MINIMUM_DEPARTURE_OFFSET_MS &&
    isSameLocalDate(departure, now)
  );
}

export function parseDepartureTimeToday(
  hourText: string,
  minuteText?: string,
  now = new Date()
): string | undefined {
  const hour = Number(hourText);
  const minute = minuteText ? Number(minuteText) : 0;
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return undefined;
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) return undefined;

  const departure = new Date(now);
  departure.setHours(hour, minute, 0, 0);
  if (!isDepartureTimeWithinToday(departure.toISOString(), now)) return undefined;
  return departure.toISOString();
}
