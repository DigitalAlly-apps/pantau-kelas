import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { School, User, CheckCircle, ArrowRight } from 'lucide-react';
import { PantauKelasLogo } from './PantauKelasLogo';

export function OnboardingWizard() {
  const { setNamaGuru, addKelas, initialSyncReady, kelasList, namaGuru } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);

  const [inputName, setInputName] = useState('');
  const [inputClass, setInputClass] = useState('');

  useEffect(() => {
    if (!initialSyncReady) return;
    const isDone = localStorage.getItem('jg_onboardingComplete');
    if (isDone || kelasList.length > 0 || namaGuru.trim()) {
      localStorage.setItem('jg_onboardingComplete', 'true');
      setIsOpen(false);
    } else {
      setIsOpen(true);
    }
  }, [initialSyncReady, kelasList.length, namaGuru]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (step === 1 && inputName.trim()) setNamaGuru(inputName.trim());
    if (step === 2 && inputClass.trim()) addKelas(inputClass.trim());
    
    if (step === 3) {
      localStorage.setItem('jg_onboardingComplete', 'true');
      setIsOpen(false);
    } else {
      setStep(s => s + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-surface w-full max-w-sm rounded-2xl shadow-xl overflow-hidden flex flex-col scale-in">
          {/* Header */}
          <div className="p-6 pb-5 flex flex-col items-center text-center bg-accent-light border-b border-border">
             <PantauKelasLogo size={70} showText={false} />
             <h2 className="text-xl font-bold mt-3 text-foreground">Pantau Kelas</h2>
             <p className="text-[13px] text-primary font-semibold mt-1 uppercase tracking-wider">Persiapan Awal</p>
          </div>

          {/* Content */}
          <div className="p-6 bg-surface flex-1 min-h-[220px] flex flex-col justify-center">
             {step === 0 && (
               <div className="text-center flex flex-col items-center">
                 <p className="text-[15px] font-bold text-foreground leading-relaxed">
                   Selamat datang di solusi pencatatan administrasi mengajar yang paling praktis!
                 </p>
                 <p className="text-[14px] text-text-secondary mt-3 leading-relaxed">
                   Mari atur nama Anda dan buat kelas pertama dalam 2 langkah mudah agar aplikasi siap digunakan.
                 </p>
               </div>
             )}

             {step === 1 && (
               <div className="flex flex-col gap-3">
                 <div className="flex items-center gap-2 mb-2">
                   <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center font-bold text-[13px] flex-shrink-0">1</div>
                   <span className="font-bold text-foreground text-[15px]">Profil Guru</span>
                 </div>
                 <label className="text-[13px] font-bold text-text-secondary">Siapa nama Anda?</label>
                 <input 
                   autoFocus
                   value={inputName} 
                   onChange={(e) => setInputName(e.target.value)} 
                   placeholder="Contoh: Pak Budi / Bu Sari"
                   className="input-soft text-[15px] p-3 font-semibold"
                 />
                 <p className="text-[12px] text-text-tertiary mt-1">Nama ini akan digunakan sebagai identitas sapaan di beranda.</p>
               </div>
             )}

             {step === 2 && (
               <div className="flex flex-col gap-3">
                 <div className="flex items-center gap-2 mb-2">
                   <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center font-bold text-[13px] flex-shrink-0">2</div>
                   <span className="font-bold text-foreground text-[15px]">Data Kelas Utama</span>
                 </div>
                 <label className="text-[13px] font-bold text-text-secondary">Atur kelas yang Anda ampu:</label>
                 <input 
                   autoFocus
                   value={inputClass} 
                   onChange={(e) => setInputClass(e.target.value)} 
                   placeholder="Contoh: Kelas 7A / Mapel Fisika 10A"
                   className="input-soft text-[15px] p-3 font-semibold"
                 />
                 <p className="text-[12px] text-text-tertiary mt-1">Anda bisa menambah banyak kelas lain nanti di menu Data Kelas.</p>
               </div>
             )}

             {step === 3 && (
               <div className="text-center flex flex-col items-center gap-3">
                 <div className="w-16 h-16 bg-semantic-green-light rounded-full flex items-center justify-center mb-1">
                   <CheckCircle className="w-8 h-8 text-semantic-green" />
                 </div>
                 <h3 className="font-bold text-xl text-foreground">Selesai Berhasil!</h3>
                 <p className="text-[14px] text-text-secondary leading-relaxed">
                   Profil Anda siap. Silakan klik menu <b className="text-foreground">Data Kelas & Siswa</b> untuk memasukkan daftar nama-nama murid Anda.
                 </p>
                 <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-xl mt-3 flex items-start gap-2 text-left">
                   <span className="text-lg">⚠️</span>
                   <p className="text-[12px] text-yellow-800 leading-relaxed font-medium">
                     Segala data hanya tersimpan <b>di HP Anda.</b> Rutin lakukan <b>Backup (Setelan)</b> sebulan sekali agar data aman jika ganti HP/browser terhapus.
                   </p>
                 </div>
               </div>
             )}
          </div>

          {/* Footer (Actions) */}
          <div className="p-4 bg-bg-2 border-t border-border flex justify-end gap-3">
             {step === 0 && (
               <button onClick={handleNext} className="btn-soft btn-primary-soft w-full text-center justify-center font-bold text-[15px] py-3.5 shadow-md hover:shadow-lg transition-all">
                 Mulai Persiapan <ArrowRight className="w-4 h-4 ml-1" />
               </button>
             )}
             
             {step === 1 && (
               <button 
                 disabled={!inputName.trim()} 
                 onClick={handleNext} 
                 className="btn-soft btn-primary-soft w-full text-center justify-center font-bold text-[15px] py-3.5 shadow-md">
                 Lanjut ke Langkah 2 <ArrowRight className="w-4 h-4 ml-1" />
               </button>
             )}

             {step === 2 && (
               <button 
                 disabled={!inputClass.trim()} 
                 onClick={handleNext} 
                 className="btn-soft btn-primary-soft w-full text-center justify-center font-bold text-[15px] py-3.5 shadow-md">
                 Simpan & Selesai <CheckCircle className="w-4 h-4 ml-2" />
               </button>
             )}

             {step === 3 && (
               <button onClick={handleNext} className="btn-soft w-full text-center justify-center font-bold text-[15px] py-3.5 shadow-lg bg-semantic-green hover:bg-green-600 text-white transition-colors border-none">
                 Masuk ke Beranda
               </button>
             )}
          </div>
      </div>
    </div>
  );
}
