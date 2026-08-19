import React, { useState, useEffect, useRef } from 'react';

export default function StudentsView({ students, onSelectStudent, onOpenInsertForStudent }) {
  const [search, setSearch] = useState('');
  const [filterProdi, setFilterProdi] = useState('ALL');
  const [filterGroup, setFilterGroup] = useState('ALL');
  const [filterPredicate, setFilterPredicate] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  const prodiOptions = Array.from(new Set(students.map(s => s.prodi)));
  const groupOptions = Array.from(new Set(students.map(s => s.kelompok)));

  // Scroll reveal observer for Student Cards Grid
  const gridRef = useRef(null);
  const [visibleCards, setVisibleCards] = useState({});

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterProdi, filterGroup, filterPredicate]);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          paginatedStudents.forEach((s, idx) => {
            setTimeout(() => {
              setVisibleCards(prev => ({ ...prev, [s.id]: true }));
            }, idx * 70);
          });
        } else {
          setVisibleCards({});
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [currentPage, search, filterProdi, filterGroup, filterPredicate]);

  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.name.toLowerCase().includes(search.toLowerCase()) ||
      student.nim.toLowerCase().includes(search.toLowerCase()) ||
      student.mentor.toLowerCase().includes(search.toLowerCase());
    
    const matchesProdi = filterProdi === 'ALL' || student.prodi === filterProdi;
    const matchesGroup = filterGroup === 'ALL' || student.kelompok === filterGroup;
    const matchesPredicate = filterPredicate === 'ALL' || student.predicate === filterPredicate;

    return matchesSearch && matchesProdi && matchesGroup && matchesPredicate;
  });

  // Calculate Pagination (Max 9 Items per Page for 3x3 Grid)
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedStudents = filteredStudents.slice(startIndex, startIndex + itemsPerPage);

  const gradedCount = students.filter(s => s.status !== 'Belum Dinilai' && (s.finalScore > 0 || Object.values(s.scores || {}).some(v => v > 0))).length;

  const getInitials = (name) => {
    if (!name) return 'MB';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  };

  const getPredicateBadge = (pred) => {
    const p = (pred || '').toLowerCase();
    if (p.includes('sangat')) {
      return 'bg-blue-50 text-[#003CEC] border-[#003CEC]/30';
    }
    if (p.includes('siap') && !p.includes('cukup')) {
      return 'bg-cyan-50 text-[#0082A0] border-[#00B0D8]/40';
    }
    if (p.includes('cukup')) {
      return 'bg-purple-50 text-[#8A3AB9] border-[#C896E0]/40';
    }
    if (p.includes('pendampingan') || p.includes('kurang')) {
      return 'bg-rose-50 text-[#C86047] border-[#E59B86]/40';
    }
    return 'bg-slate-100 text-slate-600 border-slate-200';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 font-isi relative z-10 w-full">
      
      {/* ═══ Header Section without 2026 mention ═══ */}
      <div className="relative bg-white p-6 sm:p-8 rounded-3xl shadow-gsm-card border border-gsm-lilac flex flex-wrap items-center justify-between gap-6 overflow-hidden">
        
        {/* Watermark BG4.svg */}
        <div 
          className="absolute inset-0 bg-[url('/assets/BG4.svg')] bg-cover bg-center opacity-[0.06] pointer-events-none z-0"
        />

        <div className="relative z-10 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gsm-blue-gradient text-white flex items-center justify-center shadow-md shadow-gsm-blue-main/20 flex-shrink-0">
            <span className="material-symbols-outlined text-3xl">school</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-gsm-cream text-slate-950 font-sans-code font-bold text-[10px] uppercase tracking-wider px-3 py-0.5 rounded-full border border-yellow-200">
                Direktori Mahasiswa
              </span>
              <span className="text-xs text-slate-400 font-sans-code font-bold">Departemen HRD</span>
            </div>
            <h1 className="font-coolvetica font-bold text-2xl text-slate-900 mt-1">
              Data Mahasiswa Sistem Informasi & Inovasi Digital
            </h1>
            <p className="text-xs text-slate-500 font-isi mt-0.5">
              Daftar seluruh mahasiswa baru terdaftar, status pengisian rapot 4 pilar, dan pencetakan dokumen evaluasi.
            </p>
          </div>
        </div>

        {/* Header Right Badges */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="bg-blue-50 border border-gsm-lilac px-4 py-2.5 rounded-2xl text-center shadow-sm">
            <span className="text-[10px] font-sans-code text-slate-500 uppercase font-bold block">Total Maba</span>
            <span className="font-coolvetica font-bold text-xl text-gsm-blue-main">{students.length} Orang</span>
          </div>
          <div className="bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl text-center shadow-sm">
            <span className="text-[10px] font-sans-code text-slate-500 uppercase font-bold block">Telah Dinilai</span>
            <span className="font-coolvetica font-bold text-xl text-slate-800">{gradedCount} Maba</span>
          </div>
        </div>
      </div>

      {/* ═══ Filter Controls Bar (GSM Styling) ═══ */}
      <div className="bg-white rounded-3xl p-5 shadow-gsm-card border border-gsm-lilac grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs font-isi">
        
        {/* Search */}
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base">search</span>
          <input 
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari Nama / NRP / Mentor..."
            className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-gsm-blue-main focus:bg-white text-slate-800 font-semibold"
          />
        </div>

        {/* Prodi Filter */}
        <div>
          <select 
            value={filterProdi}
            onChange={(e) => setFilterProdi(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-gsm-blue-main focus:bg-white text-slate-700 font-semibold cursor-pointer"
          >
            <option value="ALL">Semua Program Studi ({prodiOptions.length})</option>
            {prodiOptions.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {/* Kelompok Filter */}
        <div>
          <select 
            value={filterGroup}
            onChange={(e) => setFilterGroup(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-gsm-blue-main focus:bg-white text-slate-700 font-semibold cursor-pointer"
          >
            <option value="ALL">Semua Kelompok ({groupOptions.length})</option>
            {groupOptions.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        {/* Predicate Filter */}
        <div>
          <select 
            value={filterPredicate}
            onChange={(e) => setFilterPredicate(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-gsm-blue-main focus:bg-white text-slate-700 font-semibold cursor-pointer"
          >
            <option value="ALL">Semua Predikat Kelulusan</option>
            <option value="Sangat Siap Oprec">Sangat Siap Oprec (90-100)</option>
            <option value="Siap Oprec">Siap Oprec (75-89)</option>
            <option value="Cukup Siap">Cukup Siap (60-74)</option>
            <option value="Perlu Pendampingan">Perlu Pendampingan (&lt;60)</option>
            <option value="-">Belum Dinilai (-)</option>
          </select>
        </div>

      </div>

      {/* ═══ Student Cards Grid (3x3 Layout) ═══ */}
      <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedStudents.map((student) => {
          const isVisible = visibleCards[student.id];

          return (
            <div 
              key={student.id}
              className={`bg-white rounded-3xl p-6 shadow-gsm-card border border-gsm-lilac hover:shadow-gsm-hover transition-all duration-300 flex flex-col justify-between group ${
                isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-6 scale-95'
              }`}
            >
              <div>
                {/* Top Profile Header */}
                <div className="flex items-center gap-3.5 mb-4">
                  <div className="w-11 h-11 rounded-2xl bg-gsm-blue-gradient text-white flex items-center justify-center font-bold text-xs shadow-md shadow-gsm-blue-main/20 flex-shrink-0 font-sans-code">
                    {getInitials(student.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-serif-judul font-bold text-slate-900 text-sm truncate group-hover:text-gsm-blue-main transition-colors">
                      {student.name}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-sans-code font-bold mt-0.5">
                      NRP: {student.nim}
                    </p>
                  </div>
                </div>

                {/* Tags & Meta Info */}
                <div className="space-y-2.5 text-xs text-slate-600 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-slate-400 font-sans-code font-bold">Prodi:</span>
                    <span className="font-semibold text-slate-800 text-[11px]">{student.prodi}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-slate-400 font-sans-code font-bold">Kelompok:</span>
                    <span className="bg-white border border-slate-200 px-2 py-0.5 rounded-md text-slate-800 font-semibold text-[11px]">
                      {student.kelompok}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-slate-400 font-sans-code font-bold">Pembina:</span>
                    <span className="font-semibold text-slate-800 text-[11px] truncate max-w-[150px]">{student.mentor}</span>
                  </div>
                </div>

                {/* Score & Predicate Pill */}
                <div className="flex items-center justify-between p-3 bg-blue-50/50 rounded-2xl border border-gsm-lilac mb-4">
                  <div>
                    <span className="text-[10px] text-slate-400 font-sans-code uppercase font-bold block">Final Score</span>
                    <span className="font-coolvetica font-bold text-xl text-slate-900 leading-none">
                      {student.finalScore || 0}
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${getPredicateBadge(student.predicate)}`}>
                    {student.predicate || 'Belum Dinilai'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button 
                  onClick={() => onOpenInsertForStudent(student)}
                  className="flex-1 bg-gsm-blue-main hover:bg-blue-700 text-white text-xs font-bold py-2 px-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 font-reddit"
                >
                  <span className="material-symbols-outlined text-sm">edit</span>
                  <span>Input Nilai</span>
                </button>
                <button 
                  onClick={() => onSelectStudent(student)}
                  className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-gsm-blue-main hover:bg-blue-50 transition-all flex items-center justify-center shadow-sm"
                  title="Cetak / Preview Rapot PDF"
                >
                  <span className="material-symbols-outlined text-base">picture_as_pdf</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══ Clean Sliding Window Pagination Controls (Max 5 Page Buttons) ═══ */}
      <div className="bg-white rounded-3xl p-5 shadow-gsm-card border border-gsm-lilac flex flex-wrap items-center justify-between gap-4 text-xs font-sans-code text-slate-500">
        <span>
          Menampilkan {filteredStudents.length > 0 ? startIndex + 1 : 0} – {Math.min(startIndex + itemsPerPage, filteredStudents.length)} dari {filteredStudents.length} Mahasiswa
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
