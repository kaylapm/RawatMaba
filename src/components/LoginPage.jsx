import React, { useState } from 'react';
import { initialClasses } from '../data/mockData';
import { supabase } from '../lib/supabase';
import { updateUserLastLogin } from '../lib/dataService';

// Daftar Kredensial Resmi 34 Mentor & Super Admin
export const MENTOR_ACCOUNTS = {
  webdev: { name: 'HRD HMSI Pilar Aksi', role: 'super_admin', pass: 'kerjarodi', group: null },
  naufal: { name: 'Muhammad Naufal Akmal Ali Fanri', role: 'mentor', pass: 'LiShan123', group: 'Li Shan' },
  fauzta: { name: 'Fauzta Athallah Nayottama', role: 'mentor', pass: 'Zeng123', group: 'Zeng' },
  elvira: { name: 'Elvirasari Latib', role: 'mentor', pass: 'Mantis123', group: 'Mantis' },
  refa: { name: 'Refa Thalita Ardila', role: 'mentor', pass: 'Crane123', group: 'Crane' },
  alberto: { name: 'Alberto Marcelo Payong Dahe Belolu', role: 'mentor', pass: 'TheSoothsayer123', group: 'The Soothsayer' },
  safratul: { name: 'Safratul Ulyaa Zahari', role: 'mentor', pass: 'Dim123', group: 'Dim' },
  farhan: { name: 'Muhammad Farhan Firdaus', role: 'mentor', pass: 'Po123', group: 'Po' },
  veronica: { name: 'Veronica Ega Putri Habibie', role: 'mentor', pass: 'MasterBear123', group: 'Master Bear' },
  aisyah: { name: 'Aisyah Ayudya Pramudita Kandi', role: 'mentor', pass: 'Tigress123', group: 'Tigress' },
  belgis: { name: 'Belgis Alfiana Nurotul Qolbi', role: 'mentor', pass: 'Zhen123', group: 'Zhen' },
  kezia: { name: 'Kezia Davina Hagata Barus', role: 'mentor', pass: 'Han123', group: 'Han' },
  fatih: { name: 'Fatih Athaillah Nugroho', role: 'mentor', pass: 'Kai123', group: 'Kai' },
  mazen: { name: 'Muhammad Mazen Ibrahim', role: 'mentor', pass: 'TaiLung123', group: 'Tai Lung' },
  fransiskus: { name: 'Fransiskus Parulian Liwu', role: 'mentor', pass: 'MeiMei123', group: 'Mei Mei' },
  nadia: { name: 'Nadia Dwi Ramadani', role: 'mentor', pass: 'Scott123', group: 'Scott' },
  privthy: { name: 'Privthy Destriana Leoly Messi', role: 'mentor', pass: 'CaptainFish123', group: 'Captain Fish' },
  farrel: { name: 'Farrel Danish Virdiansyah', role: 'mentor', pass: 'Vachir123', group: 'Commander Vachir' },
  ilhamrizqi: { name: 'Ilham Rizqi Langit Semesta', role: 'mentor', pass: 'MasterChicken123', group: 'Master Chicken' },
  arfiya: { name: 'Arfiya Zahra Ramadhani', role: 'mentor', pass: 'LeiLei123', group: 'Lei Lei' },
  adriel: { name: 'Wahyu Adriel Christoval', role: 'mentor', pass: 'Bao123', group: 'Bao' },
  gahyaka: { name: 'Gahyaka Galur Widyatmana', role: 'mentor', pass: 'MasterOogway123', group: 'Master Oogway' },
  davin: { name: 'Akhmad Davin Zufar Ramdani', role: 'mentor', pass: 'Sum123', group: 'Sum' },
  aditya: { name: 'Aditya Chandra', role: 'mentor', pass: 'StormOx123', group: 'Master Storming Ox' },
  tiara: { name: 'Tiara Kumala Farid', role: 'mentor', pass: 'MasterShifu123', group: 'Master Shifu' },
  dimas: { name: 'Dimas Dwi Darmawan', role: 'mentor', pass: 'Monkey123', group: 'Monkey' },
  risa: { name: 'Risa Nayandra', role: 'mentor', pass: 'ThundRhino123', group: 'Master Thundering Rhino' },
  alfian: { name: 'Alfian Krisna Zakharia', role: 'mentor', pass: 'Viper123', group: 'Viper' },
  syamfiraas: { name: 'Muhammad Syamfiraas Akbar', role: 'mentor', pass: 'Chameleon123', group: 'The Chameleon' },
  hami: { name: 'Hami Zuida Rizkiyah', role: 'mentor', pass: 'MasterCroc123', group: 'Master Croc' },
  syafirah: { name: 'Syafirah Destiah Dinawati', role: 'mentor', pass: 'MrPing123', group: 'Mr. Ping' },
  avemaris: { name: 'Avemaris Levanya', role: 'mentor', pass: 'Shen123', group: 'Lord Shen' },
  randy: { name: 'Randy Hazzaputra Riawan', role: 'mentor', pass: 'GrannyBoar123', group: 'Granny Boar' },
  karleon: { name: 'Karleon Naufal Dzaki', role: 'mentor', pass: 'Porcupine123', group: 'Master Porcupine' },
  adianto: { name: 'Adianto Baskoro', role: 'mentor', pass: 'WolfBoss123', group: 'Wolf Boss' },
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

