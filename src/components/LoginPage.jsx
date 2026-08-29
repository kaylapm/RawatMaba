import React, { useState } from 'react';
import { initialClasses } from '../data/mockData';
import { supabase } from '../lib/supabase';
import { updateUserLastLogin } from '../lib/dataService';

// Daftar Kredensial Resmi 34 Mentor & Super Admin
export const MENTOR_ACCOUNTS = {
  webdev: { name: 'Super Administrator HRD', role: 'super_admin', pass: 'kerjarodi', group: null },
  avemaris: { name: 'Avemaris Levanya', role: 'mentor', pass: 'GSM2026Shen', group: 'Lord Shen' },
  althaf: { name: 'Naufal Althaf Rianzi', role: 'mentor', pass: 'GSM2026TaiLung', group: 'Tai Lung' },
  bima: { name: 'Arya Bima Ramadhana', role: 'mentor', pass: 'GSM2026GenKai', group: 'General Kai' },
  reyhan: { name: 'Reyhan Ariq Ramadhan', role: 'mentor', pass: 'GSM2026Chameleon', group: 'The Chameleon' },
  jauza: { name: 'Jauza Nafi\' Ammar', role: 'mentor', pass: 'GSM2026Soothsayer', group: 'Soothsayer' },
  vigo: { name: 'Vigo Bastian Maulana', role: 'mentor', pass: 'GSM2026Crane', group: 'Crane' },
  syahrul: { name: 'Syahrul Ilham Ramadhan', role: 'mentor', pass: 'GSM2026FlyRhino', group: 'Master Flying Rhino' },
  kukuh: { name: 'Kukuh Satrio Wibowo', role: 'mentor', pass: 'GSM2026LiShan', group: 'Li Shan' },
  gedebagus: { name: 'Gede Bagus Gana', role: 'mentor', pass: 'GSM2026ZhenMother', group: 'Zhen\'s Mother' },
  yusuf: { name: 'Yusuf Triandi W', role: 'mentor', pass: 'GSM2026MasterBear', group: 'Master Bear' },
  kharisma: { name: 'Kharisma Putri Salsabila', role: 'mentor', pass: 'GSM2026Han', group: 'Han' },
  nadia: { name: 'Nadia Dwi Ramadani', role: 'mentor', pass: 'GSM2026Scott', group: 'Scott' },
  dimas: { name: 'Dimas Dwi Darmawan', role: 'mentor', pass: 'GSM2026Monkey', group: 'Monkey' },
  belgis: { name: 'Belgis Alfiana Nurotul Qolbi', role: 'mentor', pass: 'GSM2026Zhen', group: 'Zhen' },
  risa: { name: 'Risa Nayandra', role: 'mentor', pass: 'GSM2026ThundRhino', group: 'Master Thundering Rhino' },
  adianto: { name: 'Adianto Baskoro', role: 'mentor', pass: 'GSM2026WolfBoss', group: 'Wolf Boss' },
  adriel: { name: 'Wahyu Adriel Christoval', role: 'mentor', pass: 'GSM2026Bao', group: 'Bao' },
  ilhamrizqi: { name: 'Ilham Rizqi Langit Semesta', role: 'mentor', pass: 'GSM2026MstChicken', group: 'Master Chicken' },
  fauzta: { name: 'Fauzta Athallah Nayottama', role: 'mentor', pass: 'GSM2026Zeng', group: 'Zeng' },
  elvira: { name: 'Elvirasari Latib', role: 'mentor', pass: 'GSM2026Mantis', group: 'Mantis' },
  randy: { name: 'Randy Hazzaputra Riawan', role: 'mentor', pass: 'GSM2026GrannyBoar', group: 'Granny Boar' },
  aisyah: { name: 'Aisyah Ayudya Pramudita Kandi', role: 'mentor', pass: 'GSM2026Tigress', group: 'Tigress' },
  syafirah: { name: 'Syafirah Destiah Dinawati', role: 'mentor', pass: 'GSM2026MrPing', group: 'Mr. Ping' },
  fransiskus: { name: 'Fransiskus Parulian Liwu', role: 'mentor', pass: 'GSM2026MeiMei', group: 'Mei Mei' },
  alfian: { name: 'Alfian Krisna Zakharia', role: 'mentor', pass: 'GSM2026Viper', group: 'Viper' },
  hami: { name: 'Hami Zuida Rizkiyah', role: 'mentor', pass: 'GSM2026MasterCroc', group: 'Master Croc' },
  arfiya: { name: 'Arfiya Zahra Ramadhani', role: 'mentor', pass: 'GSM2026LeiLei', group: 'Lei Lei' },
  davin: { name: 'Akhmad Davin Zufar Ramdani', role: 'mentor', pass: 'GSM2026Sum', group: 'Sum' },
  aditya: { name: 'Aditya Chandra', role: 'mentor', pass: 'GSM2026StormOx', group: 'Master Storming Ox' },
  farhan: { name: 'Muhammad Farhan Firdaus', role: 'mentor', pass: 'GSM2026Po', group: 'Po' },
  karleon: { name: 'Karleon Naufal Dzaki', role: 'mentor', pass: 'GSM2026Porcupine', group: 'Master Porcupine' },
  safratul: { name: 'Safratul Ulyaa Zahari', role: 'mentor', pass: 'GSM2026Dim', group: 'Dim' },
  tiara: { name: 'Tiara Kumala Farid', role: 'mentor', pass: 'GSM2026MasterShifu', group: 'Master Shifu' },
  gahyaka: { name: 'Gahyaka Galur Widyatmana', role: 'mentor', pass: 'GSM2026MasterOogway', group: 'Master Oogway' },
};

export default function LoginPage({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    const cleanInputUser = username.trim();
    const cleanInputPass = password.trim();

    try {
      // 1. Query Supabase (safe select columns that exist in schema)
      const { data: dbProfiles, error: dbErr } = await supabase
        .from('profiles')
        .select('id, name, role, username, password')
        .eq('username', cleanInputUser)
        .limit(2);

      if (!dbErr && dbProfiles && dbProfiles.length > 0) {
        // Strict JavaScript case-sensitive check
        const foundProfile = dbProfiles.find(p => (p.username || '') === cleanInputUser);

        if (foundProfile) {
          const expectedPass = foundProfile.password ? String(foundProfile.password) : null;
          const fallbackData = MENTOR_ACCOUNTS[cleanInputUser];
          const isPasswordCorrect = expectedPass 
            ? (cleanInputPass === expectedPass)
            : (fallbackData ? cleanInputPass === fallbackData.pass : cleanInputPass === '123');

          if (isPasswordCorrect) {
            // Record last_login_at in database
            await updateUserLastLogin({ name: foundProfile.name, username: foundProfile.username });

            const matchingGroup = fallbackData?.group || initialClasses.find(c => (c.mentor || '').toLowerCase() === (foundProfile.name || '').toLowerCase())?.name || null;

            onLoginSuccess({
              id: foundProfile.id || `user-${foundProfile.username}`,
              name: foundProfile.name || foundProfile.username,
              role: foundProfile.role || (foundProfile.username === 'webdev' ? 'super_admin' : 'mentor'),
              username: foundProfile.username,
              group_name: matchingGroup
            });
            setIsLoading(false);
            return;
          } else {
            setErrorMsg('Password salah. Silakan periksa kembali password Anda (case-sensitive).');
            setIsLoading(false);
            return;
          }
        }
      }
    } catch (err) {
      console.warn('Supabase query during login failed, checking fallback:', err);
    }

    // 2. Strict Offline / Hardcoded Fallbacks for all 34 Mentors + Super Admin
    if (MENTOR_ACCOUNTS[cleanInputUser]) {
      const acc = MENTOR_ACCOUNTS[cleanInputUser];
      if (cleanInputPass === acc.pass) {
        onLoginSuccess({
          id: `user-${cleanInputUser}`,
          name: acc.name,
          role: acc.role,
          username: cleanInputUser,
          group_name: acc.group
        });
        setIsLoading(false);
        return;
      } else {
        setErrorMsg('Password salah. Silakan periksa kembali password Anda (case-sensitive).');
        setIsLoading(false);
        return;
      }
    }

    // If account not found (or case does not match exactly)
    setErrorMsg(`Username "${cleanInputUser}" tidak ditemukan. Pastikan huruf besar/kecil (case-sensitive) sudah sesuai.`);
    setIsLoading(false);
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

