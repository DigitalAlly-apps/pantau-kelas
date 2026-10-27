import { useState } from 'react';
import { useSupabase } from '@/context/SupabaseContext';
import { useApp } from '@/context/AppContext';
import { Cloud, ShieldAlert, CheckCircle2, Lock, Smartphone, RefreshCw, LogOut } from 'lucide-react';

// Google icon SVG component
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export default function AuthPage() {
  const { user, profile, isConfigured, signInWithGoogle, signOut, syncState, lastSyncTime, lastSyncError } = useSupabase();
  const { syncWithCloud, showToast } = useApp();
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      showToast(`Gagal masuk: ${error.message}`);
      setLoading(false);
    }
    // Jika berhasil, browser akan redirect ke Google — loading tetap true
  };

  const handleManualSync = async () => {
    setLoading(true);
    await syncWithCloud();
    setLoading(false);
  };

  const handleSignOut = async () => {
    setLoading(true);
    await signOut();
    setLoading(false);
  };

  // ── 1. SUPABASE BELUM DIKONFIGURASI ──────────────────────────────────────────
  if (!isConfigured) {
    return (
      <div className="container max-w-xl mx-auto px-4 py-12 animate-fade-in">
        <div className="bg-surface rounded-2xl shadow-soft border border-amber-200 dark:border-amber-900/50 p-8 text-center space-y-4">
          <div className="inline-flex p-4 bg-amber-50 dark:bg-amber-950/30 rounded-2xl text-amber-500">
            <ShieldAlert size={32} />
          </div>
          <h2 className="text-xl font-bold text-foreground">Cloud Sync Belum Siap</h2>
          <p className="text-sm text-text-secondary">
            Supabase belum terkonfigurasi. Pastikan variabel <code className="px-1.5 py-0.5 bg-bg-2 rounded text-xs font-mono text-amber-600">VITE_SUPABASE_URL</code> dan <code className="px-1.5 py-0.5 bg-bg-2 rounded text-xs font-mono text-amber-600">VITE_SUPABASE_ANON_KEY</code> sudah diisi.
          </p>
        </div>
      </div>
    );
  }

  // ── 2. SUDAH LOGIN ────────────────────────────────────────────────────────────
  if (user) {
    return (
      <div className="container max-w-md mx-auto px-4 py-10 animate-fade-in">
        <div className="bg-surface rounded-2xl shadow-soft border border-indigo-100 dark:border-indigo-950 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-6 text-center text-white">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3 ring-4 ring-white/30">
              <Cloud size={30} className="text-white" />
            </div>
            <h2 className="text-xl font-bold">Cloud Sync Aktif</h2>
            <p className="text-indigo-100 text-sm mt-1">{profile?.nama_guru || user.email}</p>
          </div>

          {/* Status */}
          <div className="p-5 space-y-3">
            <div className="flex justify-between items-center text-sm py-2.5 border-b border-border/40">
              <span className="text-text-secondary">Email Akun</span>
              <span className="font-medium text-foreground truncate max-w-[180px]">{user.email}</span>
            </div>
            <div className="flex justify-between items-center text-sm py-2.5 border-b border-border/40">
              <span className="text-text-secondary">Status</span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                syncState === 'syncing' ? 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400' :
                syncState === 'error'   ? 'bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400' :
                'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  syncState === 'syncing' ? 'bg-blue-500 animate-pulse' :
                  syncState === 'error'   ? 'bg-rose-500' : 'bg-emerald-500'
                }`} />
                {syncState === 'syncing' ? 'Menyinkronkan...' :
                 syncState === 'error'   ? 'Gagal Sinkron' : 'Tersinkronisasi'}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm py-2.5">
              <span className="text-text-secondary">Terakhir Sync</span>
              <span className="font-mono text-xs text-foreground">{lastSyncTime || 'Belum pernah'}</span>
            </div>

            {lastSyncError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-700 dark:text-rose-300 space-y-1">
                <span className="font-semibold block">Detail Error Supabase:</span>
                <span className="font-mono break-all block">{lastSyncError}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="px-5 pb-5 space-y-2.5">
            <button
              onClick={handleManualSync}
              disabled={loading || syncState === 'syncing'}
              className="w-full h-11 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-all active:scale-[0.98]"
            >
              <RefreshCw size={16} className={syncState === 'syncing' ? 'animate-spin' : ''} />
              {syncState === 'syncing' ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}
            </button>
            <button
              onClick={handleSignOut}
              disabled={loading}
              className="w-full h-11 flex items-center justify-center gap-2 border border-border hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-600 hover:text-rose-700 font-semibold rounded-xl transition-all"
            >
              <LogOut size={16} />
              Keluar Akun
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── 3. BELUM LOGIN — Google Sign In ───────────────────────────────────────────
  return (
    <div className="container max-w-4xl mx-auto px-4 py-10 animate-fade-in">
      <div className="grid md:grid-cols-2 gap-8 items-center max-w-3xl mx-auto">

        {/* Kiri: Benefit */}
        <div className="space-y-6 hidden md:block">
          <div className="space-y-2">
            <span className="px-3 py-1 bg-indigo-500/10 text-indigo-500 rounded-full text-xs font-semibold tracking-wider uppercase">Cloud Storage</span>
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground">Satu Jurnal,<br/>Semua Perangkat</h2>
            <p className="text-text-secondary text-sm">Akses data jurnal yang sama dari HP, laptop, atau tablet kapan pun dan di mana pun.</p>
          </div>
          <div className="space-y-4">
            {[
              { icon: <Cloud size={18} />, title: 'Auto Background Sync', desc: 'Data tersinkron otomatis saat ada perubahan.' },
              { icon: <Lock size={18} />, title: 'Aman & Terisolasi', desc: 'Data Anda dilindungi Row Level Security — hanya Anda yang bisa akses.' },
              { icon: <Smartphone size={18} />, title: 'Offline-First', desc: 'Tetap bisa input data tanpa internet. Sync otomatis saat terkoneksi.' },
            ].map((f, i) => (
              <div key={i} className="flex gap-3">
                <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-xl flex-shrink-0 h-fit">{f.icon}</div>
                <div>
                  <h4 className="font-semibold text-foreground text-sm">{f.title}</h4>
                  <p className="text-text-secondary text-xs">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Kanan: Sign In Card */}
        <div>
          <div className="bg-surface rounded-2xl shadow-soft border border-border/50 overflow-hidden">
            {/* Header Card */}
            <div className="p-8 text-center border-b border-border/40">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center mx-auto mb-4">
                <Cloud size={28} className="text-indigo-500" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Masuk ke Cloud Sync</h3>
              <p className="text-text-secondary text-sm mt-1">Gunakan akun Google untuk masuk dengan aman dan cepat.</p>
            </div>

            {/* Google Button */}
            <div className="p-6 space-y-4">
              <button
                id="btn-google-signin"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full h-12 flex items-center justify-center gap-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-700 dark:text-slate-200 shadow-sm transition-all active:scale-[0.98] disabled:opacity-60"
              >
                {loading ? (
                  <RefreshCw size={18} className="animate-spin text-slate-400" />
                ) : (
                  <GoogleIcon className="w-5 h-5" />
                )}
                {loading ? 'Menghubungkan...' : 'Lanjutkan dengan Google'}
              </button>

              <div className="flex items-center gap-2 text-xs text-text-tertiary">
                <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0" />
                <span>Tidak perlu password — cukup akun Google Anda</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-text-tertiary">
                <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0" />
                <span>Data lokal Anda aman dan tidak akan terhapus saat login</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
