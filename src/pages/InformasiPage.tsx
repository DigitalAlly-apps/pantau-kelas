import { BookOpen, ClipboardCheck, Download, AlertTriangle, Info, ChevronRight } from 'lucide-react';
import { PantauKelasLogo } from '@/components/PantauKelasLogo';

const tutorials = [
  {
    icon: ClipboardCheck,
    title: 'Cara Input Absensi',
    steps: [
      'Pilih tab "Absensi" di menu navigasi.',
      'Pilih tanggal dan periode (Harian / UTS / UAS).',
      'Tap status setiap siswa: H (Hadir), S (Sakit), I (Izin), A (Alpa).',
      'Klik tombol "Simpan Absensi" untuk menyimpan.',
    ],
  },
  {
    icon: AlertTriangle,
    title: 'Cara Input Kasus / Catatan Perilaku',
    steps: [
      'Pilih tab "Kasus" di menu navigasi.',
      'Pilih siswa, tanggal, dan periode ujian.',
      'Isi deskripsi kasus dan pilih kategori pelanggaran (Kedisiplinan, Sholat/Ibadah, Perilaku & Etika, dll).',
      'Klik "Simpan Kasus" untuk menyimpan catatan.',
    ],
  },
  {
    icon: BookOpen,
    title: 'Cara Input Catatan Anekdot',
    steps: [
      'Buka tab "Catatan Anekdot" di menu navigasi.',
      'Tap tombol "Tambah Catatan Anekdot" di bagian atas.',
      'Pilih siswa, tanggal, lalu tulis catatan perkembangan atau anekdot.',
      'Catatan anekdot adalah observasi singkat tentang kejadian bermakna pada siswa — bisa positif maupun negatif.',
      'Klik "Simpan Catatan". Catatan juga bisa dilihat di tab Riwayat dan di profil siswa.',
    ],
  },
  {
    icon: ClipboardCheck,
    title: 'Cara Melihat Riwayat & Edit Data',
    steps: [
      'Buka tab "Riwayat" untuk melihat semua catatan.',
      'Gunakan kotak pencarian untuk mencari nama siswa atau tanggal.',
      'Filter tampilan: Semua, Absensi saja, atau Kasus saja.',
      'Tap tombol pensil untuk mengedit, atau tombol tempat sampah untuk menghapus data.',
    ],
  },
  {
    icon: Download,
    title: 'Cara Backup & Restore Data',
    steps: [
      'Buka tab "Setelan" → Backup & Restore.',
      'Tap "Backup Data (JSON)" untuk mengunduh file backup ke perangkat.',
      'Simpan file .json tersebut di tempat yang aman (Google Drive, WhatsApp ke diri sendiri, dll).',
      'Untuk memulihkan, tap "Restore dari Backup" dan pilih file .json yang tersimpan.',
    ],
  },
];

export function InformasiPage() {
  return (
    <div className="flex flex-col gap-4 max-w-4xl mx-auto w-full">
      {/* Logo & Intro */}
      <div className="bg-surface rounded-2xl shadow-soft p-6 flex flex-col items-center text-center">
        <PantauKelasLogo size={110} showText={true} className="mb-2" />
        <p className="text-sm text-text-secondary leading-relaxed mt-3 max-w-xs">
          Pantau Kelas adalah asisten wali kelas dari Digital Ally untuk mencatat absensi, memantau perkembangan siswa,
          dan menindaklanjuti kebutuhan kelas dengan praktis dan aman di perangkat sendiri.
        </p>
        <div className="mt-4 pt-4 border-t border-border w-full">
          <p className="text-xs text-text-tertiary font-semibold tracking-widest uppercase">Developer</p>
          <p className="text-sm text-foreground font-semibold mt-1">Digital Ally Project</p>
          <p className="text-xs text-text-tertiary">Created by Miqdad Abdussalam</p>
        </div>
      </div>

      {/* Backup Alert */}
      <div className="rounded-2xl border-2 border-red-400 dark:border-red-500 bg-red-50 dark:bg-red-950/30 p-4 flex gap-3">
        <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-5 h-5 text-red-500" />
        </div>
        <div>
          <p className="text-sm font-bold text-red-600 dark:text-red-400 mb-1">WAJIB BACKUP DATA!</p>
          <p className="text-xs text-red-600/80 dark:text-red-400/80 leading-relaxed">
            Lakukan <strong>BACKUP DATA (.json)</strong> minimal satu kali seminggu! Data tersimpan di browser Anda —
            menghapus cache browser dapat menghapus data jika tidak dibackup.
          </p>
        </div>
      </div>

      {/* Tutorial */}
      <div className="bg-surface rounded-2xl shadow-soft overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Info className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Panduan Penggunaan</span>
        </div>
        <div className="divide-y divide-border">
          {tutorials.map((t, i) => (
            <details key={i} className="group">
              <summary className="flex items-center gap-3 px-4 py-3.5 cursor-pointer list-none select-none">
                <div className="w-8 h-8 rounded-xl bg-accent-light flex items-center justify-center flex-shrink-0">
                  <t.icon className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-semibold text-foreground flex-1">{t.title}</span>
                <ChevronRight className="w-4 h-4 text-text-tertiary transition-transform group-open:rotate-90" />
              </summary>
              <div className="px-4 pb-4 pl-[60px]">
                <ol className="flex flex-col gap-2">
                  {t.steps.map((step, j) => (
                    <li key={j} className="flex gap-2 text-xs text-text-secondary leading-relaxed">
                      <span className="w-5 h-5 rounded-full bg-accent-light text-primary text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{j + 1}</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </details>
          ))}
        </div>
      </div>

      <p className="text-[11px] text-text-tertiary text-center pb-2">Pantau Kelas v5 — Digital Ally Project</p>
    </div>
  );
}
