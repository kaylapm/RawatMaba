import React, { useState, useEffect, useRef } from 'react';
import { PILLARS, SCALE_GUIDE } from './InsertGradesModal';

export default function SubjectsView() {
  const [selectedPillarId, setSelectedPillarId] = useState('ALL');
  const [openRubrikKeys, setOpenRubrikKeys] = useState({});

  // ═══════════════════════════════════════════════════════════════
  // SCROLL REVEAL OBSERVERS
  // ═══════════════════════════════════════════════════════════════
  const [visiblePillars, setVisiblePillars] = useState({});
  const [isGuideVisible, setIsGuideVisible] = useState(false);

  const pillarsContainerRef = useRef(null);
  const guideRef = useRef(null);

  useEffect(() => {
    // Observer for bottom guide
    if (guideRef.current) {
      const gObs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsGuideVisible(true);
          }
        },
        { threshold: 0.1 }
      );
      gObs.observe(guideRef.current);
      return () => gObs.disconnect();
    }
  }, []);

  useEffect(() => {
    // Reset and reveal pillars when selection changes or on scroll
    PILLARS.forEach((p, idx) => {
      setTimeout(() => {
        setVisiblePillars(prev => ({ ...prev, [p.id]: true }));
      }, idx * 100);
    });
  }, [selectedPillarId]);

  const toggleRubrik = (key) => {
    setOpenRubrikKeys(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const displayedPillars = selectedPillarId === 'ALL'
    ? PILLARS
    : PILLARS.filter(p => p.id === selectedPillarId);

  const totalBobotAll = PILLARS.reduce((acc, p) => acc + p.bobot, 0);
  const totalIndicatorsAll = PILLARS.reduce((acc, p) => acc + p.indicators.length, 0);

  return (
    <div className="space-y-8 font-isi relative z-10 w-full">
      
      {/* ═══ 1. Academic Header Banner (GSM Standard) ═══ */}
      <div className="relative bg-white p-6 sm:p-8 rounded-3xl shadow-gsm-card border border-gsm-lilac flex flex-wrap items-center justify-between gap-6 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
        
        {/* Watermark BG4.svg */}
        <div 
          className="absolute inset-0 bg-[url('/assets/BG4.svg')] bg-cover bg-center opacity-[0.06] pointer-events-none z-0"
        />

        <div className="relative z-10 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gsm-blue-gradient text-white flex items-center justify-center shadow-md shadow-gsm-blue-main/20 flex-shrink-0">
            <span className="material-symbols-outlined text-3xl">menu_book</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-gsm-cream text-slate-950 font-sans-code font-bold text-[10px] uppercase tracking-wider px-3 py-0.5 rounded-full border border-yellow-200">
                Kurikulum Rubrik Penilaian
              </span>
              <span className="text-xs text-slate-400 font-sans-code font-bold">Departemen HRD</span>
            </div>
            <h1 className="font-coolvetica font-bold text-2xl text-slate-900 mt-1">
              Kriteria & Rubrik Penilaian Rapot Mentoring
            </h1>
            <p className="text-xs text-slate-500 font-isi mt-0.5">
              Standar 4 Pilar Utama, 17 Indikator Penilaian, dan Skala Skor 1–5 Berbasis Kompetensi
            </p>
          </div>
        </div>

        {/* Global Summary Badge */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="bg-blue-50 border border-gsm-lilac px-4 py-2.5 rounded-2xl text-center shadow-sm">
            <span className="text-[10px] font-sans-code text-slate-500 uppercase font-bold block">Total Bobot</span>
            <span className="font-coolvetica font-bold text-xl text-gsm-blue-main">{totalBobotAll} Poin</span>
          </div>
          <div className="bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl text-center shadow-sm">
            <span className="text-[10px] font-sans-code text-slate-500 uppercase font-bold block">Indikator</span>
            <span className="font-coolvetica font-bold text-xl text-slate-800">{totalIndicatorsAll} Butir</span>
          </div>
        </div>
      </div>

      {/* ═══ Quick Pillar Selector Tabs (GSM Palette with Hidden Scrollbar) ═══ */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => setSelectedPillarId('ALL')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-bold font-isi transition-all flex items-center gap-2 border whitespace-nowrap ${
            selectedPillarId === 'ALL'
              ? 'bg-gsm-blue-main text-white border-gsm-blue-main shadow-md shadow-gsm-blue-main/20'
              : 'bg-white text-slate-700 border-gsm-lilac hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          <span className="material-symbols-outlined text-base">apps</span>
          <span>Semua 4 Pilar ({totalIndicatorsAll} Indikator)</span>
        </button>

        {PILLARS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setSelectedPillarId(p.id)}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold font-isi transition-all flex items-center gap-2 border whitespace-nowrap ${
              selectedPillarId === p.id
                ? 'text-white shadow-md'
                : 'bg-white text-slate-700 border-gsm-lilac hover:border-slate-300 hover:bg-slate-50'
            }`}
            style={{
              backgroundColor: selectedPillarId === p.id ? p.color : undefined,
              borderColor: selectedPillarId === p.id ? p.color : undefined,
              boxShadow: selectedPillarId === p.id ? `0 4px 14px ${p.color}35` : undefined
            }}
          >
            <span className="material-symbols-outlined text-base">{p.icon}</span>
            <span>{p.code}. {p.shortTitle}</span>
            <span className={`text-[10px] font-sans-code px-2 py-0.5 rounded-full ${
              selectedPillarId === p.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              {p.bobot} Poin
            </span>
          </button>
        ))}
      </div>

      {/* ═══ Pilar Cards with Detailed Indicators (Scroll Reveal) ═══ */}
      <div ref={pillarsContainerRef} className="space-y-8">
        {displayedPillars.map((pillar) => {
          const isVisible = visiblePillars[pillar.id];

          return (
            <div 
              key={pillar.id}
              className={`bg-white rounded-3xl p-6 sm:p-8 shadow-gsm-card border border-gsm-lilac space-y-6 relative overflow-hidden transition-all duration-700 ease-out hover:shadow-gsm-hover ${
                isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-[0.98]'
              }`}
            >
              {/* Pilar Header Banner */}
              <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-gsm-lilac">
                <div className="flex items-center gap-4">
                  <div 
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-white shadow-md flex-shrink-0 transition-transform duration-300 group-hover:scale-105"
                    style={{ backgroundColor: pillar.color }}
                  >
                    <span className="material-symbols-outlined text-3xl sm:text-4xl">{pillar.icon}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span 
                        className="text-[10px] font-sans-code font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full text-white shadow-sm"
                        style={{ backgroundColor: pillar.color }}
                      >
                        {pillar.code}
                      </span>
                      <span className="text-xs font-sans-code text-slate-500 font-bold">
                        {pillar.indicators.length} Indikator Penilaian
                      </span>
                    </div>
                    <h2 className="font-coolvetica font-bold text-2xl text-slate-900 mt-1">
                      {pillar.title}
                    </h2>
                  </div>
                </div>

                {/* Pillar Weight Badge */}
                <div className="bg-slate-50 border border-gsm-lilac px-5 py-3 rounded-2xl text-right shadow-sm">
                  <span className="text-[10px] font-sans-code text-slate-500 uppercase font-bold block">Bobot Pilar</span>
                  <span className="font-coolvetica font-bold text-2xl" style={{ color: pillar.color }}>
                    {pillar.bobot} Poin
                  </span>
                </div>
              </div>

              {/* Indicators List in Pillar */}
              <div className="space-y-4">
                {pillar.indicators.map((ind, idx) => {
                  const isOpen = !!openRubrikKeys[ind.key];

                  return (
                    <div 
                      key={ind.key}
                      className="border border-slate-200/90 rounded-2xl overflow-hidden hover:border-slate-300 transition-all bg-slate-50/40 hover:bg-white shadow-sm"
                    >
                      {/* Indicator Top Bar */}
                      <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3.5">
                          <span 
                            className="w-7 h-7 rounded-xl text-white font-sans-code font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm"
                            style={{ backgroundColor: pillar.color }}
                          >
                            {idx + 1}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-serif-judul font-bold text-slate-900 text-sm sm:text-base">
                                {ind.label}
                              </h3>
                              <span className="bg-blue-50 text-gsm-blue-main font-sans-code font-bold text-[10px] px-2 py-0.5 rounded-full border border-blue-200">
                                Bobot: {ind.bobot} Poin
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 font-isi mt-1 leading-relaxed">
                              {ind.desc}
                            </p>
                          </div>
                        </div>

                        {/* Accordion Toggle Button */}
                        <button
                          type="button"
                          onClick={() => toggleRubrik(ind.key)}
                          className="self-end sm:self-center px-4 py-2 rounded-xl text-xs font-bold font-sans-code transition-all flex items-center gap-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm"
                        >
                          <span>{isOpen ? 'Tutup Rubrik' : 'Detail Rubrik (1–5)'}</span>
                          <span className={`material-symbols-outlined text-sm transition-transform duration-200 ${isOpen ? 'rotate-180 text-gsm-blue-main' : ''}`}>
                            expand_more
                          </span>
                        </button>
                      </div>

                      {/* Expandable Rubric 1-5 Grid */}
                      {isOpen && (
                        <div className="p-4 sm:p-5 bg-white border-t border-slate-200/80 animate-in fade-in slide-in-from-top-2 duration-300">
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-sans-code mb-3 flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm text-gsm-blue-main">rule</span>
                            <span>Panduan Deskriptor Skor 1 sampai 5:</span>
                          </h4>

                          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                            {[1, 2, 3, 4, 5].map((lvl) => {
                              const desc = ind.rubrik?.[lvl] || 'Deskripsi rubrik.';
                              return (
                                <div 
                                  key={lvl}
                                  className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/50 flex flex-col justify-between space-y-2 hover:border-gsm-blue-main transition-colors"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="w-6 h-6 rounded-lg bg-gsm-blue-gradient text-white font-sans-code font-bold text-xs flex items-center justify-center shadow-sm">
                                      {lvl}
                                    </span>
                                    <span className="text-[10px] font-sans-code font-bold text-slate-400">
                                      {lvl === 5 ? 'Sangat Baik' : (lvl >= 3 ? 'Cukup/Baik' : 'Kurang')}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-600 font-isi leading-relaxed">
                                    {desc}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>

            </div>
          );
        })}
      </div>

      {/* ═══ Skala Penilaian & Predikat Kelulusan (Scroll Reveal) ═══ */}
      <div 
        ref={guideRef}
        className={`grid grid-cols-1 lg:grid-cols-2 gap-6 transition-all duration-700 ease-out ${
          isGuideVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        
        {/* Panduan Skala Skor 1-5 */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-gsm-card border border-gsm-lilac space-y-4 hover:shadow-gsm-hover transition-all">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-gsm-blue-main text-2xl">straighten</span>
            <h3 className="font-coolvetica font-bold text-lg text-slate-900">
              Panduan Skala Penilaian 1–5
            </h3>
          </div>
          <p className="text-xs text-slate-500 font-isi">
            Setiap indikator dinilai menggunakan skala 1 hingga 5 yang kemudian dikonversikan secara matematis sesuai bobot poin indikator:
          </p>

          <div className="space-y-2.5">
            {SCALE_GUIDE.map((item) => (
              <div 
                key={item.score}
                className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-blue-50/40 transition-colors"
              >
                <span className="w-8 h-8 rounded-xl bg-gsm-blue-gradient text-white font-sans-code font-bold text-xs flex items-center justify-center shadow-sm flex-shrink-0">
                  {item.score}
                </span>
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-xs text-slate-800 mr-1.5">{item.label}:</span>
                  <span className="text-xs text-slate-600 leading-relaxed">{item.desc}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 text-xs font-sans-code text-slate-700 bg-blue-50/60 p-3.5 rounded-2xl border border-blue-200">
            <strong>Rumus Kalkulasi:</strong> Final Score = Σ (Skor ÷ 5 × Bobot Indikator) pada P1 + P2 + P3 + P4 (Skala 0–100).
          </div>
        </div>

        {/* Panduan Predikat Akhir */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-gsm-card border border-gsm-lilac space-y-4 hover:shadow-gsm-hover transition-all">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-gsm-blue-main text-2xl">workspace_premium</span>
            <h3 className="font-coolvetica font-bold text-lg text-slate-900">
              Kategori Predikat & Standar Kelulusan
            </h3>
          </div>
          <p className="text-xs text-slate-500 font-isi">
            Kategori predikat akhir mahasiswa baru berdasarkan akumulasi Final Score:
          </p>

          <div className="space-y-3">
            <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-[#003CEC]/30 flex flex-col justify-between space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-coolvetica font-bold text-sm text-[#003CEC]">Sangat Siap Oprec</span>
                <span className="text-xs font-sans-code font-bold bg-[#003CEC] text-white px-2.5 py-0.5 rounded-full">90 – 100</span>
              </div>
              <p className="text-xs text-slate-600 font-isi">
                Kompetensi unggul pada seluruh 4 pilar. Sangat direkomendasikan menjadi role model kepanitiaan.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-cyan-50/70 border border-[#00B0D8]/40 flex flex-col justify-between space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-coolvetica font-bold text-sm text-[#0082A0]">Siap Oprec</span>
                <span className="text-xs font-sans-code font-bold bg-[#00B0D8] text-white px-2.5 py-0.5 rounded-full">75 – 89</span>
              </div>
              <p className="text-xs text-slate-600 font-isi">
                Memenuhi seluruh standar dasar kelulusan mentoring dengan beberapa catatan minor.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-[#C896E0]/40 flex flex-col justify-between space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-coolvetica font-bold text-sm text-[#8A3AB9]">Cukup Siap (Perlu Latihan)</span>
                <span className="text-xs font-sans-code font-bold bg-[#C896E0] text-white px-2.5 py-0.5 rounded-full">60 – 74</span>
              </div>
              <p className="text-xs text-slate-600 font-isi">
                Disarankan berlatih mandiri dan review materi take-home sebelum mendaftar kepanitiaan.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-[#E59B86]/40 flex flex-col justify-between space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-coolvetica font-bold text-sm text-[#C86047]">Perlu Pendampingan Lanjutan</span>
                <span className="text-xs font-sans-code font-bold bg-[#E59B86] text-white px-2.5 py-0.5 rounded-full">&lt; 60</span>
              </div>
              <p className="text-xs text-slate-600 font-isi">
                Memerlukan pendampingan intensif dari mentor kelompok.
              </p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
