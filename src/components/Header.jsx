import React, { useState, useEffect, useRef } from 'react';

export default function Header({ 
  activeTab, 
  setActiveTab, 
  searchTerm, 
  setSearchTerm, 
  currentUser, 
  onLogout, 
  onOpenInsert,
  onOpenPdf,
  onOpenEditProfile
}) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const isMentor = currentUser?.role !== 'super_admin' && currentUser?.role !== 'admin';

  // Sliding pill indicator state & refs
  const navRef = useRef(null);
  const tabRefs = useRef({});
  const [pillStyle, setPillStyle] = useState({ left: 0, width: 0 });

  const tabs = [
    { id: 'overview', label: 'Overview (Panduan)' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'students', label: 'Data Mahasiswa' },
    ...(!isMentor ? [{ id: 'classes', label: 'Kelompok' }] : []),
    { id: 'subjects', label: 'Kriteria & Rubrik' }
  ];

  // Update sliding pill position based on active tab offset
  useEffect(() => {
    const updatePill = () => {
      const activeEl = tabRefs.current[activeTab];
      if (activeEl) {
        setPillStyle({
          left: activeEl.offsetLeft,
          width: activeEl.offsetWidth
        });
      }
    };

    updatePill();
    window.addEventListener('resize', updatePill);
    return () => window.removeEventListener('resize', updatePill);
  }, [activeTab, isMentor, currentUser]);

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-white/95 border-b border-slate-200/80 shadow-sm transition-all overflow-x-clip">
      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 h-20 flex items-center justify-between gap-3">
        
        {/* Brand Logo & Title (Left) */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <div 
            onClick={() => setActiveTab('overview')}
            className="flex items-center gap-2 cursor-pointer group whitespace-nowrap"
          >
            <img 
              src="/assets/Logo HRD.png" 
              alt="Logo HRD" 
              className="h-9 sm:h-11 w-auto object-contain group-hover:scale-105 transition-all drop-shadow-sm flex-shrink-0"
            />
            <div>
              <span className="font-coolvetica text-base sm:text-lg lg:text-xl font-bold text-slate-900 tracking-tight block leading-none">
                Rapot Rawat Maba
              </span>
              <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-widest text-[#003CEC] font-sans-code block mt-1">
                Kabinet Pilaraksi
              </span>
            </div>
          </div>
        </div>

        {/* Center Nav Links with Smooth Sliding Pill Animation */}
        <nav 
          ref={navRef}
          className="hidden lg:flex items-center gap-1 bg-slate-100/90 p-1.5 rounded-full border border-slate-200/80 shadow-inner relative flex-shrink-0"
        >
          {/* Sliding Pill Background Element */}
          <div 
            className="absolute top-1.5 bottom-1.5 bg-[#003CEC] rounded-full shadow-md shadow-[#003CEC]/25 transition-all duration-300 ease-out z-0 pointer-events-none"
            style={{
              left: `${pillStyle.left}px`,
              width: `${pillStyle.width}px`
            }}
          />

          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button 
                key={tab.id}
                ref={(el) => (tabRefs.current[tab.id] = el)}
                onClick={() => setActiveTab(tab.id)}
                className={`relative z-10 px-3.5 xl:px-4 py-1.5 rounded-full text-xs font-reddit font-bold whitespace-nowrap transition-colors duration-200 ${
                  isActive 
                    ? 'text-white' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Right Search & User Profile Avatar */}
        <div className="flex items-center gap-2 xl:gap-3 flex-shrink-0">
          
          {/* Quick Search */}
          <div className="relative hidden 2xl:block w-36">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base">
              search
            </span>
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari NRP / Nama..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-full text-xs font-isi text-slate-800 placeholder-slate-400 focus:border-[#003CEC] outline-none shadow-sm transition-all"
            />
          </div>

          {/* User Profile Badge (Fixed Perfect Circle) */}
          <div className="relative flex-shrink-0">
            <div 
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 cursor-pointer group flex-shrink-0"
            >
              <div className="w-10 h-10 min-w-[40px] min-h-[40px] aspect-square rounded-full bg-[#003CEC] text-white flex items-center justify-center font-bold text-xs shadow-md border-2 border-white group-hover:ring-2 group-hover:ring-[#003CEC] transition-all font-sans-code flex-shrink-0">
                {currentUser?.name ? currentUser.name.substring(0, 2).toUpperCase() : 'MB'}
              </div>
            </div>

            {/* Profile Dropdown */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-3 py-2.5 border-b border-slate-100 font-isi">
                  <p className="font-bold text-xs text-slate-900">{currentUser?.name}</p>
                  <p className="text-[10px] text-[#003CEC] font-sans-code font-semibold">
                    {currentUser?.role === 'super_admin' ? 'Super Admin' : 'Mentor'}
                  </p>
                </div>
                
                {/* Edit Profile Button */}
                <button 
                  onClick={() => { setShowProfileMenu(false); onOpenEditProfile(); }}
                  className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 rounded-xl flex items-center gap-2 font-semibold mt-1 font-isi transition-colors"
                >
                  <span className="material-symbols-outlined text-base text-[#003CEC]">manage_accounts</span>
                  <span>Edit Profile</span>
                </button>

                {/* Logout Button */}
                <button 
                  onClick={() => { setShowProfileMenu(false); onLogout(); }}
                  className="w-full text-left px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-2 font-semibold mt-1 font-isi transition-colors"
                >
                  <span className="material-symbols-outlined text-base">logout</span>
                  <span>Keluar (Logout)</span>
                </button>
              </div>
            )}
          </div>

        </div>

      </div>
    </header>
  );
}
