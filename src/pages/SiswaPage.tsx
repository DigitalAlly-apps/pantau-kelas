import { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  User, ArrowLeft, CheckCircle, AlertTriangle, BookOpen,
  Clock, Plus, Trash2, Upload, X, Pencil, Check, ArrowUpDown,
} from 'lucide-react';
import type { Jenjang } from '@/types';

const JENJANG_OPTIONS: Jenjang[] = ['SD', 'SMP', 'SMA'];

// ── Confirm dialog ────────────────────────────────────────────────────────────
function ConfirmDialog({ message, onConfirm, onCancel }: {
  message: string; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-xs p-5 flex flex-col gap-4">
        <p className="text-sm text-foreground">{message}</p>
        <div className="flex gap-2">
          <button onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-border bg-bg-2 text-text-secondary hover:bg-bg-3 transition-colors">
            Batal
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-semantic-red hover:bg-red-600 transition-colors">
            Hapus
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Edit Student Modal ────────────────────────────────────────────────────────
function EditStudentModal({ studentId, initialName, initialNis, onSave, onClose }: {
  studentId: string;
  initialName: string;
  initialNis: string;
  onSave: (name: string, nis: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [nis,  setNis]  = useState(initialNis === '-' ? '' : initialNis);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave(name.trim(), nis.trim() || '-');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-4 sm:pb-0">
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-sm p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Edit Data Siswa</h3>
          <button onClick={onClose} aria-label="Tutup modal" className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-xl hover:bg-bg-2 text-text-tertiary hover:text-foreground transition-colors flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label className="label-upper block mb-1.5">Nama Siswa</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Nama lengkap siswa"
              className="input-soft"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
          </div>
          <div>
            <label className="label-upper block mb-1.5">NISN</label>
            <input
              value={nis}
              onChange={e => setNis(e.target.value)}
              placeholder="Nomor Induk Siswa Nasional"
              className="input-soft"
              inputMode="numeric"
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-border bg-bg-2 text-text-secondary hover:bg-bg-3 transition-colors">
            Batal
          </button>
          <button onClick={handleSave}
            disabled={!name.trim()}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary hover:bg-primary-hover transition-colors disabled:opacity-40">
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Reorder Student Modal ─────────────────────────────────────────────────────
function ReorderStudentModal({
  studentName,
  currentPosition,
  totalStudents,
  onSave,
  onClose,
}: {
  studentName: string;
  currentPosition: number;
  totalStudents: number;
  onSave: (targetPosition: number) => void;
  onClose: () => void;
}) {
  const [targetPos, setTargetPos] = useState<number>(currentPosition);

  const handleSave = () => {
    if (isNaN(targetPos) || targetPos < 1 || targetPos > totalStudents) return;
    onSave(targetPos);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-4 sm:pb-0">
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-sm p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent-light flex items-center justify-center text-primary">
              <ArrowUpDown className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Ubah Nomor Absen</h3>
          </div>
          <button onClick={onClose} className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-xl hover:bg-bg-2 text-text-tertiary hover:text-foreground transition-colors flex items-center justify-center" aria-label="Tutup modal">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div className="rounded-xl bg-bg-2 p-3">
            <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Nama Siswa</p>
            <p className="text-sm font-bold text-foreground mt-0.5">{studentName}</p>
            <p className="text-xs text-text-secondary mt-1">
              Nomor absen saat ini: <span className="font-mono font-bold text-primary">No. {currentPosition}</span> dari {totalStudents} siswa
            </p>
          </div>

          <div>
            <label className="label-upper block mb-1.5">Nomor Absen Baru (1 - {totalStudents})</label>
            <input
              type="number"
              min={1}
              max={totalStudents}
              value={targetPos || ''}
              onChange={e => {
                const val = parseInt(e.target.value, 10);
                setTargetPos(isNaN(val) ? 1 : Math.max(1, Math.min(totalStudents, val)));
              }}
              className="input-soft font-mono text-base font-bold text-center"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
          </div>

          <div className="rounded-xl border border-border/80 bg-accent-light/40 p-3 text-xs text-text-secondary leading-relaxed">
            {targetPos === currentPosition ? (
              <span>Pilih nomor berbeda untuk mengubah urutan absen siswa ini.</span>
            ) : targetPos < currentPosition ? (
              <span>
                Siswa akan dipindahkan ke <b>No. {targetPos}</b>. Siswa dari No. {targetPos} sampai No. {currentPosition - 1} akan bergeser turun (+1).
              </span>
            ) : (
              <span>
                Siswa akan dipindahkan ke <b>No. {targetPos}</b>. Siswa dari No. {currentPosition + 1} sampai No. {targetPos} akan bergeser naik (-1).
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 min-h-[44px] py-2.5 rounded-xl text-sm font-semibold border border-border bg-bg-2 text-text-secondary hover:bg-bg-3 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={targetPos === currentPosition || isNaN(targetPos) || targetPos < 1 || targetPos > totalStudents}
            className="flex-1 min-h-[44px] py-2.5 rounded-xl text-sm font-semibold text-white bg-primary hover:bg-primary-hover transition-colors disabled:opacity-40"
          >
            Simpan Urutan
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main SiswaPage ────────────────────────────────────────────────────────────
export function SiswaPage() {
  const {
    kelasList, activeKelas, setActiveKelas, activeStudentId, setActiveStudentId,
    absenRecords, kasusRecords, catatanRecords,
    addKelas, deleteKelas, addStudentsToKelas, removeStudentFromKelas, reorderStudentInKelas,
    updateStudent, showToast,
  } = useApp();

  const kelas = kelasList.find(k => k.id === activeKelas);

  const [showAddKelas,   setShowAddKelas]   = useState(false);
  const [newKelasName,   setNewKelasName]   = useState('');
  const [newKelasJenjang,setNewKelasJenjang]= useState<Jenjang>('SMP');
  const [showAddSiswa,   setShowAddSiswa]   = useState(false);
  const [addMode,        setAddMode]        = useState<'manual' | 'paste'>('manual');
  const [manualName,     setManualName]     = useState('');
  const [manualNis,      setManualNis]      = useState('');
  const [pasteText,      setPasteText]      = useState('');
  const [search,         setSearch]         = useState('');
  const [editingStudent, setEditingStudent] = useState<{ id: string; name: string; nis: string } | null>(null);
  const [confirmDialog,  setConfirmDialog]  = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [reorderTarget,  setReorderTarget]  = useState<{ id: string; name: string; currentPosition: number } | null>(null);
  const [positionMode,   setPositionMode]   = useState<'end' | 'custom'>('end');
  const [customPosition, setCustomPosition] = useState<number>(1);

  // ── Filter search (tetap mempertahankan nomor absen resmi dari indeks kelas.students) ──
  const filteredStudents = useMemo(() => {
    if (!kelas) return [];
    const withNoAbsen = (kelas.students || []).map((s, index) => ({
      ...s,
      noAbsen: index + 1,
    }));
    if (!search.trim()) return withNoAbsen;
    const q = search.toLowerCase();
    return withNoAbsen.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.nis.includes(q)
    );
  }, [kelas, search]);

  // Cari siswa yang aktif. Jika activeStudentId ada tapi tidak ditemukan (kelas ganti/berubah),
  // jadikan null supaya tidak blank hitam.
  const selSiswa = activeStudentId ? kelas?.students.find(s => s.id === activeStudentId) ?? null : null;

  if (selSiswa && kelas) {
    return <StudentDetail student={selSiswa} kelasId={activeKelas} kelasName={kelas.name} />;
  }

  // Jika activeStudentId ada tapi siswa sudah tidak ada, reset dengan useEffect-safe timeout
  if (activeStudentId && !selSiswa) {
    setTimeout(() => setActiveStudentId(null), 0);
  }

  const askConfirm = (message: string, onConfirm: () => void) =>
    setConfirmDialog({ message, onConfirm });

  // ── Kelas ──
  const handleAddKelas = () => {
    if (!newKelasName.trim()) return;
    addKelas(newKelasName.trim(), newKelasJenjang);
    setNewKelasName('');
    setNewKelasJenjang('SMP');
    setShowAddKelas(false);
    showToast('Kelas berhasil ditambahkan');
  };

  const handleDeleteKelas = () => {
    if (!kelas || kelasList.length <= 1) return;
    askConfirm(`Hapus kelas ${kelas.name}? Semua data absensi kelas ini akan ikut terhapus.`, () => {
      deleteKelas(kelas.id);
      showToast('Kelas berhasil dihapus');
    });
  };

  const totalStudents = kelas?.students.length || 0;
  const nextNumber = totalStudents + 1;

  // ── Siswa manual ──
  const handleAddManual = () => {
    if (!manualName.trim()) return;
    const targetPos = positionMode === 'custom' ? customPosition : nextNumber;
    addStudentsToKelas(activeKelas, [{ name: manualName.trim(), nis: manualNis.trim() || '-' }], targetPos);
    setManualName('');
    setManualNis('');
    if (positionMode === 'custom') {
      setCustomPosition(prev => Math.min(prev + 1, nextNumber + 1));
    }
    showToast(`${manualName.trim()} berhasil ditambahkan pada No. ${targetPos}`);
    // jangan close panel supaya guru bisa terus tambah
  };

  // ── Reorder save ──
  const handleReorderSave = (targetPosition: number) => {
    if (!reorderTarget) return;
    reorderStudentInKelas(activeKelas, reorderTarget.id, targetPosition);
    showToast(`Nomor absen ${reorderTarget.name} diubah menjadi No. ${targetPosition}`);
    setReorderTarget(null);
  };

  // ── Paste ──
  const handlePaste = () => {
    if (!pasteText.trim()) return;
    const lines    = pasteText.trim().split('\n').filter(l => l.trim());
    const students = lines.map(line => {
      const parts = line.split('\t').length > 1 ? line.split('\t') : line.split(',');
      if (parts.length >= 3) return { name: parts[1].trim(), nis: parts[2].trim() };
      if (parts.length === 2) return { name: parts[0].trim(), nis: parts[1].trim() };
      return { name: parts[0].trim(), nis: '-' };
    }).filter(s => s.name && !/^(no|nama|nis|nisn|name|number)$/i.test(s.name));

    if (!students.length) { showToast('Tidak ada data siswa yang valid'); return; }
    addStudentsToKelas(activeKelas, students);
    setPasteText('');
    setShowAddSiswa(false);
    showToast(`${students.length} siswa berhasil ditambahkan`);
  };

  // ── Remove ──
  const handleRemove = (studentId: string, studentName: string) => {
    askConfirm(`Hapus ${studentName} dari kelas?`, () => {
      removeStudentFromKelas(activeKelas, studentId);
      showToast('Siswa berhasil dihapus');
    });
  };

  // ── Edit save ──
  const handleEditSave = (name: string, nis: string) => {
    if (!editingStudent) return;
    updateStudent(activeKelas, editingStudent.id, { name, nis });
    setEditingStudent(null);
    showToast('Data siswa diperbarui');
  };


  return (
    <div className="flex flex-col gap-5 max-w-5xl w-full pb-10 mx-auto">

      {/* Modals */}
      {confirmDialog && (
        <ConfirmDialog
          message={confirmDialog.message}
          onConfirm={() => { confirmDialog.onConfirm(); setConfirmDialog(null); }}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
      {editingStudent && (
        <EditStudentModal
          studentId={editingStudent.id}
          initialName={editingStudent.name}
          initialNis={editingStudent.nis}
          onSave={handleEditSave}
          onClose={() => setEditingStudent(null)}
        />
      )}
      {reorderTarget && kelas && (
        <ReorderStudentModal
          studentName={reorderTarget.name}
          currentPosition={reorderTarget.currentPosition}
          totalStudents={kelas.students.length}
          onSave={handleReorderSave}
          onClose={() => setReorderTarget(null)}
        />
      )}

      {/* Ringkasan kelas dan kontrol utama */}
      <section className="card-soft !p-5 md:!p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="label-upper">Data kelas</p>
            <h1 className="mt-1 text-2xl font-bold text-foreground">Kelola kelas & siswa</h1>
            <p className="mt-1 text-sm text-text-secondary">Pilih kelas, perbarui daftar siswa, dan pantau data penting.</p>
          </div>
          <div className="flex gap-2">
          <button onClick={() => setShowAddKelas(true)}
            className="btn-soft btn-secondary-soft flex items-center justify-center gap-1.5 px-3 py-2 text-xs min-h-[44px]">
            <Plus className="h-4 w-4" /> Tambah Kelas
          </button>
          {kelasList.length > 1 && (
            <button onClick={handleDeleteKelas}
              aria-label="Hapus kelas aktif"
              className="btn-soft flex items-center justify-center gap-1.5 bg-semantic-red-light px-3 py-2 text-xs text-semantic-red min-h-[44px] min-w-[44px]">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-1"><label className="label-upper mb-1.5 block">Kelas aktif</label><select value={activeKelas} onChange={e => setActiveKelas(e.target.value)} className="input-soft py-3">{kelasList.map(k => <option key={k.id} value={k.id}>Kelas {k.name}</option>)}</select></div>
          <div className="rounded-xl bg-accent-light p-3"><p className="text-2xl font-black text-primary">{kelas?.students.length || 0}</p><p className="text-xs font-semibold text-text-secondary">Siswa terdaftar</p></div>
          <div className="rounded-xl bg-bg-2 p-3"><p className="text-2xl font-black text-foreground">{absenRecords.filter(a => a.kelasId === activeKelas && a.status === 'A').length}</p><p className="text-xs font-semibold text-text-secondary">Total alpha tercatat</p></div>
        </div>
      </section>

      {/* Add Kelas */}
      {showAddKelas && (
        <div className="bg-surface rounded-2xl shadow-soft p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">Tambah Kelas Baru</h3>
            <button onClick={() => setShowAddKelas(false)} aria-label="Tutup form kelas" className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-xl hover:bg-bg-2 text-text-tertiary hover:text-foreground transition-colors flex items-center justify-center">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input value={newKelasName} onChange={e => setNewKelasName(e.target.value)}
              placeholder="Nama kelas (misal: 9A)" className="input-soft flex-1"
              onKeyDown={e => e.key === 'Enter' && handleAddKelas()} autoFocus />
            <select value={newKelasJenjang} onChange={e => setNewKelasJenjang(e.target.value as Jenjang)} className="input-soft sm:w-28">
              {JENJANG_OPTIONS.map(j => <option key={j} value={j}>{j}</option>)}
            </select>
            <button onClick={handleAddKelas} className="btn-soft btn-primary-soft min-h-[44px] px-4">Tambah</button>
          </div>
        </div>
      )}

      {/* Tambah Siswa button */}
      <button onClick={() => setShowAddSiswa(!showAddSiswa)}
        className="btn-soft btn-primary-soft w-full py-3 gap-2 flex items-center justify-center">
        <Plus className="w-4 h-4" /> Tambah Siswa
      </button>

      {/* Add Siswa panel */}
      {showAddSiswa && (
        <div className="bg-surface rounded-2xl shadow-soft p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">Tambah Siswa</h3>
            <button onClick={() => setShowAddSiswa(false)} className="text-text-tertiary">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tab mode */}
          <div className="flex bg-bg-2 rounded-xl p-1 gap-1 mb-4">
            {(['manual', 'paste'] as const).map(m => (
              <button key={m} onClick={() => setAddMode(m)}
                className={`flex-1 py-2 text-[12px] font-semibold rounded-lg transition-all ${
                  addMode === m ? 'bg-surface shadow-soft text-foreground' : 'text-text-tertiary'
                }`}>
                {m === 'manual' ? 'Manual' : 'Paste dari Excel'}
              </button>
            ))}
          </div>

          {addMode === 'manual' ? (
            <div className="flex flex-col gap-3">
              <div>
                <label className="label-upper block mb-1.5">Nama Siswa</label>
                <input
                  value={manualName}
                  onChange={e => setManualName(e.target.value)}
                  placeholder="Nama lengkap siswa"
                  className="input-soft"
                  onKeyDown={e => e.key === 'Enter' && handleAddManual()}
                />
              </div>
              <div>
                <label className="label-upper block mb-1.5">NISN <span className="normal-case text-text-tertiary font-normal">(opsional)</span></label>
                <input
                  value={manualNis}
                  onChange={e => setManualNis(e.target.value)}
                  placeholder="Nomor Induk Siswa Nasional"
                  className="input-soft"
                  inputMode="numeric"
                  onKeyDown={e => e.key === 'Enter' && handleAddManual()}
                />
              </div>

              {/* Posisi Nomor Absen */}
              {totalStudents > 0 && (
                <div className="rounded-xl border border-border/80 bg-bg-2 p-3 flex flex-col gap-2.5">
                  <label className="label-upper block text-[11px]">Posisi Nomor Absen</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPositionMode('end')}
                      className={`min-h-[44px] px-3 py-2 rounded-lg text-xs font-semibold flex flex-col items-center justify-center text-center transition-all ${
                        positionMode === 'end'
                          ? 'bg-primary text-white shadow-soft'
                          : 'bg-surface text-text-secondary border border-border hover:bg-bg-3'
                      }`}
                    >
                      <span>Nomor Terakhir</span>
                      <span className={`text-[11px] font-normal ${positionMode === 'end' ? 'text-white/80' : 'text-text-tertiary'}`}>
                        (No. {nextNumber})
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPositionMode('custom');
                        if (customPosition < 1 || customPosition > nextNumber) {
                          setCustomPosition(1);
                        }
                      }}
                      className={`min-h-[44px] px-3 py-2 rounded-lg text-xs font-semibold flex flex-col items-center justify-center text-center transition-all ${
                        positionMode === 'custom'
                          ? 'bg-primary text-white shadow-soft'
                          : 'bg-surface text-text-secondary border border-border hover:bg-bg-3'
                      }`}
                    >
                      <span>Sisipkan Tertentu</span>
                      <span className={`text-[11px] font-normal ${positionMode === 'custom' ? 'text-white/80' : 'text-text-tertiary'}`}>
                        (Pilih no 1 - {nextNumber})
                      </span>
                    </button>
                  </div>

                  {positionMode === 'custom' ? (
                    <div className="flex flex-col gap-1.5 pt-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-text-secondary">Posisikan di nomor:</span>
                        <input
                          type="number"
                          min={1}
                          max={nextNumber}
                          value={customPosition}
                          onChange={e => {
                            const val = parseInt(e.target.value, 10);
                            setCustomPosition(isNaN(val) ? 1 : Math.max(1, Math.min(nextNumber, val)));
                          }}
                          className="input-soft w-20 py-1.5 text-center font-mono font-bold text-sm"
                        />
                        <span className="text-xs text-text-tertiary">dari {nextNumber} posisi</span>
                      </div>
                      <p className="text-[11px] text-text-tertiary leading-tight">
                        Siswa baru akan menjadi <b>No. {customPosition}</b>. Siswa lama dari No. {customPosition} ke atas otomatis bergeser turun (+1).
                      </p>
                    </div>
                  ) : (
                    <p className="text-[11px] text-text-tertiary leading-tight">
                      Siswa akan ditempatkan di <b>No. {nextNumber}</b> (paling akhir). Nomor absen siswa yang sudah ada tidak akan bergeser.
                    </p>
                  )}
                </div>
              )}

              <button onClick={handleAddManual} disabled={!manualName.trim()}
                className="btn-soft btn-primary-soft w-full py-2.5 min-h-[44px] disabled:opacity-40">
                + Tambah Siswa
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="bg-bg-2 rounded-xl p-3">
                <p className="text-[11px] text-text-secondary font-medium mb-1">Format paste dari Excel:</p>
                <p className="text-[11px] text-text-tertiary">Kolom: <span className="font-mono">No | Nama | NISN</span></p>
                <p className="text-[11px] text-text-tertiary">atau: <span className="font-mono">Nama | NISN</span></p>
                <p className="text-[11px] text-text-tertiary">atau: <span className="font-mono">Nama saja</span></p>
              </div>
              <textarea
                value={pasteText}
                onChange={e => setPasteText(e.target.value)}
                placeholder={"1\tAhmad Rizki\t0012345678\n2\tSiti Nurhaliza\t0012345679"}
                rows={6}
                className="input-soft resize-none font-mono text-[12px]"
              />
              <button onClick={handlePaste}
                className="btn-soft btn-primary-soft w-full py-2.5 gap-2 flex items-center justify-center">
                <Upload className="w-4 h-4" />
                Import {pasteText.trim().split('\n').filter(l => l.trim()).length} Siswa
              </button>
            </div>
          )}
        </div>
      )}

      {/* Search */}
      {(kelas?.students.length || 0) > 5 && (
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari nama atau NISN..."
          className="input-soft"
        />
      )}

      {/* Daftar siswa */}
      {filteredStudents.length === 0 ? (
        <div className="text-center py-16 bg-surface rounded-2xl border border-dashed border-border flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-bg-2 flex items-center justify-center mb-3">
            <User className="w-8 h-8 text-text-tertiary" />
          </div>
          <p className="text-sm font-semibold text-text-secondary">
            {search ? 'Siswa tidak ditemukan' : 'Belum ada siswa di kelas ini'}
          </p>
          {!search && <p className="text-xs text-text-tertiary mt-1">Gunakan tombol Tambah Siswa di atas untuk memulai.</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStudents.map((s) => {
            const alphaCount = absenRecords.filter(a => a.kelasId === activeKelas && a.studentId === s.id && a.status === 'A').length;
            const kasusCount = kasusRecords.filter(k => k.kelasId === activeKelas && k.studentId === s.id).length;

            return (
              <div key={s.id}
                className="card-soft flex flex-col p-5 group relative cursor-pointer hover:border-primary/40"
                onClick={() => setActiveStudentId(s.id)}
              >
                {/* Header Card: Avatar with No Absen & Actions */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-accent-light flex items-center justify-center flex-shrink-0 shadow-inner group-hover:scale-105 transition-transform relative">
                      <User className="w-6 h-6 text-primary" />
                      <span className="absolute -bottom-1.5 -right-1.5 bg-primary text-white text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-md shadow-sm border border-surface">
                        {s.noAbsen}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] font-mono font-bold text-text-tertiary">
                        No. Absen {s.noAbsen}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setReorderTarget({ id: s.id, name: s.name, currentPosition: s.noAbsen });
                      }}
                      className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 sm:w-8 sm:h-8 rounded-xl bg-bg-2 hover:bg-accent-light text-text-tertiary hover:text-primary flex items-center justify-center transition-all shadow-sm"
                      title="Ubah nomor absen"
                      aria-label={`Ubah nomor absen ${s.name}`}
                    >
                      <ArrowUpDown className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingStudent({ id: s.id, name: s.name, nis: s.nis }) }}
                      className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 sm:w-8 sm:h-8 rounded-xl bg-bg-2 hover:bg-accent-light text-text-tertiary hover:text-primary flex items-center justify-center transition-all shadow-sm"
                      title="Edit"
                      aria-label={`Edit ${s.name}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemove(s.id, s.name) }}
                      className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 sm:w-8 sm:h-8 rounded-xl bg-bg-2 hover:bg-semantic-red-light text-text-tertiary hover:text-semantic-red flex items-center justify-center transition-all shadow-sm"
                      title="Hapus"
                      aria-label={`Hapus ${s.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Info Siswa */}
                <div className="flex-1 min-w-0">
                  <p className="text-[16px] font-bold text-foreground truncate group-hover:text-primary transition-colors">{s.name}</p>
                  <p className="text-[12px] text-text-secondary font-mono mt-1 font-medium">
                    NISN: {s.nis === '-' ? '—' : s.nis}
                  </p>
                </div>

                {/* Status Badges */}
                <div className="flex flex-wrap gap-2 mt-5 pt-3 border-t border-border/60">
                  {alphaCount > 0 ? (
                     <span className="badge-rich badge-red text-[11px] py-1">{alphaCount}× Alpha</span>
                  ) : <span className="badge-rich badge-green text-[11px] py-1 opacity-80">Rajin</span>}
                  
                  {kasusCount > 0 && (
                     <span className="badge-rich badge-yellow text-[11px] py-1">{kasusCount} Kasus</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Student Detail ────────────────────────────────────────────────────────────
function StudentDetail({ student, kelasId, kelasName }: {
  student: { id: string; name: string; nis: string };
  kelasId: string;
  kelasName: string;
}) {
  const {
    kelasList, absenRecords, kasusRecords, catatanRecords,
    setActiveStudentId, updateStudent, showToast,
  } = useApp();

  const kelas = kelasList.find(k => k.id === kelasId);
  const noAbsen = (kelas?.students.findIndex(s => s.id === student.id) ?? -1) + 1;

  const [isEditing,  setIsEditing]  = useState(false);
  const [editName,   setEditName]   = useState('');
  const [editNis,    setEditNis]    = useState('');

  const absen   = useMemo(() =>
    absenRecords.filter(a => a.kelasId === kelasId && a.studentId === student.id)
      .sort((a, b) => b.date.localeCompare(a.date)),
    [absenRecords, kelasId, student.id]
  );
  const kasus   = useMemo(() =>
    kasusRecords.filter(k => k.kelasId === kelasId && k.studentId === student.id)
      .sort((a, b) => b.date.localeCompare(a.date)),
    [kasusRecords, kelasId, student.id]
  );
  const catatan = useMemo(() =>
    catatanRecords.filter(c => c.kelasId === kelasId && c.studentId === student.id)
      .sort((a, b) => b.date.localeCompare(a.date)),
    [catatanRecords, kelasId, student.id]
  );

  const sakitCount  = absen.filter(a => a.status === 'S').length;
  const izinCount   = absen.filter(a => a.status === 'I').length;
  const alphaCount  = absen.filter(a => a.status === 'A').length;

  const startEdit = () => {
    setEditName(student.name);
    setEditNis(student.nis === '-' ? '' : student.nis);
    setIsEditing(true);
  };

  const saveEdit = () => {
    if (!editName.trim()) return;
    updateStudent(kelasId, student.id, {
      name: editName.trim(),
      nis:  editNis.trim() || '-',
    });
    setIsEditing(false);
    showToast('Data siswa diperbarui');
  };

  return (
    <div className="flex flex-col gap-5 max-w-4xl pb-10 w-full mx-auto">
      <div className="flex items-center justify-between">
        <button onClick={() => setActiveStudentId(null)}
          className="flex items-center gap-2 text-sm text-text-secondary hover:text-foreground transition-colors self-start min-h-[44px]">
          <ArrowLeft className="w-4 h-4" /> Kembali
        </button>
        
        {/* Quick Actions */}
        <div className="flex gap-2">
          <button onClick={() => { window.dispatchEvent(new CustomEvent('change-view', { detail: 'jurnal' })); }} 
            className="btn-soft btn-secondary-soft text-[12px] px-3 min-h-[44px] flex items-center gap-1.5 border border-semantic-red/10 text-semantic-red hover:bg-semantic-red-light">
            <AlertTriangle className="w-3.5 h-3.5" /> + Kasus
          </button>
          <button onClick={() => { window.dispatchEvent(new CustomEvent('change-view', { detail: 'jurnal' })); }} 
            className="btn-soft btn-secondary-soft text-[12px] px-3 min-h-[44px] flex items-center gap-1.5 border border-primary/10 text-primary hover:bg-accent-light">
            <BookOpen className="w-3.5 h-3.5" /> + Catatan
          </button>
        </div>
      </div>

      {/* Profile card */}
      <div className="bg-surface rounded-2xl shadow-soft p-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-accent-light flex items-center justify-center flex-shrink-0 relative">
            <User className="w-7 h-7 text-primary" />
            {noAbsen > 0 && (
              <span className="absolute -bottom-1 -right-1 bg-primary text-white text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-md shadow-sm border border-surface">
                #{noAbsen}
              </span>
            )}
          </div>

          {isEditing ? (
            <div className="flex-1 flex flex-col gap-2">
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="input-soft py-1.5 text-sm font-semibold"
                placeholder="Nama siswa"
                autoFocus
              />
              <input
                value={editNis}
                onChange={e => setEditNis(e.target.value)}
                className="input-soft py-1.5 text-sm font-mono"
                placeholder="NISN (opsional)"
                inputMode="numeric"
              />
              <div className="flex gap-2">
                <button onClick={saveEdit}
                  className="flex-1 min-h-[44px] rounded-xl text-xs font-semibold bg-primary text-white flex items-center justify-center gap-1">
                  <Check className="w-3 h-3" /> Simpan
                </button>
                <button onClick={() => setIsEditing(false)}
                  className="flex-1 min-h-[44px] rounded-xl text-xs font-semibold border border-border bg-bg-2 text-text-secondary flex items-center justify-center">
                  Batal
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-primary bg-accent-light px-2 py-0.5 rounded-md">
                  No. Absen {noAbsen > 0 ? noAbsen : '-'}
                </span>
                <span className="text-xs text-text-tertiary">Kelas {kelasName}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <h2 className="text-lg font-bold text-foreground truncate">{student.name}</h2>
                <button onClick={startEdit}
                  className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-bg-2 text-text-tertiary hover:text-primary transition-colors flex-shrink-0"
                  title="Edit data siswa"
                  aria-label="Edit data siswa">
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-text-secondary mt-0.5">
                NISN: <span className="font-mono">{student.nis === '-' ? '—' : student.nis}</span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Sakit', val: sakitCount, cls: 'text-semantic-blue bg-semantic-blue-light' },
          { label: 'Izin',  val: izinCount,  cls: 'text-semantic-yellow bg-semantic-yellow-light' },
          { label: 'Alpha', val: alphaCount, cls: 'text-semantic-red bg-semantic-red-light' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl p-3 text-center ${s.cls}`}>
            <span className="text-lg font-bold block">{s.val}</span>
            <span className="text-[10px] font-medium uppercase tracking-wider">{s.label}</span>
          </div>
        ))}
      </div>



      {/* Kasus */}
      <div className="bg-surface rounded-2xl shadow-soft p-5">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-semantic-red" />
          <h3 className="text-sm font-semibold text-foreground">Kasus ({kasus.length})</h3>
        </div>
        {!kasus.length ? (
          <p className="text-sm text-text-tertiary">Tidak ada kasus tercatat</p>
        ) : (
          <div className="flex flex-col gap-2">
            {kasus.map(k => (
              <div key={k.id} className="bg-bg-2 rounded-xl p-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-semantic-red-light text-semantic-red">
                    {k.category}
                  </span>
                  <span className="text-[11px] text-text-tertiary">{k.date}</span>
                </div>
                <p className="text-[13px] text-text-secondary">{k.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Catatan */}
      <div className="bg-surface rounded-2xl shadow-soft p-5">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Catatan Anekdot ({catatan.length})</h3>
        </div>
        {!catatan.length ? (
          <p className="text-sm text-text-tertiary">Belum ada catatan</p>
        ) : (
          <div className="flex flex-col gap-2">
            {catatan.map(c => (
              <div key={c.id} className="bg-bg-2 rounded-xl p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-text-tertiary">{c.date}</span>
                  {c.tipe && c.tipe !== 'umum' && (
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      c.tipe === 'prestasi'
                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : c.tipe === 'sholat'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    }`}>
                      {c.tipe === 'prestasi' ? 'Prestasi' : c.tipe === 'sholat' ? 'Sholat' : 'Perkembangan'}
                    </span>
                  )}
                </div>
                <p className="text-[13px] text-text-secondary leading-relaxed">{c.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Riwayat kehadiran */}
      <div className="bg-surface rounded-2xl shadow-soft p-5">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Riwayat Kehadiran</h3>
        </div>
        {!absen.length ? (
          <p className="text-sm text-text-tertiary">Belum ada data kehadiran</p>
        ) : (
          <div className="flex flex-col">
            {absen.slice(0, 30).map(a => (
              <div key={a.id} className="flex justify-between items-start py-2.5 border-b border-border last:border-b-0 gap-3">
                <span className="text-[13px] text-text-secondary font-mono">{a.date}</span>
                <div className="flex flex-col items-end gap-0.5">
                  <StatusPill status={a.status} />
                  {a.keterangan && (
                    <span className="text-[11px] text-text-tertiary italic">"{a.keterangan}"</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Status pill ───────────────────────────────────────────────────────────────
function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    H: 'bg-accent-light text-primary',
    S: 'bg-semantic-blue-light text-semantic-blue',
    I: 'bg-semantic-yellow-light text-semantic-yellow',
    A: 'bg-semantic-red-light text-semantic-red',
  };
  const labels: Record<string, string> = { H: 'Hadir', S: 'Sakit', I: 'Izin', A: 'Alpha' };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold ${styles[status] || ''}`}>
      {labels[status] || status}
    </span>
  );
}
