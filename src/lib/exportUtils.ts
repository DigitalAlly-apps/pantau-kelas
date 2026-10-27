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
  | 'sem1_harian_pra_uts'
  | 'sem1_harian_pra_uas'
  | 'sem1_uts'
  | 'sem1_uas'
  | 'sem2'
  | 'sem2_harian'
  | 'sem2_harian_pra_uts'
  | 'sem2_harian_pra_uas'
  | 'sem2_uts'
  | 'sem2_uas';

export const EXPORT_PERIOD_LABELS: Record<ExportSemFilter, string> = {
  semua:               'Semua Periode',
  bulan:               'Bulan ini',
  sem1:                'Sem 1 · Semua Data',
  sem1_harian:         'Sem 1 · 1 Semester Penuh',
  sem1_harian_pra_uts: 'Sem 1 · Rapor UTS (Sebelum UTS)',
  sem1_harian_pra_uas: 'Sem 1 · Rapor UAS (Setelah UTS)',
  sem1_uts:            'Sem 1 · Ujian UTS',
  sem1_uas:            'Sem 1 · Ujian UAS',
  sem2:                'Sem 2 · Semua Data',
  sem2_harian:         'Sem 2 · 1 Semester Penuh',
  sem2_harian_pra_uts: 'Sem 2 · Rapor UTS (Sebelum UTS)',
  sem2_harian_pra_uas: 'Sem 2 · Rapor UAS (Setelah UTS)',
  sem2_uts:            'Sem 2 · Ujian UTS',
  sem2_uas:            'Sem 2 · Ujian UAS',
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

/**
 * Cek apakah record absensi harian masuk ke 'pra_uts' (Sebelum UTS / Rapor UTS)
 * atau 'pra_uas' (Sebelum UAS / Pasca-UTS).
 * 1. Prioritas tag eksplisit (misal subPeriode atau jamUjian === 'pra_uts' | 'pra_uas')
 * 2. Cek jadwal UTS di Setelan jika diisi
 * 3. Fallback bulan tengah semester (Bulan <= 8 untuk Ganjil, Bulan <= 2 untuk Genap)
 */
export function isAbsenPraUts(
  date: string,
  targetSem: 'ganjil' | 'genap',
  sem: SemesterConfig,
  recordSubPeriode?: string,
): boolean {
  if (recordSubPeriode === 'pra_uts') return true;
  if (recordSubPeriode === 'pra_uas') return false;

  const schedule = targetSem === 'ganjil' ? sem.ganjil : sem.genap;
  if (schedule.utsStart) {
    const cutoff = schedule.utsEnd || schedule.utsStart;
    return date <= cutoff;
  }

  // Fallback bulan
  const d = new Date(`${date}T00:00:00`);
  const month = d.getMonth(); // 0 = Jan .. 11 = Dec
  if (targetSem === 'ganjil') {
    return month <= 8; // Juli (6), Agustus (7), September (8) adalah pra-uts
  } else {
    return month <= 2; // Januari (0), Februari (1), Maret (2) adalah pra-uts
  }
}

// ── Date Filter ────────────────────────────────────────────────────────────

/**
 * Kembalikan fungsi filter `(date, periodeUjian?, subPeriode?) => boolean`.
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
): (date: string, periodeUjian?: string, subPeriode?: string) => boolean {
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
    case 'sem1_harian_pra_uts': return (date, p, subP) => {
      if (p !== undefined && p !== 'Harian') return false;
      return inSem1(date) && isAbsenPraUts(date, 'ganjil', sem, subP);
    };
    case 'sem1_harian_pra_uas': return (date, p, subP) => {
      if (p !== undefined && p !== 'Harian') return false;
      return inSem1(date) && !isAbsenPraUts(date, 'ganjil', sem, subP);
    };

    case 'sem2_harian': return (date, p) => {
      if (p !== undefined) return (p === 'Harian' || !p) && inSem2(date);
      return inSem2(date);
    };
    case 'sem2_harian_pra_uts': return (date, p, subP) => {
      if (p !== undefined && p !== 'Harian') return false;
      return inSem2(date) && isAbsenPraUts(date, 'genap', sem, subP);
    };
    case 'sem2_harian_pra_uas': return (date, p, subP) => {
      if (p !== undefined && p !== 'Harian') return false;
      return inSem2(date) && !isAbsenPraUts(date, 'genap', sem, subP);
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
function xmlCell(value: unknown, styleId?: string): string {
  const isNumber = typeof value === 'number' && isFinite(value);
  const type = isNumber ? 'Number' : 'String';
  const content = isNumber ? String(value) : escapeXML(value);
  const style = styleId ? ` ss:StyleID="${styleId}"` : '';
  return `<Cell${style}><Data ss:Type="${type}">${content}</Data></Cell>`;
}

export interface ExportXLSOptions {
  title?: string;
  metadata?: Record<string, string>;
  columnWidths?: number[];
  hasTotalRow?: boolean;
}

/**
 * Download file Excel menggunakan XML Spreadsheet 2003 (SpreadsheetML).
 * Format ini bisa dibuka di Excel 2003+, LibreOffice, dan Google Sheets
 * tanpa library tambahan, dengan styling rapi, lebar kolom, dan kop dokumen.
 */
export function exportXLS(
  filename: string,
  sheetName: string,
  headers: string[],
  rows: unknown[][],
  options?: ExportXLSOptions
): void {
  const metaRows: string[] = [];

  if (options?.title) {
    metaRows.push(`<Row><Cell ss:StyleID="title"><Data ss:Type="String">${escapeXML(options.title)}</Data></Cell></Row>`);
  }

  if (options?.metadata) {
    Object.entries(options.metadata).forEach(([k, v]) => {
      metaRows.push(`<Row><Cell ss:StyleID="meta"><Data ss:Type="String">${escapeXML(k)}: ${escapeXML(v)}</Data></Cell></Row>`);
    });
    metaRows.push('<Row/>'); // Baris kosong pemisah kop & tabel
  }

  const headerRow = `<Row>${headers.map(h => xmlCell(h, 'h')).join('')}</Row>`;

  const dataRows = rows
    .map((row, rIdx) => {
      const isTotal = options?.hasTotalRow && rIdx === rows.length - 1;
      const cells = row.map((v, cIdx) => {
        let styleId = 'cellCenter';
        if (isTotal) {
          styleId = cIdx === 1 ? 'totalLeft' : 'total';
        } else if (cIdx === 1) {
          styleId = 'cellLeft';
        }
        return xmlCell(v, styleId);
      }).join('');
      return `<Row>${cells}</Row>`;
    })
    .join('\n');

  const cols = options?.columnWidths
    ? options.columnWidths.map(w => `<Column ss:Width="${w}"/>`).join('\n')
    : '';

  const cleanSheet = sheetName.replace(/[\\/?*[\]:]/g, ' ').substring(0, 31).trim() || 'Presensi';

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<?mso-application progid="Excel.Sheet"?>',
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"',
    ' xmlns:o="urn:schemas-microsoft-com:office:office"',
    ' xmlns:x="urn:schemas-microsoft-com:office:excel"',
    ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"',
    ' xmlns:html="http://www.w3.org/TR/REC-html40">',
    '<Styles>',
    '  <Style ss:ID="Default" ss:Name="Normal">',
    '    <Alignment ss:Vertical="Center"/>',
    '    <Borders/>',
    '    <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#000000"/>',
    '    <Interior/>',
    '    <NumberFormat/>',
    '    <Protection/>',
    '  </Style>',
    '  <Style ss:ID="title">',
    '    <Font ss:FontName="Calibri" ss:Size="13" ss:Bold="1" ss:Color="#0F172A"/>',
    '    <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>',
    '  </Style>',
    '  <Style ss:ID="meta">',
    '    <Font ss:FontName="Calibri" ss:Size="9" ss:Color="#475569"/>',
    '    <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>',
    '  </Style>',
    '  <Style ss:ID="h">',
    '    <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>',
    '    <Interior ss:Color="#1E293B" ss:Pattern="Solid"/>',
    '    <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>',
    '    <Borders>',
    '      <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#94A3B8"/>',
    '      <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#94A3B8"/>',
    '      <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#94A3B8"/>',
    '      <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#94A3B8"/>',
    '    </Borders>',
    '  </Style>',
    '  <Style ss:ID="cellLeft">',
    '    <Font ss:FontName="Calibri" ss:Size="10"/>',
    '    <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>',
    '    <Borders>',
    '      <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>',
    '      <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>',
    '      <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>',
    '      <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>',
    '    </Borders>',
    '  </Style>',
    '  <Style ss:ID="cellCenter">',
    '    <Font ss:FontName="Calibri" ss:Size="10"/>',
    '    <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>',
    '    <Borders>',
    '      <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>',
    '      <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>',
    '      <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>',
    '      <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>',
    '    </Borders>',
    '  </Style>',
    '  <Style ss:ID="totalLeft">',
    '    <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#0F172A"/>',
    '    <Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/>',
    '    <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>',
    '    <Borders>',
    '      <Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3" ss:Color="#64748B"/>',
    '      <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#64748B"/>',
    '      <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>',
    '      <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>',
    '    </Borders>',
    '  </Style>',
    '  <Style ss:ID="total">',
    '    <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#0F172A"/>',
    '    <Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/>',
    '    <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>',
    '    <Borders>',
    '      <Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3" ss:Color="#64748B"/>',
    '      <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#64748B"/>',
    '      <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>',
    '      <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>',
    '    </Borders>',
    '  </Style>',
    '</Styles>',
    `<Worksheet ss:Name="${escapeXML(cleanSheet)}">`,
    '<Table>',
    cols,
    metaRows.join('\n'),
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
