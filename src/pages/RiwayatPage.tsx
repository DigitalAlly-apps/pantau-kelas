import { useState, useMemo } from 'react';
import { Search, Trash2, Pencil, Check, X, Filter, ChevronDown } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import type { AbsenRecord, KasusRecord, CatatanRecord, PeriodeUjian } from '@/types';

export type FilterType = 'semua' | 'absen' | 'jurnal' | 'kasus' | 'catatan';

interface Props {
  studentId?: string;
  initialFilter?: FilterType;
  onBack?: () => void;
}

const PAGE_SIZE = 50;

const STATUS_LABEL: Record<string, string> = { H: 'Hadir', S: 'Sakit', I: 'Izin', A: 'Alpa' };
const STATUS_COLOR: Record<string, string> = {
  H: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  S: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  I: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  A: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

function LoadMoreButton({ shown, total, onLoad }: { shown: number; total: number; onLoad: () => void }) {
  if (shown >= total) return null;
  const remaining = total - shown;
  return (
    <button
      onClick={onLoad}
      className="w-full py-3 flex items-center justify-center gap-2 text-xs font-semibold text-primary hover:bg-bg-2 transition-colors border-t border-border"
    >
      <ChevronDown className="w-3.5 h-3.5" />
      Tampilkan {Math.min(PAGE_SIZE, remaining)} lagi ({remaining} tersisa)
    </button>
  );
}

export function RiwayatPage({ studentId, initialFilter = 'semua', onBack }: Props) {
  const {
    absenRecords, updateAbsenRecord, deleteAbsenRecord,
    kasusRecords, updateKasusRecord, deleteKasusRecord,
    catatanRecords, updateCatatanRecord, deleteCatatanRecord,
    kelasList, activeKelas, showToast,
  } = useApp();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>(initialFilter);
  const [editId, setEditId] = useState<string | null>(null);
  const [editType, setEditType] = useState<'absen' | 'kasus' | 'catatan' | null>(null);
  const [editData, setEditData] = useState<Partial<AbsenRecord & KasusRecord & CatatanRecord>>({});
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; type: 'absen' | 'kasus' | 'catatan' } | null>(null);

  // Pagination state per section
  const [absenShown, setAbsenShown] = useState(PAGE_SIZE);
  const [kasusShown, setKasusShown] = useState(PAGE_SIZE);
  const [catatanShown, setCatatanShown] = useState(PAGE_SIZE);

  // Reset pagination when search/filter changes
  const handleSearch = (val: string) => {
    setSearch(val);
    setAbsenShown(PAGE_SIZE);
    setKasusShown(PAGE_SIZE);
    setCatatanShown(PAGE_SIZE);
  };
  const handleFilter = (val: FilterType) => {
    setFilter(val);
    setAbsenShown(PAGE_SIZE);
    setKasusShown(PAGE_SIZE);
    setCatatanShown(PAGE_SIZE);
  };

  const kelasName = kelasList.find(k => k.id === activeKelas)?.name || '';

  const absenFiltered = useMemo(() =>
    absenRecords
      .filter(r => r.kelasId === activeKelas)
      .filter(r => !studentId || r.studentId === studentId)
      .filter(r => r.studentName.toLowerCase().includes(search.toLowerCase()) || r.date.includes(search))
      .sort((a, b) => b.date.localeCompare(a.date)),
    [absenRecords, activeKelas, search, studentId]
  );

  const kasusFiltered = useMemo(() =>
    kasusRecords
      .filter(r => r.kelasId === activeKelas)
      .filter(r => !studentId || r.studentId === studentId)
      .filter(r =>
        r.studentName.toLowerCase().includes(search.toLowerCase()) ||
        r.description.toLowerCase().includes(search.toLowerCase()) ||
        r.date.includes(search)
      )
      .sort((a, b) => b.date.localeCompare(a.date)),
    [kasusRecords, activeKelas, search, studentId]
  );

  const catatanFiltered = useMemo(() =>
    catatanRecords
      .filter(r => r.kelasId === activeKelas)
      .filter(r => !studentId || r.studentId === studentId)
      .filter(r =>
        r.studentName.toLowerCase().includes(search.toLowerCase()) ||
        r.content.toLowerCase().includes(search.toLowerCase()) ||
        r.date.includes(search)
      )
      .sort((a, b) => b.date.localeCompare(a.date)),
    [catatanRecords, activeKelas, search, studentId]
  );

  // Paginated slices
  const absenPage = absenFiltered.slice(0, absenShown);
  const kasusPage = kasusFiltered.slice(0, kasusShown);
  const catatanPage = catatanFiltered.slice(0, catatanShown);

  const startEdit = (id: string, type: 'absen' | 'kasus' | 'catatan') => {
    setEditId(id); setEditType(type);
    if (type === 'absen') {
      const r = absenRecords.find(r => r.id === id)!;
      setEditData({ status: r.status, periodeUjian: r.periodeUjian, date: r.date, mataPelajaran: r.mataPelajaran || '', jamUjian: r.jamUjian || '' });
    } else if (type === 'kasus') {
      const r = kasusRecords.find(r => r.id === id)!;
      setEditData({ description: r.description, category: r.category, periodeUjian: r.periodeUjian, date: r.date, tindakLanjut: r.tindakLanjut || '' });
    } else {
      const r = catatanRecords.find(r => r.id === id)!;
      setEditData({ content: r.content, tipe: r.tipe });
    }
  };

  const saveEdit = () => {
    if (!editId || !editType) return;
    if (editType === 'absen') updateAbsenRecord(editId, editData);
    else if (editType === 'kasus') updateKasusRecord(editId, editData);
    else updateCatatanRecord(editId, editData);
    showToast('Data berhasil diperbarui');
    setEditId(null); setEditType(null); setEditData({});
  };

  const doDelete = () => {
    if (!confirmDelete) return;
    if (confirmDelete.type === 'absen') deleteAbsenRecord(confirmDelete.id);
    else if (confirmDelete.type === 'kasus') deleteKasusRecord(confirmDelete.id);
    else deleteCatatanRecord(confirmDelete.id);
    showToast('Data berhasil dihapus');
    setConfirmDelete(null);
  };

  // Cycle kasus status: baru → proses → selesai → baru
  const cycleStatus = (r: KasusRecord) => {
    const next = r.status === 'baru' || !r.status ? 'proses' : r.status === 'proses' ? 'selesai' : 'baru';
    updateKasusRecord(r.id, { status: next });
    showToast(`Status kasus: ${next}`);
  };

  const periodeOptions: PeriodeUjian[] = ['Harian', 'UTS', 'UAS'];
  const filterOptions: { id: FilterType; label: string }[] = [
    { id: 'semua',   label: 'Semua' },
    { id: 'absen',   label: 'Absensi' },
    { id: 'jurnal',  label: 'Jurnal' },
    { id: 'kasus',   label: 'Kasus' },
    { id: 'catatan', label: 'Catatan' },
  ];

  return (
    <div className="flex flex-col gap-4 max-w-4xl mx-auto w-full">
      {onBack && <button onClick={onBack} className="flex items-center gap-2 text-xs font-bold text-text-secondary">← Kembali ke Pantauan</button>}
      {/* Search & Filter */}
      <div className="bg-surface rounded-2xl shadow-soft p-4 flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input value={search} onChange={e => handleSearch(e.target.value)}
            placeholder="Cari nama siswa, tanggal, atau deskripsi..."
            className="w-full pl-9 pr-4 py-2.5 bg-bg-2 border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary transition-colors" />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-text-tertiary mt-1 flex-shrink-0" />
          {filterOptions.map(f => (
            <button key={f.id} onClick={() => handleFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filter === f.id ? 'bg-primary text-white' : 'bg-bg-2 text-text-secondary hover:bg-bg-3'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Absensi */}
      {(filter === 'semua' || filter === 'absen') && (
        <div className="bg-surface rounded-2xl shadow-soft overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">Absensi</span>
            {kelasName && <span className="text-xs text-text-tertiary">— Kelas {kelasName}</span>}
            <span className="ml-auto text-xs bg-bg-2 px-2 py-0.5 rounded-full text-text-secondary">{absenFiltered.length}</span>
          </div>
          {absenFiltered.length === 0 ? (
            <p className="text-center text-text-tertiary text-sm py-8">Tidak ada data</p>
          ) : (
            <>
              <div className="divide-y divide-border">
                {absenPage.map(r => (
                  <div key={r.id} className="px-4 py-3">
                    {editId === r.id && editType === 'absen' ? (
                      <div className="flex flex-col gap-2">
                        <p className="text-sm font-semibold text-foreground">{r.studentName}</p>
                        <div className="flex gap-2 flex-wrap">
                          <input type="date" value={editData.date || ''} onChange={e => setEditData(p => ({ ...p, date: e.target.value }))} className="input-soft text-xs flex-1 min-w-[130px]" />
                          <select value={editData.status || 'H'} onChange={e => setEditData(p => ({ ...p, status: e.target.value as AbsenRecord['status'] }))} className="input-soft text-xs flex-1">
                            {['H','S','I','A'].map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                          </select>
                          <select value={editData.periodeUjian || 'Harian'} onChange={e => setEditData(p => ({ ...p, periodeUjian: e.target.value as PeriodeUjian }))} className="input-soft text-xs flex-1">
                            {periodeOptions.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                        </div>
                        {(editData.periodeUjian === 'UTS' || editData.periodeUjian === 'UAS') && (
                          <div className="flex gap-2 flex-wrap">
                            <input value={editData.mataPelajaran || ''} onChange={e => setEditData(p => ({ ...p, mataPelajaran: e.target.value }))} placeholder="Mata Pelajaran" className="input-soft text-xs flex-1 min-w-[130px]" />
                            <input value={editData.jamUjian || ''} onChange={e => setEditData(p => ({ ...p, jamUjian: e.target.value }))} placeholder="Jam / Sesi Ujian" className="input-soft text-xs flex-1 min-w-[130px]" />
                          </div>
                        )}
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => setEditId(null)} className="btn-soft btn-secondary-soft px-3 py-1.5 text-xs flex items-center gap-1"><X className="w-3 h-3"/>Batal</button>
                          <button onClick={saveEdit} className="btn-soft btn-primary-soft px-3 py-1.5 text-xs flex items-center gap-1"><Check className="w-3 h-3"/>Simpan</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{r.studentName}</p>
                          <p className="text-xs text-text-tertiary">
                            {r.date}
                            {r.periodeUjian && <span className="ml-1 text-primary font-medium">· {r.periodeUjian}</span>}
                            {r.mataPelajaran && <span className="ml-1 text-text-secondary">· {r.mataPelajaran}</span>}
                            {r.jamUjian && <span className="ml-1 text-text-tertiary font-medium">({r.jamUjian})</span>}
                          </p>
                        </div>
                        <span className={`text-xs font-bold px-2 py-1 rounded-lg flex-shrink-0 ${STATUS_COLOR[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                        <button onClick={() => startEdit(r.id, 'absen')} className="p-1.5 hover:bg-bg-2 rounded-lg text-text-secondary hover:text-primary"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setConfirmDelete({ id: r.id, type: 'absen' })} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-text-secondary hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <LoadMoreButton
                shown={absenShown}
                total={absenFiltered.length}
                onLoad={() => setAbsenShown(prev => prev + PAGE_SIZE)}
              />
            </>
          )}
        </div>
      )}

      {/* Kasus */}
      {(filter === 'semua' || filter === 'jurnal' || filter === 'kasus') && (
        <div className="bg-surface rounded-2xl shadow-soft overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">Kasus</span>
            {kelasName && <span className="text-xs text-text-tertiary">— Kelas {kelasName}</span>}
            <span className="ml-auto text-xs bg-bg-2 px-2 py-0.5 rounded-full text-text-secondary">{kasusFiltered.length}</span>
          </div>
          {kasusFiltered.length === 0 ? (
            <p className="text-center text-text-tertiary text-sm py-8">Tidak ada data</p>
          ) : (
            <>
              <div className="divide-y divide-border">
                {kasusPage.map(r => (
                  <div key={r.id} className="px-4 py-3">
                    {editId === r.id && editType === 'kasus' ? (
                      <div className="flex flex-col gap-2">
                        <p className="text-sm font-semibold text-foreground">{r.studentName}</p>
                        <input type="date" value={editData.date || ''} onChange={e => setEditData(p => ({ ...p, date: e.target.value }))} className="input-soft text-xs" />
                        <input value={editData.description || ''} onChange={e => setEditData(p => ({ ...p, description: e.target.value }))} placeholder="Deskripsi" className="input-soft text-xs" />
                        <div className="flex gap-2">
                          <input value={editData.category || ''} onChange={e => setEditData(p => ({ ...p, category: e.target.value }))} placeholder="Kategori" className="input-soft text-xs flex-1" />
                          <select value={editData.periodeUjian || 'Harian'} onChange={e => setEditData(p => ({ ...p, periodeUjian: e.target.value as PeriodeUjian }))} className="input-soft text-xs flex-1">
                            {periodeOptions.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                        </div>
                        <input value={editData.tindakLanjut || ''} onChange={e => setEditData(p => ({ ...p, tindakLanjut: e.target.value }))} placeholder="Tindak lanjut (opsional)" className="input-soft text-xs" />
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => setEditId(null)} className="btn-soft btn-secondary-soft px-3 py-1.5 text-xs flex items-center gap-1"><X className="w-3 h-3"/>Batal</button>
                          <button onClick={saveEdit} className="btn-soft btn-primary-soft px-3 py-1.5 text-xs flex items-center gap-1"><Check className="w-3 h-3"/>Simpan</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-foreground">{r.studentName}</p>
                            <span className="text-xs bg-bg-2 text-text-secondary px-2 py-0.5 rounded-full">{r.category}</span>
                            {r.periodeUjian && <span className="text-xs text-primary font-medium">{r.periodeUjian}</span>}
                            {/* Status badge — click to cycle */}
                            <button
                              onClick={() => cycleStatus(r)}
                              title="Klik untuk ubah status"
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${
                                !r.status || r.status === 'baru'
                                  ? 'bg-red-50 border-red-200 text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400'
                                  : r.status === 'proses'
                                  ? 'bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-400'
                                  : 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400'
                              }`}>
                              {!r.status || r.status === 'baru' ? '🔴 Baru' : r.status === 'proses' ? '🟡 Proses' : '🟢 Selesai'}
                            </button>
                          </div>
                          <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">{r.description}</p>
                          {r.tindakLanjut && <p className="text-xs text-text-tertiary mt-0.5 italic">↳ {r.tindakLanjut}</p>}
                          <p className="text-xs text-text-tertiary mt-0.5">{r.date}</p>
                        </div>
                        <div className="flex flex-shrink-0">
                          <button onClick={() => startEdit(r.id, 'kasus')} className="p-1.5 hover:bg-bg-2 rounded-lg text-text-secondary hover:text-primary"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setConfirmDelete({ id: r.id, type: 'kasus' })} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-text-secondary hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <LoadMoreButton
                shown={kasusShown}
                total={kasusFiltered.length}
                onLoad={() => setKasusShown(prev => prev + PAGE_SIZE)}
              />
            </>
          )}
        </div>
      )}

      {/* Catatan Anekdot */}
      {(filter === 'semua' || filter === 'jurnal' || filter === 'catatan') && (
        <div className="bg-surface rounded-2xl shadow-soft overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">Catatan Anekdot</span>
            {kelasName && <span className="text-xs text-text-tertiary">— Kelas {kelasName}</span>}
            <span className="ml-auto text-xs bg-bg-2 px-2 py-0.5 rounded-full text-text-secondary">{catatanFiltered.length}</span>
          </div>
          {catatanFiltered.length === 0 ? (
            <p className="text-center text-text-tertiary text-sm py-8">Tidak ada data</p>
          ) : (
            <>
              <div className="divide-y divide-border">
                {catatanPage.map(r => (
                  <div key={r.id} className="px-4 py-3 flex items-start gap-3">
                    {editId === r.id && editType === 'catatan' ? (
                      <div className="flex-1 flex flex-col gap-2">
                        <p className="text-sm font-semibold text-foreground">{r.studentName}</p>
                        <textarea value={editData.content || ''} onChange={e => setEditData(p => ({ ...p, content: e.target.value }))} rows={3} className="input-soft text-xs resize-none" autoFocus />
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => setEditId(null)} className="btn-soft btn-secondary-soft px-3 py-1.5 text-xs flex items-center gap-1"><X className="w-3 h-3"/>Batal</button>
                          <button onClick={saveEdit} className="btn-soft btn-primary-soft px-3 py-1.5 text-xs flex items-center gap-1"><Check className="w-3 h-3"/>Simpan</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <p className="text-sm font-semibold text-foreground">{r.studentName}</p>
                          {r.tipe && r.tipe !== 'umum' && (
                            <span className="text-[10px] font-medium bg-accent-light text-primary px-2 py-0.5 rounded-full capitalize">{r.tipe}</span>
                          )}
                          <span className="ml-auto text-xs text-text-tertiary">{r.date}</span>
                        </div>
                        <p className="text-xs text-text-secondary leading-relaxed mt-0.5">{r.content}</p>
                      </div>
                    )}
                    {editId !== r.id && (
                      <div className="flex flex-shrink-0">
                        <button onClick={() => startEdit(r.id, 'catatan')} className="p-1.5 hover:bg-bg-2 rounded-lg text-text-secondary hover:text-primary" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setConfirmDelete({ id: r.id, type: 'catatan' })} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-text-secondary hover:text-red-500" title="Hapus"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <LoadMoreButton
                shown={catatanShown}
                total={catatanFiltered.length}
                onLoad={() => setCatatanShown(prev => prev + PAGE_SIZE)}
              />
            </>
          )}
        </div>
      )}

      {/* Confirm Delete */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl shadow-lg p-6 max-w-sm w-full">
            <h3 className="text-base font-bold text-foreground mb-2">Hapus Data?</h3>
            <p className="text-sm text-text-secondary mb-5">Data yang dihapus tidak dapat dikembalikan.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 btn-soft btn-secondary-soft py-2.5 text-sm">Batal</button>
              <button onClick={doDelete} className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors">Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
