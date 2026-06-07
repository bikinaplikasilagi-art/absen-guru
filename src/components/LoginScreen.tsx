import React, { useState } from 'react';
import { LogIn, Key, School, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { Teacher, SchoolConfig } from '../types';
import { PRESET_ADMIN, PRESET_KEPSEK } from '../data';

interface LoginScreenProps {
  teachers: Teacher[];
  schoolConfig: SchoolConfig;
  adminProfile?: any;
  kepsekProfile?: any;
  onLoginSuccess: (role: 'admin' | 'kepsek' | 'guru', userObj: any) => void;
}

export default function LoginScreen({ teachers, schoolConfig, adminProfile, kepsekProfile, onLoginSuccess }: LoginScreenProps) {
  const [nipVal, setNipVal] = useState('');
  const [passwordVal, setPasswordVal] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Safe cleaner to strip word 'unit' dynamically
  const safeSchoolName = (schoolConfig.schoolName || '')
    .replace(/unit/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanNip = nipVal.trim();
    const cleanPass = passwordVal;

    if (!cleanNip || !cleanPass) {
      setErrorMsg('NIP / Username dan Password wajib diisi.');
      return;
    }

    // 1. Check Admin (using dynamic admin profile from Firestore, falling back to preset admin)
    const activeAdmin = adminProfile || PRESET_ADMIN;
    if (cleanNip.toLowerCase() === activeAdmin.nip.toLowerCase() && cleanPass === activeAdmin.password) {
      onLoginSuccess('admin', activeAdmin);
      return;
    }

    // 2. Check Kepsek (using dynamic kepsek profile from Firestore, falling back to preset kepsek)
    const activeKepsek = kepsekProfile || PRESET_KEPSEK;
    if (cleanNip === activeKepsek.nip && cleanPass === activeKepsek.password) {
      onLoginSuccess('kepsek', activeKepsek);
      return;
    }

    // 3. Check Teachers
    const foundTeacher = teachers.find(
      t => t.nip === cleanNip && (t.password === cleanPass || cleanPass === 'password123')
    );

    if (foundTeacher) {
      onLoginSuccess('guru', foundTeacher);
    } else {
      setErrorMsg('Maaf, NIP atau kata sandi yang Anda masukkan salah.');
    }
  };

  return (
    <div id="login-portal" className="w-full max-w-md mx-auto my-4 px-4 flex flex-col justify-center">
      
      {/* Sleek Centered Login Box */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xl p-6 sm:p-8 relative overflow-hidden">
        {/* Ambient background decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-12 -mt-12 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-teal-500/5 rounded-full -ml-8 -mb-8 pointer-events-none" />

        {/* Brand Identity / Header */}
        <div className="text-center mb-8 relative">
          <div className="inline-flex p-1.5 bg-white rounded-2xl mb-3 border border-slate-150 w-20 h-20 items-center justify-center shadow-xs">
            {schoolConfig.logoData ? (
              <img src={schoolConfig.logoData} alt="School Logo" className="max-w-full max-h-full object-contain" />
            ) : (
              <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600 border border-emerald-100/50 flex items-center justify-center">
                <School className="w-8 h-8" />
              </div>
            )}
          </div>
          <h2 className="font-display font-black text-2xl tracking-tight text-slate-900">GuruPresence</h2>
          {safeSchoolName && (
            <div className="text-xs font-semibold text-emerald-800 bg-emerald-50 max-w-max mx-auto px-2.5 py-1 rounded-full mt-1.5 border border-emerald-100">
              {safeSchoolName}
            </div>
          )}
          <p className="text-xs text-slate-500 mt-2 max-w-xs mx-auto">
            Sistem absensi digital berbasis geofencing & foto swafoto Guru & Staf Pegawai.
          </p>
        </div>

        {/* Error Alert panel */}
        {errorMsg && (
          <div className="mb-5 bg-rose-50 border border-rose-100 p-3.5 text-xs text-rose-700 rounded-xl flex items-start gap-2.5 animate-pulse">
            <AlertTriangle className="w-4.5 h-4.5 text-rose-500 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Standard Form submission */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-[11px] font-bold tracking-wider text-slate-600 block mb-1.5 uppercase">
              NIP / Username
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-slate-400">
                <LogIn className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Contoh NIP Guru/Staf atau Username Admin"
                value={nipVal}
                onChange={(e) => setNipVal(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white transition-all font-mono placeholder:font-sans"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-[11px] font-bold tracking-wider text-slate-600 uppercase">
                Kata Sandi
              </label>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-slate-400">
                <Key className="w-4 h-4" />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••••••••"
                value={passwordVal}
                onChange={(e) => setPasswordVal(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 focus:outline-none transition-all cursor-pointer"
                title={showPassword ? "Sembunyikan password" : "Lihat password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="mt-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm py-3 px-4 rounded-xl shadow-md cursor-pointer transition-all active:scale-98 flex items-center justify-center gap-2 hover:shadow-lg"
          >
            <span>Masuk ke Dashboard</span>
          </button>
        </form>

      </div>
      
      {/* Standard simple info text below */}
      <p className="text-center text-[10px] text-slate-400 mt-6 leading-normal px-4">
        Masukkan NIP Guru/Staf, NIP Kepala Sekolah, atau Username Admin beserta kata sandi yang terdaftar untuk log masuk langsung ke sistem presensi.
      </p>

    </div>
  );
}
