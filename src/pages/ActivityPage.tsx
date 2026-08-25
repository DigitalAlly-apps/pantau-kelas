import { useApp } from '@/context/AppContext';
import { AbsenPage } from './AbsenPage';
import { JurnalPage } from './JurnalPage';

export function ActivityPage() {
  const { activityView, setActivityView } = useApp();

  return (
    <div className="flex flex-col gap-5">
      <div className="page-heading">
        <div>
          <p className="label-upper">Aktivitas harian</p>
          <h1>Absensi & jurnal</h1>
          <p className="page-heading-copy">Catat kehadiran dan perkembangan siswa dari satu tempat.</p>
        </div>
      </div>
      <div className="app-segmented-control" role="tablist" aria-label="Pilih aktivitas">
        <button type="button" role="tab" aria-selected={activityView === 'absen'} onClick={() => setActivityView('absen')} className={activityView === 'absen' ? 'is-active' : ''}>Absensi</button>
        <button type="button" role="tab" aria-selected={activityView === 'jurnal'} onClick={() => setActivityView('jurnal')} className={activityView === 'jurnal' ? 'is-active' : ''}>Jurnal siswa</button>
      </div>
      {activityView === 'absen' ? <AbsenPage /> : <JurnalPage />}
    </div>
  );
}
