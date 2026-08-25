import {
  LayoutDashboard,
  Activity,
  BarChart3,
  Users,
  Settings,
  Cloud,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import type { TabId } from '@/types';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { PantauKelasLogo } from '@/components/PantauKelasLogo';

const NAV_ITEMS: { id: TabId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'home',      label: 'Beranda',          icon: LayoutDashboard },
  { id: 'aktivitas', label: 'Absensi & Jurnal', icon: Activity },
  { id: 'laporan',   label: 'Pantauan & Laporan', icon: BarChart3 },
];

export function AppSidebar() {
  const { activeTab, setActiveTab, setActiveStudentId, kelasList, activeKelas, setActiveKelas } = useApp();
  const { state, setOpenMobile } = useSidebar();
  const collapsed = state === 'collapsed';

  const handleNav = (tab: TabId) => {
    setActiveTab(tab);
    setOpenMobile(false);
    // Reset student detail view whenever navigating (including away from siswa)
    setActiveStudentId(null);
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border/60 bg-surface/60 backdrop-blur-xl">
      <SidebarContent>
        <div className="flex items-center justify-center border-b border-sidebar-border/60 py-6 px-3">
          {collapsed ? (
            <PantauKelasLogo size={32} showText={false} />
          ) : (
            <PantauKelasLogo size={112} showText={true} className="my-1" />
          )}
        </div>

        {!collapsed && kelasList.length > 0 && (
          <div className="px-3 pt-3">
            <label className="label-upper block mb-1.5 px-1">Kelas Aktif</label>
            <select value={activeKelas} onChange={e => setActiveKelas(e.target.value)}
              className="input-soft w-full px-3 py-2 text-sm text-foreground outline-none transition-colors">
              {kelasList.map(k => (
                <option key={k.id} value={k.id}>Kelas {k.name}</option>
              ))}
            </select>
          </div>
        )}

        {!collapsed && kelasList.length === 0 && (
          <div className="px-4 pt-3">
            <p className="text-[11px] text-text-tertiary italic">Belum ada kelas. Tambahkan di menu Data Siswa.</p>
          </div>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map(item => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton onClick={() => handleNav(item.id)} isActive={activeTab === item.id} tooltip={item.label}>
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => handleNav('siswa')} isActive={activeTab === 'siswa'} tooltip="Data Kelas & Siswa">
              <Users className="w-4 h-4" />
              <span>Data Kelas & Siswa</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => handleNav('setelan')} isActive={activeTab === 'setelan'} tooltip="Setelan">
              <Settings className="w-4 h-4" />
              <span>Setelan</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => handleNav('auth')} isActive={activeTab === 'auth'} tooltip="Cloud Sync">
              <Cloud className="w-4 h-4" />
              <span>Cloud Sync</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
