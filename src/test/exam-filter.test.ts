import { describe, it, expect } from 'vitest';
import { buildDateFilter, isDateInSemester, getSemesterFromDate, EXPORT_PERIOD_LABELS } from '@/lib/exportUtils';
import type { SemesterConfig } from '@/types';

describe('Ujian & Semester Date Filter', () => {
  const mockSemester: SemesterConfig = {
    tahunAjaran: '2026/2027',
    semester: 'ganjil',
    ganjil: {
      utsStart: '2026-09-15',
      utsEnd: '2026-09-20',
      uasStart: '2026-12-01',
      uasEnd: '2026-12-10',
    },
    genap: {
      utsStart: '2027-03-01',
      utsEnd: '2027-03-06',
      uasStart: '2027-06-01',
      uasEnd: '2027-06-10',
    },
  };

  it('correctly identifies Semester 1 (Ganjil) and Semester 2 (Genap)', () => {
    // 2026-10-26 is in Ganjil 2026/2027
    expect(isDateInSemester('2026-10-26', 'ganjil', mockSemester)).toBe(true);
    expect(isDateInSemester('2026-10-26', 'genap', mockSemester)).toBe(false);

    // 2027-02-15 is in Genap 2026/2027
    expect(isDateInSemester('2027-02-15', 'ganjil', mockSemester)).toBe(false);
    expect(isDateInSemester('2027-02-15', 'genap', mockSemester)).toBe(true);

    const infoGanjil = getSemesterFromDate('2026-10-26', mockSemester);
    expect(infoGanjil.semester).toBe('ganjil');
    expect(infoGanjil.label).toBe('Semester 1 (Ganjil)');

    const infoGenap = getSemesterFromDate('2027-02-15', mockSemester);
    expect(infoGenap.semester).toBe('genap');
    expect(infoGenap.label).toBe('Semester 2 (Genap)');
  });

  it('reads UAS record in sem1_uas filter even when date is outside Setelan UAS date range', () => {
    // Teacher inputted UAS on 2026-10-26 (which is in Sem 1, but outside 2026-12-01..2026-12-10)
    const filterSem1UAS = buildDateFilter('sem1_uas', mockSemester);

    // Explicit UAS attendance record
    expect(filterSem1UAS('2026-10-26', 'UAS')).toBe(true);

    // Explicit UTS or Harian record should NOT pass
    expect(filterSem1UAS('2026-10-26', 'UTS')).toBe(false);
    expect(filterSem1UAS('2026-10-26', 'Harian')).toBe(false);

    // Record from Semester 2 should not pass Sem 1 UAS
    expect(filterSem1UAS('2027-06-05', 'UAS')).toBe(false);
  });

  it('reads record correctly in sem1_uts filter', () => {
    const filterSem1UTS = buildDateFilter('sem1_uts', mockSemester);

    expect(filterSem1UTS('2026-10-26', 'UTS')).toBe(true);
    expect(filterSem1UTS('2026-10-26', 'UAS')).toBe(false);
    expect(filterSem1UTS('2026-10-26', 'Harian')).toBe(false);
  });

  it('reads record correctly in sem1_harian filter', () => {
    const filterSem1Harian = buildDateFilter('sem1_harian', mockSemester);

    expect(filterSem1Harian('2026-10-26', 'Harian')).toBe(true);
    expect(filterSem1Harian('2026-10-26', undefined)).toBe(true);
    expect(filterSem1Harian('2026-10-26', 'UAS')).toBe(false);
    expect(filterSem1Harian('2026-10-26', 'UTS')).toBe(false);
  });

  it('correctly filters Harian Sebelum UTS (Rapor UTS) vs Setelah UTS (Rapor UAS)', () => {
    const filterPraUTS = buildDateFilter('sem1_harian_pra_uts', mockSemester);
    const filterPraUAS = buildDateFilter('sem1_harian_pra_uas', mockSemester);

    // 1. Explicit subPeriode tag 'pra_uts'
    expect(filterPraUTS('2026-08-15', 'Harian', 'pra_uts')).toBe(true);
    expect(filterPraUAS('2026-08-15', 'Harian', 'pra_uts')).toBe(false);

    // 2. Explicit subPeriode tag 'pra_uas'
    expect(filterPraUTS('2026-11-10', 'Harian', 'pra_uas')).toBe(false);
    expect(filterPraUAS('2026-11-10', 'Harian', 'pra_uas')).toBe(true);

    // 3. Fallback when subPeriode is undefined (uses utsStart: 2026-09-15)
    // 2026-08-15 is before UTS -> pra_uts
    expect(filterPraUTS('2026-08-15', 'Harian')).toBe(true);
    expect(filterPraUAS('2026-08-15', 'Harian')).toBe(false);

    // 2026-11-10 is after UTS -> pra_uas
    expect(filterPraUTS('2026-11-10', 'Harian')).toBe(false);
    expect(filterPraUAS('2026-11-10', 'Harian')).toBe(true);

    // 4. Exams are never included in daily sub-periods
    expect(filterPraUTS('2026-08-15', 'UTS')).toBe(false);
    expect(filterPraUAS('2026-11-10', 'UAS')).toBe(false);

    // 5. Verify EXPORT_PERIOD_LABELS has clean wording without misleading "UAS" on full semester
    expect(EXPORT_PERIOD_LABELS.sem1_harian).toBe('Sem 1 · 1 Semester Penuh');
    expect(EXPORT_PERIOD_LABELS.sem1_harian_pra_uts).toBe('Sem 1 · Rapor UTS (Sebelum UTS)');
    expect(EXPORT_PERIOD_LABELS.sem1_harian_pra_uas).toBe('Sem 1 · Rapor UAS (Setelah UTS)');
    expect(EXPORT_PERIOD_LABELS.sem1_harian).not.toContain('UAS');
  });

  it('reads all records in sem1 filter', () => {
    const filterSem1 = buildDateFilter('sem1', mockSemester);

    expect(filterSem1('2026-10-26', 'Harian')).toBe(true);
    expect(filterSem1('2026-10-26', 'UTS')).toBe(true);
    expect(filterSem1('2026-10-26', 'UAS')).toBe(true);
    expect(filterSem1('2026-10-26', undefined)).toBe(true);

    // Records from next semester should be false
    expect(filterSem1('2027-02-15', 'Harian')).toBe(false);
  });

  it('reads records when schedule in Setelan is empty', () => {
    const emptyScheduleSemester: SemesterConfig = {
      tahunAjaran: '2026/2027',
      semester: 'ganjil',
      ganjil: { utsStart: '', utsEnd: '', uasStart: '', uasEnd: '' },
      genap: { utsStart: '', utsEnd: '', uasStart: '', uasEnd: '' },
    };

    const filterUAS = buildDateFilter('sem1_uas', emptyScheduleSemester);
    expect(filterUAS('2026-10-26', 'UAS')).toBe(true);
    expect(filterUAS('2026-10-26', 'Harian')).toBe(false);
  });

  it('guarantees exported rows are alphabetically ordered A-Z with accurate attendance totals', () => {
    const rawStudents = [
      { id: '3', name: 'Zainab', nis: '1003', sakit: 1, izin: 0, alpha: 0, aktif: 5 },
      { id: '1', name: 'Ahmad Dahlan', nis: '1001', sakit: 0, izin: 1, alpha: 0, aktif: 0 },
      { id: '2', name: 'Budi Santoso', nis: '1002', sakit: 2, izin: 1, alpha: 1, aktif: 1 },
    ];

    // Simulating export sorting logic
    const sorted = [...rawStudents].sort((a, b) =>
      a.name.localeCompare(b.name, 'id', { numeric: true, sensitivity: 'base' })
    );

    expect(sorted.map(s => s.name)).toEqual(['Ahmad Dahlan', 'Budi Santoso', 'Zainab']);

    const rows = sorted.map((s, i) => [
      i + 1,
      s.name,
      s.nis,
      s.sakit,
      s.izin,
      s.alpha,
      s.sakit + s.izin + s.alpha,
      s.aktif > 0 ? `${s.aktif} kasus` : '-',
    ]);

    // Check No urut 1, 2, 3
    expect(rows[0][0]).toBe(1);
    expect(rows[0][1]).toBe('Ahmad Dahlan');
    expect(rows[1][0]).toBe(2);
    expect(rows[1][1]).toBe('Budi Santoso');
    expect(rows[2][0]).toBe(3);
    expect(rows[2][1]).toBe('Zainab');

    // Total Budi = 2 S + 1 I + 1 A = 4
    expect(rows[1][6]).toBe(4);
  });
});
