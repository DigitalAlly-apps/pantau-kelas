import { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Kalender mini yang menampilkan status absensi per hari dalam sebulan.
 * - Hijau  : sudah diabsen (ada record)
 * - Oranye : hari sekolah, belum diabsen
 * - Abu    : weekend / libur
 * - Kosong : hari di masa depan
 */

interface Props {
  onSelectDate: (date: string) => void;
  selectedDate: string;
}

const HARI_SINGKAT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export function AbsensiKalender({ onSelectDate, selectedDate }: Props) {
  const { activeKelas, kelasList, absenRecords, liburDates, confirmedDates } = useApp();

  const kelas = kelasList.find(k => k.id === activeKelas);
  const jenjangAktif = kelas?.jenjang || 'SMP';

  // Bulan yang ditampilkan
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-indexed


  // Set tanggal yang sudah ada absensi S/I/A
  const tanggalSudahAbsen = useMemo(() => {
    const set = new Set<string>();
    absenRecords
      .filter(a => a.kelasId === activeKelas)
      .forEach(a => set.add(a.date));
    return set;
  }, [absenRecords, activeKelas]);

  // Set tanggal yang sudah dikonfirmasi (termasuk hadir semua)
  const tanggalSudahKonfirmasi = useMemo(() => {
    const set = new Set<string>();
    confirmedDates
      .filter(c => c.kelasId === activeKelas)
      .forEach(c => set.add(c.date));
    return set;
  }, [confirmedDates, activeKelas]);

  // Set tanggal libur
  const tanggalLibur = useMemo(() => {
    const set = new Set<string>();
    liburDates
      .filter(l => l.jenjang === jenjangAktif)
      .forEach(l => set.add(l.date));
    return set;
  }, [liburDates, jenjangAktif]);

  // Bangun grid kalender
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);
    const startDow = firstDay.getDay(); // 0=Sun

    const days: Array<{
      date: string | null;
      day: number;
      status: 'sudah' | 'belum' | 'libur' | 'weekend' | 'future' | 'empty';
    }> = [];

    // Padding awal
    for (let i = 0; i < startDow; i++) {
      days.push({ date: null, day: 0, status: 'empty' });
    }

    const todayStr = today.toISOString().split('T')[0];

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dt = new Date(viewYear, viewMonth, d);
      const dateStr = dt.toISOString().split('T')[0];
      const dow = dt.getDay();

      let status: typeof days[0]['status'];

      if (dateStr > todayStr) {
        status = 'future';
      } else if (tanggalLibur.has(dateStr)) {
        status = 'libur';
      } else if (dow === 0 || dow === 6) {
        status = 'weekend';
      } else if (tanggalSudahAbsen.has(dateStr) || tanggalSudahKonfirmasi.has(dateStr)) {
        status = 'sudah';
      } else {
        status = 'belum';
      }

      days.push({ date: dateStr, day: d, status });
    }

    return days;
  }, [viewYear, viewMonth, tanggalSudahAbsen, tanggalSudahKonfirmasi, tanggalLibur]);

  // Hitung ringkasan bulan ini
  const summary = useMemo(() => {
    const schoolDays = calendarDays.filter(d => d.date && (d.status === 'sudah' || d.status === 'belum'));
    const done = schoolDays.filter(d => d.status === 'sudah').length;
    const missing = schoolDays.filter(d => d.status === 'belum').length;
    return { done, missing, total: schoolDays.length };
  }, [calendarDays]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('id-ID', {
    month: 'long', year: 'numeric',
  });

  const statusStyle: Record<string, string> = {
    sudah:   'bg-green-500 text-white hover:bg-green-600',
    belum:   'bg-orange-400 text-white hover:bg-orange-500 ring-2 ring-orange-300 dark:ring-orange-700',
    libur:   'bg-bg-3 text-text-tertiary cursor-default',
    weekend: 'bg-bg-2 text-text-tertiary cursor-default',
    future:  'bg-bg-2 text-text-tertiary/50 cursor-default',
    empty:   'invisible',
  };

  return (
    <div className="bg-surface rounded-2xl shadow-soft p-4 flex flex-col gap-3">
      {/* Header navigasi bulan */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevMonth}
          aria-label="Bulan sebelumnya"
          className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl hover:bg-bg-2 active:bg-bg-3 flex items-center justify-center text-text-secondary hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-[13px] font-bold text-foreground capitalize">{monthLabel}</span>
        <button
          onClick={nextMonth}
          aria-label="Bulan berikutnya"
          className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl hover:bg-bg-2 active:bg-bg-3 flex items-center justify-center text-text-secondary hover:text-foreground transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Ringkasan */}
      <div className="flex gap-2 text-[11px] font-semibold">
        <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
          {summary.done} sudah
        </span>
        <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">
          <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
          {summary.missing} belum
        </span>
        <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-bg-2 text-text-tertiary ml-auto">
          {summary.total} hari sekolah
        </span>
      </div>

      {/* Grid hari */}
      <div className="grid grid-cols-7 gap-1">
        {/* Header hari */}
        {HARI_SINGKAT.map(h => (
          <div key={h} className="text-center text-[10px] font-bold text-text-tertiary py-1">
            {h}
          </div>
        ))}

        {/* Tanggal */}
        {calendarDays.map((d, i) => {
          const isSelected = d.date === selectedDate;
          const isClickable = d.date && (d.status === 'sudah' || d.status === 'belum');

          return (
            <button
              key={i}
              disabled={!isClickable}
              onClick={() => d.date && isClickable && onSelectDate(d.date)}
              className={`
                aspect-square rounded-lg text-[12px] font-semibold flex items-center justify-center transition-all
                ${statusStyle[d.status]}
                ${isSelected ? 'ring-2 ring-offset-1 ring-primary scale-110 z-10' : ''}
                ${isClickable ? 'cursor-pointer' : ''}
              `}
              title={d.date ? `${d.date} — ${
                d.status === 'sudah' ? 'Sudah diabsen' :
                d.status === 'belum' ? 'Belum diabsen' :
                d.status === 'libur' ? 'Libur' : ''
              }` : undefined}
            >
              {d.day || ''}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-text-tertiary pt-1 border-t border-border">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-green-500 inline-block" /> Sudah</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-orange-400 inline-block" /> Belum</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-bg-3 inline-block" /> Libur</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-bg-2 inline-block" /> Weekend</span>
      </div>
    </div>
  );
}
