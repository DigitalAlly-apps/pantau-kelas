import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { storageGet } from '@/lib/storage';
import type { User } from '@supabase/supabase-js';
import type { BackupData, Kelas, Student, AbsenRecord, KasusRecord, CatatanRecord, LiburDate, ConfirmedDate, SemesterConfig } from '@/types';

export type SyncState = 'idle' | 'syncing' | 'success' | 'error';
type AuthResult = { error: Error | null };
type StudentPayload = { id: string; name: string; nis: string; kelas_id: string; user_id: string };
const DELETED_KELAS_KEY = 'jg_deletedKelasIds';

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(typeof error === 'string' ? error : 'Terjadi kesalahan yang tidak diketahui');
}

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    if (item.id && !seen.has(item.id)) {
      seen.add(item.id);
      result.push(item);
    }
  }
  return result;
}

function isMissingDeletedKelasTable(error: { code?: string } | null) {
  return error?.code === '42P01' || error?.code === 'PGRST205';
}

interface SupabaseContextType {
  user: User | null;
  profile: { nama_guru?: string } | null;
  authLoading: boolean;
  isConfigured: boolean;
  syncState: SyncState;
  lastSyncTime: string | null;
  lastSyncError: string | null;
  setLastSyncTime: (t: string | null) => void;
  signUp: (email: string, password: string, namaGuru: string) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signInWithGoogle: () => Promise<AuthResult>;
  signOut: () => Promise<AuthResult>;
  syncData: (localState: BackupData) => Promise<BackupData | null>;
  setSyncState: (state: SyncState) => void;
}

const SupabaseContext = createContext<SupabaseContextType | null>(null);

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<{ nama_guru?: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => {
    return localStorage.getItem('jg_lastSyncTime');
  });
  const [lastSyncError, setLastSyncError] = useState<string | null>(() => {
    return sessionStorage.getItem('jg_lastSyncError');
  });

  // Ambil profil guru dari tabel profiles
  const fetchProfile = async (userId: string) => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('nama_guru')
        .eq('id', userId)
        .maybeSingle();
      if (!error && data) {
        setProfile(data);
      }
    } catch (e) {
      console.error('Error fetching profile:', e);
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setAuthLoading(false);
      return;
    }

    // Ambil sesi awal
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setAuthLoading(false);
    });

    // Dengarkan perubahan auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
      setAuthLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, namaGuru: string) => {
    if (!supabase) return { error: new Error('Supabase belum dikonfigurasi') };
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nama_guru: namaGuru, // Dipakai oleh trigger PostgreSQL
          },
        },
      });
      if (error) throw error;
      if (data.user) {
        // Optimistic profile set
        setProfile({ nama_guru: namaGuru });
      }
      return { error: null };
    } catch (error: unknown) {
      return { error: toError(error) };
    }
  };

  const signIn = async (email: string, password: string) => {
    if (!supabase) return { error: new Error('Supabase belum dikonfigurasi') };
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return { error: null };
    } catch (error: unknown) {
      return { error: toError(error) };
    }
  };

  const signOut = async () => {
    if (!supabase) return { error: new Error('Supabase belum dikonfigurasi') };
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setProfile(null);
      localStorage.removeItem('jg_lastSyncTime');
      setLastSyncTime(null);
      return { error: null };
    } catch (error: unknown) {
      return { error: toError(error) };
    }
  };

  const signInWithGoogle = async () => {
    if (!supabase) return { error: new Error('Supabase belum dikonfigurasi') };
    try {
      const redirectTo = window.location.origin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      });
      if (error) throw error;
      return { error: null };
    } catch (error: unknown) {
      return { error: toError(error) };
    }
  };

  // ── Sync Engine: Bidirectional Local-First Sync ──────────────────────────────
  const syncData = useCallback(async (localState: BackupData): Promise<BackupData | null> => {
    if (!supabase || !user) {
      setSyncState('error');
      return null;
    }

    setSyncState('syncing');
    try {
      const uid = user.id;
      const localDeletedKelasIds = new Set(storageGet<string[]>(DELETED_KELAS_KEY, []));
      let cloudDeletedKelasIds = new Set<string>();

      const deletedKelasResult = await supabase
        .from('deleted_kelas')
        .select('kelas_id')
        .eq('user_id', uid);
      if (!deletedKelasResult.error) {
        cloudDeletedKelasIds = new Set((deletedKelasResult.data || []).map(row => row.kelas_id as string));
      } else if (!isMissingDeletedKelasTable(deletedKelasResult.error)) {
        throw deletedKelasResult.error;
      }
      const deletedKelasIds = new Set([...localDeletedKelasIds, ...cloudDeletedKelasIds]);

      if (localDeletedKelasIds.size > 0) {
        const tombstones = [...localDeletedKelasIds].map(kelasId => ({
          kelas_id: kelasId,
          user_id: uid,
        }));
        const { error: tombstoneError } = await supabase.from('deleted_kelas').upsert(tombstones);
        if (tombstoneError && !isMissingDeletedKelasTable(tombstoneError)) throw tombstoneError;
      }

      // Hapus data cloud untuk kelas yang sengaja dihapus di perangkat ini.
      for (const kelasId of localDeletedKelasIds) {
        for (const table of ['students', 'absen_records', 'kasus_records', 'catatan_records', 'confirmed_dates', 'kelas']) {
          const idColumn = table === 'kelas' ? 'id' : 'kelas_id';
          const { error } = await supabase.from(table).delete().eq(idColumn, kelasId).eq('user_id', uid);
          if (error) throw error;
        }
      }

      const activeLocalKelas = localState.kelasList.filter(k => !deletedKelasIds.has(k.id));

      // ── A.       // 1. Upload Kelas
      if (activeLocalKelas.length > 0) {
        const payloadKelas = dedupeById(activeLocalKelas.map(k => ({
          id: k.id,
          name: k.name,
          jenjang: k.jenjang || 'SMP',
          user_id: uid
        })));
        if (payloadKelas.length > 0) {
          const { error: errK } = await supabase.from('kelas').upsert(payloadKelas);
          if (errK) throw errK;
        }
      }

      // 2. Upload Students
      const rawStudents: StudentPayload[] = [];
      activeLocalKelas.forEach(k => {
        k.students.forEach(s => {
          rawStudents.push({
            id: s.id,
            name: s.name,
            nis: s.nis,
            kelas_id: k.id,
            user_id: uid
          });
        });
      });
      const payloadStudents = dedupeById(rawStudents);
      if (payloadStudents.length > 0) {
        const { error: errS } = await supabase.from('students').upsert(payloadStudents);
        if (errS) throw errS;
      }

      // 3. Upload Absen Records
      if (localState.absenRecords.length > 0) {
        const payloadAbsen = dedupeById(localState.absenRecords.map(r => ({
          id: r.id,
          student_id: r.studentId,
          student_name: r.studentName,
          date: r.date,
          status: r.status,
          keterangan: r.keterangan || null,
          kelas_id: r.kelasId,
          periode_ujian: r.periodeUjian || null,
          mata_pelajaran: r.mataPelajaran || null,
          jam_ujian: r.jamUjian || null,
          user_id: uid
        })));
        if (payloadAbsen.length > 0) {
          const { error: errA } = await supabase.from('absen_records').upsert(payloadAbsen);
          if (errA) throw errA;
        }
      }

      // 4. Upload Kasus Records
      if (localState.kasusRecords.length > 0) {
        const payloadKasus = dedupeById(localState.kasusRecords.map(r => ({
          id: r.id,
          student_id: r.studentId,
          student_name: r.studentName,
          date: r.date,
          description: r.description,
          category: r.category,
          kelas_id: r.kelasId,
          periode_ujian: r.periodeUjian || null,
          waktu_pemanggilan: r.waktuPemanggilan || null,
          tanggal_pemanggilan: r.tanggalPemanggilan || null,
          status: r.status || 'baru',
          tindak_lanjut: r.tindakLanjut || null,
          user_id: uid
        })));
        if (payloadKasus.length > 0) {
          const { error: errKas } = await supabase.from('kasus_records').upsert(payloadKasus);
          if (errKas) throw errKas;
        }
      }

      // 5. Upload Catatan Records
      if (localState.catatanRecords.length > 0) {
        const payloadCatatan = dedupeById(localState.catatanRecords.map(r => ({
          id: r.id,
          student_id: r.studentId,
          student_name: r.studentName,
          date: r.date,
          content: r.content,
          kelas_id: r.kelasId,
          tipe: r.tipe || 'umum',
          user_id: uid
        })));
        if (payloadCatatan.length > 0) {
          const { error: errCat } = await supabase.from('catatan_records').upsert(payloadCatatan);
          if (errCat) throw errCat;
        }
      }

      // 6. Upload Libur Dates
      if (localState.liburDates && localState.liburDates.length > 0) {
        const payloadLibur = dedupeById(localState.liburDates.map(r => ({
          id: r.id,
          date: r.date,
          jenjang: r.jenjang,
          keterangan: r.keterangan || null,
          user_id: uid
        })));
        if (payloadLibur.length > 0) {
          const { error: errLib } = await supabase.from('libur_dates').upsert(payloadLibur);
          if (errLib) throw errLib;
        }
      }

      // 7. Upload Confirmed Dates
      if (localState.confirmedDates && localState.confirmedDates.length > 0) {
        const payloadConf = dedupeById(localState.confirmedDates.map(r => ({
          id: r.id,
          kelas_id: r.kelasId,
          date: r.date,
          periode_ujian: r.periodeUjian || null,
          mata_pelajaran: r.mataPelajaran || null,
          jam_ujian: r.jamUjian || null,
          user_id: uid
        })));
        if (payloadConf.length > 0) {
          const { error: errConf } = await supabase.from('confirmed_dates').upsert(payloadConf);
          if (errConf) throw errConf;
        }
      }

      // 8. Upload Semester Config
      if (localState.semester) {
        const payloadSemester = {
          user_id: uid,
          tahun_ajaran: localState.semester.tahunAjaran,
          semester: localState.semester.semester,
          ganjil: localState.semester.ganjil,
          genap: localState.semester.genap,
          updated_at: new Date().toISOString()
        };
        const { error: errSem } = await supabase.from('semester_config').upsert(payloadSemester);
        if (errSem) throw errSem;
      }

      // ── B. DOWNLOAD TERBARU DARI CLOUD ─────────────────────────────────────
 
      // 1. Fetch profiles (dengan fallback jika profile belum terbuat)
      let dbProfileName = '';
      const { data: dbProfile } = await supabase.from('profiles').select('nama_guru').eq('id', uid).maybeSingle();
      if (!dbProfile) {
        const fallbackName = localState.namaGuru || user.user_metadata?.nama_guru || 'Guru Jurnal';
        const { error: errProfileUpsert } = await supabase.from('profiles').upsert({
          id: uid,
          nama_guru: fallbackName,
          updated_at: new Date().toISOString()
        });
        if (!errProfileUpsert) {
          dbProfileName = fallbackName;
          setProfile({ nama_guru: fallbackName });
        }
      } else {
        dbProfileName = dbProfile.nama_guru || '';
      }
      const namaGuru = dbProfileName || localState.namaGuru || '';

      // 2. Fetch kelas
      const { data: dbKelas, error: errFetchK } = await supabase.from('kelas').select('*').order('created_at', { ascending: true });
      if (errFetchK) throw errFetchK;

      // 3. Fetch students
      const { data: dbStudents, error: errFetchS } = await supabase.from('students').select('*').order('created_at', { ascending: true });
      if (errFetchS) throw errFetchS;

      // 4. Fetch absen records
      const { data: dbAbsen, error: errFetchA } = await supabase.from('absen_records').select('*');
      if (errFetchA) throw errFetchA;

      // 5. Fetch kasus records
      const { data: dbKasus, error: errFetchKas } = await supabase.from('kasus_records').select('*');
      if (errFetchKas) throw errFetchKas;

      // 6. Fetch catatan records
      const { data: dbCatatan, error: errFetchCat } = await supabase.from('catatan_records').select('*');
      if (errFetchCat) throw errFetchCat;

      // 7. Fetch libur dates
      const { data: dbLibur, error: errFetchLib } = await supabase.from('libur_dates').select('*');
      if (errFetchLib) throw errFetchLib;

      // 8. Fetch confirmed dates
      const { data: dbConfirmed, error: errFetchConf } = await supabase.from('confirmed_dates').select('*');
      if (errFetchConf) throw errFetchConf;

      // 9. Fetch semester config
      const { data: dbSemester, error: errFetchSem } = await supabase.from('semester_config').select('*').eq('user_id', uid).maybeSingle();
      if (errFetchSem) throw errFetchSem;

      // Bersihkan kelas kosong lama saat perangkat belum memiliki kelas lokal.
      // Kelas yang memiliki siswa atau histori tidak disentuh.
      const cloudKelas = (dbKelas || []).filter(k => !deletedKelasIds.has(k.id));
      const localHasAnyClassData = localState.kelasList.some(k => k.students.length > 0) ||
        localState.absenRecords.length > 0 || localState.kasusRecords.length > 0 || localState.catatanRecords.length > 0;
      const shouldCleanupEmptyKelas = !localHasAnyClassData;
      if (shouldCleanupEmptyKelas && cloudKelas.length > 0) {
        const kelasWithData = new Set<string>([
          ...(dbStudents || []).map(row => row.kelas_id as string),
          ...(dbAbsen || []).map(row => row.kelas_id as string),
          ...(dbKasus || []).map(row => row.kelas_id as string),
          ...(dbCatatan || []).map(row => row.kelas_id as string),
          ...(dbConfirmed || []).map(row => row.kelas_id as string),
        ]);
        const emptyKelasIds = cloudKelas.filter(k => !kelasWithData.has(k.id)).map(k => k.id as string);
        for (const kelasId of emptyKelasIds) {
          const { error } = await supabase.from('kelas').delete().eq('id', kelasId).eq('user_id', uid);
          if (error) throw error;
        }
      }

      // ── C. RAKIT BALIK KE BACKUPDATA FORMAT (LOCAL STATE) ──────────────────

      // Petakan siswa ke dalam kelas (urutkan abjad)
      const mappedKelasList: Kelas[] = cloudKelas
        .filter(k => !(shouldCleanupEmptyKelas && !(dbStudents || []).some(row => row.kelas_id === k.id)))
        .map(k => {
        const classStudents: Student[] = (dbStudents || [])
          .filter(s => s.kelas_id === k.id)
          .map(s => ({
            id: s.id,
            name: s.name,
            nis: s.nis || ''
          }))
          .sort((a, b) => a.name.localeCompare(b.name, 'id', { numeric: true, sensitivity: 'base' }));
        return {
          id: k.id,
          name: k.name,
          jenjang: k.jenjang as 'SD' | 'SMP' | 'SMA',
          students: classStudents
        };
      });

      // Petakan Absen Records
      const mappedAbsen: AbsenRecord[] = (dbAbsen || []).map(r => ({
        id: r.id,
        studentId: r.student_id,
        studentName: r.student_name,
        date: r.date,
        status: r.status as 'H' | 'S' | 'I' | 'A',
        keterangan: r.keterangan || undefined,
        kelasId: r.kelas_id,
        periodeUjian: r.periode_ujian as AbsenRecord['periodeUjian'],
        mataPelajaran: r.mata_pelajaran || undefined,
        jamUjian: r.jam_ujian || undefined
      }));

      // Petakan Kasus Records
      const mappedKasus: KasusRecord[] = (dbKasus || []).map(r => ({
        id: r.id,
        studentId: r.student_id,
        studentName: r.student_name,
        date: r.date,
        description: r.description,
        category: r.category,
        kelasId: r.kelas_id,
        periodeUjian: r.periode_ujian as KasusRecord['periodeUjian'],
        waktuPemanggilan: r.waktu_pemanggilan || undefined,
        tanggalPemanggilan: r.tanggal_pemanggilan || undefined,
        status: r.status as KasusRecord['status'],
        tindakLanjut: r.tindak_lanjut || undefined
      }));

      // Petakan Catatan Records
      const mappedCatatan: CatatanRecord[] = (dbCatatan || []).map(r => ({
        id: r.id,
        studentId: r.student_id,
        studentName: r.student_name,
        date: r.date,
        content: r.content,
        kelasId: r.kelas_id,
        tipe: r.tipe as CatatanRecord['tipe']
      }));

      // Petakan Libur Dates
      const mappedLibur: LiburDate[] = (dbLibur || []).map(r => ({
        id: r.id,
        date: r.date,
        jenjang: r.jenjang as LiburDate['jenjang'],
        keterangan: r.keterangan || undefined
      }));

      // Petakan Confirmed Dates
      const mappedConfirmed: ConfirmedDate[] = (dbConfirmed || []).map(r => ({
        id: r.id,
        kelasId: r.kelas_id,
        date: r.date,
        periodeUjian: r.periode_ujian as ConfirmedDate['periodeUjian'],
        mataPelajaran: r.mata_pelajaran || undefined,
        jamUjian: r.jam_ujian || undefined
      }));

      // Petakan Semester Config
      const currentYear = new Date().getFullYear();
      const mappedSemester: SemesterConfig = dbSemester ? {
        tahunAjaran: dbSemester.tahun_ajaran,
        semester: dbSemester.semester as SemesterConfig['semester'],
        ganjil: dbSemester.ganjil as SemesterConfig['ganjil'],
        genap: dbSemester.genap as SemesterConfig['genap']
      } : {
        tahunAjaran: `${currentYear}/${currentYear + 1}`,
        semester: new Date().getMonth() < 6 ? 'genap' : 'ganjil',
        ganjil: { utsStart: '', utsEnd: '', uasStart: '', uasEnd: '' },
        genap: { utsStart: '', utsEnd: '', uasStart: '', uasEnd: '' }
      };

      const finalState: BackupData = {
        version: '5.0',
        exportedAt: new Date().toISOString(),
        namaGuru,
        semester: mappedSemester,
        kelasList: mappedKelasList,
        absenRecords: mappedAbsen,
        kasusRecords: mappedKasus,
        catatanRecords: mappedCatatan,
        liburDates: mappedLibur,
        confirmedDates: mappedConfirmed
      };

      const syncTimeString = new Date().toLocaleString('id-ID');
      setLastSyncTime(syncTimeString);
      localStorage.setItem('jg_lastSyncTime', syncTimeString);
      setSyncState('success');
      setLastSyncError(null);
      sessionStorage.removeItem('jg_lastSyncError');

      return finalState;
    } catch (err: unknown) {
      const error = toError(err);
      const msg = error.message || 'Unknown error';
      console.error('Sync error:', msg, err);
      setSyncState('error');
      setLastSyncError(msg);
      sessionStorage.setItem('jg_lastSyncError', msg);
      return null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <SupabaseContext.Provider value={{
      user,
      profile,
      authLoading,
      isConfigured: isSupabaseConfigured,
      syncState,
      lastSyncTime,
      lastSyncError,
      setLastSyncTime,
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
      syncData,
      setSyncState
    }}>
      {children}
    </SupabaseContext.Provider>
  );
}

export const useSupabase = () => {
  const ctx = useContext(SupabaseContext);
  if (!ctx) throw new Error('useSupabase must be used within SupabaseProvider');
  return ctx;
};
