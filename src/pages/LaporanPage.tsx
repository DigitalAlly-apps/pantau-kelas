import { useMemo, useState } from 'react';
import { ArrowLeft, Download, FileSpreadsheet, Search, X, Info } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { RiwayatPage } from './RiwayatPage';
import { exportCSV, exportXLS, buildDateFilter, EXPORT_PERIOD_LABELS } from '@/lib/exportUtils';
import type { ExportSemFilter } from '@/lib/exportUtils';

type SemRow    = 'sem1' | 'sem2' | 'bulan' | 'semua';
type PeriodeRow = 'semua' | 'harian' | 'harian_pra_uts' | 'harian_pra_uas' | 'UTS' | 'UAS';

export function LaporanPage() {
  const {
    kelasList, activeKelas, absenRecords, kasusRecords, catatanRecords,
    semester, setActiveTab,
  } = useApp();
  const kelas = kelasList.find(k => k.id === activeKelas);

  // Baris 1: pilih semester (default = semester aktif saat ini)
  const [semesterRow, setSemesterRow] = useState<SemRow>(() =>
    semester.semester === 'ganjil' ? 'sem1' : 'sem2'
  );
  // Baris 2: sub-filter periode (default: absensi reguler 1 semester penuh)
  const [periodeRow, setPeriodeRow] = useState<PeriodeRow>('harian');
  const [query, setQuery]           = useState('');
  const [studentId, setStudentId]   = useState<string | null>(null);
  const [showRecap, setShowRecap]   = useState(false);
  const [manageMode, setManageMode] = useState<'absen' | 'jurnal' | null>(null);

  // Satu filter terpadu yang mengontrol tampilan DAN export
  const activePeriod = useMemo((): ExportSemFilter => {
    if (semesterRow === 'bulan' || semesterRow === 'semua') return semesterRow as ExportSemFilter;
    if (periodeRow === 'semua') return semesterRow as ExportSemFilter;
    return `${semesterRow}_${periodeRow.toLowerCase()}` as ExportSemFilter;
  }, [semesterRow, periodeRow]);

  const dateFilter = useMemo(
    () => buildDateFilter(activePeriod, semester),
    [activePeriod, semester],
  );

  const showSubFilter   = semesterRow === 'sem1' || semesterRow === 'sem2';
  const scheduleConfig  = semesterRow === 'sem1' ? semester.ganjil : semester.genap;
  const showScheduleHint =
    (periodeRow === 'UTS' && !scheduleConfig.utsStart) ||
    (periodeRow === 'UAS' && !scheduleConfig.uasStart);

  const periodLabel = EXPORT_PERIOD_LABELS[activePeriod];

  const students = useMemo(() => (kelas?.students || []).map(student => {
    const absen = absenRecords.filter(a =>
      a.kelasId === activeKelas && a.studentId === student.id &&
      dateFilter(a.date, a.periodeUjian, a.subPeriode || a.jamUjian)
    );
    const aktif = kasusRecords.filter(k =>
      k.kelasId === activeKelas && k.studentId === student.id &&
      dateFilter(k.date) && (k.status === 'baru' || k.status === 'proses')
    ).length;
    const sakit = absen.filter(a => a.status === 'S').length;
    const izin  = absen.filter(a => a.status === 'I').length;
    const alpha = absen.filter(a => a.status === 'A').length;
    return { ...student, sakit, izin, alpha, aktif, total: sakit + izin + alpha };
  }).sort((a, b) =>
    b.aktif - a.aktif || b.alpha - a.alpha || b.total - a.total ||
    a.name.localeCompare(b.name, 'id')
  ), [kelas, absenRecords, kasusRecords, activeKelas, dateFilter]);

  const selected = students.find(s => s.id === studentId);
  const shown    = students.filter(s => s.name.toLowerCase().includes(query.toLowerCase()));

  // Ringkasan untuk preview di modal export
  const totalS = students.reduce((n, s) => n + s.sakit, 0);
  const totalI = students.reduce((n, s) => n + s.izin, 0);
  const totalA = students.reduce((n, s) => n + s.alpha, 0);

  const exportFile = (kind: 'csv' | 'xls') => {
    // 1. Urutkan siswa sesuai urutan resmi buku absen kelas
    const studentOrderMap = new Map((kelas?.students || []).map((s, idx) => [s.id, idx]));
    const sorted = [...students].sort((a, b) => {
      const idxA = studentOrderMap.get(a.id) ?? 9999;
      const idxB = studentOrderMap.get(b.id) ?? 9999;
      return idxA - idxB;
    });

    // 2. Susun baris data dengan No urut 1..N sesuai absen resmi
    const rows = sorted.map((s, i) => [
      i + 1,
      s.name,
      s.nis || '',
      s.sakit,
      s.izin,
      s.alpha,
      s.sakit + s.izin + s.alpha,
      s.aktif > 0 ? `${s.aktif} kasus` : '-',
    ]);

    // 3. Tambahkan baris total kelas di bagian bawah
    const totalTidakHadir = totalS + totalI + totalA;
    const totalKasus = sorted.reduce((sum, s) => sum + s.aktif, 0);

    const summaryRow = [
      '',
      'TOTAL KELAS',
      '',
      totalS,
      totalI,
      totalA,
      totalTidakHadir,
      totalKasus > 0 ? `${totalKasus} kasus` : '-',
    ];

    const allRows = [...rows, summaryRow];
    const headers = [
      'No',
      'Nama Siswa',
      'NIS',
      'Sakit (S)',
      'Izin (I)',
      'Alpha (A)',
      'Total Tidak Hadir',
      'Kasus Aktif',
    ];

    const suffix = activePeriod.replace(/_/g, '-');
    const base = `rekap_presensi_${kelas?.name || 'kelas'}_${suffix}_${semester.tahunAjaran.replace('/', '-')}`;
    const todayStr = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const metadata: Record<string, string> = {
      'Kelas': kelas?.name || '-',
      'Semester': semester.semester === 'ganjil' ? 'Semester 1 (Ganjil)' : 'Semester 2 (Genap)',
      'Periode Rekap': periodLabel,
      'Tahun Ajaran': semester.tahunAjaran,
      'Jumlah Siswa': `${sorted.length} siswa`,
      'Tanggal Ekspor': todayStr,
    };

    if (kind === 'csv') {
      exportCSV(base + '.csv', headers, allRows);
    } else {
      exportXLS(
        base + '.xls',
        `Rekap ${kelas?.name || 'Kelas'}`,
        headers,
        allRows,
        {
          title: 'REKAPITULASI PRESENSI SISWA',
          metadata,
          columnWidths: [35, 220, 85, 65, 65, 65, 95, 90],
          hasTotalRow: true,
        }
      );
    }
  };

  if (!kelas) return <p className="py-16 text-center text-sm text-text-tertiary">Pilih kelas terlebih dahulu.</p>;

  if (selected && manageMode) {
    return <RiwayatPage studentId={selected.id} initialFilter={manageMode} onBack={() => setManageMode(null)} />;
  }

  if (selected) {
    const events = [
      ...absenRecords
        .filter(a => a.kelasId === activeKelas && a.studentId === selected.id && dateFilter(a.date, a.periodeUjian, a.subPeriode || a.jamUjian))
        .map(a => ({
          id: `a${a.id}`, date: a.date,
          title: a.status === 'S' ? 'Sakit' : a.status === 'I' ? 'Izin' : 'Alpha',
          note: a.keterangan,
          tone: a.status === 'A' ? 'text-semantic-red' : 'text-text-secondary',
        })),
      ...kasusRecords
        .filter(k => k.kelasId === activeKelas && k.studentId === selected.id && dateFilter(k.date))
        .map(k => ({ id: `k${k.id}`, date: k.date, title: `Kasus · ${k.category}`, note: k.description, tone: 'text-semantic-red' })),
      ...catatanRecords
        .filter(c => c.kelasId === activeKelas && c.studentId === selected.id && dateFilter(c.date))
        .map(c => ({ id: `c${c.id}`, date: c.date, title: `Catatan · ${c.tipe || 'umum'}`, note: c.content, tone: 'text-primary' })),
    ].sort((a, b) => b.date.localeCompare(a.date));

    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <button onClick={() => setStudentId(null)} className="flex items-center gap-2 text-xs font-bold text-text-secondary">
          <ArrowLeft className="w-4" /> Kembali
        </button>
        <section className="rounded-2xl bg-surface p-5 shadow-soft">
          <p className="label-upper">Buku Induk Siswa</p>
          <h2 className="mt-1 text-xl font-bold">{selected.name}</h2>
          <p className="text-xs text-text-tertiary">{selected.nis || 'NIS belum diisi'}</p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { label: 'Sakit', value: selected.sakit, tone: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' },
              { label: 'Izin',  value: selected.izin,  tone: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300' },
              { label: 'Alpha', value: selected.alpha, tone: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300' },
            ].map(item => (
              <div key={item.label} className={`min-h-[76px] rounded-xl p-3 ${item.tone}`}>
                <p className="text-2xl font-black leading-none">{item.value}</p>
                <p className="mt-2 text-xs font-bold">{item.label}</p>
              </div>
            ))}
          </div>
          {selected.aktif ? <p className="mt-3 text-xs font-bold text-semantic-red">{selected.aktif} kasus aktif</p> : null}
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <button onClick={() => setManageMode('absen')} className="btn-soft btn-secondary-soft py-2.5 text-xs">Kelola Absensi</button>
            <button onClick={() => setManageMode('jurnal')} className="btn-soft btn-secondary-soft py-2.5 text-xs">Kelola Jurnal</button>
            <button
              onClick={() => { sessionStorage.setItem('jg_jurnal_student_id', selected.id); setActiveTab('jurnal'); }}
              className="btn-soft btn-primary-soft py-2.5 text-xs"
            >Tambah Jurnal</button>
          </div>
        </section>
        <section className="overflow-hidden rounded-2xl bg-surface shadow-soft">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-bold">Riwayat</h3>
            <span className="text-[11px] font-semibold text-primary">{periodLabel}</span>
          </div>
          {events.length ? events.map(event => (
            <div key={event.id} className="border-b border-border px-4 py-3 last:border-0">
              <div className="flex justify-between gap-3">
                <b className={`text-xs ${event.tone}`}>{event.title}</b>
                <span className="text-[11px] text-text-tertiary">{event.date}</span>
              </div>
              {event.note && <p className="mt-1 text-xs text-text-secondary">{event.note}</p>}
            </div>
          )) : (
            <p className="p-8 text-center text-xs text-text-tertiary">
              Belum ada riwayat pada periode <b>{periodLabel}</b>.
            </p>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-3">

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="label-upper">Buku Induk · {kelas.name}</p>
          <h2 className="mt-1 text-lg font-bold">Rekap Absensi Siswa</h2>
          <p className="text-xs text-text-tertiary">Rekap kehadiran reguler UTS &amp; UAS untuk rapor semester.</p>
        </div>
        <button
          onClick={() => setShowRecap(true)}
          className="rounded-xl bg-bg-2 px-3 py-2 text-xs font-bold text-text-secondary hover:text-foreground hover:bg-bg-3 transition-colors"
        >
          Rekap & export
        </button>
      </div>

      {/* Baris 1 — Pilih semester */}
      <div className="flex gap-2 overflow-x-auto pb-1 touch-pan-x scrollbar-none">
        {([
          ['sem1',  'Sem 1 · Ganjil'],
          ['sem2',  'Sem 2 · Genap'],
          ['bulan', 'Bulan ini'],
          ['semua', 'Semua'],
        ] as [SemRow, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => { setSemesterRow(id); setPeriodeRow('harian'); }}
            className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-bold transition-colors min-h-[40px] sm:min-h-[44px] flex items-center justify-center ${
              semesterRow === id ? 'bg-primary text-primary-foreground' : 'bg-bg-2 text-text-secondary'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Baris 2 — Sub-filter periode (Fokus pada Rapor UTS & UAS) */}
      {showSubFilter && (
        <div className="flex gap-2 overflow-x-auto pb-1 touch-pan-x scrollbar-none">
          {([
            ['harian_pra_uts', 'Rapor UTS (Sebelum UTS)'],
            ['harian_pra_uas', 'Rapor UAS (Setelah UTS)'],
            ['harian',         '1 Semester Penuh'],
            ['semua',          'Semua Data'],
            ['UTS',            'Ujian UTS'],
            ['UAS',            'Ujian UAS'],
          ] as [PeriodeRow, string][]).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setPeriodeRow(id)}
              className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-bold transition-colors min-h-[40px] sm:min-h-[44px] flex items-center justify-center ${
                periodeRow === id
                  ? 'bg-surface text-foreground shadow-soft ring-1 ring-border'
                  : 'bg-bg-2/60 text-text-tertiary hover:text-text-secondary'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Info status aktif & jumlah data */}
      <div className="flex flex-col gap-1 rounded-xl bg-bg-2 px-3.5 py-2.5 text-xs">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <span className="font-bold text-foreground">{periodLabel}</span>
            <span className="text-[11px] text-text-tertiary">• TA {semester.tahunAjaran}</span>
          </div>
          <span className="text-[11px] text-text-secondary font-medium">
            {students.filter(s => s.total > 0 || s.aktif > 0).length} siswa dengan catatan
          </span>
        </div>
        <p className="text-[11px] text-text-tertiary">
          {periodeRow === 'harian_pra_uts' && 'Menampilkan kehadiran harian reguler sebelum UTS untuk nilai Rapor UTS.'}
          {periodeRow === 'harian_pra_uas' && 'Menampilkan kehadiran harian reguler setelah UTS untuk nilai Rapor UAS.'}
          {periodeRow === 'harian' && 'Menampilkan akumulasi seluruh kehadiran harian selama 1 semester penuh (sebelum & setelah UTS).'}
          {periodeRow === 'semua' && 'Menampilkan semua data kehadiran pada semester ini, termasuk sesi ujian.'}
          {periodeRow === 'UTS' && 'Menampilkan catatan presensi sesi ujian UTS per mata pelajaran.'}
          {periodeRow === 'UAS' && 'Menampilkan catatan presensi sesi ujian UAS per mata pelajaran.'}
        </p>
      </div>

      {/* Hint: jadwal UTS/UAS belum dikonfigurasi */}
      {showScheduleHint && (
        <div className="flex items-center gap-2 rounded-xl bg-bg-2/70 px-3 py-2 text-[11px] text-text-tertiary">
          <Info className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Jadwal tanggal resmi {periodeRow} belum diatur di Setelan — menampilkan semua record {periodeRow} pada {semesterRow === 'sem1' ? 'Semester 1' : 'Semester 2'}.</span>
        </div>
      )}

      {/* Search */}
      <label className="relative block">
        <Search className="absolute left-3 top-1/2 w-4 -translate-y-1/2 text-text-tertiary" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Cari siswa"
          className="input-soft w-full pl-10"
        />
      </label>

      {/* Daftar siswa */}
      <section className="overflow-hidden rounded-2xl bg-surface shadow-soft">
        {shown.map((s, index) => (
          <button
            key={s.id}
            onClick={() => setStudentId(s.id)}
            className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left last:border-0 hover:bg-bg-2"
          >
            <span className="w-5 text-center text-[11px] text-text-tertiary">{index + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm font-bold leading-5">{s.name}</p>
              <p className="mt-0.5 text-[11px] text-text-tertiary">
                S {s.sakit} · I {s.izin} ·{' '}
                <span className={s.alpha ? 'font-bold text-semantic-red' : ''}>A {s.alpha}</span>
              </p>
            </div>
            {s.aktif ? (
              <span className="rounded-full bg-semantic-red-light px-2 py-1 text-[10px] font-bold text-semantic-red">
                {s.aktif} kasus
              </span>
            ) : s.total ? (
              <span className="text-[10px] font-bold text-semantic-yellow">Pantau</span>
            ) : null}
          </button>
        ))}
        {!shown.length && (
          <div className="p-8 text-center flex flex-col items-center gap-1.5">
            <p className="text-xs text-text-tertiary">Tidak ada catatan ketidakhadiran siswa pada filter ini.</p>
            {(periodeRow === 'UTS' || periodeRow === 'UAS') && (
              <p className="text-[11px] text-text-secondary max-w-sm">
                Jika sudah menginput absensi {periodeRow}, pastikan periode dipilih <b>{periodeRow}</b> saat menginput di menu <b>Aktivitas &gt; Absensi &gt; Ujian</b>.
              </p>
            )}
          </div>
        )}
      </section>

      {/* Modal Rekap & Export */}
      {showRecap && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:justify-center">
          <div className="w-full max-w-md rounded-t-3xl bg-surface p-5 shadow-lg sm:rounded-3xl">

            <div className="flex items-start justify-between">
              <div>
                <p className="label-upper">Rekap kelas</p>
                <h3 className="mt-1 text-lg font-bold">{students.length} siswa</h3>
                <p className="mt-0.5 text-[11px] font-semibold text-primary">{periodLabel}</p>
              </div>
              <button onClick={() => setShowRecap(false)} className="mt-0.5 rounded-xl bg-bg-2 p-2">
                <X className="w-4" />
              </button>
            </div>

            {/* Preview S / I / A */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { label: 'Sakit', value: totalS, tone: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' },
                { label: 'Izin',  value: totalI, tone: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300' },
                { label: 'Alpha', value: totalA, tone: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300' },
              ].map(item => (
                <div key={item.label} className={`rounded-xl p-3 ${item.tone}`}>
                  <p className="text-xl font-black leading-none">{item.value}</p>
                  <p className="mt-1 text-[10px] font-bold">{item.label}</p>
                </div>
              ))}
            </div>

            <p className="mt-3 text-xs text-text-secondary">
              Hasil ekspor otomatis diurutkan rapi berdasarkan abjad nama siswa (A–Z) sesuai filter aktif.
            </p>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => exportFile('csv')}
                className="btn-soft btn-secondary-soft flex flex-1 items-center justify-center gap-1.5 py-3"
              >
                <Download className="w-4" /> CSV
              </button>
              <button
                onClick={() => exportFile('xls')}
                className="btn-soft btn-primary-soft flex flex-1 items-center justify-center gap-1.5 py-3"
              >
                <FileSpreadsheet className="w-4" /> Excel
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
