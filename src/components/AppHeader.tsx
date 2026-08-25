import { Moon, Sun, Info, RefreshCw } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useDarkMode } from '@/hooks/use-dark-mode';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { InformasiPage } from '@/pages/InformasiPage';
import type { TabId } from '@/types';

const TAB_TITLES: Record<TabId, string> = {
  home:      'Beranda',
  siswa:     'Data Kelas & Siswa',
  aktivitas: 'Aktivitas',
  laporan:   'Buku Induk & Laporan',
  setelan:   'Setelan & Informasi',
  auth:      'Cloud Sync',
};

const HARI = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];

// Fix: tanggal tidak berubah selama sesi — tidak perlu interval
const today = new Date();
const tanggalStr = `${HARI[today.getDay()]}, ${today.getDate()} ${today.toLocaleString('id-ID', { month: 'short' })}`;

export function AppHeader() {
  const { activeTab, kelasList, activeKelas, namaGuru, semester } = useApp();
  const { isDark, toggle: toggleDark } = useDarkMode();
  
  const semLabel = semester.semester === 'ganjil' ? 'Semester 1 (Ganjil)' : 'Semester 2 (Genap)';
  const currentSchedule = semester.semester === 'ganjil' ? semester.ganjil : semester.genap;

  const kelasName = kelasList.find(k => k.id === activeKelas)?.name;
  const firstName = namaGuru ? namaGuru.split(' ')[0] : null;
  const reloadApp = async () => {
    try {
      const registration = await navigator.serviceWorker?.getRegistration();
      await registration?.update();
    } finally {
      window.location.reload();
    }
  };

  return (
    <header className="sticky top-0 z-30 px-4 pt-4 pb-2 lg:static lg:px-6 lg:pt-5">
      <div className="glass-panel-jurnal flex items-center justify-between rounded-3xl px-4 py-3 relative overflow-hidden">
        <div className="pointer-events-none absolute -left-8 -top-10 h-24 w-24 rounded-full bg-primary/15 blur-2xl" />
      <div className="relative z-10 min-w-0">
        <div className="mb-1 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_14px_hsl(var(--accent))]" />
          <span className="text-[10px] font-black uppercase tracking-[.14em] text-text-tertiary">{tanggalStr}</span>
        </div>
        <div className="font-display truncate text-[19px] font-bold leading-none text-foreground">{activeTab === 'home' ? (firstName || 'Pantau Kelas') : TAB_TITLES[activeTab]}</div>
        <div className="mt-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-primary">{kelasName ? `Kelas ${kelasName}` : 'Pantau Kelas'}</div>
      </div>

      <div className="relative z-10 flex shrink-0 items-center gap-2">
        <button onClick={() => void reloadApp()} className="app-icon-button" title="Muat ulang versi terbaru" aria-label="Muat ulang versi terbaru">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>

        {/* Theme toggle */}
        <button onClick={() => toggleDark()} className="app-icon-button" title={isDark ? 'Mode Terang' : 'Mode Gelap'}>
          {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </button>

        {/* Info & Tutorial Toggle */}
        <Sheet>
          <SheetTrigger asChild>
            <button className="app-icon-button" title="Informasi & Bantuan">
              <Info className="w-3.5 h-3.5 text-primary" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[90vw] sm:max-w-md p-0 overflow-y-auto">
            <div className="p-6">
              <SheetHeader className="mb-6 text-left">
                <SheetTitle className="text-lg font-bold">Informasi Sistem</SheetTitle>
              </SheetHeader>

              <div className="space-y-6">
                {/* Semester Summary */}
                <div className="card-soft bg-accent-light/30 border-accent/20">
                  <h4 className="label-upper mb-2">Periode Aktif</h4>
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-bold text-foreground">{semester.tahunAjaran}</p>
                    <p className="text-xs text-text-secondary">{semLabel}</p>
                  </div>
                  
                  {(currentSchedule.utsStart || currentSchedule.uasStart) && (
                    <div className="mt-4 pt-4 border-t border-accent/10 grid grid-cols-2 gap-3">
                      {currentSchedule.utsStart && (
                        <div>
                          <p className="text-[10px] uppercase font-bold text-text-tertiary">Mulai UTS</p>
                          <p className="text-xs font-semibold">{currentSchedule.utsStart}</p>
                        </div>
                      )}
                      {currentSchedule.uasStart && (
                        <div>
                          <p className="text-[10px] uppercase font-bold text-text-tertiary">Mulai UAS</p>
                          <p className="text-xs font-semibold">{currentSchedule.uasStart}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Tutorials */}
                <div className="-mx-6">
                  <div className="px-6 py-2 bg-bg-2 border-y border-border mb-4">
                    <p className="label-upper">Tutorial & Bantuan</p>
                  </div>
                  <InformasiPage />
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
      </div>
    </header>
  );
}
