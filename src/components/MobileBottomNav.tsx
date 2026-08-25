import { Activity, BarChart3, ChevronLeft, ChevronRight, Cloud, House, Info, PanelsTopLeft, Settings, Users, X } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import type { TabId } from '@/types';
import { InformasiPage } from '@/pages/InformasiPage';

const items: { id: TabId; label: string; icon: typeof House }[] = [
  { id: 'home', label: 'Beranda', icon: House },
  { id: 'aktivitas', label: 'Catat', icon: Activity },
  { id: 'laporan', label: 'Pantauan', icon: BarChart3 },
];

export function MobileBottomNav() {
  const { activeTab, setActiveTab, setActiveStudentId } = useApp();
  const [moreOpen, setMoreOpen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const navigate = (tab: TabId) => {
    setActiveStudentId(null);
    setActiveTab(tab);
    setMoreOpen(false);
    setShowInfo(false);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pointer-events-none lg:hidden">
      <nav className="glass-panel-jurnal mx-auto flex min-h-[72px] max-w-[372px] items-center justify-between rounded-3xl px-2.5 pointer-events-auto overflow-hidden relative">
        {items.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <button key={id} onClick={() => navigate(id)} className={`relative flex min-h-[54px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[11px] font-bold transition-all ${active ? 'text-primary-foreground' : 'text-text-tertiary hover:text-foreground'}`}>
              {active && <span className="absolute inset-1 rounded-2xl bg-gradient-to-br from-primary to-blue shadow-accent" />}
              <Icon className={`relative z-10 h-5 w-5 ${active ? 'scale-110' : 'opacity-75'}`} strokeWidth={active ? 2.7 : 2.2} />
              <span className="relative z-10 whitespace-nowrap">{label}</span>
            </button>
          );
        })}
        <button onClick={() => { setShowInfo(false); setMoreOpen(true); }} className={`relative flex min-h-[54px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[11px] font-bold transition-all ${moreOpen ? 'text-primary-foreground' : 'text-text-tertiary hover:text-foreground'}`}>
          {moreOpen && <span className="absolute inset-1 rounded-2xl bg-gradient-to-br from-primary to-blue shadow-accent" />}
          <PanelsTopLeft className="relative z-10 h-5 w-5 opacity-75" strokeWidth={2.2} />
          <span className="relative z-10 whitespace-nowrap">Lainnya</span>
        </button>
      </nav>

      {moreOpen && <button aria-label="Tutup menu lainnya" onClick={() => setMoreOpen(false)} className="fixed inset-0 -z-10 bg-black/20 backdrop-blur-[1px]" />}
      {moreOpen && (
        <section className="app-bottom-sheet pointer-events-auto absolute bottom-0 left-0 right-0 max-h-[78dvh] overflow-y-auto rounded-3xl p-4 shadow-[0_-18px_52px_rgba(0,0,0,.22)]">
          <div className="app-sheet-handle" />
          {showInfo ? (
            <>
              <div className="mb-3 flex items-center justify-between"><button onClick={() => setShowInfo(false)} className="app-icon-button h-9 w-9"><ChevronLeft className="h-4 w-4" /></button><div className="font-display text-base font-bold">Informasi & Bantuan</div><button onClick={() => setMoreOpen(false)} className="app-icon-button h-9 w-9"><X className="h-4 w-4" /></button></div>
              <InformasiPage />
            </>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between"><div><div className="font-display text-lg font-bold">Lainnya</div><p className="text-[11px] text-text-tertiary">Pengaturan dan data pendukung</p></div><button onClick={() => setMoreOpen(false)} className="app-icon-button h-9 w-9"><X className="h-4 w-4" /></button></div>
              <div className="space-y-1">
                {[{ tab: 'siswa' as TabId, label: 'Data Kelas & Siswa', detail: 'Kelas, daftar siswa, dan profil', icon: Users }, { tab: 'setelan' as TabId, label: 'Setelan', detail: 'Profil, semester, backup, dan tampilan', icon: Settings }, { tab: 'auth' as TabId, label: 'Cloud Sync', detail: 'Akun dan status sinkronisasi', icon: Cloud }].map(({ tab, label, detail, icon: Icon }) => <button key={tab} onClick={() => navigate(tab)} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left hover:bg-accent-light/70"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-[13px] font-bold text-foreground">{label}</span><span className="block text-[10px] text-text-tertiary">{detail}</span></span><ChevronRight className="h-4 w-4 text-text-tertiary" /></button>)}
                <button onClick={() => setShowInfo(true)} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left hover:bg-accent-light/70"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-blue/10 text-blue"><Info className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-[13px] font-bold text-foreground">Informasi & Bantuan</span><span className="block text-[10px] text-text-tertiary">Panduan penggunaan Pantau Kelas</span></span><ChevronRight className="h-4 w-4 text-text-tertiary" /></button>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
