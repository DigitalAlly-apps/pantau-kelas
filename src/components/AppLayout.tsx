import { useApp } from '@/context/AppContext';
import { AppHeader } from './AppHeader';
import { AppSidebar } from './AppSidebar';
import { ToastContainer } from './ToastContainer';
import { SidebarProvider } from '@/components/ui/sidebar';
import { HomePage } from '@/pages/HomePage';
import { SiswaPage } from '@/pages/SiswaPage';
import { SetelanPage } from '@/pages/SetelanPage';
import { LaporanRiwayatPage } from '@/pages/LaporanRiwayatPage';
import { ActivityPage } from '@/pages/ActivityPage';
import AuthPage from '@/pages/AuthPage';
import { MobileBottomNav } from '@/components/MobileBottomNav';

export function AppLayout() {
  const { activeTab } = useApp();

  const renderPage = () => {
    switch (activeTab) {
      case 'home':       return <HomePage />;
      case 'siswa':      return <SiswaPage />;
      case 'aktivitas':  return <ActivityPage />;
      case 'laporan':    return <LaporanRiwayatPage />;
      case 'setelan':    return <SetelanPage />;
      case 'auth':       return <AuthPage />;
      default:           return <HomePage />;
    }
  };

  return (
    <SidebarProvider>
      <div className="app-frame-jurnal flex h-[100dvh] w-full overflow-hidden overscroll-none">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <AppHeader />
          <main className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pb-[calc(104px+env(safe-area-inset-bottom))] pt-3 md:p-6 md:pb-6">
            <div className="mx-auto w-full max-w-7xl">{renderPage()}</div>
          </main>
        </div>
        <MobileBottomNav />
        <ToastContainer />
      </div>
    </SidebarProvider>
  );
}
