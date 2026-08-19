import React from 'react';

export default function Footer() {
  return (
    <footer className="w-full bg-white border-t border-gsm-lilac py-5 px-6 sm:px-12 mt-auto font-isi relative z-20">
      <div className="w-full max-w-[1400px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Left Branding */}
        <div className="flex items-center gap-3">
          <img 
            src="/assets/Logo HRD.png" 
            alt="Logo HRD" 
            className="h-8 w-auto object-contain drop-shadow-sm flex-shrink-0" 
          />
          <div>
            <span className="font-coolvetica font-bold text-sm text-slate-900 block leading-none">
              Rapot Rawat Maba
            </span>
            <span className="text-[10px] text-slate-500 font-sans-code mt-0.5 block">
              Departemen Human Resource Development (HRD) • Kabinet Pilaraksi
            </span>
          </div>
        </div>

        {/* Right Copyright Info */}
        <div className="flex items-center gap-2 text-xs text-slate-400 font-sans-code">
          <span>© All Rights Reserved</span>
        </div>

      </div>
    </footer>
  );
}
