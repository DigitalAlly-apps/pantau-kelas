import { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { CalendarCheck, ChevronRight, AlertCircle, CheckCircle2, ChevronDown } from 'lucide-react';
import { getMissingAttendanceDates } from '@/lib/attendance-dates';

/**
 * Widget yang menampilkan hari-hari sekolah yang belum ada absensi.
 * Logika: hari aktif Senin–Sabtu
 * dalam rentang N hari ke belakang, bukan libur, belum ada record absensi.
 */

function formatTanggal(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
}

interface Props {
  onGoToAbsen: (date: string) => void;
  lookbackDays?: number;
}

export function AbsensiGapWidget({ onGoToAbsen, lookbackDays = 30 }: Props) {
  const { activeKelas, kelasList, absenRecords, liburDates, confirmedDates } = useApp();
  const [expanded, setExpanded] = useState(false);

  const kelas = kelasList.find(k => k.id === activeKelas);
  const jenjangAktif = kelas?.jenjang || 'SMP';

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

  // Set tanggal libur untuk jenjang ini
  const tanggalLibur = useMemo(() => {
    const set = new Set<string>();
    liburDates
      .filter(l => l.jenjang === jenjangAktif)
      .forEach(l => set.add(l.date));
    return set;
  }, [liburDates, jenjangAktif]);

  // Hitung hari yang belum diabsen
  const hariKosong = useMemo(() => {
    return getMissingAttendanceDates({
      today: new Date(),
      lookbackDays,
      holidays: tanggalLibur,
      attendedDates: tanggalSudahAbsen,
      confirmedDates: tanggalSudahKonfirmasi,
    });
  }, [lookbackDays, tanggalLibur, tanggalSudahAbsen, tanggalSudahKonfirmasi]);

  if (!kelas || kelas.students.length === 0) return null;

  const PREVIEW_COUNT = 5;
  const shown = expanded ? hariKosong : hariKosong.slice(0, PREVIEW_COUNT);
  const sisanya = hariKosong.length - PREVIEW_COUNT;

  if (hariKosong.length === 0) {
    return (
      <div className="card-soft border-green-200 dark:border-green-800/40 bg-green-50/50 dark:bg-green-950/20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-green-100 dark:bg-green-900/40 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-[14px] font-bold text-green-700 dark:text-green-400">Absensi Lengkap!</p>
            <p className="text-[12px] text-green-600/70 dark:text-green-500/70">
              Semua hari sekolah dalam {lookbackDays} hari terakhir sudah diabsen.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card-soft border-orange-200 dark:border-orange-800/40">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center flex-shrink-0">
          <AlertCircle className="w-4 h-4 text-orange-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold text-foreground">
            {hariKosong.length} Hari Belum Diabsen
          </p>
          <p className="text-[12px] text-text-tertiary">
            {lookbackDays} hari terakhir · Kelas {kelas.name}
          </p>
        </div>
        <span className="flex-shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400">
          {hariKosong.length}
        </span>
      </div>

      {/* List tanggal */}
      <div className="flex flex-col gap-1.5">
        {shown.map(dateStr => (
          <button
            key={dateStr}
            onClick={() => onGoToAbsen(dateStr)}
            className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-bg-2 hover:bg-orange-50 dark:hover:bg-orange-950/30 hover:border-orange-200 dark:hover:border-orange-800/40 border border-transparent transition-all group text-left"
          >
            <div className="flex items-center gap-2.5">
              <CalendarCheck className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
              <span className="text-[13px] font-semibold text-foreground group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                {formatTanggal(dateStr)}
              </span>
              <span className="text-[11px] text-text-tertiary font-mono">{dateStr}</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-text-tertiary group-hover:text-orange-500 transition-colors flex-shrink-0" />
          </button>
        ))}
      </div>

      {/* Show more / less */}
      {hariKosong.length > PREVIEW_COUNT && (
        <button
          onClick={() => setExpanded(v => !v)}
          className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 text-[12px] font-semibold text-text-secondary hover:text-primary transition-colors"
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          {expanded ? 'Sembunyikan' : `Tampilkan ${sisanya} lagi`}
        </button>
      )}
    </div>
  );
}
