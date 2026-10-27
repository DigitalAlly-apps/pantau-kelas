import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { AlertTriangle, Zap } from 'lucide-react';
import type { KasusRecord, PeriodeUjian, KasusStatus } from '@/types';

const KATEGORI = [
  'Kedisiplinan',
  'Sholat / Ibadah',
  'Perilaku & Etika',
  'Tugas & Peralatan',
  'Pelanggaran Berat',
  'Lainnya'
];
const PERIODE_OPTIONS: PeriodeUjian[] = ['Harian', 'UTS', 'UAS'];
const STATUS_OPTIONS: KasusStatus[] = ['baru', 'proses', 'selesai'];

const TEMPLATE_KASUS = [
  'Tidak mengerjakan PR / Tugas',
  'Terlambat masuk kelas / sekolah',
  'Tidak melaksanakan sholat berjamaah',
  'Terlambat / kabur saat waktu sholat',
  'Mengganggu teman saat pelajaran',
  'Tidak membawa buku / perlengkapan belajar',
  'Berbicara tidak sopan / berisik',
  'Bermain HP saat jam pelajaran',
  'Berkelahi / pertengkaran',
  'Meninggalkan kelas tanpa izin (membolos)',
];

export function KasusPage() {
  const { kelasList, activeKelas, addKasusRecord, addCatatanRecord, showToast } = useApp();
  const kelas = kelasList.find(k => k.id === activeKelas);
  const [studentId, setStudentId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [periode, setPeriode] = useState<PeriodeUjian>('Harian');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(KATEGORI[0]);
  const [tipeCatatan, setTipeCatatan] = useState<'prestasi' | 'perkembangan' | 'umum'>('umum');
  const [showTemplates, setShowTemplates] = useState(false);
  const [tanggalPemanggilan, setTanggalPemanggilan] = useState('');
  const [waktuPemanggilan, setWaktuPemanggilan] = useState('');
  const [status, setStatus] = useState<KasusStatus>('baru');

  const reset = () => { setDescription(''); setStudentId(''); setShowTemplates(false); setWaktuPemanggilan(''); setTanggalPemanggilan(''); setStatus('baru'); };

  const handleSave = () => {
    if (!studentId || !description.trim()) {
      showToast('Pilih siswa dan isi deskripsi');
      return;
    }
    const student = kelas?.students.find(s => s.id === studentId);
    if (!student) return;

    const record: KasusRecord = {
      id: `k_${Date.now()}`,
      studentId, studentName: student.name,
      date, description: description.trim(),
      category, kelasId: activeKelas, periodeUjian: periode,
      waktuPemanggilan: waktuPemanggilan || undefined,
      tanggalPemanggilan: tanggalPemanggilan || undefined,
      status,
    };
    addKasusRecord(record);
    showToast('Kasus berhasil disimpan');
    reset();
  };

  if (!kelas || kelas.students.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <p className="text-text-secondary text-sm">Belum ada siswa di kelas ini.</p>
        <p className="text-text-tertiary text-xs">Tambahkan siswa di menu <strong>Data Siswa</strong> terlebih dahulu.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 max-w-4xl mx-auto w-full">
      <div className="bg-surface rounded-2xl shadow-soft p-5 flex flex-col gap-4">
        {/* Siswa */}
        <div>
          <label className="label-upper block mb-1.5">Siswa</label>
          <select value={studentId} onChange={e => setStudentId(e.target.value)} className="input-soft">
            <option value="">-- Pilih Siswa --</option>
            {kelas.students.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.nis})</option>
            ))}
          </select>
        </div>

        {/* Tanggal + Periode */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="label-upper block mb-1.5">Tanggal</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input-soft" />
          </div>
          <div className="flex-1">
            <label className="label-upper block mb-1.5">Periode</label>
            <div className="flex bg-bg-2 rounded-xl p-1 gap-1">
              {PERIODE_OPTIONS.map(p => (
                <button key={p} onClick={() => setPeriode(p)}
                  className={`flex-1 py-2 text-[11px] font-semibold rounded-lg transition-all ${
                    periode === p ? 'bg-surface shadow-soft text-foreground' : 'text-text-tertiary'
                  }`}>{p}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Kategori */}
        <div>
          <label className="label-upper block mb-1.5">Kategori</label>
          <div className="flex flex-wrap gap-2">
            {KATEGORI.map(k => (
              <button key={k} onClick={() => setCategory(k)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  category === k ? 'bg-primary text-white' : 'bg-bg-2 text-text-secondary hover:bg-bg-3'
                }`}>{k}</button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-upper block mb-1.5">
              Tgl Pemanggilan
              <span className="ml-1.5 text-[10px] text-text-tertiary normal-case font-normal">(opsional)</span>
            </label>
            <input
              type="date"
              value={tanggalPemanggilan}
              onChange={e => setTanggalPemanggilan(e.target.value)}
              className="input-soft w-full"
            />
          </div>
          <div>
            <label className="label-upper block mb-1.5">
              Waktu Pemanggilan
              <span className="ml-1.5 text-[10px] text-text-tertiary normal-case font-normal">(opsional)</span>
            </label>
            <input
              type="time"
              value={waktuPemanggilan}
              onChange={e => setWaktuPemanggilan(e.target.value)}
              className="input-soft w-full"
            />
          </div>
          <div className="col-span-2">
            <label className="label-upper block mb-1.5">Status Kasus</label>
            <select value={status} onChange={e => setStatus(e.target.value as KasusStatus)} className="input-soft w-full">
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{s === 'baru' ? 'Baru' : s === 'proses' ? 'Proses' : 'Selesai'}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Deskripsi + Template */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="label-upper">Deskripsi Kasus</label>
            <button onClick={() => setShowTemplates(!showTemplates)}
              className="flex items-center gap-1 text-[11px] text-primary font-semibold hover:underline">
              <Zap className="w-3 h-3" /> Template
            </button>
          </div>

          {/* Template chips */}
          {showTemplates && (
            <div className="flex flex-wrap gap-2 mb-2">
              {TEMPLATE_KASUS.map(t => (
                <button key={t} onClick={() => { setDescription(t); setShowTemplates(false); }}
                  className="text-[11px] px-2.5 py-1 bg-accent-light text-primary rounded-lg hover:bg-primary hover:text-white transition-all">
                  {t}
                </button>
              ))}
            </div>
          )}

          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Tuliskan deskripsi kejadian..."
            rows={4}
            className="input-soft resize-none"
          />
        </div>

        <button onClick={handleSave} className="btn-soft btn-primary-soft w-full py-3">
          Simpan Kasus
        </button>
      </div>
    </div>
  );
}
