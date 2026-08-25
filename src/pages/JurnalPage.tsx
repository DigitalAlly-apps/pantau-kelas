import { useDeferredValue, useMemo, useState } from 'react';
import { AlertTriangle, Bell, BookOpen, Check, ChevronDown, Clock3, Search, X, Zap } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useSupabase } from '@/context/SupabaseContext';
import { enablePushNotifications } from '@/lib/push-notifications';
import type { KasusRecord, KasusStatus } from '@/types';
import { RiwayatPage } from './RiwayatPage';

const KATEGORI = ['Kedisiplinan', 'Sholat / Ibadah', 'Perilaku & Etika', 'Tugas & Peralatan', 'Pelanggaran Berat', 'Lainnya'];
const TEMPLATE = ['Tidak mengerjakan PR / Tugas', 'Terlambat masuk kelas / sekolah', 'Tidak melaksanakan sholat berjamaah', 'Mengganggu teman saat pelajaran', 'Tidak membawa buku / perlengkapan belajar'];
const TIPE = [['umum', '📝 Umum'], ['sholat', '🕌 Ibadah'], ['prestasi', '🏆 Prestasi'], ['perkembangan', '📈 Perkembangan']] as const;
type Tab = 'hari-ini' | 'tindak-lanjut' | 'riwayat';
type Form = 'kasus' | 'catatan' | null;

export function JurnalPage() {
  const { kelasList, activeKelas, kasusRecords, catatanRecords, addKasusRecord, addCatatanRecord, updateKasusRecord, showToast } = useApp();
  const { user } = useSupabase();
  const kelas = kelasList.find(k => k.id === activeKelas);
  const today = new Date().toISOString().split('T')[0];
  const [tab, setTab] = useState<Tab>('hari-ini');
  const [form, setForm] = useState<Form>(null);
  const [studentId, setStudentId] = useState('');
  const [studentQuery, setStudentQuery] = useState('');
  const deferredStudentQuery = useDeferredValue(studentQuery);
  const [date, setDate] = useState(today);
  const [category, setCategory] = useState(KATEGORI[0]);
  const [description, setDescription] = useState('');
  const [catatanType, setCatatanType] = useState<typeof TIPE[number][0]>('umum');
  const [showExtra, setShowExtra] = useState(false);
  const [pemanggilan, setPemanggilan] = useState('');
  const [waktuPemanggilan, setWaktuPemanggilan] = useState('');
  const [tindakLanjut, setTindakLanjut] = useState('');
  const reset = () => { setForm(null); setStudentId(''); setStudentQuery(''); setDate(today); setCategory(KATEGORI[0]); setDescription(''); setCatatanType('umum'); setShowExtra(false); setPemanggilan(''); setWaktuPemanggilan(''); setTindakLanjut(''); };
  const student = kelas?.students.find(s => s.id === studentId);
  const filteredStudents = useMemo(() => {
    const query = deferredStudentQuery.trim().toLocaleLowerCase('id-ID');
    return (kelas?.students ?? []).filter(item => !query || `${item.name} ${item.nis}`.toLocaleLowerCase('id-ID').includes(query));
  }, [kelas?.students, deferredStudentQuery]);
  const todayItems = useMemo(() => [
    ...kasusRecords.filter(item => item.kelasId === activeKelas && item.date === today).map(item => ({ id: `k-${item.id}`, type: 'kasus', title: item.studentName, subtitle: item.category, content: item.description, status: item.status })),
    ...catatanRecords.filter(item => item.kelasId === activeKelas && item.date === today).map(item => ({ id: `c-${item.id}`, type: 'catatan', title: item.studentName, subtitle: TIPE.find(t => t[0] === item.tipe)?.[1] || '📝 Umum', content: item.content })),
  ].reverse(), [kasusRecords, catatanRecords, activeKelas, today]);
  const activeCases = kasusRecords.filter(item => item.kelasId === activeKelas && item.status !== 'selesai');
  const save = () => {
    if (!student || !description.trim()) return showToast('Pilih siswa dan isi catatan');
    if (form === 'kasus') {
      addKasusRecord({ id: `k_${Date.now()}`, studentId, studentName: student.name, date, description: description.trim(), category, kelasId: activeKelas, periodeUjian: 'Harian', status: 'baru', tanggalPemanggilan: pemanggilan || undefined, waktuPemanggilan: waktuPemanggilan || undefined, tindakLanjut: tindakLanjut.trim() || undefined });
      if (waktuPemanggilan && user) {
        void enablePushNotifications(user.id).catch((error: unknown) => {
          showToast(error instanceof Error ? error.message : 'Notifikasi perangkat belum aktif.');
        });
      }
    }
    else addCatatanRecord({ id: `cat_${Date.now()}`, studentId, studentName: student.name, date, content: description.trim(), kelasId: activeKelas, tipe: catatanType });
    showToast(form === 'kasus' ? 'Kasus berhasil dicatat' : 'Catatan berhasil disimpan'); reset();
  };
  if (!kelas?.students.length) return <div className="py-16 text-center text-sm text-text-tertiary">Belum ada siswa di kelas ini.</div>;
  const startCase = (item: KasusRecord) => updateKasusRecord(item.id, { status: 'proses' });
  const finishCase = (item: KasusRecord) => updateKasusRecord(item.id, { status: 'selesai' });
  return <div className="mx-auto flex max-w-4xl flex-col gap-4">
    <div className="grid grid-cols-3 rounded-xl bg-bg-2 p-1 gap-1">{([['hari-ini', 'Hari Ini'], ['tindak-lanjut', `Tindak lanjut${activeCases.length ? ` · ${activeCases.length}` : ''}`], ['riwayat', 'Riwayat']] as [Tab,string][]).map(([id,label]) => <button key={id} onClick={() => setTab(id)} className={`rounded-lg px-1 py-2.5 text-[11px] font-bold ${tab === id ? 'bg-surface shadow-soft text-foreground' : 'text-text-tertiary'}`}>{label}</button>)}</div>
    {tab === 'hari-ini' && <><section className="rounded-2xl bg-surface p-5 shadow-soft"><p className="label-upper">Jurnal kelas {kelas.name}</p><div className="mt-1 flex items-end justify-between"><div><h2 className="text-lg font-bold">Hari ini</h2><p className="text-xs text-text-tertiary">{new Date(`${today}T00:00:00`).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</p></div><div className="text-right"><b className="text-lg text-semantic-red">{activeCases.length}</b><p className="text-[10px] text-text-tertiary">perlu tindak lanjut</p></div></div><div className="mt-4 grid grid-cols-2 gap-2"><button onClick={() => setForm('kasus')} className="rounded-xl bg-semantic-red px-3 py-3 text-xs font-bold text-white"><AlertTriangle className="mr-1 inline w-4" /> Catat kasus</button><button onClick={() => setForm('catatan')} className="rounded-xl bg-primary px-3 py-3 text-xs font-bold text-primary-foreground"><BookOpen className="mr-1 inline w-4" /> Catatan siswa</button></div></section><section className="overflow-hidden rounded-2xl bg-surface shadow-soft"><div className="border-b border-border px-4 py-3"><h3 className="text-sm font-bold">Aktivitas hari ini</h3></div>{todayItems.length ? todayItems.map(item => <div key={item.id} className="border-b border-border px-4 py-3 last:border-0"><div className="flex items-center justify-between gap-2"><b className="text-xs">{item.title}</b><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${item.type === 'kasus' ? 'bg-semantic-red-light text-semantic-red' : 'bg-accent-light text-primary'}`}>{item.subtitle}</span></div><p className="mt-1 text-xs text-text-secondary">{item.content}</p></div>) : <p className="p-8 text-center text-xs text-text-tertiary">Belum ada catatan hari ini.</p>}</section></>}
    {tab === 'tindak-lanjut' && <section className="overflow-hidden rounded-2xl bg-surface shadow-soft"><div className="border-b border-border px-4 py-3"><h3 className="text-sm font-bold">Antrean tindak lanjut</h3><p className="text-xs text-text-tertiary">Kasus baru dan yang sedang diproses.</p></div>{activeCases.length ? activeCases.sort((a,b) => a.date.localeCompare(b.date)).map(item => <div key={item.id} className="border-b border-border p-4 last:border-0"><div className="flex items-start justify-between gap-3"><div><b className="text-sm">{item.studentName}</b><p className="mt-0.5 text-xs text-text-tertiary">{item.category} · {item.date}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${item.status === 'proses' ? 'bg-semantic-yellow-light text-semantic-yellow' : 'bg-semantic-red-light text-semantic-red'}`}>{item.status === 'proses' ? 'Proses' : 'Baru'}</span></div><p className="mt-2 text-xs text-text-secondary">{item.description}</p>{(item.tanggalPemanggilan || item.waktuPemanggilan || item.tindakLanjut) && <p className="mt-2 rounded-lg bg-bg-2 p-2 text-[11px] text-text-secondary"><Clock3 className="mr-1 inline w-3" />{item.tanggalPemanggilan || 'Tindak lanjut'}{item.waktuPemanggilan ? ` · ${item.waktuPemanggilan}` : ''}{item.tindakLanjut ? ` · ${item.tindakLanjut}` : ''}</p>}<div className="mt-3 flex gap-2">{item.status !== 'proses' && <button onClick={() => startCase(item)} className="flex-1 rounded-xl bg-semantic-yellow px-3 py-2 text-xs font-bold text-white">Mulai tindak lanjut</button>}<button onClick={() => finishCase(item)} className="flex-1 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"><Check className="mr-1 inline w-3.5" /> Tandai selesai</button></div></div>) : <p className="p-10 text-center text-sm text-text-tertiary">Semua kasus sudah selesai ditindaklanjuti.</p>}</section>}
    {tab === 'riwayat' && <RiwayatPage />}
    {form && <div className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:justify-center"><div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-surface p-5 shadow-lg sm:rounded-3xl"><div className="flex justify-between gap-3"><div><p className="label-upper">{form === 'kasus' ? 'Catat kasus' : 'Catatan siswa'}</p><h2 className="mt-1 text-lg font-bold">{form === 'kasus' ? 'Kejadian perlu ditindaklanjuti' : 'Perkembangan atau observasi'}</h2></div><button onClick={reset} aria-label="Tutup formulir" className="rounded-xl bg-bg-2 p-2"><X className="w-4" /></button></div><div className="mt-4 space-y-3"><div><label htmlFor="student-search" className="mb-1 block text-xs font-bold text-text-secondary">Cari siswa</label><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" aria-hidden="true" /><input id="student-search" type="search" value={studentQuery} onChange={e => setStudentQuery(e.target.value)} placeholder="Ketik nama atau NIS siswa" autoComplete="off" aria-describedby="student-search-result" className="input-soft w-full pl-9" /></div><p id="student-search-result" className="mt-1 text-[11px] text-text-tertiary">{filteredStudents.length ? `${filteredStudents.length} siswa ditemukan` : 'Siswa tidak ditemukan. Coba nama atau NIS lain.'}</p></div><div><label htmlFor="student-select" className="mb-1 block text-xs font-bold text-text-secondary">Pilih siswa</label><select id="student-select" value={studentId} onChange={e => setStudentId(e.target.value)} className="input-soft" disabled={!filteredStudents.length}><option value="">{filteredStudents.length ? 'Pilih siswa' : 'Tidak ada hasil'}</option>{filteredStudents.map(s => <option key={s.id} value={s.id}>{s.name} ({s.nis || 'NIS belum diisi'})</option>)}</select></div><input type="date" value={date} onChange={e => setDate(e.target.value)} className="input-soft" />{form === 'kasus' ? <><select value={category} onChange={e => setCategory(e.target.value)} className="input-soft">{KATEGORI.map(item => <option key={item}>{item}</option>)}</select><div className="flex flex-wrap gap-1.5">{TEMPLATE.map(item => <button key={item} onClick={() => setDescription(item)} className="rounded-lg bg-accent-light px-2 py-1 text-[10px] font-bold text-primary"><Zap className="mr-0.5 inline w-3" />{item}</button>)}</div></> : <div className="grid grid-cols-2 gap-2">{TIPE.map(([id,label]) => <button key={id} onClick={() => setCatatanType(id)} className={`rounded-xl px-2 py-2 text-[11px] font-bold ${catatanType === id ? 'bg-primary text-primary-foreground' : 'bg-bg-2 text-text-secondary'}`}>{label}</button>)}</div>}<textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} placeholder={form === 'kasus' ? 'Deskripsi kejadian...' : 'Tulis catatan siswa...'} className="input-soft resize-none" />{form === 'kasus' && <><button onClick={() => setShowExtra(v => !v)} className="flex items-center gap-1 text-xs font-bold text-text-secondary">Detail tindak lanjut <ChevronDown className={`w-3 transition ${showExtra ? 'rotate-180' : ''}`} /></button>{showExtra && <div className="space-y-2 rounded-xl bg-bg-2 p-3"><div className="grid grid-cols-2 gap-2"><div><label className="mb-1 block text-[10px] font-bold uppercase text-text-tertiary">Tanggal panggilan</label><input type="date" value={pemanggilan} onChange={e => setPemanggilan(e.target.value)} className="input-soft w-full" /></div><div><label className="mb-1 block text-[10px] font-bold uppercase text-text-tertiary">Jam panggilan</label><input type="time" value={waktuPemanggilan} onChange={e => setWaktuPemanggilan(e.target.value)} className="input-soft w-full" /></div></div><div className="flex items-center gap-2 text-[11px] text-text-tertiary"><Bell className="h-3.5 w-3.5" /> Notifikasi akan muncul saat tanggal dan jam tercapai.</div><input value={tindakLanjut} onChange={e => setTindakLanjut(e.target.value)} placeholder="Catatan tindak lanjut" className="input-soft" /></div>}</>}<button onClick={save} className="btn-soft btn-primary-soft w-full py-3">Simpan</button></div></div></div>}
  </div>;
}
