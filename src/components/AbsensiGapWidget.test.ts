import { describe, expect, it } from 'vitest';
import { formatLocalDateKey, getMissingAttendanceDates } from '@/lib/attendance-dates';

function missingDates(today: string, lookbackDays: number, options?: {
  holidays?: string[];
  attendedDates?: string[];
  confirmedDates?: string[];
}) {
  return getMissingAttendanceDates({
    today: new Date(`${today}T12:00:00`),
    lookbackDays,
    holidays: new Set(options?.holidays),
    attendedDates: new Set(options?.attendedDates),
    confirmedDates: new Set(options?.confirmedDates),
  });
}

describe('AbsensiGapWidget date calculation', () => {
  it('keeps local dates instead of shifting them to UTC', () => {
    const date = new Date(2026, 7, 17, 0, 0, 0);

    expect(formatLocalDateKey(date)).toBe('2026-08-17');
  });

  it('excludes Sunday and includes Saturday', () => {
    const dates = missingDates('2026-08-24', 2);

    expect(dates).toEqual(['2026-08-22']);
    expect(dates.some(date => new Date(`${date}T12:00:00`).getDay() === 0)).toBe(false);
  });

  it('does not shift Monday to the previous Sunday', () => {
    const dates = missingDates('2026-08-18', 2);

    expect(dates).toEqual(['2026-08-17']);
  });

  it('excludes holidays, attended dates, and confirmed dates', () => {
    const dates = missingDates('2026-08-24', 6, {
      holidays: ['2026-08-19'],
      attendedDates: ['2026-08-20'],
      confirmedDates: ['2026-08-21'],
    });

    expect(dates).toEqual(['2026-08-18', '2026-08-22']);
  });
});
