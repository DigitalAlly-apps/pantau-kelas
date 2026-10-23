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
  | 'sem1_uts'
  | 'sem1_uas'
  | 'sem2'
  | 'sem2_uts'
  | 'sem2_uas';

export const EXPORT_PERIOD_LABELS: Record<ExportSemFilter, string> = {
  semua:    'Semua',
  bulan:    'Bulan ini',
  sem1:     'Sem 1 · Ganjil',
  sem1_uts: 'Sem 1 · UTS',
  sem1_uas: 'Sem 1 · UAS',
  sem2:     'Sem 2 · Genap',
  sem2_uts: 'Sem 2 · UTS',
  sem2_uas: 'Sem 2 · UAS',
};

// ── Date Filter ────────────────────────────────────────────────────────────

/**
 * Kembalikan fungsi filter `(date, periodeUjian?) => boolean`.
 *
 * Jika `periodeUjian` diberikan (absen record), filter mempertimbangkan
 * jenis periode (UTS/UAS). Jika tidak (kasus/catatan), hanya date range
 * yang diperiksa — sehingga kasus/catatan selalu difilter berdasarkan
 * rentang tanggal saja, tidak oleh jenis periodeUjian.
 *
 * Fallback: jika jadwal UTS/UAS belum dikonfigurasi di Setelan (string
 * kosong), inRange() mengembalikan true sehingga data tetap tampil.
 */
export function buildDateFilter(
  filter: ExportSemFilter,
  sem: SemesterConfig,
): (date: string, periodeUjian?: string) => boolean {
  if (filter === 'semua') return () => true;

  const startYear = Number(sem.tahunAjaran.split('/')[0]);

  const inSem1 = (date: string) => {
    const d = new Date(`${date}T00:00:00`);
    return d.getFullYear() === startYear && d.getMonth() >= 6;
  };
  const inSem2 = (date: string) => {
    const d = new Date(`${date}T00:00:00`);
    return d.getFullYear() === startYear + 1 && d.getMonth() <= 5;
  };
  // Jika start/end kosong (belum dikonfigurasi), anggap semua tanggal lolos
  const inRange = (date: string, start: string, end: string) =>
    !start || !end || (date >= start && date <= end);

  switch (filter) {
    case 'bulan': return (date) => {
      const d = new Date(`${date}T00:00:00`);
      const n = new Date();
      return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth();
    };

    case 'sem1': return (date) => inSem1(date);
    case 'sem2': return (date) => inSem2(date);

    case 'sem1_uts': return (date, p) => {
      if (p !== undefined && p !== 'UTS') return false;
      return inSem1(date) && inRange(date, sem.ganjil.utsStart, sem.ganjil.utsEnd);
    };
    case 'sem1_uas': return (date, p) => {
      if (p !== undefined && p !== 'UAS') return false;
      return inSem1(date) && inRange(date, sem.ganjil.uasStart, sem.ganjil.uasEnd);
    };
    case 'sem2_uts': return (date, p) => {
      if (p !== undefined && p !== 'UTS') return false;
      return inSem2(date) && inRange(date, sem.genap.utsStart, sem.genap.utsEnd);
    };
    case 'sem2_uas': return (date, p) => {
      if (p !== undefined && p !== 'UAS') return false;
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
