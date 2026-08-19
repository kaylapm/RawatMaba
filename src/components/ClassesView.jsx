import React, { useState, useEffect, useRef } from 'react';
import { getMentorLastLogin } from '../lib/dataService';

function formatLastLogin(timestampISO) {
  if (!timestampISO) return 'Never';
  try {
    const date = new Date(timestampISO);
    if (isNaN(date.getTime())) return 'Never';
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).replace('.', ':');
  } catch (e) {
    return 'Never';
  }
}

export default function ClassesView({ classes = [], students = [], mentorLogins = {}, onOpenInsert }) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Scroll reveal observer for Classes Grid Cards
  const gridRef = useRef(null);
  const [visibleClasses, setVisibleClasses] = useState({});

  const totalPages = Math.ceil(classes.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedClasses = classes.slice(startIndex, startIndex + itemsPerPage);

  const uniqueMentorsCount = Array.from(new Set(classes.map(c => c.mentor))).filter(Boolean).length;

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          paginatedClasses.forEach((cls, idx) => {
            setTimeout(() => {
              setVisibleClasses(prev => ({ ...prev, [cls.id]: true }));
            }, idx * 60);
          });
        } else {
          setVisibleClasses({});
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [currentPage, classes.length]);

  return (
    <div className="space-y-8 animate-in fade-in duration-300 font-isi relative z-10 w-full">
      
      {/* ═══ Header Section matching Kriteria & Rubrik ═══ */}
      <div className="relative bg-white p-6 sm:p-8 rounded-3xl shadow-gsm-card border border-gsm-lilac flex flex-wrap items-center justify-between gap-6 overflow-hidden">
        
        {/* Watermark BG4.svg */}
        <div 
          className="absolute inset-0 bg-[url('/assets/BG4.svg')] bg-cover bg-center opacity-[0.06] pointer-events-none z-0"
        />

        <div className="relative z-10 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gsm-blue-gradient text-white flex items-center justify-center shadow-md shadow-gsm-blue-main/20 flex-shrink-0">
            <span className="material-symbols-outlined text-3xl">diversity_3</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-gsm-cream text-slate-950 font-sans-code font-bold text-[10px] uppercase tracking-wider px-3 py-0.5 rounded-full border border-yellow-200">
                Kelompok Mentoring
              </span>
              <span className="text-xs text-slate-400 font-sans-code font-bold">Departemen HRD</span>
            </div>
            <h1 className="font-coolvetica font-bold text-2xl text-slate-900 mt-1">
              Data Kelompok & Pembina Rawat Maba
            </h1>
            <p className="text-xs text-slate-500 font-isi mt-0.5">
              Pemantauan progres penilaian rapot per kelompok mentoring dan status aktivitas pembina.
            </p>
          </div>
        </div>

        {/* Header Right Badges */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="bg-blue-50 border border-gsm-lilac px-4 py-2.5 rounded-2xl text-center shadow-sm">
            <span className="text-[10px] font-sans-code text-slate-500 uppercase font-bold block">Total Kelompok</span>
            <span className="font-coolvetica font-bold text-xl text-gsm-blue-main">{classes.length} Kelompok</span>
          </div>
          <div className="bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl text-center shadow-sm">
            <span className="text-[10px] font-sans-code text-slate-500 uppercase font-bold block">Pembina Aktif</span>
            <span className="font-coolvetica font-bold text-xl text-slate-800">{uniqueMentorsCount} Mentor</span>
          </div>
        </div>
      </div>

      {/* ═══ Classes Grid Cards ═══ */}
      <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedClasses.map((cls) => {
          const isVisible = visibleClasses[cls.id];
          const members = students.filter(s => s.kelompok === cls.name);
          const graded = members.filter(s => s.status !== 'Belum Dinilai');
          const membersCount = members.length || cls.membersCount || 0;
          const gradedCount = graded.length || cls.gradedCount || 0;
          const progressPercent = membersCount > 0 ? Math.round((gradedCount / membersCount) * 100) : 0;
          
          const lastLogin = getMentorLastLogin(cls.mentor, mentorLogins);
          const loginBadge = formatLastLogin(lastLogin);

          return (
            <div 
              key={cls.id}
              className={`bg-white rounded-3xl p-6 shadow-gsm-card border border-gsm-lilac hover:shadow-gsm-hover transition-all duration-300 flex flex-col justify-between group ${
                isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-6 scale-95'
              }`}
            >
              <div>
                {/* Header Card */}
                <div className="flex justify-between items-start mb-4">
                  <span className="text-[10px] font-sans-code font-bold uppercase tracking-wider text-gsm-blue-main bg-blue-50 px-2.5 py-1 rounded-full border border-gsm-lilac">
                    {cls.id}
                  </span>
                  <span className={`text-[10px] font-sans-code font-bold px-2.5 py-1 rounded-full ${
                    progressPercent === 100 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {progressPercent}% Selesai
                  </span>
                </div>

                <h3 className="font-serif-judul font-bold text-lg text-slate-900 mb-1 group-hover:text-gsm-blue-main transition-colors">
                  Kelompok {cls.name}
                </h3>
                
                <p className="text-xs text-slate-500 font-isi mb-4 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-slate-400">person</span>
                  <span>Mentor: <strong className="text-slate-800 font-semibold">{cls.mentor}</strong></span>
                </p>

                {/* Progress Bar */}
                <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 mb-4">
                  <div className="flex justify-between text-[11px] font-sans-code text-slate-600 font-bold">
                    <span>Progres Rapot</span>
                    <span className="text-gsm-blue-main">{gradedCount} / {membersCount} Maba</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${progressPercent === 100 ? 'bg-emerald-500' : 'bg-gsm-blue-main'}`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Mentor Login Activity */}
                <div className="flex items-center justify-between text-[10px] font-sans-code text-slate-400 pt-2 border-t border-slate-100">
                  <span>Last Login Mentor:</span>
                  <span className={`font-bold px-2 py-0.5 rounded-md ${lastLogin ? 'text-emerald-700 bg-emerald-50' : 'text-slate-500'}`}>
                    {loginBadge}
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-4 mt-2">
                <button 
                  onClick={onOpenInsert}
                  className="w-full bg-slate-50 hover:bg-gsm-blue-main hover:text-white text-slate-700 border border-slate-200 hover:border-gsm-blue-main text-xs font-bold py-2.5 rounded-2xl transition-all flex items-center justify-center gap-1.5 font-reddit shadow-sm"
                >
                  <span className="material-symbols-outlined text-sm">edit_note</span>
                  <span>Input Nilai Kelompok</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══ Clean Sliding Window Pagination Controls (Max 5 Page Buttons) ═══ */}
      <div className="bg-white rounded-3xl p-5 shadow-gsm-card border border-gsm-lilac flex flex-wrap items-center justify-between gap-4 text-xs font-sans-code text-slate-500">
        <span>
          Menampilkan {classes.length > 0 ? startIndex + 1 : 0} – {Math.min(startIndex + itemsPerPage, classes.length)} dari {classes.length} Kelompok
        </span>

        <div className="flex items-center gap-1.5">
          <button 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            className="px-3.5 py-2 rounded-xl border border-slate-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-all font-bold"
          >
            Prev
          </button>

          {/* Sliding Window Pagination: Max 5 Buttons */}
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum = i + 1;
            if (totalPages > 5 && currentPage > 3) {
              pageNum = currentPage - 2 + i;
              if (pageNum > totalPages) pageNum = totalPages - 4 + i;
            }
            return (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`w-9 h-9 rounded-xl font-bold transition-all ${
                  currentPage === pageNum 
                    ? 'bg-gsm-blue-main text-white shadow-md shadow-gsm-blue-main/20' 
                    : 'border border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                {pageNum}
              </button>
            );
          })}

          <button 
            disabled={currentPage === totalPages || totalPages === 0}
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            className="px-3.5 py-2 rounded-xl border border-slate-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-all font-bold"
          >
            Next
          </button>
        </div>
      </div>

    </div>
  );
}
