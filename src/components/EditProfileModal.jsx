import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function EditProfileModal({ isOpen, onClose, currentUser, onUpdateUser, showToast }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (currentUser) {
      setUsername(currentUser.username || currentUser.name || '');
      setPassword('');
      setConfirmPassword('');
      setErrorMsg('');
    }
  }, [currentUser, isOpen]);

  if (!isOpen || !currentUser) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    if (!cleanUsername) {
      setErrorMsg('Username tidak boleh kosong');
      return;
    }

    if (cleanPassword && cleanPassword.length < 3) {
      setErrorMsg('Password minimal 3 karakter');
      return;
    }

    if (cleanPassword && cleanPassword !== confirmPassword.trim()) {
      setErrorMsg('Konfirmasi password tidak cocok');
      return;
    }

    setIsLoading(true);

    try {
      const updateData = { username: cleanUsername };
      if (cleanPassword) {
        updateData.password = cleanPassword;
      }

      // Update in Supabase public.profiles table
      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .or(`username.eq.${currentUser.username},name.eq.${currentUser.name}`);

      if (error) {
        console.warn('Supabase profile update warning:', error);
      }

      // Update current user state in App.jsx
      onUpdateUser({
        ...currentUser,
        username: cleanUsername,
        password: cleanPassword || currentUser.password
      });

      if (showToast) {
        showToast('Profil berhasil diperbarui!');
      }

      setIsLoading(false);
      onClose();
    } catch (err) {
      console.error('Error updating profile:', err);
      setErrorMsg('Gagal menyimpan perubahan');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
      
      {/* Modal Card */}
      <div 
        className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200/80 overflow-hidden font-isi relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header with Brand Asset Background */}
        <div className="relative p-6 bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-white border-b border-slate-100 overflow-hidden">
          
          {/* Brand Pattern Background Asset */}
          <div 
            className="absolute inset-0 opacity-15 pointer-events-none bg-repeat bg-contain"
            style={{ backgroundImage: `url('/assets/Pattern Dot.png')` }}
          ></div>

          {/* Decorative Adobe Express / Bintang Asset */}
          <img 
            src="/assets/Adobe Express - file 2.png" 
            alt="Asset 3D" 
            className="absolute -right-3 -bottom-4 w-20 h-auto opacity-30 pointer-events-none rotate-12"
          />

          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white shadow-sm border border-slate-200/80 p-1.5 flex items-center justify-center flex-shrink-0">
                <img 
                  src="/assets/Logo HRD.png" 
                  alt="Logo HRD" 
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h2 className="font-coolvetica font-bold text-xl text-slate-900 tracking-wide">
                  Pengaturan Akun
                </h2>
                <p className="text-xs text-slate-500 font-sans-code">
                  Edit username & password login
                </p>
              </div>
            </div>

            <button 
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/80 hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-all border border-slate-200/60 shadow-sm"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold p-3 rounded-2xl">
              {errorMsg}
            </div>
          )}

          {/* Nama Lengkap (Read-only) */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 font-sans-code">Nama Lengkap</label>
            <input 
              type="text" 
              value={currentUser.name} 
              disabled
              className="w-full px-3.5 py-2.5 bg-slate-100/90 border border-slate-200 rounded-xl text-xs font-medium text-slate-500 cursor-not-allowed"
            />
          </div>

          {/* Username */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 font-sans-code">Username</label>
            <input 
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              required
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-gsm-blue-main focus:ring-2 focus:ring-gsm-blue-main/20 transition-all shadow-sm"
            />
          </div>

          {/* Password Baru */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 font-sans-code">Password Baru</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Kosongkan jika tidak diganti"
                className="w-full pl-3.5 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-gsm-blue-main focus:ring-2 focus:ring-gsm-blue-main/20 transition-all shadow-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-lg">
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
          </div>

          {/* Konfirmasi Password */}
          {password && (
            <div className="space-y-1 animate-in fade-in duration-150">
              <label className="text-xs font-bold text-slate-700 font-sans-code">Ulangi Password</label>
              <input 
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ketik ulang password"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-gsm-blue-main focus:ring-2 focus:ring-gsm-blue-main/20 transition-all shadow-sm"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 rounded-xl bg-gsm-blue-main hover:bg-[#002ec4] text-white text-xs font-bold shadow-md shadow-gsm-blue-main/20 transition-all disabled:opacity-60"
            >
              {isLoading ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>

        </form>
      </div>

    </div>
  );
}
