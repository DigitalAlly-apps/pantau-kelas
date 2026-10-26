export interface Student {
  id: string;
  name: string;
  nis: string;
}

export type Jenjang = 'SD' | 'SMP' | 'SMA';

export interface Kelas {
  id: string;
  name: string;
  students: Student[];
  jenjang?: Jenjang;
}

export type PeriodeUjian = 'UTS' | 'UAS' | 'Harian';
export type SubPeriodeReguler = 'pra_uts' | 'pra_uas';

export interface AbsenRecord {
  id: string;
  studentId: string;
  studentName: string;
  date: string;
  status: 'H' | 'S' | 'I' | 'A';
  keterangan?: string;
  kelasId: string;
  periodeUjian?: PeriodeUjian;
  subPeriode?: SubPeriodeReguler;
  mataPelajaran?: string;
  jamUjian?: string;
}

export type KasusStatus = 'baru' | 'proses' | 'selesai';

export interface KasusRecord {
  id: string;
  studentId: string;
  studentName: string;
  date: string;
  description: string;
  category: string;
  kelasId: string;
  periodeUjian?: PeriodeUjian;
  waktuPemanggilan?: string;
  tanggalPemanggilan?: string;
  status?: KasusStatus;
  tindakLanjut?: string;
}

export interface CatatanRecord {
  id: string;
  studentId: string;
  studentName: string;
  date: string;
  content: string;
  kelasId: string;
  tipe?: 'prestasi' | 'perkembangan' | 'sholat' | 'umum';
}

export type TabId = 'home' | 'aktivitas' | 'laporan' | 'siswa' | 'setelan' | 'auth';
export type ActivityView = 'absen' | 'jurnal';
export type ReportView = 'pantauan' | 'ujian' | 'riwayat';

export type SemesterPeriod = 'ganjil' | 'genap';

export interface UjianSchedule {
  utsStart: string;
  utsEnd: string;
  uasStart: string;
  uasEnd: string;
}

export interface LiburDate {
  id: string;
  date: string;
  jenjang: Jenjang;
  keterangan?: string;
}

/** Tanggal yang sudah dikonfirmasi absensi-nya (termasuk yang semua hadir = tidak ada record S/I/A) */
export interface ConfirmedDate {
  /** format: `${kelasId}_${date}` */
  id: string;
  kelasId: string;
  date: string;
  periodeUjian?: PeriodeUjian;
  mataPelajaran?: string;
  jamUjian?: string;
}

export interface SemesterConfig {
  tahunAjaran: string;
  semester: SemesterPeriod;
  ganjil: UjianSchedule;
  genap: UjianSchedule;
}

export interface BackupData {
  version: string;
  exportedAt: string;
  namaGuru: string;
  semester: SemesterConfig;
  kelasList: Kelas[];
  absenRecords: AbsenRecord[];
  kasusRecords: KasusRecord[];
  catatanRecords: CatatanRecord[];
  liburDates?: LiburDate[];
  confirmedDates?: ConfirmedDate[];
}
