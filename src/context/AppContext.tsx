import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { Kelas, AbsenRecord, KasusRecord, CatatanRecord, TabId, ActivityView, ReportView, SemesterConfig, BackupData, LiburDate, Jenjang, ConfirmedDate, PeriodeUjian } from '@/types';
import { storageGet, storageSet, storageRemove, initStorage } from '@/lib/storage';
import { useAutoBackup } from '@/hooks/use-auto-backup';
import { useSupabase } from './SupabaseContext';

// ─── helpers (sekarang pakai IndexedDB via storage layer) ────────────────────
function ls<T>(key: string, fallback: T): T {
  return storageGet<T>(key, fallback);
}
function save(key: string, value: unknown) {
  storageSet(key, value);
}

// ─── defaults ───────────────────────────────────────────────────────────────
const currentYear = new Date().getFullYear();
const DEFAULT_SEMESTER: SemesterConfig = {
  tahunAjaran: `${currentYear}/${currentYear + 1}`,
  semester: new Date().getMonth() < 6 ? 'genap' : 'ganjil',
  ganjil: { utsStart: '', utsEnd: '', uasStart: '', uasEnd: '' },
  genap: { utsStart: '', utsEnd: '', uasStart: '', uasEnd: '' },
};
const DELETED_KELAS_KEY = 'jg_deletedKelasIds';

// ─── Fix 3: Zod-lite validation for importBackup ─────────────────────────────
function validateBackup(data: unknown): data is BackupData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  if (typeof d.version !== 'string') return false;
  if (!Array.isArray(d.kelasList)) return false;
  // kelasList items must have id/name/students
  for (const k of d.kelasList as unknown[]) {
    if (!k || typeof k !== 'object') return false;
    const kk = k as Record<string, unknown>;
    if (typeof kk.id !== 'string' || typeof kk.name !== 'string' || !Array.isArray(kk.students)) return false;
  }
  return true;
}

// ─── Fix 2: addAbsenRecords — exception-based, drop status H ─────────────────
// Records with status H are NOT stored; presence is inferred from absence of S/I/A.
// When editing an existing non-H record to H, the record is deleted.

interface AppState {
  namaGuru: string;
  setNamaGuru: (name: string) => void;
  lastBackupDate: string | null;
  setLastBackupDate: (d: string) => void;
  activeTab: TabId;
  setActiveTab: (tab: TabId | 'absen' | 'jurnal') => void;
  activityView: ActivityView;
  setActivityView: (view: ActivityView) => void;
  reportView: ReportView;
  setReportView: (view: ReportView) => void;
  activeKelas: string;
  setActiveKelas: (id: string) => void;
  activeStudentId: string | null;
  setActiveStudentId: (id: string | null) => void;
  kelasList: Kelas[];
  setKelasList: React.Dispatch<React.SetStateAction<Kelas[]>>;
  addKelas: (name: string, jenjang?: Jenjang) => void;
  deleteKelas: (id: string) => void;
  addStudentsToKelas: (kelasId: string, students: { name: string; nis: string }[]) => void;
  removeStudentFromKelas: (kelasId: string, studentId: string) => void;
  updateStudent: (kelasId: string, studentId: string, updates: { name?: string; nis?: string }) => void;
  absenRecords: AbsenRecord[];
  addAbsenRecords: (records: AbsenRecord[]) => void;
  updateAbsenRecord: (id: string, updates: Partial<AbsenRecord>) => void;
  deleteAbsenRecord: (id: string) => void;
  deleteAbsenRecordsByDateAndJenjang: (date: string, jenjang: Jenjang) => void;
  kasusRecords: KasusRecord[];
  addKasusRecord: (record: KasusRecord) => void;
  updateKasusRecord: (id: string, updates: Partial<KasusRecord>) => void;
  deleteKasusRecord: (id: string) => void;
  catatanRecords: CatatanRecord[];
  addCatatanRecord: (record: CatatanRecord) => void;
  updateCatatanRecord: (id: string, updates: Partial<CatatanRecord>) => void;
  deleteCatatanRecord: (id: string) => void;
  liburDates: LiburDate[];
  addLiburDate: (libur: LiburDate) => void;
  deleteLiburDate: (id: string) => void;
  confirmedDates: ConfirmedDate[];
  confirmDate: (kelasId: string, date: string, periodeUjian?: PeriodeUjian, mataPelajaran?: string, jamUjian?: string) => void;
  unconfirmDate: (kelasId: string, date: string, periodeUjian?: PeriodeUjian, mataPelajaran?: string, jamUjian?: string) => void;
  isDateConfirmed: (kelasId: string, date: string, periodeUjian?: PeriodeUjian, mataPelajaran?: string, jamUjian?: string) => boolean;
  toasts: { id: string; message: string }[];
  showToast: (message: string) => void;
  semester: SemesterConfig;
  setSemester: React.Dispatch<React.SetStateAction<SemesterConfig>>;
  exportBackup: () => void;
  importBackup: (data: BackupData) => void;
  resetAll: () => void;
  syncWithCloud: () => Promise<boolean>;
  initialSyncReady: boolean;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { user, authLoading, syncData, syncState } = useSupabase();
  const [initialSyncReady, setInitialSyncReady] = useState(false);
  // ── Fix 1: All state loaded from localStorage ──────────────────────────────
  const [namaGuru, setNamaGuruRaw] = useState(() => ls<string>('jg_namaGuru', ''));
  const [lastBackupDate, setLastBackupRaw] = useState(() => ls<string | null>('jg_lastBackup', null));
  const legacyTab = ls<string>('jg_activeTab', 'home');
  const initialTab: TabId = legacyTab === 'absen' || legacyTab === 'jurnal' ? 'aktivitas' : legacyTab === 'siswa' ? 'siswa' : (['home', 'aktivitas', 'laporan', 'setelan', 'auth'].includes(legacyTab) ? legacyTab as TabId : 'home');
  const [activeTab, setActiveTabRaw] = useState<TabId>(initialTab);
  const [activityView, setActivityViewRaw] = useState<ActivityView>(() => ls<ActivityView>('jg_activityView', legacyTab === 'jurnal' ? 'jurnal' : 'absen'));
  const [reportView, setReportViewRaw] = useState<ReportView>(() => ls<ReportView>('jg_reportView', 'pantauan'));
  const [activeKelas, setActiveKelasRaw] = useState<string>(() => ls<string>('jg_activeKelas', ''));
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
  const [kelasList, setKelasListRaw] = useState<Kelas[]>(() => ls<Kelas[]>('jg_kelasList', []));
  const [absenRecords, setAbsenRecordsRaw] = useState<AbsenRecord[]>(() => ls<AbsenRecord[]>('jg_absenRecords', []));
  const [kasusRecords, setKasusRecordsRaw] = useState<KasusRecord[]>(() => ls<KasusRecord[]>('jg_kasusRecords', []));
  const [catatanRecords, setCatatanRecordsRaw] = useState<CatatanRecord[]>(() => ls<CatatanRecord[]>('jg_catatanRecords', []));
  const [liburDates, setLiburDatesRaw] = useState<LiburDate[]>(() => ls<LiburDate[]>('jg_liburDates', []));
  const [confirmedDates, setConfirmedDatesRaw] = useState<ConfirmedDate[]>(() => ls<ConfirmedDate[]>('jg_confirmedDates', []));
  const [toasts, setToasts] = useState<{ id: string; message: string }[]>([]);
  const [semester, setSemesterRaw] = useState<SemesterConfig>(() => ls<SemesterConfig>('jg_semester', DEFAULT_SEMESTER));

  // ── Fix 1: Wrapped setters that also persist ──────────────────────────────
  const setNamaGuru = useCallback((v: string) => {
    setNamaGuruRaw(v); save('jg_namaGuru', v);
  }, []);
  const setLastBackupDate = useCallback((v: string) => {
    setLastBackupRaw(v); save('jg_lastBackup', v);
  }, []);
  const setActiveTab = useCallback((v: TabId | 'absen' | 'jurnal') => {
    if (v === 'absen' || v === 'jurnal') {
      setActivityViewRaw(v); save('jg_activityView', v);
      setActiveTabRaw('aktivitas'); save('jg_activeTab', 'aktivitas');
      return;
    }
    setActiveTabRaw(v); save('jg_activeTab', v);
  }, []);
  const setActivityView = useCallback((v: ActivityView) => {
    setActivityViewRaw(v); save('jg_activityView', v); setActiveTabRaw('aktivitas'); save('jg_activeTab', 'aktivitas');
  }, []);
  const setReportView = useCallback((v: ReportView) => {
    setReportViewRaw(v); save('jg_reportView', v); setActiveTabRaw('laporan'); save('jg_activeTab', 'laporan');
  }, []);
  const setActiveKelas = useCallback((v: string) => {
    setActiveKelasRaw(v); save('jg_activeKelas', v);
    // Reset student detail view when kelas changes
    setActiveStudentId(null);
  }, []);
  const setSemester: React.Dispatch<React.SetStateAction<SemesterConfig>> = useCallback((v) => {
    setSemesterRaw(prev => {
      const next = typeof v === 'function' ? v(prev) : v;
      save('jg_semester', next);
      return next;
    });
  }, []);
  const setKelasList: React.Dispatch<React.SetStateAction<Kelas[]>> = useCallback((v) => {
    setKelasListRaw(prev => {
      const next = typeof v === 'function' ? v(prev) : v;
      save('jg_kelasList', next);
      return next;
    });
  }, []);
  const setAbsenRecords = useCallback((v: React.SetStateAction<AbsenRecord[]>) => {
    setAbsenRecordsRaw(prev => {
      const next = typeof v === 'function' ? v(prev) : v;
      save('jg_absenRecords', next);
      return next;
    });
  }, []);
  const setKasusRecords = useCallback((v: React.SetStateAction<KasusRecord[]>) => {
    setKasusRecordsRaw(prev => {
      const next = typeof v === 'function' ? v(prev) : v;
      save('jg_kasusRecords', next);
      return next;
    });
  }, []);
  const setCatatanRecords = useCallback((v: React.SetStateAction<CatatanRecord[]>) => {
    setCatatanRecordsRaw(prev => {
      const next = typeof v === 'function' ? v(prev) : v;
      save('jg_catatanRecords', next);
      return next;
    });
  }, []);
  const setLiburDates = useCallback((v: React.SetStateAction<LiburDate[]>) => {
    setLiburDatesRaw(prev => {
      const next = typeof v === 'function' ? v(prev) : v;
      save('jg_liburDates', next);
      return next;
    });
  }, []);
  const setConfirmedDates = useCallback((v: React.SetStateAction<ConfirmedDate[]>) => {
    setConfirmedDatesRaw(prev => {
      const next = typeof v === 'function' ? v(prev) : v;
      save('jg_confirmedDates', next);
      return next;
    });
  }, []);

  // ── Inisialisasi IndexedDB storage saat pertama mount ─────────────────────
  useEffect(() => {
    initStorage().catch(() => {/* fallback ke localStorage sudah ditangani di storage.ts */ });
    storageRemove('jg_jadwalList');
  }, []);

  // ── Auto-set activeKelas ───────────────────────────────────────────────────
  useEffect(() => {
    if (kelasList.length > 0 && !kelasList.find(k => k.id === activeKelas)) {
      setActiveKelas(kelasList[0].id);
    }
    if (kelasList.length === 0) setActiveKelas('');
  }, [kelasList]);

  const showToast = useCallback((message: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  // ── Fix 2: exception-based absen — H is dropped, editing to H deletes ─────
  const addAbsenRecords = useCallback((records: AbsenRecord[]) => {
    setAbsenRecords(prev => {
      // Remove any existing record for same studentId+date+kelasId
      // Untuk ujian multi-sesi (ada mataPelajaran), juga match mataPelajaran+jamUjian
      // supaya sesi Jam 1 tidak terhapus saat simpan Jam 2
      const deduped = prev.filter(p =>
        !records.some(r =>
          r.studentId === p.studentId &&
          r.date === p.date &&
          r.kelasId === p.kelasId &&
          // Kalau record baru punya mataPelajaran, hanya hapus record lama yang mapel+jam-nya sama
          (r.mataPelajaran
            ? r.mataPelajaran === p.mataPelajaran && (r.jamUjian || '') === (p.jamUjian || '')
            : !p.mataPelajaran)
        )
      );
      // Only store non-H (exceptions: S, I, A)
      const exceptions = records.filter(r => r.status !== 'H');
      return [...deduped, ...exceptions];
    });
  }, []);

  const updateAbsenRecord = useCallback((id: string, updates: Partial<AbsenRecord>) => {
    setAbsenRecords(prev => {
      // Fix 2: if updated status is H, delete the record (H = hadir = no exception)
      if (updates.status === 'H') {
        return prev.filter(r => r.id !== id);
      }
      return prev.map(r => r.id === id ? { ...r, ...updates } : r);
    });
  }, []);

  const deleteAbsenRecord = useCallback((id: string) => {
    setAbsenRecords(prev => prev.filter(r => r.id !== id));
  }, []);

  const deleteAbsenRecordsByDateAndJenjang = useCallback((date: string, jenjang: Jenjang) => {
    const kelasIds = new Set(kelasList.filter(k => (k.jenjang || 'SMP') === jenjang).map(k => k.id));
    setAbsenRecords(prev => prev.filter(r => !(r.date === date && kelasIds.has(r.kelasId))));
  }, [kelasList]);

  const addKasusRecord = useCallback((record: KasusRecord) => {
    setKasusRecords(prev => [...prev, record]);
  }, []);
  const updateKasusRecord = useCallback((id: string, updates: Partial<KasusRecord>) => {
    setKasusRecords(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  }, []);
  const deleteKasusRecord = useCallback((id: string) => {
    setKasusRecords(prev => prev.filter(r => r.id !== id));
  }, []);

  const addCatatanRecord = useCallback((record: CatatanRecord) => {
    setCatatanRecords(prev => [...prev, record]);
  }, []);
  const updateCatatanRecord = useCallback((id: string, updates: Partial<CatatanRecord>) => {
    setCatatanRecords(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  }, []);
  const deleteCatatanRecord = useCallback((id: string) => {
    setCatatanRecords(prev => prev.filter(r => r.id !== id));
  }, []);

  const addLiburDate = useCallback((libur: LiburDate) => {
    setLiburDates(prev => {
      const filtered = prev.filter(l => !(l.jenjang === libur.jenjang && l.date === libur.date));
      return [...filtered, libur];
    });
  }, []);
  const deleteLiburDate = useCallback((id: string) => {
    setLiburDates(prev => prev.filter(l => l.id !== id));
  }, []);

  const confirmDate = useCallback((kelasId: string, date: string, periodeUjian?: PeriodeUjian, mataPelajaran?: string, jamUjian?: string) => {
    setConfirmedDates(prev => {
      // Remove any existing confirmed date that matches this specific criteria (or exact same slots)
      const filtered = prev.filter(c =>
        !(c.kelasId === kelasId &&
          c.date === date &&
          c.periodeUjian === periodeUjian &&
          c.mataPelajaran === mataPelajaran &&
          c.jamUjian === jamUjian)
      );
      const id = `${kelasId}_${date}${mataPelajaran ? `_${mataPelajaran.replace(/\s+/g, '_')}` : ''}${jamUjian ? `_${jamUjian.replace(/\s+/g, '_')}` : ''}`;
      return [...filtered, { id, kelasId, date, periodeUjian, mataPelajaran, jamUjian }];
    });
  }, []);
  const unconfirmDate = useCallback((kelasId: string, date: string, periodeUjian?: PeriodeUjian, mataPelajaran?: string, jamUjian?: string) => {
    setConfirmedDates(prev => prev.filter(c =>
      !(c.kelasId === kelasId &&
        c.date === date &&
        (!periodeUjian || c.periodeUjian === periodeUjian) &&
        (!mataPelajaran || c.mataPelajaran === mataPelajaran) &&
        (!jamUjian || c.jamUjian === jamUjian))
    ));
  }, []);
  const isDateConfirmed = useCallback((kelasId: string, date: string, periodeUjian?: PeriodeUjian, mataPelajaran?: string, jamUjian?: string) => {
    return confirmedDates.some(c =>
      c.kelasId === kelasId &&
      c.date === date &&
      (!periodeUjian || c.periodeUjian === periodeUjian) &&
      (!mataPelajaran || c.mataPelajaran === mataPelajaran) &&
      (!jamUjian || c.jamUjian === jamUjian)
    );
  }, [confirmedDates]);

  const addKelas = useCallback((name: string, jenjang: Jenjang = 'SMP') => {
    const id = 'k_' + Date.now();
    setKelasList(prev => [...prev, { id, name, jenjang, students: [] }]);
    setActiveKelas(id);
  }, []);
  const deleteKelas = useCallback((id: string) => {
    setKelasList(prev => prev.filter(k => k.id !== id));
    setAbsenRecords(prev => prev.filter(record => record.kelasId !== id));
    setKasusRecords(prev => prev.filter(record => record.kelasId !== id));
    setCatatanRecords(prev => prev.filter(record => record.kelasId !== id));
    setConfirmedDates(prev => prev.filter(record => record.kelasId !== id));
    const deletedIds = storageGet<string[]>(DELETED_KELAS_KEY, []);
    if (!deletedIds.includes(id)) storageSet(DELETED_KELAS_KEY, [...deletedIds, id]);
  }, [kelasList, setKelasList, setAbsenRecords, setKasusRecords, setCatatanRecords, setConfirmedDates]);
  const addStudentsToKelas = useCallback((kelasId: string, students: { name: string; nis: string }[]) => {
    setKelasList(prev => prev.map(k => {
      if (k.id !== kelasId) return k;
      const newStudents = students.map((s, i) => ({
        id: `${kelasId}_${Date.now()}_${i}`,
        name: s.name.trim(), nis: s.nis.trim(),
      })).filter(s => s.name);
      const combined = [...k.students, ...newStudents];
      combined.sort((a, b) => a.name.localeCompare(b.name, 'id', { numeric: true, sensitivity: 'base' }));
      return { ...k, students: combined };
    }));
  }, []);
  const updateStudent = useCallback((kelasId: string, studentId: string, updates: { name?: string; nis?: string }) => {
    const previousName = kelasList.find(k => k.id === kelasId)?.students.find(s => s.id === studentId)?.name;
    const nextKelasList = kelasList.map(k => {
      if (k.id !== kelasId) return k;
      const updated = k.students.map(s =>
        s.id !== studentId ? s : { ...s, ...updates }
      );
      updated.sort((a, b) => a.name.localeCompare(b.name, 'id', { numeric: true, sensitivity: 'base' }));
      return { ...k, students: updated };
    });
    const nextAbsenRecords = updates.name && updates.name !== previousName
      ? absenRecords.map(record => record.kelasId === kelasId && record.studentId === studentId ? { ...record, studentName: updates.name! } : record)
      : absenRecords;
    const nextKasusRecords = updates.name && updates.name !== previousName
      ? kasusRecords.map(record => record.kelasId === kelasId && record.studentId === studentId ? { ...record, studentName: updates.name! } : record)
      : kasusRecords;
    const nextCatatanRecords = updates.name && updates.name !== previousName
      ? catatanRecords.map(record => record.kelasId === kelasId && record.studentId === studentId ? { ...record, studentName: updates.name! } : record)
      : catatanRecords;

    setKelasList(nextKelasList);
    if (updates.name && updates.name !== previousName) {
      setAbsenRecords(nextAbsenRecords);
      setKasusRecords(nextKasusRecords);
      setCatatanRecords(nextCatatanRecords);
      if (user) {
        void syncData({
          version: '5.0', exportedAt: new Date().toISOString(), namaGuru, semester,
          kelasList: nextKelasList, absenRecords: nextAbsenRecords,
          kasusRecords: nextKasusRecords, catatanRecords: nextCatatanRecords,
          liburDates, confirmedDates,
        }).then(result => {
          if (!result) showToast('Nama siswa tersimpan lokal, tetapi gagal disimpan ke cloud.');
        });
      }
    }
  }, [kelasList, absenRecords, kasusRecords, catatanRecords, liburDates, confirmedDates, namaGuru, semester, user, syncData, setKelasList, setAbsenRecords, setKasusRecords, setCatatanRecords, showToast]);
  const removeStudentFromKelas = useCallback((kelasId: string, studentId: string) => {
    setKelasList(prev => prev.map(k =>
      k.id !== kelasId ? k : { ...k, students: k.students.filter(s => s.id !== studentId) }
    ));
  }, []);

  const resetAll = useCallback(() => {
    setNamaGuru('');
    setKelasList([]);
    setAbsenRecords([]);
    setKasusRecords([]);
    setCatatanRecords([]);
    setLiburDates([]);
    setConfirmedDates([]);
    setLastBackupDate('');
    setActiveKelas('');
    setSemester(DEFAULT_SEMESTER);
    // Clear all storage keys (IDB + localStorage)
    ['jg_namaGuru', 'jg_lastBackup', 'jg_activeTab', 'jg_activeKelas',
      'jg_kelasList', 'jg_deletedKelasIds', 'jg_absenRecords', 'jg_kasusRecords', 'jg_catatanRecords',
      'jg_jadwalList', 'jg_liburDates', 'jg_semester', 'jg_autobackup', 'jg_confirmedDates'].forEach(k => storageRemove(k));
    showToast('Semua data berhasil direset');
  }, [showToast]);

  const exportBackup = useCallback(() => {
    const data: BackupData = {
      version: '5.0', exportedAt: new Date().toISOString(),
      namaGuru, semester, kelasList, absenRecords, kasusRecords, catatanRecords, liburDates, confirmedDates,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_jurnal_guru_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    const today = new Date().toISOString().split('T')[0];
    setLastBackupDate(today);
    showToast('Backup berhasil diunduh');
  }, [namaGuru, semester, kelasList, absenRecords, kasusRecords, catatanRecords, liburDates, showToast]);

  // ── Fix 3: Zod-lite validation, reject corrupt/random JSON ────────────────
  const importBackup = useCallback((data: BackupData) => {
    if (!validateBackup(data)) {
      showToast('❌ Format backup tidak valid atau file corrupt');
      return;
    }
    if (data.namaGuru) setNamaGuru(data.namaGuru);
    setKelasList(data.kelasList);
    setAbsenRecords(data.absenRecords || []);
    setKasusRecords(data.kasusRecords || []);
    setCatatanRecords(data.catatanRecords || []);
    if (data.liburDates) setLiburDates(data.liburDates);
    if (data.confirmedDates) setConfirmedDates(data.confirmedDates);
    if (data.semester) setSemester(data.semester);
    if (data.kelasList.length > 0) setActiveKelas(data.kelasList[0].id);
    showToast('✅ Data berhasil dipulihkan dari backup');
  }, [showToast]);

  // ── Auto-backup: snapshot ke IDB setiap ada perubahan, auto-download kalau >3 hari ──
  const autoBackupData: BackupData = {
    version: '5.0',
    exportedAt: new Date().toISOString(),
    namaGuru, semester, kelasList, absenRecords, kasusRecords, catatanRecords, liburDates, confirmedDates,
  };
  useAutoBackup({
    data: autoBackupData,
    lastBackupDate,
    onAutoBackupDone: (date) => {
      setLastBackupDate(date);
      showToast('💾 Auto-backup berhasil diunduh');
    },
  });

  // Ref & helper untuk mengoptimalkan frekuensi sync
  const lastSyncedUserIdRef = React.useRef<string | null>(null);
  const lastSyncedDataRef = React.useRef<string>('');
  const isSyncingRef = React.useRef<boolean>(false);

  const getSerializedState = useCallback((
    name: string,
    sem: SemesterConfig,
    kelas: Kelas[],
    absen: AbsenRecord[],
    kasus: KasusRecord[],
    catatan: CatatanRecord[],
    libur: LiburDate[],
    confirmed: ConfirmedDate[]
  ) => {
    return JSON.stringify({
      namaGuru: name,
      semester: sem,
      kelasList: kelas,
      absenRecords: absen,
      kasusRecords: kasus,
      catatanRecords: catatan,
      liburDates: libur,
      confirmedDates: confirmed
    });
  }, []);

  // ── Sync awal saat user pertama kali login ────────────────────────────────────
  useEffect(() => {
    if (authLoading) {
      setInitialSyncReady(false);
      return;
    }
    if (!user) {
      lastSyncedUserIdRef.current = null;
      lastSyncedDataRef.current = '';
      setInitialSyncReady(true);
      return;
    }
    if (lastSyncedUserIdRef.current !== user.id) {
      lastSyncedUserIdRef.current = user.id;
      setInitialSyncReady(false);
      const triggerInitialSync = async () => {
        // Tunggu sebentar agar React selesai render sebelum mulai sync
        await new Promise(r => setTimeout(r, 300));
        if (isSyncingRef.current) return;
        isSyncingRef.current = true;

        const localState: BackupData = {
          version: '5.0',
          exportedAt: new Date().toISOString(),
          namaGuru,
          semester,
          kelasList,
          absenRecords,
          kasusRecords,
          catatanRecords,
          liburDates,
          confirmedDates
        };

        const synced = await syncData(localState);
        isSyncingRef.current = false;

        if (synced) {
          // ── GUARD DATA LOSS: Jika cloud kosong tapi lokal ada data,
          // jangan timpa data lokal. Biarkan auto-sync yang mengunggahnya.
          const cloudHasData = (synced.kelasList?.length ?? 0) > 0 ||
            (synced.absenRecords?.length ?? 0) > 0 ||
            (synced.kasusRecords?.length ?? 0) > 0 ||
            (synced.catatanRecords?.length ?? 0) > 0;
          const localHasData = kelasList.length > 0 || absenRecords.length > 0;

          if (cloudHasData) {
            // Cloud punya data → pulihkan ke lokal
            lastSyncedDataRef.current = getSerializedState(
              synced.namaGuru || '',
              synced.semester,
              synced.kelasList,
              synced.absenRecords || [],
              synced.kasusRecords || [],
              synced.catatanRecords || [],
              synced.liburDates || [],
              synced.confirmedDates || []
            );
            if (synced.namaGuru) setNamaGuru(synced.namaGuru);
            setSemester(synced.semester);
            setKelasList(synced.kelasList);
            setAbsenRecords(synced.absenRecords || []);
            setKasusRecords(synced.kasusRecords || []);
            setCatatanRecords(synced.catatanRecords || []);
            setLiburDates(synced.liburDates || []);
            setConfirmedDates(synced.confirmedDates || []);
            showToast('☁️ Cloud Sync: Data berhasil dipulihkan dari Cloud!');
          } else if (localHasData) {
            // Cloud kosong tapi lokal ada data → biarkan data lokal, auto-sync akan mengunggahnya
            lastSyncedDataRef.current = ''; // force auto-sync untuk upload data lokal
            showToast('☁️ Cloud Sync: Terhubung! Data lokal akan diunggah...');
          } else {
            // Keduanya kosong → tidak ada yang perlu dilakukan
            showToast('☁️ Cloud Sync: Terhubung!');
          }
        } else {
          // Tampilkan error spesifik dari Supabase
          const errMsg = sessionStorage.getItem('jg_lastSyncError');
          showToast(`❌ Gagal sinkronisasi: ${errMsg || 'Cek koneksi internet'}`);
        }
        setInitialSyncReady(true);
      };

      triggerInitialSync();
    }
  }, [user, authLoading]);

  // ── Auto-sync debounced ke Supabase ──────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    // Gunakan ref, bukan syncState, agar tidak memicu ulang effect ini saat status sync berubah
    if (isSyncingRef.current) return;

    const currentSerialized = getSerializedState(
      namaGuru,
      semester,
      kelasList,
      absenRecords,
      kasusRecords,
      catatanRecords,
      liburDates,
      confirmedDates
    );

    // Jika data tidak berubah dari sinkronisasi terakhir, abaikan auto-sync
    if (currentSerialized === lastSyncedDataRef.current) return;

    const timer = setTimeout(async () => {
      // Double-check ref sebelum eksekusi (mencegah race condition)
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;

      const localState: BackupData = {
        version: '5.0',
        exportedAt: new Date().toISOString(),
        namaGuru,
        semester,
        kelasList,
        absenRecords,
        kasusRecords,
        catatanRecords,
        liburDates,
        confirmedDates
      };

      const synced = await syncData(localState);
      if (synced) {
        lastSyncedDataRef.current = currentSerialized;
      }
      isSyncingRef.current = false;
    }, 2500);

    return () => clearTimeout(timer);
  // syncState sengaja DIHAPUS dari dependency array untuk mencegah infinite loop
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [namaGuru, semester, kelasList, absenRecords, kasusRecords, catatanRecords, liburDates, confirmedDates, user, syncData, getSerializedState]);

  const syncWithCloud = useCallback(async () => {
    if (!user) {
      showToast('⚠️ Silakan masuk ke akun Cloud terlebih dahulu');
      return false;
    }
    const localState: BackupData = {
      version: '5.0',
      exportedAt: new Date().toISOString(),
      namaGuru,
      semester,
      kelasList,
      absenRecords,
      kasusRecords,
      catatanRecords,
      liburDates,
      confirmedDates
    };
    const synced = await syncData(localState);
    if (synced) {
      lastSyncedDataRef.current = getSerializedState(
        synced.namaGuru || '',
        synced.semester,
        synced.kelasList,
        synced.absenRecords || [],
        synced.kasusRecords || [],
        synced.catatanRecords || [],
        synced.liburDates || [],
        synced.confirmedDates || []
      );

      if (synced.namaGuru) setNamaGuru(synced.namaGuru);
      setSemester(synced.semester);
      setKelasList(synced.kelasList);
      setAbsenRecords(synced.absenRecords || []);
      setKasusRecords(synced.kasusRecords || []);
      setCatatanRecords(synced.catatanRecords || []);
      setLiburDates(synced.liburDates || []);
      setConfirmedDates(synced.confirmedDates || []);
      showToast('☁️ Sukses menyinkronkan data dengan Cloud!');
      return true;
    } else {
      showToast('❌ Gagal sinkronisasi data dengan Cloud');
      return false;
    }
  }, [user, namaGuru, semester, kelasList, absenRecords, kasusRecords, catatanRecords, liburDates, confirmedDates, syncData, showToast, getSerializedState]);

  return (
    <AppContext.Provider value={{
      namaGuru, setNamaGuru,
      lastBackupDate, setLastBackupDate,
      activeTab, setActiveTab,
      activityView, setActivityView,
      reportView, setReportView,
      activeKelas, setActiveKelas,
      activeStudentId, setActiveStudentId,
      kelasList, setKelasList,
      addKelas, deleteKelas, addStudentsToKelas, removeStudentFromKelas, updateStudent,
      absenRecords, addAbsenRecords, updateAbsenRecord, deleteAbsenRecord, deleteAbsenRecordsByDateAndJenjang,
      kasusRecords, addKasusRecord, updateKasusRecord, deleteKasusRecord,
      catatanRecords, addCatatanRecord, updateCatatanRecord, deleteCatatanRecord,
      liburDates, addLiburDate, deleteLiburDate,
      confirmedDates, confirmDate, unconfirmDate, isDateConfirmed,
      toasts, showToast,
      semester, setSemester,
      exportBackup, importBackup, resetAll,
      syncWithCloud,
      initialSyncReady,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
