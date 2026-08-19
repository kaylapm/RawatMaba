import React, { useEffect, useState, useRef } from 'react';

export default function OverviewGuideView({ onOpenInsert, onOpenPdf, onOpenBatch, setActiveTab }) {
  const [scrollY, setScrollY] = useState(0);
  const [isSection2Visible, setIsSection2Visible] = useState(false);
  const [visibleCards, setVisibleCards] = useState([false, false, false, false]);
  
  const gridRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Observe the section 2 header
  useEffect(() => {
    const target = document.getElementById('alur-panduan-section');
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsSection2Visible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  // Single observer on the card grid container — toggle ALL cards on scroll in/out
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Stagger reveal on scroll down into view
          [0, 1, 2, 3].forEach(i => {
            setTimeout(() => {
              setVisibleCards(prev => {
                const next = [...prev];
                next[i] = true;
                return next;
              });
            }, i * 120);
          });
        } else {
          // Immediately hide all when scrolled out (up or down)
          setVisibleCards([false, false, false, false]);
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Calculate hero opacity fade on scroll
  const heroOpacity = Math.max(0, 1 - scrollY / 600);
  const heroScale = Math.max(0.95, 1 - scrollY / 5000);
  const heroTranslateY = scrollY * 0.35;

  return (
    <div className="w-full flex flex-col font-isi selection:bg-[#003CEC] selection:text-white overflow-x-hidden">
      
      {/* SECTION 1: Full-Screen Hero with BG1.png */}
      <section className="w-full relative bg-[url('/assets/BG1.png')] bg-cover bg-center bg-no-repeat min-h-[calc(100vh-5rem)] flex items-center justify-center">
        
        {/* Parallax Ambient Glow */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-to-r from-[#003CEC]/15 via-sky-400/15 to-purple-500/15 blur-3xl rounded-full pointer-events-none z-0 transition-transform duration-300 ease-out"
          style={{ transform: `translate(-50%, calc(-50% + ${scrollY * 0.12}px))` }}
        ></div>

        {/* Hero Content — parallax fade out on scroll */}
        <div 
          className="relative z-10 max-w-4xl mx-auto text-center space-y-6 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 transition-all duration-200 ease-out will-change-transform"
          style={{ 
            opacity: heroOpacity, 
            transform: `translateY(${heroTranslateY}px) scale(${heroScale})` 
          }}
        >
          
          {/* Main Title Graphics */}
          <div className="space-y-4 flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-700">
            <img 
              src="/assets/JUDUL2.svg" 
              alt="Panduan & Overview Rapot Rawat Maba" 
              className="w-full max-w-md sm:max-w-lg lg:max-w-2xl h-auto object-contain mx-auto drop-shadow-md transition-all duration-300 hover:scale-[1.01]"
            />
            {/* Sub judul 2 enlarged as requested */}
            <img 
              src="/assets/sub judul2.png" 
              alt="HMSI Tahun 2026 Kabinet Pilaraksi Subjudul" 
              className="h-14 sm:h-20 lg:h-24 w-auto object-contain mx-auto drop-shadow-md transition-all duration-300 hover:scale-[1.03]"
            />
          </div>

          {/* Description Text Badge */}
          <div className="bg-white/90 backdrop-blur-md px-7 sm:px-9 py-3.5 rounded-full border border-blue-100/90 shadow-md max-w-2xl mx-auto animate-in slide-in-from-bottom-4 duration-700 delay-200">
            <p className="text-xs sm:text-sm font-semibold text-slate-700 leading-relaxed tracking-wide font-isi">
              Wadah resmi pengisian nilai rapot, evaluasi kelompok, dan penerbitan rapot digital Mahasiswa Baru HMSI Tahun 2026.
            </p>
          </div>

        </div>
      </section>

      {/* SOFT BLUR GRADIENT DISSOLVE BETWEEN SECTION 1 & SECTION 2 */}
      <div className="w-full h-20 -mt-10 -mb-10 relative z-20 pointer-events-none bg-gradient-to-b from-transparent via-white/80 to-white backdrop-blur-[3px]"></div>

      {/* SECTION 2: Step by Step Guide Section with BG2.svg */}
      <section 
        id="alur-panduan-section" 
        className="w-full relative bg-[url('/assets/BG2.svg')] bg-cover bg-top bg-no-repeat pt-14 sm:pt-20 pb-24 px-4 sm:px-6 lg:px-8 bg-white overflow-x-hidden"
      >
        
        <div className="max-w-6xl mx-auto space-y-10 relative z-10">
          
          {/* Section Header */}
          <div 
            className={`flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-slate-200/80 transition-all duration-700 ease-out transform ${
              isSection2Visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <div className="space-y-1">
              <span className="text-xs font-extrabold uppercase tracking-widest text-[#003CEC] font-sans-code block">
                Panduan Penggunaan
              </span>
              <h2 className="font-serif-judul font-bold text-2xl sm:text-3xl text-slate-900 tracking-tight">
                Alur Ringkas Pengisian Rapot
              </h2>
            </div>
            <button 
              onClick={() => setActiveTab('dashboard')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#003CEC] hover:text-blue-800 font-reddit transition-all group bg-white hover:bg-slate-50 border border-slate-200 px-4 py-2 rounded-full shadow-sm"
            >
              <span>Buka Dashboard Rekap</span>
              <span className="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </button>
          </div>

          {/* 4 Step Cards — Updated with 4 Pillars Rubrik */}
          <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Step 1 */}
            <div 
              onClick={() => setActiveTab('students')}
              className="relative p-6 rounded-3xl cursor-pointer group flex flex-col justify-between min-h-[230px] overflow-hidden bg-white border border-gsm-lilac shadow-gsm-card hover:-translate-y-2 hover:shadow-gsm-hover transition-all duration-300"
              style={{
                opacity: visibleCards[0] ? 1 : 0,
                transform: visibleCards[0] ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.95)',
                transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0ms'
              }}
            >
              <div className="absolute top-4 right-5 z-10">
                <span className="font-sans-code font-extrabold text-3xl leading-none text-[#003CEC]">
                  01
                </span>
              </div>
              <img 
                src="/assets/Adobe Express - file 2.png"
                alt="Decorative Element"
                className="absolute bottom-1 right-2 w-14 h-auto object-contain opacity-40 pointer-events-none z-0 rotate-12 group-hover:scale-110 group-hover:rotate-6 group-hover:opacity-75 transition-all duration-300"
              />
              <div className="relative z-10 space-y-3 pt-2 pr-10">
                <h3 className="font-bold text-base text-slate-900 tracking-tight leading-snug group-hover:text-[#003CEC] transition-colors">
                  Pilih Mahasiswa Mentee
                </h3>
                <p className="text-xs text-slate-600 font-isi leading-relaxed">
                  Cari dan pilih mentee kelompok Anda berdasarkan NRP atau nama di daftar Mahasiswa.
                </p>
              </div>
              <div className="relative z-10 pt-4">
                <div className="inline-flex items-center gap-1.5 bg-slate-50 group-hover:bg-[#003CEC] border border-slate-200/80 rounded-full px-3.5 py-1.5 shadow-sm transition-all duration-300">
                  <span className="text-[11px] font-bold text-[#003CEC] group-hover:text-white transition-colors">Daftar Mahasiswa</span>
                  <span className="material-symbols-outlined text-xs text-[#003CEC] group-hover:text-white group-hover:translate-x-1 transition-all">arrow_forward</span>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div 
              onClick={onOpenInsert}
              className="relative p-6 rounded-3xl cursor-pointer group flex flex-col justify-between min-h-[230px] overflow-hidden bg-white border border-gsm-lilac shadow-gsm-card hover:-translate-y-2 hover:shadow-gsm-hover transition-all duration-300"
              style={{
                opacity: visibleCards[1] ? 1 : 0,
                transform: visibleCards[1] ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.95)',
                transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1) 120ms'
              }}
            >
              <div className="absolute top-4 right-5 z-10">
                <span className="font-sans-code font-extrabold text-3xl leading-none text-[#00B0D8]">
                  02
                </span>
              </div>
              <img 
                src="/assets/Adobe Express - file 2.png"
                alt="Decorative Element"
                className="absolute bottom-1 right-2 w-14 h-auto object-contain opacity-40 pointer-events-none z-0 rotate-12 group-hover:scale-110 group-hover:rotate-6 group-hover:opacity-75 transition-all duration-300"
              />
              <div className="relative z-10 space-y-3 pt-2 pr-10">
                <h3 className="font-bold text-base text-slate-900 tracking-tight leading-snug group-hover:text-[#003CEC] transition-colors">
                  Input Skor 4 Pilar Rubrik
                </h3>
                <p className="text-xs text-slate-600 font-isi leading-relaxed">
                  Isi skor 1–5 objektif pada 17 Indikator (CV & Portofolio, LinkedIn, Interview, dan Sikap).
                </p>
              </div>
              <div className="relative z-10 pt-4">
                <div className="inline-flex items-center gap-1.5 bg-slate-50 group-hover:bg-[#003CEC] border border-slate-200/80 rounded-full px-3.5 py-1.5 shadow-sm transition-all duration-300">
                  <span className="text-[11px] font-bold text-[#003CEC] group-hover:text-white transition-colors">Form Input Nilai</span>
                  <span className="material-symbols-outlined text-xs text-[#003CEC] group-hover:text-white group-hover:translate-x-1 transition-all">arrow_forward</span>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div 
              onClick={() => setActiveTab('dashboard')}
              className="relative p-6 rounded-3xl cursor-pointer group flex flex-col justify-between min-h-[230px] overflow-hidden bg-white border border-gsm-lilac shadow-gsm-card hover:-translate-y-2 hover:shadow-gsm-hover transition-all duration-300"
              style={{
                opacity: visibleCards[2] ? 1 : 0,
                transform: visibleCards[2] ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.95)',
                transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1) 240ms'
              }}
            >
              <div className="absolute top-4 right-5 z-10">
                <span className="font-sans-code font-extrabold text-3xl leading-none text-[#C896E0]">
                  03
                </span>
              </div>
              <img 
                src="/assets/Adobe Express - file 2.png"
                alt="Decorative Element"
                className="absolute bottom-1 right-2 w-14 h-auto object-contain opacity-40 pointer-events-none z-0 rotate-12 group-hover:scale-110 group-hover:rotate-6 group-hover:opacity-75 transition-all duration-300"
              />
              <div className="relative z-10 space-y-3 pt-2 pr-10">
                <h3 className="font-bold text-base text-slate-900 tracking-tight leading-snug group-hover:text-[#003CEC] transition-colors">
                  Evaluasi Rekapitulasi Rapot
                </h3>
                <p className="text-xs text-slate-600 font-isi leading-relaxed">
                  Tinjau kalkulasi Final Score (0–100), predikat kelulusan, dan berikan catatan evaluasi mentor.
                </p>
              </div>
              <div className="relative z-10 pt-4">
                <div className="inline-flex items-center gap-1.5 bg-slate-50 group-hover:bg-[#003CEC] border border-slate-200/80 rounded-full px-3.5 py-1.5 shadow-sm transition-all duration-300">
                  <span className="text-[11px] font-bold text-[#003CEC] group-hover:text-white transition-colors">Dashboard Rekap</span>
                  <span className="material-symbols-outlined text-xs text-[#003CEC] group-hover:text-white group-hover:translate-x-1 transition-all">arrow_forward</span>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div 
              onClick={onOpenPdf}
              className="relative p-6 rounded-3xl cursor-pointer group flex flex-col justify-between min-h-[230px] overflow-hidden bg-white border border-gsm-lilac shadow-gsm-card hover:-translate-y-2 hover:shadow-gsm-hover transition-all duration-300"
              style={{
                opacity: visibleCards[3] ? 1 : 0,
                transform: visibleCards[3] ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.95)',
                transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1) 360ms'
              }}
            >
              <div className="absolute top-4 right-5 z-10">
                <span className="font-sans-code font-extrabold text-3xl leading-none text-[#E59B86]">
                  04
                </span>
              </div>
              <img 
                src="/assets/Adobe Express - file 2.png"
                alt="Decorative Element"
                className="absolute bottom-1 right-2 w-14 h-auto object-contain opacity-40 pointer-events-none z-0 rotate-12 group-hover:scale-110 group-hover:rotate-6 group-hover:opacity-75 transition-all duration-300"
              />
              <div className="relative z-10 space-y-3 pt-2 pr-10">
                <h3 className="font-bold text-base text-slate-900 tracking-tight leading-snug group-hover:text-[#003CEC] transition-colors">
                  Simpan & Cetak Rapot PDF
                </h3>
                <p className="text-xs text-slate-600 font-isi leading-relaxed">
                  Simpan nilai ke database resmi dan terbitkan lembar rapot digital resmi format PDF.
                </p>
              </div>
              <div className="relative z-10 pt-4">
                <div className="inline-flex items-center gap-1.5 bg-slate-50 group-hover:bg-[#003CEC] border border-slate-200/80 rounded-full px-3.5 py-1.5 shadow-sm transition-all duration-300">
                  <span className="text-[11px] font-bold text-[#003CEC] group-hover:text-white transition-colors">Preview Rapot PDF</span>
                  <span className="material-symbols-outlined text-xs text-[#003CEC] group-hover:text-white group-hover:translate-x-1 transition-all">arrow_forward</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

    </div>
  );
}
