import React, { useState, useEffect, useRef } from 'react';

export default function Header({ 
  activeTab, 
  setActiveTab, 
  currentUser, 
  onLogout, 
  onOpenInsert,
  onOpenPdf,
  onOpenEditProfile
}) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isMentor = currentUser?.role !== 'super_admin' && currentUser?.role !== 'admin';

  // Sliding pill indicator state & refs
  const navRef = useRef(null);
  const tabRefs = useRef({});
  const [pillStyle, setPillStyle] = useState({ left: 0, width: 0 });

  const tabs = [
    { id: 'overview', label: 'Overview (Panduan)', icon: 'info' },
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'students', label: 'Data Mahasiswa', icon: 'school' },
    ...(!isMentor ? [{ id: 'classes', label: 'Kelompok', icon: 'diversity_3' }] : []),
    { id: 'subjects', label: 'Kriteria & Rubrik', icon: 'menu_book' }
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
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-white/95 border-b border-slate-200/80 shadow-sm transition-all">
      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 h-20 flex items-center justify-between gap-3">
        
        {/* Brand Logo & Title (Left) */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <div 
            onClick={() => { setActiveTab('overview'); setIsMobileMenuOpen(false); }}
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

        {/* Center Nav Links with Smooth Sliding Pill Animation (Desktop) */}
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

        {/* Right User Profile Avatar & Mobile Hamburger Toggle */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">

          {/* User Profile Badge (Fixed Perfect Circle) */}
          <div className="relative flex-shrink-0">
            <div 
              onClick={() => { setShowProfileMenu(!showProfileMenu); setIsMobileMenuOpen(false); }}
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
                  <p className="font-bold text-xs text-slate-900 truncate">{currentUser?.name}</p>
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
                  className="w-full text-left px-3 py-2 text-xs text-[#C86047] hover:bg-rose-50 rounded-xl flex items-center gap-2 font-semibold mt-1 font-isi transition-colors"
                >
                  <span className="material-symbols-outlined text-base">logout</span>
                  <span>Keluar (Logout)</span>
                </button>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Menu Toggle (Mobile & Tablet) */}
          <button
            type="button"
            onClick={() => { setIsMobileMenuOpen(!isMobileMenuOpen); setShowProfileMenu(false); }}
            className="lg:hidden p-2 rounded-2xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition-all flex items-center justify-center shadow-sm"
            aria-label="Toggle navigation menu"
          >
            <span className="material-symbols-outlined text-2xl">
              {isMobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>

        </div>

      </div>

      {/* Mobile Drawer / Slide-Down Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-white/95 backdrop-blur-xl border-b border-slate-200 px-4 py-4 space-y-3 animate-in slide-in-from-top-3 duration-200 shadow-xl font-isi">
          
          {/* Nav Tab Items */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl text-xs font-bold transition-all ${
                    isActive 
                      ? 'bg-[#003CEC] text-white shadow-md shadow-[#003CEC]/20' 
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/80'
                  }`}
                >
                  <span className={`material-symbols-outlined text-lg ${isActive ? 'text-white' : 'text-[#003CEC]'}`}>
                    {tab.icon}
                  </span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

    </header>
  );
}
