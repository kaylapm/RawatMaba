import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getMentorLastLogin } from '../lib/dataService';

const MEMBER_FILTERS = [
  { value: 'ALL', label: 'Semua Anggota' },
  { value: 'GRADED', label: 'Sudah Dinilai' },
  { value: 'UNRATED', label: 'Belum Dinilai' },
];

function formatLastLogin(timestampISO) {
  if (!timestampISO) return 'Belum pernah';
  try {
    const date = new Date(timestampISO);
    if (Number.isNaN(date.getTime())) return 'Belum pernah';
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).replace('.', ':');
  } catch (e) {
    return 'Belum pernah';
  }
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function isStudentGraded(student) {
  const status = normalizeText(student?.status);
  const hasRecordedScore = Number(student?.finalScore || 0) > 0
    || Object.values(student?.scores || {}).some((score) => Number(score || 0) > 0);

  return (status !== '' && status !== 'belum dinilai') || hasRecordedScore;
}

function getInitials(name) {
  const words = String(name || 'Maba').trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((word) => word[0]).join('').toUpperCase();
}

export default function ClassesView({ classes = [], students = [], mentorLogins = {}, onOpenInsert }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [memberFilter, setMemberFilter] = useState('ALL');
  const [memberSearch, setMemberSearch] = useState('');
  const [visibleClasses, setVisibleClasses] = useState({});
  const gridRef = useRef(null);
  const memberPanelRef = useRef(null);
  const itemsPerPage = 12;

  const totalPages = Math.ceil(classes.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedClasses = classes.slice(startIndex, startIndex + itemsPerPage);
  const uniqueMentorsCount = Array.from(new Set(classes.map((cls) => cls.mentor))).filter(Boolean).length;

  const getClassMembers = (className) => {
    const normalizedClassName = normalizeText(className);
    return students.filter((student) => normalizeText(student.kelompok) === normalizedClassName);
  };

  const selectedClass = useMemo(
    () => classes.find((cls) => cls.id === selectedClassId) || null,
    [classes, selectedClassId],
  );

  const selectedMembers = useMemo(
    () => (selectedClass ? getClassMembers(selectedClass.name) : []),
    [selectedClass, students],
  );

  const selectedGradedCount = selectedMembers.filter(isStudentGraded).length;
  const filteredMembers = selectedMembers.filter((student) => {
    const graded = isStudentGraded(student);
    const matchesFilter = memberFilter === 'ALL'
      || (memberFilter === 'GRADED' && graded)
      || (memberFilter === 'UNRATED' && !graded);
    const search = normalizeText(memberSearch);
    const matchesSearch = !search
      || normalizeText(student.name).includes(search)
      || normalizeText(student.nim).includes(search)
      || normalizeText(student.prodi).includes(search);

    return matchesFilter && matchesSearch;
  });

  const openMembers = (cls, filter = 'ALL') => {
    setSelectedClassId(cls.id);
    setMemberFilter(filter);
    setMemberSearch('');
    window.requestAnimationFrame(() => {
      memberPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  useEffect(() => {
    if (!selectedClass || !memberPanelRef.current) return;
    memberPanelRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [selectedClassId]);

  useEffect(() => {
    const el = gridRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVisibleClasses(Object.fromEntries(paginatedClasses.map((cls) => [cls.id, true])));
      return undefined;
    }

    const timers = [];
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          paginatedClasses.forEach((cls, idx) => {
            const timer = setTimeout(() => {
              setVisibleClasses((prev) => ({ ...prev, [cls.id]: true }));
            }, idx * 60);
            timers.push(timer);
          });
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      timers.forEach(clearTimeout);
    };
  }, [currentPage, classes.length]);

  return (
    <div className="space-y-10 animate-in fade-in duration-300 font-isi relative z-10 w-full">
      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-8">
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 rounded-xl bg-gsm-blue-main text-white flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-2xl">diversity_3</span>
          </div>
          <div>
            <p className="text-xs text-gsm-blue-main font-medium mb-2">Kelompok Mentoring · Departemen HRD</p>
            <h1 className="font-coolvetica font-semibold text-2xl text-slate-900">
              Data Kelompok & Mentor Rawat Maba
            </h1>
            <p className="text-sm leading-6 text-slate-500 font-isi mt-2 max-w-2xl">
              Pilih kelompok untuk melihat anggotanya dan memantau status penilaian setiap mahasiswa.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 sm:gap-8 text-left sm:text-right">
          <div>
            <span className="text-xs text-slate-500 block mb-1">Total kelompok</span>
            <span className="font-coolvetica font-semibold text-lg text-slate-900">{classes.length}</span>
          </div>
          <div className="pl-6 sm:pl-8 border-l border-slate-200">
            <span className="text-xs text-slate-500 block mb-1">Mentor aktif</span>
            <span className="font-coolvetica font-semibold text-lg text-slate-900">{uniqueMentorsCount}</span>
          </div>
        </div>
      </div>

      {selectedClass && (
        <section
          ref={memberPanelRef}
          aria-labelledby="class-members-title"
          className="scroll-mt-24 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
        >
          <div className="p-6 sm:p-7 border-b border-slate-200 bg-slate-50/60 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="flex items-start gap-4 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gsm-blue-main text-white flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-xl">groups</span>
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 id="class-members-title" className="font-coolvetica font-semibold text-lg text-slate-900">
                    Anggota Kelompok {selectedClass.name}
                  </h2>
                  <span className="text-xs font-medium text-gsm-blue-main">
                    {selectedGradedCount}/{selectedMembers.length} dinilai
                  </span>
                </div>
                <p className="text-sm text-slate-500 mt-1.5">
                  Mentor: <strong className="text-slate-700 font-medium">{selectedClass.mentor}</strong>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedClassId(null)}
              className="self-start lg:self-center inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              aria-label={`Tutup daftar anggota kelompok ${selectedClass.name}`}
            >
              <span className="material-symbols-outlined text-base">close</span>
              Tutup
            </button>
          </div>

          <div className="p-6 sm:p-7 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex flex-wrap gap-2.5" aria-label="Filter status penilaian">
                {MEMBER_FILTERS.map((filter) => {
                  const count = filter.value === 'ALL'
                    ? selectedMembers.length
                    : filter.value === 'GRADED'
                      ? selectedGradedCount
                      : selectedMembers.length - selectedGradedCount;

                  return (
                    <button
                      type="button"
                      key={filter.value}
                      onClick={() => setMemberFilter(filter.value)}
                      aria-pressed={memberFilter === filter.value}
                      className={`px-4 py-2.5 rounded-lg border text-xs font-medium transition-colors ${
                        memberFilter === filter.value
                          ? 'bg-gsm-blue-main border-gsm-blue-main text-white'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      {filter.label} ({count})
                    </button>
                  );
                })}
              </div>

              <label className="relative block w-full lg:w-72">
                <span className="sr-only">Cari anggota kelompok</span>
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base">search</span>
                <input
                  type="search"
                  value={memberSearch}
                  onChange={(event) => setMemberSearch(event.target.value)}
                  placeholder="Cari nama atau NRP..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-gsm-blue-main focus:ring-2 focus:ring-gsm-blue-main/10 text-xs text-slate-800 font-normal transition-colors"
                />
              </label>
            </div>

            {filteredMembers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredMembers.map((student) => {
                  const graded = isStudentGraded(student);
                  return (
                    <article key={student.id} className="p-5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-medium flex-shrink-0">
                          {getInitials(student.name)}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-slate-900 truncate">{student.name}</h3>
                          <p className="text-xs text-slate-500 mt-1 truncate">
                            NRP {student.nim || '-'} · {student.prodi || 'Program studi belum diisi'}
                          </p>
                          <span className={`inline-flex items-center gap-1.5 mt-2.5 text-xs font-medium ${
                            graded
                              ? 'text-[#0082A0]'
                              : 'text-amber-700'
                          }`}>
                            <span className="material-symbols-outlined text-[13px]">{graded ? 'check_circle' : 'schedule'}</span>
                            {graded ? `Sudah Dinilai · ${student.finalScore || 0}` : 'Belum Dinilai'}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onOpenInsert?.(student)}
                        className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                          graded
                            ? 'bg-white text-gsm-blue-main border border-slate-200 hover:bg-slate-50'
                            : 'bg-gsm-blue-main text-white border border-gsm-blue-main hover:bg-blue-700'
                        }`}
                      >
                        <span className="material-symbols-outlined text-base">{graded ? 'edit' : 'add_notes'}</span>
                        {graded ? 'Lihat / Edit Nilai' : 'Input Nilai'}
                      </button>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 px-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center">
                <span className="material-symbols-outlined text-3xl text-slate-300">person_search</span>
                <p className="text-sm font-semibold text-slate-700 mt-3">Tidak ada anggota pada daftar ini</p>
                <p className="text-xs leading-5 text-slate-500 mt-1.5">Coba pilih status lain atau hapus kata pencarian.</p>
              </div>
            )}
          </div>
        </section>
      )}

      <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
        {paginatedClasses.map((cls) => {
          const isVisible = visibleClasses[cls.id];
          const members = getClassMembers(cls.name);
          const gradedCount = members.filter(isStudentGraded).length;
          const membersCount = members.length || cls.membersCount || 0;
          const effectiveGradedCount = members.length > 0 ? gradedCount : (cls.gradedCount || 0);
          const unratedCount = Math.max(0, membersCount - effectiveGradedCount);
          const progressPercent = membersCount > 0 ? Math.round((effectiveGradedCount / membersCount) * 100) : 0;
          const lastLogin = getMentorLastLogin(cls.mentor, mentorLogins);
          const isSelected = selectedClassId === cls.id;

          return (
            <article
              key={cls.id}
              className={`bg-white rounded-3xl p-6 shadow-gsm-card border hover:shadow-gsm-hover transition-all duration-300 flex flex-col justify-between group ${
                isSelected ? 'border-gsm-blue-main ring-2 ring-gsm-blue-main/10' : 'border-gsm-lilac'
              } ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
            >
              <div>
                <div className="flex items-center gap-3.5 mb-4">
                  <div className="w-11 h-11 rounded-2xl bg-gsm-blue-gradient text-white flex items-center justify-center font-semibold text-xs shadow-md shadow-gsm-blue-main/20 flex-shrink-0">
                    {getInitials(cls.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-serif-judul font-semibold text-slate-900 text-sm truncate group-hover:text-gsm-blue-main transition-colors">
                      Kelompok {cls.name}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium mt-1">{cls.id}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${
                    progressPercent === 100
                      ? 'bg-cyan-50 text-[#0082A0] border-[#00B0D8]/40'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {progressPercent}%
                  </span>
                </div>

                <div className="space-y-3 text-xs text-slate-600 bg-slate-50/80 p-4 rounded-2xl border border-slate-100 mb-4">
                  <div className="flex justify-between items-start gap-3">
                    <span className="text-[11px] text-slate-400 font-semibold flex-shrink-0">Mentor:</span>
                    <span className="font-medium text-slate-800 text-[11px] text-right leading-5">{cls.mentor}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-slate-400 font-semibold">Jumlah anggota:</span>
                    <span className="font-medium text-slate-800 text-[11px]">{membersCount} Maba</span>
                  </div>
                  <div className="flex justify-between items-center gap-3 pt-2 border-t border-slate-200/60">
                    <span className="text-[11px] text-slate-400 font-semibold">Login terakhir:</span>
                    <span className={`font-medium text-[11px] text-right ${lastLogin ? 'text-gsm-blue-main' : 'text-slate-500'}`}>
                      {formatLastLogin(lastLogin)}
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-blue-50/50 rounded-2xl border border-gsm-lilac mb-4">
                  <div className="flex items-end justify-between gap-3 mb-3">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Progres Rapot</span>
                      <span className="font-coolvetica font-semibold text-xl text-slate-900 leading-none">{effectiveGradedCount}/{membersCount}</span>
                    </div>
                    <span className="text-xs font-medium text-gsm-blue-main">{progressPercent}% selesai</span>
                  </div>
                  <div className="w-full bg-white h-1.5 rounded-full overflow-hidden border border-blue-100">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${progressPercent === 100 ? 'bg-[#00B0D8]' : 'bg-gsm-blue-main'}`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-1">
                  <button
                    type="button"
                    onClick={() => openMembers(cls, 'GRADED')}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left hover:bg-cyan-50/50 hover:border-[#00B0D8]/30 transition-colors"
                    aria-label={`Lihat ${effectiveGradedCount} anggota kelompok ${cls.name} yang sudah dinilai`}
                  >
                    <span className="block text-[10px] text-[#0082A0] font-semibold">Sudah dinilai</span>
                    <span className="block text-xs text-slate-900 font-semibold mt-1">{effectiveGradedCount} Maba</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openMembers(cls, 'UNRATED')}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left hover:bg-amber-50/50 hover:border-amber-200 transition-colors"
                    aria-label={`Lihat ${unratedCount} anggota kelompok ${cls.name} yang belum dinilai`}
                  >
                    <span className="block text-[10px] text-amber-700 font-semibold">Belum dinilai</span>
                    <span className="block text-xs text-slate-900 font-semibold mt-1">{unratedCount} Maba</span>
                  </button>
                </div>
              </div>

              <div className="pt-4 mt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => openMembers(cls)}
                  aria-expanded={isSelected}
                  className="w-full bg-gsm-blue-main hover:bg-blue-700 text-white border border-gsm-blue-main text-xs font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-gsm-blue-main/20"
                >
                  <span className="material-symbols-outlined text-sm">group</span>
                  <span>{isSelected ? 'Anggota Sedang Ditampilkan' : 'Lihat Anggota Kelompok'}</span>
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {classes.length === 0 && (
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-dashed border-slate-300 text-center">
          <span className="material-symbols-outlined text-4xl text-slate-300">group_off</span>
          <p className="text-sm font-semibold text-slate-700 mt-3">Belum ada data kelompok</p>
        </div>
      )}

      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-5 text-xs text-slate-500">
        <span>
          Menampilkan {classes.length > 0 ? startIndex + 1 : 0} – {Math.min(startIndex + itemsPerPage, classes.length)} dari {classes.length} Kelompok
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            className="px-3.5 py-2 rounded-lg border border-slate-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors font-medium"
          >
            Sebelumnya
          </button>

          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum = i + 1;
            if (totalPages > 5 && currentPage > 3) {
              pageNum = currentPage - 2 + i;
              if (pageNum > totalPages) pageNum = totalPages - 4 + i;
            }
            return (
              <button
                type="button"
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                aria-label={`Buka halaman ${pageNum}`}
                aria-current={currentPage === pageNum ? 'page' : undefined}
                className={`w-9 h-9 rounded-lg font-medium transition-colors ${
                  currentPage === pageNum
                    ? 'bg-gsm-blue-main text-white'
                    : 'border border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            type="button"
            disabled={currentPage === totalPages || totalPages === 0}
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            className="px-3.5 py-2 rounded-lg border border-slate-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors font-medium"
          >
            Berikutnya
          </button>
        </div>
      </div>
    </div>
  );
}
