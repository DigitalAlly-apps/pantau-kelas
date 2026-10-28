import { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Download, FileSpreadsheet, GraduationCap, ChevronDown, ChevronUp, Check } from 'lucide-react';
import type { PeriodeUjian } from '@/types';
import { exportCSV, exportXLS, isDateInSemester } from '@/lib/exportUtils';

const STATUS_LABEL: Record<string, string> = { S: 'Sakit', I: 'Izin', A: 'Alpha' };
const STATUS_COLOR: Record<string, string> = {
  S: 'bg-semantic-blue-light text-semantic-blue',
  I: 'bg-semantic-yellow-light text-semantic-yellow',
  A: 'bg-semantic-red-light text-semantic-red',
};

export function RekapUjianPage() {
  const { kelasList, activeKelas, absenRecords, confirmedDates, semester, setActiveTab } = useApp();
  const kelas = kelasList.find(k => k.id === activeKelas);

  const [periodeFilter, setPeriodeFilter] = useState<'UTS' | 'UAS'>('UTS');
  const [semesterFilter, setSemesterFilter] = useState<'ganjil' | 'genap'>(
    () => semester.semester
  );
  const [expandedMapel, setExpandedMapel] = useState<string | null>(null);

  /** Cek apakah date masuk dalam semester yang dipilih. */
  const inSelectedSem = (date: string) => {
    return isDateInSemester(date, semesterFilter, semester);
  };

  // Ambil semua record ujian untuk kelas ini — difilter semester + periode
  const ujianRecords = useMemo(() =>
    absenRecords.filter(a =>
      a.kelasId === activeKelas &&
      a.periodeUjian === periodeFilter &&
      a.mataPelajaran &&
      inSelectedSem(a.date)
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [absenRecords, activeKelas, periodeFilter, semesterFilter, semester]
  );

  // Daftar mapel unik: gabungkan dari absenRecords DAN confirmedDates
  // (karena model exception-based, mapel yang semua hadir tidak punya record di absenRecords)
  const mapelList = useMemo(() => {
    const set = new Set<string>();
    ujianRecords.forEach(a => {
      const key = `${a.mataPelajaran}${a.jamUjian ? ` (${a.jamUjian})` : ''}`;
      set.add(key);
    });
    // Tambahkan mapel dari confirmedDates yang mungkin semua hadir (tidak ada exception)
    confirmedDates
      .filter(c =>
        c.kelasId === activeKelas &&
        c.periodeUjian === periodeFilter &&
        c.mataPelajaran &&
        inSelectedSem(c.date)
      )
      .forEach(c => {
        const key = `${c.mataPelajaran}${c.jamUjian ? ` (${c.jamUjian})` : ''}`;
        set.add(key);
      });
    return Array.from(set).sort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ujianRecords, confirmedDates, activeKelas, periodeFilter, semesterFilter]);

  // Daftar tanggal unik per mapel (gabungkan dari absenRecords dan confirmedDates)
  const tanggalPerMapel = useMemo(() => {
    const map: Record<string, string[]> = {};
    ujianRecords.forEach(a => {
      const key = `${a.mataPelajaran}${a.jamUjian ? ` (${a.jamUjian})` : ''}`;
      if (!map[key]) map[key] = [];
      if (!map[key].includes(a.date)) map[key].push(a.date);
    });
    // Tambahkan tanggal dari confirmedDates
    confirmedDates
      .filter(c =>
        c.kelasId === activeKelas &&
        c.periodeUjian === periodeFilter &&
        c.mataPelajaran &&
        inSelectedSem(c.date)
      )
      .forEach(c => {
        const key = `${c.mataPelajaran}${c.jamUjian ? ` (${c.jamUjian})` : ''}`;
        if (!map[key]) map[key] = [];
        if (!map[key].includes(c.date)) map[key].push(c.date);
      });
    Object.keys(map).forEach(k => map[k].sort());
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ujianRecords, confirmedDates, activeKelas, periodeFilter, semesterFilter]);

  // Siswa yang tidak hadir per mapel: { mapel -> { studentId -> { date, status, keterangan }[] } }
  const absenPerMapel = useMemo(() => {
    const result: Record<string, Record<string, { date: string; status: string; keterangan?: string }[]>> = {};
    ujianRecords
      .filter(a => a.status !== 'H')
      .forEach(a => {
        const key = `${a.mataPelajaran}${a.jamUjian ? ` (${a.jamUjian})` : ''}`;
        if (!result[key]) result[key] = {};
        if (!result[key][a.studentId]) result[key][a.studentId] = [];
        result[key][a.studentId].push({ date: a.date, status: a.status, keterangan: a.keterangan });
      });
    return result;
  }, [ujianRecords]);

  // Ringkasan per siswa: berapa mapel yang tidak hadir
  const ringkasanSiswa = useMemo(() => {
    if (!kelas) return [];
    return kelas.students.map(s => {
      const mapelTidakHadir = mapelList.filter(m => absenPerMapel[m]?.[s.id]?.length > 0);
      const totalAbsen = mapelList.reduce((acc, m) => acc + (absenPerMapel[m]?.[s.id]?.length || 0), 0);
      return { ...s, mapelTidakHadir, totalAbsen };
    }).filter(s => s.totalAbsen > 0).sort((a, b) => b.totalAbsen - a.totalAbsen);
  }, [kelas, mapelList, absenPerMapel]);

  const semLabel = semesterFilter === 'ganjil' ? 'Sem 1 · Ganjil' : 'Sem 2 · Genap';
  const semSlug  = semesterFilter === 'ganjil' ? 'sem1' : 'sem2';

  const buildExportData = (separator: string) => {
    if (!kelas || mapelList.length === 0) return null;
    // Gunakan urutan resmi buku absen kelas
    const sorted = kelas.students;
    const headers = ['No', 'Nama Siswa', 'NIS', ...mapelList, 'Total Tidak Hadir'];
    const rows = sorted.map((s, i) => {
      const mapelCols = mapelList.map(m => {
        const records = absenPerMapel[m]?.[s.id];
        if (!records || records.length === 0) return 'Hadir';
        return records.map(r => STATUS_LABEL[r.status] || r.status).join(separator);
      });
      const total = mapelList.reduce((acc, m) => acc + (absenPerMapel[m]?.[s.id]?.length || 0), 0);
      return [i + 1, s.name, s.nis || '', ...mapelCols, total];
    });
    return { headers, rows, count: sorted.length };
  };

  const handleExportCSV = () => {
    const data = buildExportData('; ');
    if (!data || !kelas) return;
    exportCSV(
      `rekap_ujian_${periodeFilter}_${semSlug}_${kelas.name}_${semester.tahunAjaran.replace('/', '-')}.csv`,
      data.headers,
      data.rows
    );
  };

  const handleExportXLS = () => {
    const data = buildExportData(', ');
    if (!data || !kelas) return;
    const todayStr = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    exportXLS(
      `rekap_ujian_${periodeFilter}_${semSlug}_${kelas.name}_${semester.tahunAjaran.replace('/', '-')}.xls`,
      `Ujian ${periodeFilter} · ${kelas.name}`,
      data.headers,
      data.rows,
      {
        title: `REKAPITULASI PRESENSI UJIAN ${periodeFilter}`,
        metadata: {
          'Kelas': kelas.name,
          'Periode': `Ujian ${periodeFilter}`,
          'Semester': semLabel,
          'Tahun Ajaran': semester.tahunAjaran,
          'Jumlah Siswa': `${data.count} siswa`,
          'Tanggal Ekspor': todayStr,
        },
        columnWidths: [35, 200, 85, ...mapelList.map(() => 80), 95],
      }
    );
  };

  if (!kelas || kelas.students.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <GraduationCap className="w-10 h-10 text-text-tertiary opacity-40" />
        <p className="text-text-secondary text-sm">Belum ada siswa di kelas ini.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 max-w-4xl mx-auto w-full">

      {/* Baris 1 — Pilih semester */}
      <div className="flex bg-bg-2 rounded-xl p-1 gap-1">
        {([['ganjil', 'Sem 1 · Ganjil'], ['genap', 'Sem 2 · Genap']] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => { setSemesterFilter(id); setExpandedMapel(null); }}
            className={`flex-1 py-2.5 text-[12px] font-bold rounded-lg transition-all min-h-[44px] flex items-center justify-center ${
              semesterFilter === id ? 'bg-surface shadow-soft text-foreground' : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Baris 2 — Pilih periode ujian */}
      <div className="flex bg-bg-2 rounded-xl p-1 gap-1">
        {(['UTS', 'UAS'] as const).map(p => (
          <button
            key={p}
            onClick={() => { setPeriodeFilter(p); setExpandedMapel(null); }}
            className={`flex-1 py-2.5 text-[13px] font-bold rounded-lg transition-all min-h-[44px] flex items-center justify-center ${
              periodeFilter === p ? 'bg-surface shadow-soft text-foreground' : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {mapelList.length === 0 ? (
        <div className="bg-surface rounded-2xl shadow-soft p-8 flex flex-col items-center gap-3 text-center">
          <GraduationCap className="w-10 h-10 text-text-tertiary opacity-40" />
          <p className="text-sm font-semibold text-text-secondary">
            Belum ada data {periodeFilter} · {semLabel}
          </p>
          <p className="text-xs text-text-tertiary max-w-md">
            Input absensi ujian dengan memilih tab <b>Ujian &gt; {periodeFilter}</b> di semester{' '}
            <b>{semesterFilter === 'ganjil' ? 'Ganjil' : 'Genap'} {semester.tahunAjaran}</b> dan pastikan mata pelajaran telah diisi.
          </p>
          <button
            onClick={() => {
              sessionStorage.setItem('pk_absen_tab', 'ujian');
              sessionStorage.setItem('pk_absen_periode', periodeFilter);
              setActiveTab('absen');
            }}
            className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-soft hover:opacity-90 transition-opacity min-h-[44px]"
          >
            + Input {periodeFilter} Sekarang
          </button>
        </div>
      ) : (
        <>
          {/* Label kontekstual */}
          <div className="flex items-center gap-2">
            <p className="text-xs font-bold text-text-secondary">
              Rekap {periodeFilter} · {semLabel}
            </p>
            <span className="text-[10px] text-text-tertiary">· {semester.tahunAjaran}</span>
          </div>

          {/* Ringkasan siswa bermasalah */}
          {ringkasanSiswa.length > 0 && (
            <div className="bg-surface rounded-2xl shadow-soft overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">Siswa Tidak Hadir</span>
                <span className="ml-auto text-xs bg-semantic-red-light text-semantic-red px-2 py-0.5 rounded-full font-semibold">
                  {ringkasanSiswa.length} siswa
                </span>
              </div>
              <div className="divide-y divide-border">
                {ringkasanSiswa.map(s => (
                  <div key={s.id} className="px-4 py-3 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-foreground">{s.name}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {s.mapelTidakHadir.map(m => {
                          const records = absenPerMapel[m]?.[s.id] || [];
                          const label = records.map(r => STATUS_LABEL[r.status] || r.status).join(', ');
                          return (
                            <span key={m} className="text-[10px] px-2 py-0.5 rounded-full bg-semantic-red-light text-semantic-red font-semibold">
                              {m}: {label}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    <span className="text-[12px] font-bold text-semantic-red flex-shrink-0 bg-semantic-red-light px-2 py-1 rounded-lg">
                      {s.totalAbsen}×
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tabel per mapel */}
          {mapelList.map(mapel => {
            const isExpanded = expandedMapel === mapel;
            const absenMapel = absenPerMapel[mapel] || {};
            const jumlahTidakHadir = Object.keys(absenMapel).length;
            const tanggalList = tanggalPerMapel[mapel] || [];

            return (
              <div key={mapel} className="bg-surface rounded-2xl shadow-soft overflow-hidden">
                {/* Header mapel — collapsible */}
                <button
                  onClick={() => setExpandedMapel(isExpanded ? null : mapel)}
                  className="w-full px-4 py-3 border-b border-border flex items-center gap-3 hover:bg-bg-2 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-xl bg-accent-light flex items-center justify-center flex-shrink-0">
                    <GraduationCap className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-foreground">{mapel}</p>
                    <p className="text-[11px] text-text-tertiary">
                      {tanggalList.join(', ')} · {jumlahTidakHadir} siswa tidak hadir
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {jumlahTidakHadir > 0 && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-semantic-red-light text-semantic-red">
                        {jumlahTidakHadir}
                      </span>
                    )}
                    {isExpanded
                      ? <ChevronUp className="w-4 h-4 text-text-tertiary" />
                      : <ChevronDown className="w-4 h-4 text-text-tertiary" />
                    }
                  </div>
                </button>

                {/* Detail siswa tidak hadir */}
                {isExpanded && (
                  <div className="divide-y divide-border">
                    {jumlahTidakHadir === 0 ? (
                      <div className="px-4 py-4 flex items-center justify-center gap-1.5 text-sm text-text-tertiary">
                        <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Semua siswa hadir</span>
                      </div>
                    ) : (
                      Object.entries(absenMapel).map(([studentId, records]) => {
                        const siswa = kelas.students.find(s => s.id === studentId);
                        if (!siswa) return null;
                        return (
                          <div key={studentId} className="px-4 py-3 flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-semibold text-foreground">{siswa.name}</p>
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                {records.map((r, i) => (
                                  <div key={i} className="flex items-center gap-1">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${STATUS_COLOR[r.status] || 'bg-bg-2 text-text-secondary'}`}>
                                      {STATUS_LABEL[r.status] || r.status}
                                    </span>
                                    <span className="text-[10px] text-text-tertiary">{r.date}</span>
                                    {r.keterangan && (
                                      <span className="text-[10px] text-text-tertiary italic">"{r.keterangan}"</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Tabel rekap lengkap — scrollable */}
          <div className="bg-surface rounded-2xl shadow-soft overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-sm font-semibold text-foreground">Tabel Rekap Lengkap</p>
              <p className="text-[11px] text-text-tertiary mt-0.5">Centang = hadir · S/I/A = tidak hadir</p>
            </div>
            <div className="overflow-x-auto touch-pan-x">
              <table className="w-full border-collapse text-[12px]">
                <thead>
                  <tr className="bg-bg-2">
                    <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-text-tertiary px-4 py-2.5 sticky left-0 bg-bg-2 z-10 min-w-[140px]">Nama</th>
                    {mapelList.map(m => (
                      <th key={m} className="text-center text-[10px] font-semibold uppercase tracking-wider text-text-tertiary px-3 py-2.5 min-w-[80px]">{m}</th>
                    ))}
                    <th className="text-center text-[10px] font-semibold uppercase tracking-wider text-text-tertiary px-3 py-2.5">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {kelas.students.map((s, i) => {
                    const total = mapelList.reduce((acc, m) => acc + (absenPerMapel[m]?.[s.id]?.length || 0), 0);
                    return (
                      <tr key={s.id} className={`hover:bg-bg-2 transition-colors ${i % 2 === 0 ? '' : 'bg-bg-2/30'}`}>
                        <td className="px-4 py-2.5 border-b border-border font-medium text-foreground sticky left-0 bg-surface z-10">
                          {s.name}
                        </td>
                        {mapelList.map(m => {
                          const records = absenPerMapel[m]?.[s.id];
                          if (!records || records.length === 0) {
                            return (
                              <td key={m} className="px-3 py-2.5 border-b border-border text-center text-green-600 dark:text-green-400 font-bold">
                                <Check className="w-3.5 h-3.5 mx-auto text-emerald-600 dark:text-emerald-400" />
                              </td>
                            );
                          }
                          const label = records.map(r => STATUS_LABEL[r.status]?.[0] || r.status).join('/');
                          const firstStatus = records[0].status;
                          return (
                            <td key={m} className={`px-3 py-2.5 border-b border-border text-center font-bold text-[11px] ${
                              firstStatus === 'S' ? 'text-semantic-blue' :
                              firstStatus === 'I' ? 'text-semantic-yellow' :
                              'text-semantic-red'
                            }`}>
                              {label}
                            </td>
                          );
                        })}
                        <td className={`px-3 py-2.5 border-b border-border text-center font-bold ${total > 0 ? 'text-semantic-red' : 'text-green-600 dark:text-green-400'}`}>
                          {total > 0 ? total : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Export */}
          <div className="flex gap-3">
            <button onClick={handleExportCSV} className="btn-soft btn-secondary-soft flex-1 py-3 gap-2 flex items-center justify-center">
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <button onClick={handleExportXLS} className="btn-soft btn-primary-soft flex-1 py-3 gap-2 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" /> Export Excel
            </button>
          </div>
        </>
      )}
    </div>
  );
}
