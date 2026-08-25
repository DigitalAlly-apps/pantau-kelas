import { useMemo, useState } from 'react';
import { ArrowLeft, ChevronDown, Download, FileSpreadsheet, Search, X } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { RiwayatPage } from './RiwayatPage';

type Period = 'semester' | 'bulan' | 'semua';

export function LaporanPage() {
  const { kelasList, activeKelas, absenRecords, kasusRecords, catatanRecords, semester, setActiveTab } = useApp();
  const kelas = kelasList.find(k => k.id === activeKelas);
  const [period, setPeriod] = useState<Period>('semester');
  const [query, setQuery] = useState('');
  const [studentId, setStudentId] = useState<string | null>(null);
  const [showRecap, setShowRecap] = useState(false);
  const [manageMode, setManageMode] = useState<'absen' | 'jurnal' | null>(null);
  const inPeriod = (date: string) => {
    if (period === 'semua') return true;
    const d = new Date(`${date}T00:00:00`), now = new Date();
    if (period === 'bulan') return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    const startYear = Number(semester.tahunAjaran.split('/')[0]);
    return d.getFullYear() === (semester.semester === 'ganjil' ? startYear : startYear + 1) && (semester.semester === 'ganjil' ? d.getMonth() >= 6 : d.getMonth() <= 5);
  };
  const students = useMemo(() => (kelas?.students || []).map(student => {
    const absen = absenRecords.filter(a => a.kelasId === activeKelas && a.studentId === student.id && inPeriod(a.date));
    const aktif = kasusRecords.filter(k => k.kelasId === activeKelas && k.studentId === student.id && inPeriod(k.date) && (k.status === 'baru' || k.status === 'proses')).length;
    const sakit = absen.filter(a => a.status === 'S').length, izin = absen.filter(a => a.status === 'I').length, alpha = absen.filter(a => a.status === 'A').length;
    return { ...student, sakit, izin, alpha, aktif, total: sakit + izin + alpha };
  }).sort((a, b) => b.aktif - a.aktif || b.alpha - a.alpha || b.total - a.total || a.name.localeCompare(b.name, 'id')), [kelas, absenRecords, kasusRecords, activeKelas, period, semester]);
  const selected = students.find(s => s.id === studentId);
  const shown = students.filter(s => s.name.toLowerCase().includes(query.toLowerCase()));
  const exportFile = (kind: 'csv' | 'xls') => {
    const rows = students.map((s, i) => [i + 1, s.name, s.nis, s.sakit, s.izin, s.alpha, s.aktif]);
    const headers = ['No', 'Nama', 'NIS', 'Sakit', 'Izin', 'Alpha', 'Kasus aktif'];
    const content = kind === 'csv' ? [headers, ...rows].map(row => row.join(',')).join('\n') : `<html><meta charset="utf-8"><table><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>${rows.map(row => `<tr>${row.map(value => `<td>${value ?? ''}</td>`).join('')}</tr>`).join('')}</table></html>`;
    const blob = new Blob([kind === 'csv' ? '\ufeff' + content : content], { type: kind === 'csv' ? 'text/csv;charset=utf-8' : 'application/vnd.ms-excel' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `buku_induk_${kelas?.name || 'kelas'}.${kind}`; link.click(); URL.revokeObjectURL(link.href);
  };
  if (!kelas) return <p className="py-16 text-center text-sm text-text-tertiary">Pilih kelas terlebih dahulu.</p>;
  if (selected && manageMode) {
    return <RiwayatPage
      studentId={selected.id}
      initialFilter={manageMode}
      onBack={() => setManageMode(null)}
    />;
  }
  if (selected) {
    const events = [
      ...absenRecords.filter(a => a.kelasId === activeKelas && a.studentId === selected.id && inPeriod(a.date)).map(a => ({ id: `a${a.id}`, date: a.date, title: a.status === 'S' ? 'Sakit' : a.status === 'I' ? 'Izin' : 'Alpha', note: a.keterangan, tone: a.status === 'A' ? 'text-semantic-red' : 'text-text-secondary' })),
      ...kasusRecords.filter(k => k.kelasId === activeKelas && k.studentId === selected.id && inPeriod(k.date)).map(k => ({ id: `k${k.id}`, date: k.date, title: `Kasus · ${k.category}`, note: k.description, tone: 'text-semantic-red' })),
      ...catatanRecords.filter(c => c.kelasId === activeKelas && c.studentId === selected.id && inPeriod(c.date)).map(c => ({ id: `c${c.id}`, date: c.date, title: `Catatan · ${c.tipe || 'umum'}`, note: c.content, tone: 'text-primary' })),
    ].sort((a,b) => b.date.localeCompare(a.date));
    return <div className="mx-auto max-w-3xl space-y-4"><button onClick={() => setStudentId(null)} className="flex items-center gap-2 text-xs font-bold text-text-secondary"><ArrowLeft className="w-4" /> Kembali</button><section className="rounded-2xl bg-surface p-5 shadow-soft"><p className="label-upper">Buku Induk Siswa</p><h2 className="mt-1 text-xl font-bold">{selected.name}</h2><p className="text-xs text-text-tertiary">{selected.nis || 'NIS belum diisi'}</p><div className="mt-4 grid grid-cols-3 gap-2">{[{ label: 'Sakit', value: selected.sakit, tone: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' }, { label: 'Izin', value: selected.izin, tone: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300' }, { label: 'Alpha', value: selected.alpha, tone: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300' }].map(item => <div key={item.label} className={`min-h-[76px] rounded-xl p-3 ${item.tone}`}><p className="text-2xl font-black leading-none">{item.value}</p><p className="mt-2 text-xs font-bold">{item.label}</p></div>)}</div>{selected.aktif ? <p className="mt-3 text-xs font-bold text-semantic-red">{selected.aktif} kasus aktif</p> : null}<div className="mt-4 grid gap-2 sm:grid-cols-3"><button onClick={() => setManageMode('absen')} className="btn-soft btn-secondary-soft py-2.5 text-xs">Kelola Absensi</button><button onClick={() => setManageMode('jurnal')} className="btn-soft btn-secondary-soft py-2.5 text-xs">Kelola Jurnal</button><button onClick={() => { sessionStorage.setItem('jg_jurnal_student_id', selected.id); setActiveTab('jurnal'); }} className="btn-soft btn-primary-soft py-2.5 text-xs">Tambah Jurnal</button></div></section><section className="overflow-hidden rounded-2xl bg-surface shadow-soft"><div className="border-b border-border px-4 py-3"><h3 className="text-sm font-bold">Riwayat</h3></div>{events.length ? events.map(event => <div key={event.id} className="border-b border-border px-4 py-3 last:border-0"><div className="flex justify-between gap-3"><b className={`text-xs ${event.tone}`}>{event.title}</b><span className="text-[11px] text-text-tertiary">{event.date}</span></div>{event.note && <p className="mt-1 text-xs text-text-secondary">{event.note}</p>}</div>) : <p className="p-8 text-center text-xs text-text-tertiary">Belum ada riwayat pada periode ini.</p>}</section></div>;
  }
  return <div className="mx-auto max-w-4xl space-y-3"><div className="flex items-center justify-between gap-3"><div><p className="label-upper">Buku Induk · {kelas.name}</p><h2 className="mt-1 text-lg font-bold">Siswa</h2></div><button onClick={() => setShowRecap(true)} className="rounded-xl bg-bg-2 px-3 py-2 text-xs font-bold text-text-secondary">Rekap & export</button></div><div className="flex gap-2 overflow-x-auto">{([['semester','Semester'], ['bulan','Bulan ini'], ['semua','Semua']] as [Period,string][]).map(([id,label]) => <button key={id} onClick={() => setPeriod(id)} className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold ${period === id ? 'bg-primary text-primary-foreground' : 'bg-bg-2 text-text-secondary'}`}>{label}</button>)}</div><label className="relative block"><Search className="absolute left-3 top-1/2 w-4 -translate-y-1/2 text-text-tertiary" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari siswa" className="input-soft w-full pl-10" /></label><section className="overflow-hidden rounded-2xl bg-surface shadow-soft">{shown.map((s, index) => <button key={s.id} onClick={() => setStudentId(s.id)} className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left last:border-0 hover:bg-bg-2"><span className="w-5 text-center text-[11px] text-text-tertiary">{index + 1}</span><div className="min-w-0 flex-1"><p className="line-clamp-2 text-sm font-bold leading-5">{s.name}</p><p className="mt-0.5 text-[11px] text-text-tertiary">S {s.sakit} · I {s.izin} · <span className={s.alpha ? 'text-semantic-red font-bold' : ''}>A {s.alpha}</span></p></div>{s.aktif ? <span className="rounded-full bg-semantic-red-light px-2 py-1 text-[10px] font-bold text-semantic-red">{s.aktif} kasus</span> : s.total ? <span className="text-[10px] font-bold text-semantic-yellow">Pantau</span> : null}</button>)}{!shown.length && <p className="p-8 text-center text-xs text-text-tertiary">Tidak ada siswa ditemukan.</p>}</section>{showRecap && <div className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:justify-center"><div className="w-full max-w-md rounded-t-3xl bg-surface p-5 shadow-lg sm:rounded-3xl"><div className="flex justify-between"><div><p className="label-upper">Rekap kelas</p><h3 className="mt-1 text-lg font-bold">{students.length} siswa</h3></div><button onClick={() => setShowRecap(false)} className="rounded-xl bg-bg-2 p-2"><X className="w-4" /></button></div><p className="mt-3 text-xs text-text-secondary">Rekap lengkap sesuai filter periode yang sedang dipilih.</p><div className="mt-4 flex gap-2"><button onClick={() => exportFile('csv')} className="btn-soft btn-secondary-soft flex-1 py-3"><Download className="w-4" /> CSV</button><button onClick={() => exportFile('xls')} className="btn-soft btn-primary-soft flex-1 py-3"><FileSpreadsheet className="w-4" /> Excel</button></div></div></div>}</div>;
}
