import React, { useState } from 'react';
import { initialStudents } from '../data/mockData';

export default function LoginPage({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Valid mentor list from database / mockData
  const validMentorNames = Array.from(new Set(initialStudents.map(s => s.mentor)));

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    setTimeout(() => {
      const cleanInputUser = username.trim();
      const cleanInputPass = password.trim();
      const userLower = cleanInputUser.toLowerCase();

      // 1. Super Admin Account Check (webdev / kerjarodi)
      if ((userLower === 'webdev' || userLower === 'superadmin') && cleanInputPass === 'kerjarodi') {
        onLoginSuccess({
          id: 'admin-super-01',
          name: 'Super Admin Webdev',
          role: 'super_admin',
          username: 'webdev',
          mentorGroup: null
        });
        setIsLoading(false);
        return;
      }

      // 3. Mentor Database Check — Check if username exists in Database Mentor List
      const foundMentor = validMentorNames.find(mName => {
        const mLower = mName.toLowerCase();
        const firstWord = mLower.split(' ')[0];
        return mLower === userLower || 
               mLower.includes(userLower) || 
               userLower.includes(firstWord) ||
               userLower.replace(/[^a-z]/g, '').includes(mLower.replace(/[^a-z]/g, ''));
      });

      if (foundMentor) {
        if (cleanInputPass === '123' || cleanInputPass === 'mentor123') {
          onLoginSuccess({
            id: `mentor-${foundMentor.toLowerCase().replace(/\s+/g, '-')}`,
            name: foundMentor,
            role: 'mentor',
            username: foundMentor,
            mentorGroup: null
          });
          setIsLoading(false);
          return;
        } else {
          setErrorMsg('Password salah. Password standar mentor adalah 123.');
          setIsLoading(false);
          return;
        }
      }

      // If user typed random text not registered in database
      setErrorMsg(`Akun "${cleanInputUser}" tidak terdaftar di database Mentor atau Admin. Silakan periksa kembali.`);
      setIsLoading(false);
    }, 400);
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white font-isi text-slate-900 selection:bg-[#003CEC] selection:text-white relative overflow-x-hidden">
      
      {/* LEFT PANEL: Powered by Bg3.png */}
      <div 
        className="w-full lg:w-[55%] p-8 sm:p-14 lg:p-20 flex flex-col justify-center items-center relative overflow-hidden shadow-2xl min-h-[450px] lg:min-h-screen bg-[#3852f6]"
      >
        {/* Background Texture Asset: Bg3.png */}
        <img 
          src="/assets/Bg3.png" 
          alt="Background Visual" 
          className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
        />

        {/* Center Main Graphic Assets */}
        <div className="relative z-20 text-center space-y-8 max-w-xl mx-auto flex flex-col items-center justify-center animate-in fade-in duration-700">
          
          {/* Main Title Graphic: JUDUL.png */}
          <img 
            src="/assets/JUDUL.png" 
            alt="Rapot Rawat Maba" 
            className="w-full max-w-md sm:max-w-lg h-auto object-contain mx-auto drop-shadow-md"
          />

          {/* Sub Title Graphic: subjudul.png */}
          <img 
            src="/assets/subjudul.png" 
            alt="HMSI Tahun 2026 Kabinet Pilaraksi" 
            className="w-full max-w-xs sm:max-w-sm lg:max-w-md h-auto object-contain mx-auto drop-shadow-sm"
          />

        </div>

      </div>

      {/* RIGHT PANEL: Ultra Clean, Elegant & Animated Sign In Form */}
      <div className="w-full lg:w-[45%] bg-white p-8 sm:p-14 lg:p-20 flex flex-col justify-center animate-in fade-in slide-in-from-right-6 duration-700">
        
        <div className="max-w-sm mx-auto w-full space-y-8">
          
          {/* Clean Heading */}
          <div className="space-y-1.5">
            <h2 className="font-serif-judul font-bold text-3xl sm:text-4xl text-slate-900 tracking-tight">
              Selamat Datang
            </h2>
            <p className="text-xs text-slate-500 font-isi">
              Silakan masuk dengan akun Mentor atau Admin terdaftar.
            </p>
          </div>

          {/* Error Alert */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-isi flex items-start gap-2.5 animate-in fade-in duration-300">
              <span className="material-symbols-outlined text-base mt-0.5 flex-shrink-0">error</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-6">
            
            {/* Username Input */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider font-sans-code">
                Username
              </label>
              <input 
                type="text" 
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username..."
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-xs font-isi text-slate-900 placeholder-slate-400 outline-none focus:border-gsm-blue-main focus:ring-2 focus:ring-gsm-blue-main/20 transition-all duration-200 shadow-sm"
              />
            </div>

            {/* Password Input with Show/Hide Eye Toggle Icon */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider font-sans-code">
                Password
              </label>
              <div className="relative flex items-center">
                <input 
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password..."
                  className="w-full px-4 py-3 pr-11 bg-white border border-slate-300 rounded-xl text-xs font-isi text-slate-900 placeholder-slate-400 outline-none focus:border-gsm-blue-main focus:ring-2 focus:ring-gsm-blue-main/20 transition-all duration-200 shadow-sm"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-slate-400 hover:text-slate-700 p-1 flex items-center justify-center transition-colors focus:outline-none"
                  title={showPassword ? "Sembunyikan Password" : "Tampilkan Password"}
                >
                  <span className="material-symbols-outlined text-lg">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Sign In Button */}
            <button 
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl bg-gsm-blue-main hover:bg-[#002ec4] text-white font-bold text-xs shadow-lg shadow-gsm-blue-main/20 transition-all duration-300 font-reddit flex items-center justify-center hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
            >
              <span>{isLoading ? 'Loading...' : 'Sign In'}</span>
            </button>

          </form>

        </div>

      </div>

    </div>
  );
}

