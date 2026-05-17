export type TimeOfDayTint = {
  color: string;
  opacity: number;
};

export function getTimeOfDayTint(hour: number): TimeOfDayTint | null {
  if (hour >= 5 && hour < 7)   return { color: '#C8D4E8', opacity: 0.07 };
  if (hour >= 7 && hour < 12)  return null;
  if (hour >= 12 && hour < 17) return { color: '#F5E8C0', opacity: 0.08 };
  if (hour >= 17 && hour < 21) return { color: '#E8C070', opacity: 0.09 };
  return { color: '#2A3048', opacity: 0.10 };
}

export function getWarmthOpacity(recordedDaysCount: number): number {
  if (recordedDaysCount <= 0) return 0;
  return Math.min(Math.sqrt(recordedDaysCount / 90) * 0.06, 0.06);
}
