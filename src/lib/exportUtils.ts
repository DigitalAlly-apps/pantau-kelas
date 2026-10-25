/**
 * Export utilities: proper CSV (RFC 4180) dan XML SpreadsheetML (.xls).
 *
 * Mengapa XML SpreadsheetML dan bukan HTML-as-xls?
 * HTML dengan MIME vnd.ms-excel tidak reliable di Excel 2013+ dan LibreOffice.
 * XML SpreadsheetML (Office XML 2003) adalah format standar yang bisa dibuka
 * tanpa library dan tanpa masalah kompatibilitas.
 */

import type { SemesterConfig } from '@/types';

// ── Filter Types ───────────────────────────────────────────────────────────

/**
 * Opsi filter periode untuk export dan tampilan:
 * - semua / bulan: filter waktu sederhana
 * - sem1 / sem2:   seluruh semester ganjil / genap
 * - sem1_uts dst:  periode ujian spesifik dalam semester
 */
export type ExportSemFilter =
  | 'semua'
  | 'bulan'
  | 'sem1'
  | 'sem1_harian'
  | 'sem1_uts'
  | 'sem1_uas'
  | 'sem2'
  | 'sem2_harian'
  | 'sem2_uts'
  | 'sem2_uas';

export const EXPORT_PERIOD_LABELS: Record<ExportSemFilter, string> = {
  semua:       'Semua Periode',
  bulan:       'Bulan ini',
  sem1:        'Sem 1 · Semua',
  sem1_harian: 'Sem 1 · Harian',
  sem1_uts:    'Sem 1 · UTS',
  sem1_uas:    'Sem 1 · UAS',
  sem2:        'Sem 2 · Semua',
  sem2_harian: 'Sem 2 · Harian',
  sem2_uts:    'Sem 2 · UTS',
  sem2_uas:    'Sem 2 · UAS',
};

// ── Semester & Date Helpers ────────────────────────────────────────────────

/**
 * Cek apakah sebuah tanggal (YYYY-MM-DD) masuk ke Semester Ganjil atau Genap.
 * Memperhitungkan tahun ajaran serta jadwal ujian resmi jika diatur.
 */
export function isDateInSemester(
  date: string,
  targetSem: 'ganjil' | 'genap',
  sem: SemesterConfig,
): boolean {
  if (!date) return false;
  const startYear = Number(sem.tahunAjaran.split('/')[0]);
  if (!startYear || isNaN(startYear)) return true;

  const d = new Date(`${date}T00:00:00`);
  const year = d.getFullYear();
  const month = d.getMonth(); // 0 = Jan, 6 = Jul, 11 = Des

  const inRange = (s?: string, e?: string) => Boolean(s && e && date >= s && date <= e);

  if (targetSem === 'ganjil') {
    // 1. Cek jadwal spesifik Ganjil yang diatur di Setelan
    if (inRange(sem.ganjil.utsStart, sem.ganjil.utsEnd) || inRange(sem.ganjil.uasStart, sem.ganjil.uasEnd)) {
      return true;
    }
    // 2. Standar Semester 1 (Juli s/d Desember)
    if (year === startYear && month >= 6) {
      return true;
    }
    // 3. Toleransi UAS Semester 1 yang jatuh pada awal Januari tahun berikutnya
    if (
      year === startYear + 1 &&
      month === 0 &&
      ((sem.ganjil.uasStart && sem.ganjil.uasStart.startsWith(`${startYear + 1}-01`)) ||
       (sem.ganjil.uasEnd && sem.ganjil.uasEnd.startsWith(`${startYear + 1}-01`)))
    ) {
      return true;
    }
    return false;
  } else {
    // Genap
    // 1. Cek jadwal spesifik Genap yang diatur di Setelan
    if (inRange(sem.genap.utsStart, sem.genap.utsEnd) || inRange(sem.genap.uasStart, sem.genap.uasEnd)) {
      return true;
    }
    // 2. Kecualikan jika tanggal ini merupakan jadwal UAS ganjil
    if (inRange(sem.ganjil.uasStart, sem.ganjil.uasEnd)) {
      return false;
    }
    // 3. Standar Semester 2 (Januari s/d Juni)
    if (year === startYear + 1 && month <= 5) {
      return true;
    }
    return false;
  }
}

/**
 * Dapatkan informasi semester dari tanggal tertentu untuk indikator UI real-time.
 */
export function getSemesterFromDate(
  date: string,
  sem: SemesterConfig,
): { semester: 'ganjil' | 'genap'; label: string; tahunAjaran: string } {
  const isGanjil = isDateInSemester(date, 'ganjil', sem);
  return {
    semester: isGanjil ? 'ganjil' : 'genap',
    label: isGanjil ? 'Semester 1 (Ganjil)' : 'Semester 2 (Genap)',
    tahunAjaran: sem.tahunAjaran,
  };
}

// ── Date Filter ────────────────────────────────────────────────────────────

/**
 * Kembalikan fungsi filter `(date, periodeUjian?) => boolean`.
 *
 * - Jika `periodeUjian` diberikan (record absensi):
 *   Filter langsung mencocokkan jenis periode (Harian/UTS/UAS) dan semester.
 *   Data UAS/UTS TIDAK akan diblokir oleh jadwal Setelan yang belum diatur.
 * - Jika `periodeUjian` tidak ada (kasus/catatan):
 *   Filter menggunakan jadwal rentang tanggal ujian jika dikonfigurasi.
 */
export function buildDateFilter(
  filter: ExportSemFilter,
  sem: SemesterConfig,
): (date: string, periodeUjian?: string) => boolean {
  if (filter === 'semua') return () => true;

  const inSem1 = (date: string) => isDateInSemester(date, 'ganjil', sem);
  const inSem2 = (date: string) => isDateInSemester(date, 'genap', sem);

  const inRange = (date: string, start?: string, end?: string) =>
    Boolean(start && end && date >= start && date <= end);

  switch (filter) {
    case 'bulan': return (date) => {
      const d = new Date(`${date}T00:00:00`);
      const n = new Date();
      return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth();
    };

    case 'sem1': return (date) => inSem1(date);
    case 'sem2': return (date) => inSem2(date);

    case 'sem1_harian': return (date, p) => {
      if (p !== undefined) return (p === 'Harian' || !p) && inSem1(date);
      return inSem1(date);
    };
    case 'sem2_harian': return (date, p) => {
      if (p !== undefined) return (p === 'Harian' || !p) && inSem2(date);
      return inSem2(date);
    };

    case 'sem1_uts': return (date, p) => {
      if (p !== undefined) return p === 'UTS' && inSem1(date);
      return inSem1(date) && inRange(date, sem.ganjil.utsStart, sem.ganjil.utsEnd);
    };
    case 'sem1_uas': return (date, p) => {
      if (p !== undefined) return p === 'UAS' && inSem1(date);
      return inSem1(date) && inRange(date, sem.ganjil.uasStart, sem.ganjil.uasEnd);
    };
    case 'sem2_uts': return (date, p) => {
      if (p !== undefined) return p === 'UTS' && inSem2(date);
      return inSem2(date) && inRange(date, sem.genap.utsStart, sem.genap.utsEnd);
    };
    case 'sem2_uas': return (date, p) => {
      if (p !== undefined) return p === 'UAS' && inSem2(date);
      return inSem2(date) && inRange(date, sem.genap.uasStart, sem.genap.uasEnd);
    };

    default: return () => true;
  }
}

// ── CSV Export ─────────────────────────────────────────────────────────────

/** Escape satu field untuk CSV (RFC 4180). */
function escapeCSVField(value: unknown): string {
  const str = value == null ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

/**
 * Download file CSV dengan proper RFC 4180 escaping dan UTF-8 BOM
 * (BOM diperlukan agar Excel bisa baca karakter Indonesia dengan benar).
 */
export function exportCSV(filename: string, headers: string[], rows: unknown[][]): void {
  const allRows = [headers, ...rows];
  const content = allRows
    .map(row => row.map(escapeCSVField).join(','))
    .join('\r\n');
  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8' });
  triggerDownload(blob, filename.endsWith('.csv') ? filename : filename + '.csv');
}

// ── XLS Export ─────────────────────────────────────────────────────────────

/** Escape string untuk konten XML. */
function escapeXML(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Buat satu elemen <Cell> SpreadsheetML. */
function xmlCell(value: unknown, isHeader = false): string {
  const isNumber = typeof value === 'number' && isFinite(value);
  const type = isNumber ? 'Number' : 'String';
  const content = isNumber ? String(value) : escapeXML(value);
  const style = isHeader ? ' ss:StyleID="h"' : '';
  return `<Cell${style}><Data ss:Type="${type}">${content}</Data></Cell>`;
}

/**
 * Download file Excel menggunakan XML Spreadsheet 2003 (SpreadsheetML).
 * Format ini bisa dibuka di Excel 2003+, LibreOffice, dan Google Sheets
 * tanpa library tambahan.
 */
export function exportXLS(
  filename: string,
  sheetName: string,
  headers: string[],
  rows: unknown[][]
): void {
  const headerRow = `<Row>${headers.map(h => xmlCell(h, true)).join('')}</Row>`;
  const dataRows = rows
    .map(row => `<Row>${row.map(v => xmlCell(v)).join('')}</Row>`)
    .join('');

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<?mso-application progid="Excel.Sheet"?>',
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"',
    ' xmlns:o="urn:schemas-microsoft-com:office:office"',
    ' xmlns:x="urn:schemas-microsoft-com:office:excel"',
    ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"',
    ' xmlns:html="http://www.w3.org/TR/REC-html40">',
    '<Styles>',
    '  <Style ss:ID="h">',
    '    <Font ss:Bold="1"/>',
    '    <Interior ss:Color="#D0D0D0" ss:Pattern="Solid"/>',
    '    <Alignment ss:Horizontal="Center"/>',
    '  </Style>',
    '</Styles>',
    `<Worksheet ss:Name="${escapeXML(sheetName)}">`,
    '<Table>',
    headerRow,
    dataRows,
    '</Table>',
    '</Worksheet>',
    '</Workbook>',
  ].join('\n');

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' });
  triggerDownload(blob, filename.endsWith('.xls') ? filename : filename + '.xls');
}

// ── Utility ────────────────────────────────────────────────────────────────

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
