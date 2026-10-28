import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Search, BookOpen, Plus, X, Pencil, Trash2, Check } from 'lucide-react';
import type { CatatanRecord } from '@/types';

const TIPE_CATATAN = [
  { id: 'umum',         label: 'Umum',          desc: 'Catatan observasi lainnya' },
  { id: 'sholat',       label: 'Sholat & Ibadah', desc: 'Catatan kedisiplinan & pelaksanaan sholat/ibadah' },
  { id: 'prestasi',     label: 'Prestasi',       desc: 'Pencapaian atau penghargaan' },
  { id: 'perkembangan', label: 'Perkembangan',   desc: 'Kemajuan belajar atau sikap' },
] as const;

type TipeCatatan = typeof TIPE_CATATAN[number]['id'];

export function CatatanPage() {
  const { activeKelas, kelasList, catatanRecords, addCatatanRecord, updateCatatanRecord, deleteCatatanRecord, setActiveStudentId, setActiveTab, showToast } = useApp();
  const kelas = kelasList.find(k => k.id === activeKelas);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [content, setContent] = useState('');
  const [tipe, setTipe] = useState<TipeCatatan>('umum');

  // Edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editTipe, setEditTipe] = useState<TipeCatatan>('umum');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return catatanRecords
      .filter(c => c.kelasId === activeKelas && (
        c.studentName.toLowerCase().includes(search.toLowerCase()) ||
        c.content.toLowerCase().includes(search.toLowerCase())
      ))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [catatanRecords, activeKelas, search]);

  const handleSave = () => {
    if (!studentId || !content.trim()) {
      showToast('Pilih siswa dan isi catatan');
      return;
    }
    const student = kelas?.students.find(s => s.id === studentId);
    if (!student) return;
    const record: CatatanRecord = {
      id: `cat_${Date.now()}`,
      studentId,
      studentName: student.name,
      date,
      content: content.trim(),
      kelasId: activeKelas,
      tipe,
    };
    addCatatanRecord(record);
    setContent('');
    setStudentId('');
    setTipe('umum');
    setShowForm(false);
    showToast('Catatan berhasil disimpan');
  };

  const startEdit = (c: CatatanRecord) => {
    setEditId(c.id);
    setEditContent(c.content);
    setEditTipe((c.tipe as TipeCatatan) || 'umum');
  };

  const saveEdit = () => {
    if (!editId || !editContent.trim()) return;
    updateCatatanRecord(editId, { content: editContent.trim(), tipe: editTipe });
    setEditId(null);
    showToast('Catatan berhasil diperbarui');
  };

  const doDelete = () => {
    if (!confirmDeleteId) return;
    deleteCatatanRecord(confirmDeleteId);
    setConfirmDeleteId(null);
    showToast('Catatan berhasil dihapus');
  };

  const handleStudentClick = (sId: string) => {
    setActiveStudentId(sId);
    setActiveTab('siswa');
  };

  const TIPE_BADGE: Record<string, string> = {
    prestasi:     'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    perkembangan: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    sholat:       'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    umum:         'bg-bg-2 text-text-secondary',
  };

  if (!kelas || kelas.students.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <BookOpen className="w-10 h-10 text-text-tertiary opacity-40" />
        <p className="text-text-secondary text-sm">Belum ada siswa di kelas ini.</p>
        <p className="text-text-tertiary text-xs">Tambahkan siswa di menu <strong>Data Siswa</strong> terlebih dahulu.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 max-w-4xl mx-auto w-full">

      {/* Form Input */}
      {showForm ? (
        <div className="bg-surface rounded-2xl shadow-soft p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Catatan Baru</h3>
            <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-bg-2 rounded-lg text-text-tertiary">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div>
            <label className="label-upper block mb-1.5">Siswa</label>
            <select value={studentId} onChange={e => setStudentId(e.target.value)} className="input-soft">
              <option value="">-- Pilih Siswa --</option>
              {kelas.students.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="label-upper block mb-1.5">Tanggal</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input-soft" />
            </div>
            <div className="flex-1">
              <label className="label-upper block mb-1.5">Tipe</label>
              <select value={tipe} onChange={e => setTipe(e.target.value as TipeCatatan)} className="input-soft text-sm">
                {TIPE_CATATAN.map(t => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label-upper block mb-1.5">Catatan / Anekdot</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Tuliskan catatan perkembangan, prestasi, atau anekdot siswa..."
              rows={4}
              className="input-soft resize-none"
            />
          </div>
          <button onClick={handleSave} className="btn-soft btn-primary-soft w-full py-3">
            Simpan Catatan
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="btn-soft btn-primary-soft w-full py-3 flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> Tambah Catatan Anekdot
        </button>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
        <input
          type="text"
          placeholder="Cari catatan..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-soft pl-10"
        />
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-text-tertiary">
          <BookOpen className="w-10 h-10 mb-3 opacity-40" />
          <p className="text-sm">Belum ada catatan</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(c => (
            <div key={c.id} className="bg-surface rounded-2xl shadow-soft p-4">
              {editId === c.id ? (
                /* ── Edit mode ── */
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-foreground">{c.studentName}</span>
                    <span className="text-[11px] text-text-tertiary">{c.date}</span>
                  </div>
                  <select value={editTipe} onChange={e => setEditTipe(e.target.value as TipeCatatan)} className="input-soft text-xs">
                    {TIPE_CATATAN.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                  <textarea
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    rows={3}
                    className="input-soft resize-none text-sm"
                    autoFocus
                  />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setEditId(null)} className="btn-soft btn-secondary-soft px-3 py-1.5 text-xs min-h-[44px] flex items-center justify-center gap-1"><X className="w-3.5 h-3.5"/>Batal</button>
                    <button onClick={saveEdit} className="btn-soft btn-primary-soft px-3 py-1.5 text-xs min-h-[44px] flex items-center justify-center gap-1"><Check className="w-3.5 h-3.5"/>Simpan</button>
                  </div>
                </div>
              ) : (
                /* ── View mode ── */
                <div>
                  <div className="flex items-center gap-2 mb-2 flex-wrap sm:flex-nowrap">
                    <button onClick={() => handleStudentClick(c.studentId)} className="text-[13px] font-semibold text-foreground hover:text-primary transition-colors text-left min-h-[44px] flex items-center">
                      {c.studentName}
                    </button>
                    {c.tipe && (
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${TIPE_BADGE[c.tipe] || TIPE_BADGE.umum}`}>
                        {TIPE_CATATAN.find(t => t.id === c.tipe)?.label || c.tipe}
                      </span>
                    )}
                    <span className="ml-auto text-[11px] text-text-tertiary">{c.date}</span>
                    <button onClick={() => startEdit(c)} className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-bg-2 rounded-xl text-text-tertiary hover:text-primary transition-colors" title="Edit" aria-label="Edit catatan">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => setConfirmDeleteId(c.id)} className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-semantic-red-light rounded-xl text-text-tertiary hover:text-semantic-red transition-colors" title="Hapus" aria-label="Hapus catatan">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-[13px] text-text-secondary leading-relaxed">{c.content}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Confirm Delete Dialog */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl shadow-lg p-6 max-w-sm w-full">
            <h3 className="text-base font-bold text-foreground mb-2">Hapus Catatan?</h3>
            <p className="text-sm text-text-secondary mb-5">Catatan yang dihapus tidak dapat dikembalikan.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteId(null)} className="flex-1 btn-soft btn-secondary-soft py-2.5 text-sm">Batal</button>
              <button onClick={doDelete} className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors">Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
