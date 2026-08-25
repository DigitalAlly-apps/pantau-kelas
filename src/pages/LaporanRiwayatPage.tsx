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
          <p className="label-upper">Buku induk</p>
          <h1>Laporan kelas</h1>
          <p className="page-heading-copy">Pantau siswa, nilai ujian, dan riwayat jurnal dengan cepat.</p>
        </div>
      </div>
      <div className="app-segmented-control app-segmented-control-wide" role="tablist" aria-label="Pilih laporan">
        <button type="button" role="tab" aria-selected={reportView === 'pantauan'} onClick={() => setReportView('pantauan')} className={reportView === 'pantauan' ? 'is-active' : ''}>Pantauan</button>
        <button type="button" role="tab" aria-selected={reportView === 'ujian'} onClick={() => setReportView('ujian')} className={reportView === 'ujian' ? 'is-active' : ''}>Ujian</button>
        <button type="button" role="tab" aria-selected={reportView === 'riwayat'} onClick={() => setReportView('riwayat')} className={reportView === 'riwayat' ? 'is-active' : ''}>Riwayat</button>
      </div>

      <div>
        {reportView === 'pantauan' && <LaporanPage />}
        {reportView === 'ujian'   && <RekapUjianPage />}
        {reportView === 'riwayat' && <RiwayatPage />}
      </div>
    </div>
  );
}
