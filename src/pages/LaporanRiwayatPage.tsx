import { LaporanPage } from './LaporanPage';
import { RiwayatPage } from './RiwayatPage';
import { RekapUjianPage } from './RekapUjianPage';
import { useApp } from '@/context/AppContext';

export function LaporanRiwayatPage() {
  const { reportView, setReportView } = useApp();

  return (
    <div className="flex flex-col gap-5">
      <div className="page-heading">
        <div>
          <p className="label-upper">Buku Induk &amp; Rapor</p>
          <h1>Rekap Absensi Siswa</h1>
          <p className="page-heading-copy">Rekapitulasi kehadiran reguler UTS &amp; UAS semester 1 dan 2 untuk nilai rapor.</p>
        </div>
      </div>
      <div className="app-segmented-control app-segmented-control-wide" role="tablist" aria-label="Pilih laporan">
        <button type="button" role="tab" aria-selected={reportView === 'pantauan'} onClick={() => setReportView('pantauan')} className={reportView === 'pantauan' ? 'is-active' : ''}>Rekap Rapor</button>
        <button type="button" role="tab" aria-selected={reportView === 'riwayat'} onClick={() => setReportView('riwayat')} className={reportView === 'riwayat' ? 'is-active' : ''}>Riwayat</button>
        <button type="button" role="tab" aria-selected={reportView === 'ujian'} onClick={() => setReportView('ujian')} className={reportView === 'ujian' ? 'is-active' : ''}>Presensi Ujian</button>
      </div>

      <div>
        {reportView === 'pantauan' && <LaporanPage />}
        {reportView === 'riwayat' && <RiwayatPage />}
        {reportView === 'ujian'   && <RekapUjianPage />}
      </div>
    </div>
  );
}
