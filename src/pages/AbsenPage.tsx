import { useState, useMemo, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Search, CheckCircle, Pencil, ChevronDown, CalendarX, X, CalendarDays, BookOpen, AlertCircle } from 'lucide-react';
import type { AbsenRecord, PeriodeUjian } from '@/types';
import { AbsensiKalender } from '@/components/AbsensiKalender';

type AbsenStatus = 'H' | 'S' | 'I' | 'A';
const PERIODE_OPTIONS: PeriodeUjian[] = ['Harian', 'UTS', 'UAS'];

// Saran keterangan per statusss
const KETERANGAN_SUGGESTIONS: Record<AbsenStatus, string[]> = {
  H: [],
  S: ['Sakit perut', 'Demam', 'Flu / pilek', 'Sakit kepala', 'Sakit gigi', 'Rawat inap'],
  I: ['Keperluan keluarga', 'Acara keluarga', 'Izin dokter', 'Perjalanan dinas orang tua', 'Kegiatan sekolah lain'],
  A: [],
};

export function AbsenPage() {
  const {
    kelasList, activeKelas, absenRecords, addAbsenRecords, showToast,
    liburDates, addLiburDate, deleteLiburDate, deleteAbsenRecordsByDateAndJenjang,
    confirmDate, unconfirmDate, isDateConfirmed,
  } = useApp();
  const kelas = kelasList.find(k => k.id === activeKelas);
  const jenjangAktif = kelas?.jenjang || 'SMP';

  const [date, setDate]               = useState(new Date().toISOString().split('T')[0]);
  const [periode, setPeriode]         = useState<PeriodeUjian>('Harian');
  const [mataPelajaran, setMataPelajaran] = useState('');
  const [jamUjian, setJamUjian]       = useState('');
  const [search, setSearch]           = useState('');
  const [localStatus, setLocalStatus] = useState<Record<string, AbsenStatus>>({});

  const handlePeriodeChange = (p: PeriodeUjian) => {
    setPeriode(p);
    setMataPelajaran('');
    setJamUjian('');
    setLocalStatus({});
    setLocalKet({});
    setExpandedId(null);
    setShowPreview(false);
    setEditingSession(false);
  };
  const [localKet, setLocalKet]       = useState<Record<string, string>>({});  // keterangan per siswa
  const [expandedId, setExpandedId]   = useState<string | null>(null);         // siswa yang sedang buka keterangan
  const [showPreview, setShowPreview] = useState(false);
  const [editingSession, setEditingSession] = useState(false); // true saat mode edit aktif (startEdit dipanggil)
  const [showLiburForm, setShowLiburForm] = useState(false);
  const [liburKet, setLiburKet] = useState('');
  const [showKalender, setShowKalender] = useState(false);
  const [attendanceTab, setAttendanceTab] = useState<'harian' | 'ujian' | 'kalender'>('harian');

  const isUjian = periode === 'UTS' || periode === 'UAS';

  // Sesi ujian yang sudah ada di tanggal ini (untuk periode UTS/UAS)
  const sesiUjianHariIni = useMemo(() => {
    if (!isUjian) return [];
    const sessionsMap = new Map<string, { mapel: string; jam?: string }>();
    absenRecords
      .filter(a => a.date === date && a.kelasId === activeKelas && a.periodeUjian === periode && a.mataPelajaran)
      .forEach(a => {
        const key = `${a.mataPelajaran}${a.jamUjian ? ` (${a.jamUjian})` : ''}`;
        sessionsMap.set(key, { mapel: a.mataPelajaran!, jam: a.jamUjian });
      });
    return Array.from(sessionsMap.entries()).map(([label, val]) => ({ label, ...val }));
  }, [absenRecords, date, activeKelas, periode, isUjian]);

  const existingForDate = useMemo(() =>
    absenRecords.filter(a =>
      a.date === date &&
      a.kelasId === activeKelas &&
      // Saat UTS/UAS: filter by mapel & jamUjian supaya multi-sesi tidak saling timpa
      (!isUjian || !mataPelajaran || (a.mataPelajaran === mataPelajaran && (!jamUjian || a.jamUjian === jamUjian)))
    ),
    [absenRecords, date, activeKelas, isUjian, mataPelajaran, jamUjian]
  );

  const liburForDate = useMemo(() =>
    liburDates.find(l => l.date === date && l.jenjang === jenjangAktif),
    [liburDates, date, jenjangAktif]
  );

  // isEditMode: tanggal sudah pernah disimpan (ada record S/I/A atau sudah dikonfirmasi hadir semua)
  const isConfirmed = isDateConfirmed(
    activeKelas,
    date,
    isUjian ? periode : undefined,
    isUjian ? mataPelajaran : undefined,
    isUjian ? jamUjian : undefined
  );
  const isEditMode = (existingForDate.length > 0 || isConfirmed) && Object.keys(localStatus).length === 0;

  const students = useMemo(() => {
    if (!kelas) return [];
    return kelas.students
      .filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name, 'id', { numeric: true, sensitivity: 'base' }));
  }, [kelas, search]);

  const getStatus = (studentId: string): AbsenStatus => {
    if (localStatus[studentId] !== undefined) return localStatus[studentId];
    return existingForDate.find(a => a.studentId === studentId)?.status || 'H';
  };

  const getKet = (studentId: string): string => {
    if (localKet[studentId] !== undefined) return localKet[studentId];
    return existingForDate.find(a => a.studentId === studentId)?.keterangan || '';
  };

  const toggleStatus = (studentId: string, status: AbsenStatus) => {
    setLocalStatus(prev => ({ ...prev, [studentId]: status }));
    // Kalau balik ke Hadir, clear keterangan & collapse
    if (status === 'H') {
      setLocalKet(prev => ({ ...prev, [studentId]: '' }));
      setExpandedId(null);
    } else {
      // Auto expand keterangan saat pilih S/I/A
      setExpandedId(studentId);
    }
  };

  const startEdit = () => {
    const prefilled: Record<string, AbsenStatus> = {};
    const prefilledKet: Record<string, string> = {};
    kelas?.students.forEach(s => {
      const rec = existingForDate.find(a => a.studentId === s.id);
      prefilled[s.id]    = rec?.status      || 'H';
      prefilledKet[s.id] = rec?.keterangan  || '';
    });
    setLocalStatus(prefilled);
    setLocalKet(prefilledKet);
    setEditingSession(true);
    showToast('Mode edit aktif — perubahan belum disimpan');
  };

  const markAllHadir = () => {
    const all: Record<string, AbsenStatus> = {};
    kelas?.students.forEach(s => { all[s.id] = 'H'; });
    setLocalStatus(all);
    setLocalKet({});
    setExpandedId(null);
  };

  const handleSave = () => {
    if (!kelas) return;
    if (liburForDate) {
      showToast('Tanggal ini libur, absensi tidak perlu disimpan');
      return;
    }
    // Saat UTS/UAS, mapel wajib diisi
    if (isUjian && !mataPelajaran.trim()) {
      showToast('Mata pelajaran wajib diisi untuk absensi ujian');
      return;
    }
    // Validasi: cegah input mapel+jam yang sama dua kali di hari yang sama (kecuali sedang edit)
    if (isUjian && mataPelajaran.trim() && !editingSession) {
      const mapelKey2 = mataPelajaran.trim();
      const jamKey2 = jamUjian.trim();
      const alreadyExists = isDateConfirmed(activeKelas, date, periode, mapelKey2 || undefined, jamKey2 || undefined);
      if (alreadyExists) {
        showToast(`Absensi ${mapelKey2}${jamKey2 ? ` (${jamKey2})` : ''} sudah ada. Klik Edit untuk mengubah.`);
        return;
      }
    }
    const mapelKey = mataPelajaran.trim();
    const jamKey = isUjian ? jamUjian.trim() : '';
    const records: AbsenRecord[] = kelas.students.map(s => ({
      // ID include mapel & jam saat UTS/UAS supaya multi-sesi per hari tidak saling timpa
      id:             isUjian && mapelKey
                        ? `${date}_${mapelKey.replace(/\s+/g, '_')}${jamKey ? `_${jamKey.replace(/\s+/g, '_')}` : ''}_${s.id}_${activeKelas}`
                        : `${date}_${s.id}_${activeKelas}`,
      studentId:      s.id,
      studentName:    s.name,
      date,
      status:         getStatus(s.id),
      keterangan:     getKet(s.id) || undefined,
      kelasId:        activeKelas,
      periodeUjian:   periode,
      mataPelajaran:  mapelKey || undefined,
      jamUjian:       jamKey || undefined,
    }));
    addAbsenRecords(records);
    confirmDate(activeKelas, date, periode, mapelKey || undefined, jamKey || undefined);
    setLocalStatus({});
    setLocalKet({});
    setExpandedId(null);
    setShowPreview(false);
    setEditingSession(false);
    showToast('Absensi berhasil disimpan');

    // UX: Saat ujian, auto-reset mapel & jam untuk input sesi berikutnya
    if (isUjian) {
      setMataPelajaran('');
      setJamUjian('');
    }
  };

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    setJamUjian('');
    setLocalStatus({});
    setLocalKet({});
    setExpandedId(null);
    setShowPreview(false);
    setShowLiburForm(false);
    setLiburKet('');
    setEditingSession(false);
  };

  // Baca target date dari sessionStorage (dikirim dari HomePage widget)
  useEffect(() => {
    const target = sessionStorage.getItem('jg_absen_target_date');
    if (target) {
      handleDateChange(target);
      sessionStorage.removeItem('jg_absen_target_date');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddLibur = () => {
    addLiburDate({
      id: `l_${date}_${jenjangAktif}`,
      date,
      jenjang: jenjangAktif,
      keterangan: liburKet.trim() || undefined,
    });
    deleteAbsenRecordsByDateAndJenjang(date, jenjangAktif);
    // Unconfirm semua kelas jenjang ini untuk tanggal ini
    unconfirmDate(activeKelas, date);
    setLocalStatus({});
    setLocalKet({});
    setExpandedId(null);
    setShowPreview(false);
    setShowLiburForm(false);
    setLiburKet('');
    showToast(`Tanggal ${date} ditandai libur untuk ${jenjangAktif}`);
  };

  const handleDeleteLibur = () => {
    if (!liburForDate) return;
    deleteLiburDate(liburForDate.id);
    showToast('Libur dibatalkan');
  };

  const statuses: AbsenStatus[] = ['H', 'S', 'I', 'A'];
  const statusColors: Record<AbsenStatus, string> = {
    H: 'bg-primary text-primary-foreground',
    S: 'bg-semantic-blue text-white',
    I: 'bg-semantic-yellow text-white',
    A: 'bg-semantic-red text-white',
  };

  const statusLabel: Record<AbsenStatus, string> = {
    H: 'Hadir', S: 'Sakit', I: 'Izin', A: 'Alpha',
  };
  const attendanceSummary = kelas?.students.reduce((summary, student) => {
    const status = getStatus(student.id);
    summary[status]++;
    return summary;
  }, { H: 0, S: 0, I: 0, A: 0 } as Record<AbsenStatus, number>) || { H: 0, S: 0, I: 0, A: 0 };

  if (!kelas || kelas.students.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <p className="text-text-secondary text-sm">Belum ada siswa di kelas ini.</p>
        <p className="text-text-tertiary text-xs">Tambahkan siswa di menu <strong>Data Siswa</strong> terlebih dahulu.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full max-w-4xl mx-auto overflow-hidden">

      <div className="flex rounded-xl bg-bg-2 p-1 gap-1">
        {([['harian', 'Harian'], ['ujian', 'Ujian'], ['kalender', 'Kalender']] as const).map(([id, label]) => <button key={id} onClick={() => {
          setAttendanceTab(id);
          setShowKalender(id === 'kalender');
          if (id === 'harian') handlePeriodeChange('Harian');
          if (id === 'ujian' && !isUjian) handlePeriodeChange('UTS');
        }} className={`flex-1 rounded-lg py-2.5 text-xs font-bold ${attendanceTab === id ? 'bg-surface shadow-soft text-foreground' : 'text-text-tertiary'}`}>{label}</button>)}
      </div>

      {/* ── Card kontrol: Tanggal · Periode · Mapel ── */}
      <div className="bg-surface rounded-2xl shadow-soft p-4 flex flex-col gap-3 overflow-hidden">

        {/* Baris 1: Tanggal + tombol Kalender */}
        <div className="flex gap-2 min-w-0">
          <input
            type="date"
            value={date}
            onChange={e => handleDateChange(e.target.value)}
            className="input-soft flex-1 min-w-0 w-0"
          />
          <button
            onClick={() => { setAttendanceTab('kalender'); setShowKalender(v => !v); }}
            title="Lihat kalender absensi"
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold transition-all ${
              showKalender ? 'bg-primary text-white' : 'bg-bg-2 text-text-secondary hover:text-primary hover:bg-accent-light'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span className="hidden sm:inline">Kalender</span>
          </button>
        </div>

        {/* Baris 2: Toggle Harian / UTS / UAS */}
        {attendanceTab === 'ujian' && <div className="flex bg-bg-2 rounded-xl p-1 gap-1">
          {PERIODE_OPTIONS.map(p => (
            <button
              key={p}
              onClick={() => handlePeriodeChange(p)}
              className={`flex-1 py-2 text-[12px] font-semibold rounded-lg transition-all ${
                periode === p ? 'bg-surface shadow-soft text-foreground' : 'text-text-tertiary'
              }`}
            >
              {p}
            </button>
          ))}
        </div>}

        {/* Kalender mini */}
        {showKalender && (
          <AbsensiKalender
            selectedDate={date}
            onSelectDate={d => { handleDateChange(d); setShowKalender(false); }}
          />
        )}

        {/* Baris 3: Jenjang + Tandai Libur */}
        <div className="flex items-center justify-between gap-2 rounded-xl bg-bg-2 px-3 py-2">
          <p className="text-[12px] text-text-secondary truncate">
            Jenjang: <span className="font-bold text-foreground">{jenjangAktif}</span>
          </p>
          {liburForDate ? (
            <button
              onClick={handleDeleteLibur}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-semantic-red-light text-semantic-red hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            >
              <X className="w-3 h-3" /> Batalkan Libur
            </button>
          ) : (
            <button
              onClick={() => setShowLiburForm(v => !v)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-bg-3 text-text-secondary hover:text-primary transition-colors"
            >
              <CalendarX className="w-3 h-3" /> Tandai Libur
            </button>
          )}
        </div>

        {/* Form libur */}
        {showLiburForm && !liburForDate && (
          <div className="rounded-xl border border-border bg-bg-2 p-3 flex flex-col gap-2">
            <label className="label-upper block">Keterangan Libur</label>
            <input
              value={liburKet}
              onChange={e => setLiburKet(e.target.value)}
              placeholder="Contoh: Libur nasional, rapat guru..."
              className="input-soft text-[13px]"
            />
            {existingForDate.length > 0 && (
              <p className="text-[11px] text-semantic-red">
                Menandai libur akan menghapus {existingForDate.length} data absensi pada tanggal ini.
              </p>
            )}
            <div className="flex gap-2">
              <button onClick={() => setShowLiburForm(false)} className="btn-soft btn-secondary-soft flex-1 py-2 text-sm">Batal</button>
              <button onClick={handleAddLibur} className="btn-soft btn-primary-soft flex-1 py-2 text-sm">Simpan Libur</button>
            </div>
          </div>
        )}

        {/* Mata pelajaran hanya diperlukan untuk sesi ujian. */}
        {isUjian && <div>
          <label className="label-upper block mb-1.5">
            Mata Pelajaran
            <span className="ml-1.5 text-semantic-red text-[10px] font-bold normal-case">* wajib untuk {periode}</span>
          </label>

          {/* Chip sesi ujian yang sudah ada hari ini */}
          {sesiUjianHariIni.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5 items-center">
              <span className="text-[10px] text-text-tertiary">Sesi hari ini:</span>
              {sesiUjianHariIni.map(session => {
                const isActive = mataPelajaran === session.mapel && jamUjian === (session.jam || '');
                return (
                  <button
                    key={session.label}
                    onClick={() => {
                      setMataPelajaran(session.mapel);
                      setJamUjian(session.jam || '');
                      setLocalStatus({});
                      setLocalKet({});
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all flex items-center gap-1 ${
                      isActive
                        ? 'bg-primary text-white border-primary'
                        : 'bg-bg-2 border-border text-text-secondary hover:border-primary hover:text-primary'
                    }`}
                  >
                    <BookOpen className="w-3 h-3" />
                    {session.label}
                  </button>
                );
              })}
            </div>
          )}

          <input
            value={mataPelajaran}
            onChange={e => setMataPelajaran(e.target.value)}
            placeholder={`Nama mapel ${periode} (wajib)`}
            className={`input-soft w-full ${!mataPelajaran ? 'border-semantic-red/50' : ''}`}
          />
          {!mataPelajaran && (
            <p className="text-[11px] text-semantic-red mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Isi mapel dulu sebelum simpan
            </p>
          )}
        </div>}

        {/* Jam/Sesi Ujian (opsional, hanya UTS/UAS) */}
        {isUjian && (
          <div className="mt-3">
            <label className="label-upper block mb-1.5">
              Jam / Sesi Ujian <span className="text-text-tertiary text-[10px] font-normal normal-case">(opsional)</span>
            </label>
            <div className="flex gap-1.5 mb-2">
              {['Jam 1', 'Jam 2', 'Jam 3', 'Jam 4'].map(label => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setJamUjian(jamUjian === label ? '' : label)}
                  className={`flex-1 py-1.5 rounded-xl border text-[11px] font-bold transition-all active:scale-[0.97] ${
                    jamUjian === label
                      ? 'bg-primary text-white border-primary shadow-soft'
                      : 'bg-surface border-border text-text-secondary hover:border-primary/50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={jamUjian}
              onChange={e => setJamUjian(e.target.value)}
              placeholder="cth: Jam 1, Jam 2, atau kosongkan"
              className="input-soft w-full text-[13px]"
            />
          </div>
        )}
      </div>

      {attendanceTab !== 'kalender' && !liburForDate && <div className="grid grid-cols-4 gap-2">
        {([['H', 'Hadir'], ['S', 'Sakit'], ['I', 'Izin'], ['A', 'Alpha']] as [AbsenStatus, string][]).map(([id, label]) => <div key={id} className="rounded-xl bg-surface p-3 text-center shadow-soft"><p className={`text-lg font-bold ${id === 'A' ? 'text-semantic-red' : ''}`}>{attendanceSummary[id]}</p><p className="text-[9px] font-bold uppercase text-text-tertiary">{label}</p></div>)}
      </div>}

      {liburForDate && (
        <div className="bg-semantic-yellow-light rounded-2xl px-4 py-5 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/60 dark:bg-black/10 flex items-center justify-center flex-shrink-0">
            <CalendarX className="w-4 h-4 text-semantic-yellow" />
          </div>
          <div>
            <p className="text-sm font-bold text-semantic-yellow">Libur untuk jenjang {jenjangAktif}</p>
            <p className="text-[12px] text-semantic-yellow/80 mt-1">
              Tidak perlu mengisi absensi pada tanggal ini{liburForDate.keterangan ? `: ${liburForDate.keterangan}` : '.'}
            </p>
          </div>
        </div>
      )}

      {attendanceTab !== 'kalender' && !liburForDate && (
        <>

      {/* Edit mode banner */}
      {isEditMode && (
        <div className="bg-semantic-blue-light rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-[13px] text-semantic-blue font-semibold">
              {existingForDate.length === 0 && isConfirmed
                ? 'Semua siswa hadir pada hari ini'
                : 'Data absensi sudah ada'}
              {isUjian && mataPelajaran && (
                <span className="ml-1.5 text-[11px] font-normal opacity-80">· {mataPelajaran}</span>
              )}
            </p>
            <p className="text-[11px] text-semantic-blue/70 mt-0.5">
              {existingForDate.filter(a => a.status !== 'H').length} siswa tidak hadir tercatat
            </p>
          </div>
          <button onClick={startEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-semantic-blue text-white rounded-lg text-[12px] font-semibold flex-shrink-0 hover:bg-blue-600 transition-colors">
            <Pencil className="w-3 h-3" /> Edit
          </button>
        </div>
      )}

      {/* Search + Hadir Semua */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input type="text" placeholder="Cari nama siswa..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="input-soft pl-10 w-full" />
        </div>
        <button onClick={markAllHadir}
          className="flex items-center gap-1.5 px-3 py-2 bg-accent-light text-primary rounded-xl text-xs font-semibold hover:bg-primary hover:text-white transition-all flex-shrink-0">
          <CheckCircle className="w-3.5 h-3.5" /> Hadir Semua
        </button>
      </div>

      {/* Daftar Siswa */}
      <div className="bg-surface rounded-2xl shadow-soft overflow-hidden">
        {students.map((s, i) => {
          const status   = getStatus(s.id);
          const ket      = getKet(s.id);
          const isOpen   = expandedId === s.id;
          const needsKet = status !== 'H';
          const suggestions = KETERANGAN_SUGGESTIONS[status] || [];

          return (
            <div key={s.id}
              className={`${i < students.length - 1 ? 'border-b border-border' : ''}`}>

              {/* Baris utama */}
              <div className="flex items-center justify-between px-4 py-3 gap-3">
                {/* Nama */}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-foreground truncate">{s.name}</p>
                  {/* Tampilkan keterangan singkat kalau ada */}
                  {ket && !isOpen && (
                    <p className="text-[11px] text-text-tertiary truncate mt-0.5 italic">"{ket}"</p>
                  )}
                </div>

                {status === 'H' ? <button onClick={() => { toggleStatus(s.id, 'A'); setExpandedId(s.id); }} className="rounded-xl border border-border bg-bg-2 px-3 py-2 text-[11px] font-bold text-text-secondary">Tandai tidak hadir</button> : <button onClick={() => setExpandedId(isOpen ? null : s.id)} className={`rounded-xl px-3 py-2 text-[11px] font-bold ${statusColors[status]}`}>{statusLabel[status]}</button>}

                {/* Tombol expand keterangan — hanya muncul kalau S/I/A */}
                {needsKet && (
                  <button
                    onClick={() => setExpandedId(isOpen ? null : s.id)}
                    className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                      isOpen ? 'bg-bg-3 text-text-secondary' : 'bg-bg-2 text-text-tertiary hover:bg-bg-3'
                    }`}
                    title="Tambah keterangan"
                  >
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                )}
              </div>

              {/* Panel keterangan — slide down */}
              {needsKet && isOpen && (
                <div className="px-4 pb-3 flex flex-col gap-2 bg-bg-2 border-t border-border">
                  <div className="grid grid-cols-4 gap-1 pt-2">
                    {statuses.map(st => <button key={st} onClick={() => toggleStatus(s.id, st)} className={`rounded-lg py-2 text-[10px] font-bold ${status === st ? statusColors[st] : 'bg-surface text-text-tertiary'}`}>{statusLabel[st]}</button>)}
                  </div>
                  <label className="label-upper pt-2 block">
                    Keterangan {statusLabel[status]}
                  </label>

                  {/* Input teks bebas */}
                  <input
                    type="text"
                    value={ket}
                    onChange={e => setLocalKet(prev => ({ ...prev, [s.id]: e.target.value }))}
                    placeholder={`Contoh: ${suggestions[0] || 'Tulis keterangan...'}`}
                    className="input-soft text-[13px]"
                    autoFocus
                  />

                  {/* Saran cepat */}
                  {suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {suggestions.map(sug => (
                        <button
                          key={sug}
                          onClick={() => setLocalKet(prev => ({ ...prev, [s.id]: sug }))}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                            ket === sug
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-surface border-border text-text-secondary hover:border-primary hover:text-primary'
                          }`}
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Preview & Simpan */}
      {!showPreview ? (
        <button onClick={() => setShowPreview(true)} className="btn-soft btn-primary-soft w-full py-3">
          {isEditMode ? 'Edit & Simpan' : 'Pratinjau & Simpan'}
        </button>
      ) : (
        <div className="flex flex-col gap-3">
          <h3 className="label-upper">
            Pratinjau — {date} · {periode}{mataPelajaran && mataPelajaran !== '__custom' ? ` · ${mataPelajaran}` : ''}{jamUjian ? ` (${jamUjian})` : ''}
          </h3>
          <div className="bg-surface rounded-2xl shadow-soft overflow-hidden">
            {kelas?.students.map((s, i, arr) => {
              const st  = getStatus(s.id);
              const ket = getKet(s.id);
              if (st === 'H') return null;
              return (
                <div key={s.id}
                  className={`flex justify-between items-start px-4 py-3 gap-3 ${i < arr.length - 1 ? 'border-b border-border' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate">{s.name}</p>
                    {ket && <p className="text-[11px] text-text-tertiary italic mt-0.5">"{ket}"</p>}
                  </div>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md flex-shrink-0 ${
                    st === 'S' ? 'bg-semantic-blue-light text-semantic-blue' :
                    st === 'I' ? 'bg-semantic-yellow-light text-semantic-yellow' :
                    'bg-semantic-red-light text-semantic-red'
                  }`}>
                    {statusLabel[st]}
                  </span>
                </div>
              );
            })}
            {kelas?.students.every(s => getStatus(s.id) === 'H') && (
              <p className="px-4 py-4 text-sm text-text-tertiary text-center">Semua siswa hadir ✓</p>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowPreview(false)} className="btn-soft btn-secondary-soft flex-1 py-3">Batal</button>
            <button onClick={handleSave} className="btn-soft btn-primary-soft flex-1 py-3">Simpan</button>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
