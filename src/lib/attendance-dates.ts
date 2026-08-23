const HARI_AKTIF = [1, 2, 3, 4, 5, 6]; // Senin–Sabtu (0=Minggu)

export function formatLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export interface MissingAttendanceDatesInput {
  today: Date;
  lookbackDays: number;
  holidays: Set<string>;
  attendedDates: Set<string>;
  confirmedDates: Set<string>;
}

export function getMissingAttendanceDates({
  today,
  lookbackDays,
  holidays,
  attendedDates,
  confirmedDates,
}: MissingAttendanceDatesInput) {
  const currentDay = new Date(today);
  currentDay.setHours(0, 0, 0, 0);
  const result: string[] = [];

  for (let i = lookbackDays; i >= 1; i--) {
    const date = new Date(currentDay);
    date.setDate(currentDay.getDate() - i);
    if (!HARI_AKTIF.includes(date.getDay())) continue;

    const dateStr = formatLocalDateKey(date);
    if (holidays.has(dateStr)) continue;
    if (attendedDates.has(dateStr)) continue;
    if (confirmedDates.has(dateStr)) continue;

    result.push(dateStr);
  }

  return result;
}
