export function formatNotificationDuration(minutesValue: number, isRu: boolean): string {
  const numericMinutes = Number(minutesValue);
  const totalSeconds = Number.isFinite(numericMinutes)
    ? Math.max(1, Math.round(numericMinutes * 60))
    : 60;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const parts: string[] = [];
  if (minutes > 0) parts.push(`${minutes} ${isRu ? 'мин' : 'min'}`);
  if (seconds > 0) parts.push(`${seconds} ${isRu ? 'сек' : 'sec'}`);
  return parts.join(' ');
}
