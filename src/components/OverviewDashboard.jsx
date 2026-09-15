import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { getMentorLastLogin, isStudentReadyToPrint } from '../lib/dataService';
import { PILLARS, calcPillarScore } from './InsertGradesModal';
import { STUDENT_STATUS_CONFIG } from './StudentsView';

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

function renderCategoryPill(category) {
  const cat = (category || 'Info').toLowerCase();
  let dotColor = 'bg-sky-500';
  let label = category || 'Info';
  
  if (cat.includes('urgent') || cat.includes('darurat') || cat.includes('penting')) {
    dotColor = 'bg-rose-500';
  } else if (cat.includes('deadline') || cat.includes('tenggat')) {
    dotColor = 'bg-amber-500';
  } else if (cat.includes('system') || cat.includes('update') || cat.includes('sistem')) {
    dotColor = 'bg-purple-500';
  }

  return (
    <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 border border-slate-200/80 px-2.5 py-0.5 rounded-full text-[10px] font-sans-code font-bold uppercase tracking-wider">
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></span>
      <span>{label}</span>
    </span>
  );
}

export default function OverviewDashboard({ 
  students = [], 
  classes = [], 
  notices = [], 
  searchTerm = '', 
  onOpenInsert, 
  onOpenPdf, 
  currentUser,
  mentorLogins = {},
  onAddNotice,
  onDeleteNotice,
  isSyncing = false,
  isRealtimeConnected = true,
  onRefresh
}) {
  const [selectedMentor, setSelectedMentor] = useState('ALL');
  
  // KPI Clickable Modal State ('GRADED' | 'UNRATED' | null)
  const [kpiModalType, setKpiModalType] = useState(null);
  const [kpiModalSearch, setKpiModalSearch] = useState('');
  const [kpiModalGroup, setKpiModalGroup] = useState('ALL');

  // Super Admin Notice Modal State
  const [isAddNoticeOpen, setIsAddNoticeOpen] = useState(false);
  const [selectedNoticeDetail, setSelectedNoticeDetail] = useState(null);
  const [newNoticeTitle, setNewNoticeTitle] = useState('');
  const [newNoticeDesc, setNewNoticeDesc] = useState('');
  const [newNoticeCategory, setNewNoticeCategory] = useState('Info');
  const [noticeDate, setNoticeDate] = useState('');
  const [noticeTime, setNoticeTime] = useState('23:59');

  const formatDeadlineString = (dateStr, timeStr) => {
    if (!dateStr) return '';
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      const dayName = days[dateObj.getDay()];
      const dateNum = dateObj.getDate();
      const monthName = months[dateObj.getMonth()];
      const year = dateObj.getFullYear();
      const time = timeStr ? `${timeStr} WIB` : '23:59 WIB';
      return `${dayName}, ${dateNum} ${monthName} ${year} • ${time}`;
    } catch (e) {
      return dateStr;
    }
  };

  const handleNoticeSubmit = async (e) => {
    e.preventDefault();
    if (!newNoticeTitle.trim() || !newNoticeDesc.trim()) return;

    const finalDeadline = noticeDate ? formatDeadlineString(noticeDate, noticeTime) : null;

    const newNotice = {
      title: newNoticeTitle.trim(),
      description: newNoticeDesc.trim(),
      category: newNoticeCategory,
      date: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
      deadline: finalDeadline,
      author: currentUser?.name || 'HRD HMSI Pilar Aksi'
    };

    if (onAddNotice) {
      await onAddNotice(newNotice);
    }

    setNewNoticeTitle('');
    setNewNoticeDesc('');
    setNewNoticeCategory('Info');
    setNoticeDate('');
    setNoticeTime('23:59');
    setIsAddNoticeOpen(false);
  };

  // Visibility state for scroll staggered reveals
  const [isKpiVisible, setIsKpiVisible] = useState(false);
  const [isChartVisible, setIsChartVisible] = useState(false);
  const [isBottomVisible, setIsBottomVisible] = useState(false);

  const kpiRef = useRef(null);
  const chartRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    const createObserver = (ref, setter) => {
      if (!ref.current) return null;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setter(true);
          }
        },
        { threshold: 0.1 }
      );
      obs.observe(ref.current);
      return obs;
    };

    const o1 = createObserver(kpiRef, setIsKpiVisible);
    const o2 = createObserver(chartRef, setIsChartVisible);
    const o3 = createObserver(bottomRef, setIsBottomVisible);

    return () => {
      if (o1) o1.disconnect();
      if (o2) o2.disconnect();
      if (o3) o3.disconnect();
    };
  }, []);

  const isSuperAdmin = currentUser?.role === 'super_admin' || currentUser?.username === 'webdev';
  const isMentor = currentUser?.role === 'mentor';
  const mentorGroupName = currentUser?.group_name || students?.[0]?.kelompok || 'Kelompok Mentoring';

  // Get list of unique mentors
  const mentorList = useMemo(() => {
    const uniqueMentors = Array.from(new Set((students || []).map(s => s?.mentor))).filter(Boolean).sort();
    return uniqueMentors.length > 0 ? uniqueMentors : classes.map(c => c.mentor).filter(Boolean);
  }, [students, classes]);

  // Filter students based on role, search term and selected mentor
  const filteredStudents = useMemo(() => {
    return (students || []).filter(student => {
      if (!student) return false;

      // If mentor, lock to their own group / mentor name
      if (isMentor) {
        const uGroup = mentorGroupName.toLowerCase().trim();
        const uName = (currentUser?.name || '').toLowerCase().trim();
        const sGroup = (student.kelompok || '').toLowerCase().trim();
        const sMentor = (student.mentor || '').toLowerCase().trim();
        
        const isGroupMatch = uGroup && (sGroup === uGroup);
        const isMentorMatch = uName && (sMentor === uName || sMentor.includes(uName) || uName.includes(sMentor));
        if (!isGroupMatch && !isMentorMatch) return false;
      } else if (selectedMentor !== 'ALL') {
        if (student.mentor !== selectedMentor) return false;
      }

      // Search bar filter
      const term = (searchTerm || '').toLowerCase();
      if (term) {
        const matchesSearch = 
          (student.name || '').toLowerCase().includes(term) ||
          (student.nim || '').toLowerCase().includes(term) ||
          (student.kelompok || '').toLowerCase().includes(term) ||
          (student.prodi || '').toLowerCase().includes(term);
        return matchesSearch;
      }

      return true;
    });
  }, [students, isMentor, mentorGroupName, currentUser, selectedMentor, searchTerm]);

  // Filter classes based on role and selected mentor
  const filteredClasses = useMemo(() => {
    return classes.filter(cls => {
      if (isMentor) {
        const uGroup = mentorGroupName.toLowerCase().trim();
        const uName = (currentUser?.name || '').toLowerCase().trim();
        const cName = (cls.name || '').toLowerCase().trim();
        const cMentor = (cls.mentor || '').toLowerCase().trim();
        const isGroupMatch = uGroup && (cName === uGroup);
        const isMentorMatch = uName && (cMentor === uName || cMentor.includes(uName) || uName.includes(cMentor));
        return isGroupMatch || isMentorMatch;
      } else if (selectedMentor !== 'ALL') {
        return cls.mentor === selectedMentor;
      }
      return true;
    });
  }, [classes, isMentor, mentorGroupName, currentUser, selectedMentor]);

  const totalStudents = filteredStudents.length;
  // Graded students with rubrics/scores (used for 4 pillars statistics calculation)
  const gradedStudents = filteredStudents.filter(s => s.status !== 'Belum Dinilai' && (s.finalScore > 0 || Object.values(s.scores || {}).some(v => v > 0)));
  // Students who have completed BOTH scores AND mentor feedback/messages
  const readyToPrintStudents = useMemo(() => filteredStudents.filter(isStudentReadyToPrint), [filteredStudents]);
  // Students who are pending (either unrated OR haven't completed mentor feedback yet)
  const pendingStudents = useMemo(() => filteredStudents.filter(s => !isStudentReadyToPrint(s)), [filteredStudents]);
  const totalClassesCount = isMentor ? 1 : (selectedMentor === 'ALL' ? classes.length : 1);

  // KPI Clickable Modal Filtered Dataset
  const kpiModalStudents = useMemo(() => {
    if (!kpiModalType) return [];
    const baseList = kpiModalType === 'GRADED' ? readyToPrintStudents : pendingStudents;
    return baseList.filter(s => {
      if (kpiModalGroup !== 'ALL' && s.kelompok !== kpiModalGroup) return false;
      const term = (kpiModalSearch || '').toLowerCase().trim();
      if (term) {
        return (
          (s.name || '').toLowerCase().includes(term) ||
          (s.nim || '').toLowerCase().includes(term) ||
          (s.kelompok || '').toLowerCase().includes(term) ||
          (s.mentor || '').toLowerCase().includes(term) ||
          (s.prodi || '').toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [kpiModalType, readyToPrintStudents, pendingStudents, kpiModalGroup, kpiModalSearch]);

  const kpiModalUniqueGroups = useMemo(() => {
    const baseList = kpiModalType === 'GRADED' ? readyToPrintStudents : pendingStudents;
    return Array.from(new Set(baseList.map(s => s.kelompok))).filter(Boolean).sort();
  }, [kpiModalType, readyToPrintStudents, pendingStudents]);

  // ═══════════════════════════════════════════════════════════════
  // STATISTIK ANALITIK 4 PILAR GSM (Average, Min, Max)
  // ═══════════════════════════════════════════════════════════════
  const pillarStats = useMemo(() => {
    // Exclude dummy student records from overall cohort statistics
    const dataset = gradedStudents.filter(s => !s.isDummy && s.nim !== '5026249999' && s.id !== '30000000-0000-0000-0000-000000000999');

    return PILLARS.map(pillar => {
      const scoresList = dataset.map(s => {
        // Recalculate accurately from indicators if scores object exists
        if (s.scores && Object.keys(s.scores).length > 0) {
          return calcPillarScore(pillar, s.scores);
        }
        if (s.pillarScores && s.pillarScores[`${pillar.id}_score`] !== undefined && s.pillarScores[`${pillar.id}_score`] !== null) {
          let val = Number(s.pillarScores[`${pillar.id}_score`]);
          if (!isNaN(val)) {
            // Safety normalize if legacy raw 0-100 percentage was saved
            if (val > pillar.bobot) {
              val = Math.round(((val / 100) * pillar.bobot) * 10) / 10;
            }
            return Math.min(val, pillar.bobot);
          }
        }
        return 0;
      });

      if (scoresList.length === 0) {
        return {
          ...pillar,
          avgScore: 0,
          avgPct: 0,
          minScore: 0,
          maxScore: 0,
          sampleCount: 0
        };
      }

      const sum = scoresList.reduce((acc, v) => acc + v, 0);
      const avg = sum / scoresList.length;
      const min = Math.min(...scoresList);
      const max = Math.max(...scoresList);
      const avgPct = pillar.bobot > 0 ? Math.round((avg / pillar.bobot) * 100) : 0;

      return {
        ...pillar,
        avgScore: Math.round(avg * 10) / 10,
        avgPct: Math.min(100, avgPct),
        minScore: Math.round(Math.min(min, pillar.bobot) * 10) / 10,
        maxScore: Math.round(Math.min(max, pillar.bobot) * 10) / 10,
        sampleCount: scoresList.length
      };
    });
  }, [gradedStudents]);

  return (
    <div className="space-y-8 font-isi relative z-10 w-full">
      
      {/* ═══ 1. Academic Header Banner (Refined Proportion & Compact Cards) ═══ */}
      <div className="relative bg-white/90 backdrop-blur-xl p-5 sm:p-6 lg:p-7 rounded-3xl shadow-gsm-card border border-gsm-lilac flex flex-wrap items-center justify-between gap-5 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
        
        {/* Watermark BG4.svg */}
        <div 
          className="absolute inset-0 bg-[url('/assets/BG4.svg')] bg-cover bg-center opacity-[0.05] pointer-events-none z-0"
        />

        <div className="relative z-10 flex items-center gap-3.5 sm:gap-4 min-w-[280px]">
          <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-2xl bg-gsm-blue-gradient text-white flex items-center justify-center shadow-md shadow-gsm-blue-main/20 flex-shrink-0">
            <span className="material-symbols-outlined text-2xl sm:text-3xl">dashboard</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-gsm-cream text-slate-950 font-sans-code font-bold text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-yellow-200">
                Dashboard Rekap
              </span>
              <span className="text-[11px] text-slate-400 font-sans-code font-bold">Departemen HRD</span>
            </div>
            <h1 className="font-coolvetica font-semibold text-lg sm:text-2xl text-slate-900 mt-1 leading-snug tracking-tight">
              Dashboard Rekapitulasi Nilai
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-isi mt-0.5 leading-relaxed">
              {isMentor 
                ? `Monitoring progres nilai 4 pilar kelompok ${mentorGroupName} (${totalStudents} Maba).` 
                : `Ringkasan progres penilaian 4 pilar dan performa mahasiswa per kelompok.`}
            </p>
          </div>
        </div>

        {/* Header Right Controls */}
        <div className="relative z-10 flex flex-wrap items-center gap-2.5">
          {!isMentor && (
            <div className="h-10 inline-flex items-center gap-2 bg-white border border-slate-200/90 hover:border-slate-300 px-3.5 rounded-2xl shadow-xs">
              <span className="material-symbols-outlined text-sm text-gsm-blue-main">filter_list</span>
              <span className="text-[11px] font-bold text-slate-500 font-sans-code">Mentor:</span>
              <select 
                value={selectedMentor}
                onChange={(e) => setSelectedMentor(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 outline-none font-isi cursor-pointer max-w-[180px] truncate"
              >
                <option value="ALL">Semua Mentor ({mentorList.length})</option>
                {mentorList.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          )}

          {/* Siap Cetak KPI Pill Badge */}
          <div className="h-10 inline-flex items-center gap-2 bg-blue-50/90 border border-blue-200/80 px-3.5 rounded-2xl shadow-xs">
            <span className="text-[10px] font-sans-code text-slate-500 uppercase font-bold tracking-wider">Siap Cetak</span>
            <div className="flex items-baseline gap-0.5">
              <span className="font-coolvetica font-bold text-base text-gsm-blue-main leading-none">{readyToPrintStudents.length}</span>
              <span className="text-[11px] text-slate-400 font-sans-code font-semibold">/{totalStudents}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ 2. TOP POSITION: Reminders & Pengumuman Panitia (High Priority & Glassmorphism Design) ═══ */}
      {(notices.length > 0 || isSuperAdmin) && (
        <div className="space-y-3.5 animate-in fade-in slide-in-from-top-3 duration-500">
          <div className="flex flex-wrap justify-between items-center gap-3 px-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gsm-blue-main/10 text-gsm-blue-main flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-lg">campaign</span>
              </div>
              <div className="flex items-center gap-2">
                <h2 className="font-coolvetica font-bold text-base sm:text-lg text-slate-900 tracking-wide">
                  Pengumuman & Reminder Panitia
                </h2>
                {notices.length > 0 && (
                  <span className="text-[10px] font-sans-code font-bold bg-sky-500/10 text-sky-700 px-2.5 py-0.5 rounded-full border border-sky-500/20 backdrop-blur-md">
                    {notices.length} Aktif
                  </span>
                )}
              </div>
            </div>

            {/* Super Admin Add Notice Button */}
            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => setIsAddNoticeOpen(true)}
                className="bg-gsm-blue-main hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all shadow-sm shadow-gsm-blue-main/20 flex items-center gap-1.5 font-reddit"
              >
                <span className="material-symbols-outlined text-sm">add_circle</span>
                <span>Tambah Pengumuman</span>
              </button>
            )}
          </div>

          {notices.length === 0 ? (
            <div className="p-4 rounded-2xl bg-white/70 backdrop-blur-md border border-dashed border-slate-200 text-center text-xs text-slate-400 font-sans-code">
              Belum ada pengumuman aktif saat ini.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {notices.map((notice, idx) => {
                const displayAuthor = notice.author === 'Super Administrator HRD' ? 'HRD HMSI Pilar Aksi' : (notice.author || 'Panitia Rawat Maba');

                return (
                  <div 
                    key={notice.id}
                    onClick={() => setSelectedNoticeDetail(notice)}
                    className="bg-white rounded-3xl p-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 hover:border-slate-300 hover:shadow-[0_10px_30px_rgb(0,0,0,0.06)] hover:-translate-y-0.5 cursor-pointer transition-all duration-300 relative overflow-hidden flex flex-col justify-between group"
                    style={{ transitionDelay: `${idx * 60}ms` }}
                    title="Klik untuk melihat detail pengumuman lengkap"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        {renderCategoryPill(notice.category)}
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400 text-[10px] font-sans-code">{notice.date}</span>
                          <span className="material-symbols-outlined text-xs text-slate-300 group-hover:text-gsm-blue-main transition-colors">open_in_new</span>
                        </div>
                      </div>

                      <h3 className="font-serif-judul font-bold text-xs sm:text-sm text-slate-900 leading-snug mb-1.5 tracking-wide group-hover:text-gsm-blue-main transition-colors">
                        {notice.title}
                      </h3>
                      <p className="text-[11px] text-slate-600 line-clamp-3 font-isi leading-relaxed">
                        {notice.description}
                      </p>

                      {notice.deadline && (
                        <div className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-sans-code font-medium text-slate-600 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-xl">
                          <span className="material-symbols-outlined text-xs text-slate-400">schedule</span>
                          <span>Deadline: <strong className="text-slate-800 font-bold">{notice.deadline}</strong></span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] font-sans-code text-slate-400">
                      <span className="truncate max-w-[140px] text-slate-500 font-medium">{displayAuthor}</span>

                      {/* Delete button for Super Admin */}
                      {isSuperAdmin && onDeleteNotice ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Hapus pengumuman "${notice.title}"?`)) {
                              onDeleteNotice(notice.id);
                            }
                          }}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-all"
                          title="Hapus Pengumuman"
                        >
                          <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                      ) : (
                        <span className="text-gsm-blue-main font-bold flex items-center gap-0.5">
                          <span>Detail</span>
                          <span className="material-symbols-outlined text-[11px]">arrow_forward</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══ 3. 4 Dynamic KPI Summary Cards Grid (Scroll Staggered Reveal) ═══ */}
      <div 
        ref={kpiRef}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        
        {/* KPI 1: Kelompok */}
        <div 
          className={`bg-white rounded-3xl p-6 shadow-gsm-card border border-gsm-lilac hover:shadow-gsm-hover transition-all duration-500 flex flex-col justify-between ${
            isKpiVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
          style={{ transitionDelay: '50ms' }}
        >
          <div>
            <div className="flex justify-between items-start mb-3 gap-2">
              <span className="text-xs font-semibold text-slate-500 font-isi tracking-wide truncate">
                {isMentor ? 'Kelompok Anda' : 'Total Kelompok'}
              </span>
              <span className="bg-blue-50 text-gsm-blue-main text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-gsm-lilac font-sans-code tracking-wider whitespace-nowrap flex-shrink-0">
                {isMentor ? mentorGroupName : (selectedMentor === 'ALL' ? '34 Kelompok' : selectedMentor)}
              </span>
            </div>
            <div className="flex items-end gap-3 my-1">
              <span className="font-coolvetica font-bold text-3xl text-slate-900 tracking-wide">{totalClassesCount}</span>
              <span className="text-xs text-slate-400 font-sans-code mb-1 tracking-wide">{isMentor ? mentorGroupName : 'Kelompok Mentoring'}</span>
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 font-sans-code flex items-center justify-between tracking-wide gap-2">
            <span className="truncate">{isMentor ? `Mentor: ${currentUser?.name}` : (selectedMentor === 'ALL' ? '34 Mentor Aktif' : `Mentor: ${selectedMentor}`)}</span>
            <span className="text-gsm-blue-main font-bold whitespace-nowrap flex-shrink-0">100% Aktif</span>
          </div>
        </div>

        {/* KPI 2: Total Maba */}
        <div 
          className={`bg-white rounded-3xl p-6 shadow-gsm-card border border-gsm-lilac hover:shadow-gsm-hover transition-all duration-500 flex flex-col justify-between ${
            isKpiVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
          style={{ transitionDelay: '120ms' }}
        >
          <div>
            <div className="flex justify-between items-start mb-3 gap-2">
              <span className="text-xs font-semibold text-slate-500 font-isi tracking-wide truncate">Jumlah Mahasiswa Maba</span>
              <span className="bg-cyan-50 text-[#0082A0] text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-gsm-cyan/30 font-sans-code tracking-wider whitespace-nowrap flex-shrink-0">
                Aktif
              </span>
            </div>
            <div className="flex items-end gap-3 my-1">
              <span className="font-coolvetica font-bold text-3xl text-slate-900 tracking-wide">{totalStudents}</span>
              <span className="text-xs text-slate-400 font-sans-code mb-1 tracking-wide">Mahasiswa</span>
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 font-sans-code flex items-center justify-between tracking-wide gap-2">
            <span className="truncate">{isMentor ? `Anggota Kelompok ${mentorGroupName}` : 'Departemen Sistem Informasi'}</span>
            <span className="text-gsm-blue-main font-bold whitespace-nowrap flex-shrink-0">Terdaftar</span>
          </div>
        </div>

        {/* KPI 3: Nilai Selesai & Siap Cetak (Interactive & Clickable to View Graded Students) */}
        <div 
          onClick={() => { setKpiModalType('GRADED'); setKpiModalSearch(''); setKpiModalGroup('ALL'); }}
          className={`bg-white rounded-3xl p-6 shadow-gsm-card border border-gsm-lilac hover:border-gsm-blue-main hover:shadow-gsm-hover transition-all duration-300 flex flex-col justify-between cursor-pointer group hover:-translate-y-1 ${
            isKpiVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
          style={{ transitionDelay: '190ms' }}
          title="Klik untuk melihat daftar nama mahasiswa yang siap cetak rapot (nilai & pesan mentor lengkap)"
        >
          <div>
            <div className="flex justify-between items-start mb-3 gap-2">
              <span className="text-xs font-semibold text-slate-500 font-isi tracking-wide group-hover:text-gsm-blue-main transition-colors flex items-center gap-1 min-w-0">
                <span className="truncate">Siap Cetak Rapot</span>
                <span className="material-symbols-outlined text-xs opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">open_in_new</span>
              </span>
              <span className="bg-gsm-cream text-slate-950 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-yellow-200 font-sans-code tracking-wider whitespace-nowrap flex-shrink-0">
                {Math.round((readyToPrintStudents.length / (totalStudents || 1)) * 100)}% Siap Cetak
              </span>
            </div>
            <div className="flex items-end gap-3 my-1">
              <span className="font-coolvetica font-bold text-3xl text-slate-900 tracking-wide">{readyToPrintStudents.length}</span>
              <span className="text-xs text-slate-400 font-sans-code mb-1 tracking-wide">/ {totalStudents} Maba</span>
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 font-sans-code flex items-center justify-between tracking-wide gap-2">
            <span className="group-hover:text-slate-800 transition-colors truncate">Nilai & Pesan Lengkap</span>
            <span className="text-gsm-blue-main font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform whitespace-nowrap flex-shrink-0">
              <span>Buka List ({readyToPrintStudents.length})</span>
              <span className="material-symbols-outlined text-xs">arrow_forward</span>
            </span>
          </div>
        </div>

        {/* KPI 4: Belum Lengkap / Pending (Interactive & Clickable to View Pending Students) */}
        <div 
          onClick={() => { setKpiModalType('UNRATED'); setKpiModalSearch(''); setKpiModalGroup('ALL'); }}
          className={`bg-white rounded-3xl p-6 shadow-gsm-card border border-gsm-lilac hover:border-[#E59B86] hover:shadow-gsm-hover transition-all duration-300 flex flex-col justify-between cursor-pointer group hover:-translate-y-1 ${
            isKpiVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
          style={{ transitionDelay: '260ms' }}
          title="Klik untuk melihat daftar nama mahasiswa yang belum lengkap / belum dinilai"
        >
          <div>
            <div className="flex justify-between items-start mb-3 gap-2">
              <span className="text-xs font-semibold text-slate-500 font-isi tracking-wide group-hover:text-[#C86047] transition-colors flex items-center gap-1 min-w-0">
                <span className="truncate">Belum Lengkap</span>
                <span className="material-symbols-outlined text-xs opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">open_in_new</span>
              </span>
              <span className="bg-[#E59B86]/20 text-[#C86047] text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-[#E59B86]/40 font-sans-code tracking-wider whitespace-nowrap flex-shrink-0">
                {pendingStudents.length} Maba
              </span>
            </div>
            <div className="flex items-end gap-3 my-1">
              <span className="font-coolvetica font-bold text-3xl text-slate-900 tracking-wide">{pendingStudents.length}</span>
              <span className="text-xs text-slate-400 font-sans-code mb-1 tracking-wide">Maba Belum Lengkap</span>
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 font-sans-code flex items-center justify-between tracking-wide gap-2">
            <span className="group-hover:text-slate-800 transition-colors truncate">Perlu Evaluasi Mentor</span>
            <span className="text-[#C86047] font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform whitespace-nowrap flex-shrink-0">
              <span>Buka List ({pendingStudents.length})</span>
              <span className="material-symbols-outlined text-xs">arrow_forward</span>
            </span>
          </div>
        </div>

      </div>

      {/* ═══ 4. Main Analytics: Sumbu X 4 Pilar Bar Chart + Insight (Scroll Reveal) ═══ */}
      <div 
        ref={chartRef}
        className={`grid grid-cols-1 lg:grid-cols-12 gap-6 transition-all duration-700 ease-out ${
          isChartVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        
        {/* Left Column: Grade Distribution Chart per Pilar (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-4 sm:p-6 lg:p-7 shadow-gsm-card border border-gsm-lilac flex flex-col justify-between hover:shadow-gsm-hover transition-all">
          <div className="flex flex-wrap justify-between items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-gsm-blue-main text-2xl">bar_chart</span>
                <h2 className="font-coolvetica font-bold text-base sm:text-lg text-slate-900 tracking-wide">
                  Statistik Capaian Rata-Rata per Pilar
                </h2>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 font-sans-code tracking-wide mt-0.5">
                Capaian kompetensi 4 pilar ({gradedStudents.length} mahasiswa dinilai)
              </p>
            </div>

            <div className="flex items-center gap-2 text-[10px] font-sans-code bg-slate-50 border border-gsm-lilac px-3 py-1 rounded-full">
              <span className="w-2.5 h-2.5 rounded-full bg-gsm-blue-main"></span>
              <span className="text-slate-600 font-bold">Rata-Rata (%)</span>
            </div>
          </div>

          {/* Bar Chart Sumbu X: 4 Pilar (Fully Responsive) */}
          <div className="relative flex-1 min-h-[220px] sm:min-h-[240px] flex items-end justify-between px-1 sm:px-4 pb-10 pt-6 sm:pt-8 border-b border-slate-100 w-full overflow-hidden">
            {/* Grid background dashed lines */}
            <div className="absolute left-7 sm:left-10 right-0 top-0 h-full flex flex-col justify-between pb-10 pointer-events-none opacity-40">
              <div className="w-full border-t border-dashed border-slate-300"></div>
              <div className="w-full border-t border-dashed border-slate-300"></div>
              <div className="w-full border-t border-dashed border-slate-300"></div>
              <div className="w-full border-t border-dashed border-slate-300"></div>
            </div>

            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-[9px] sm:text-[10px] text-slate-400 font-sans-code pb-10 pointer-events-none">
              <span>100%</span>
              <span>75%</span>
              <span>50%</span>
              <span>0%</span>
            </div>

            {/* 4 Pillars Bars (Sumbu X) */}
            <div className="relative z-10 w-full flex items-end justify-around pl-7 sm:pl-10 gap-2 sm:gap-4 md:gap-6">
              {pillarStats.map((pillar) => {
                const heightPct = pillar.sampleCount > 0 ? Math.max(8, pillar.avgPct) : 10;

                return (
                  <div key={pillar.id} className="flex-1 flex flex-col items-center group max-w-[58px] sm:max-w-[75px] md:max-w-[90px] min-w-0">
                    <div className="flex flex-col items-center mb-1.5 group-hover:scale-105 transition-all text-center">
                      <span className="text-[11px] sm:text-xs font-bold font-sans-code text-slate-900 leading-none">
                        {pillar.sampleCount > 0 ? `${pillar.avgPct}%` : '0%'}
                      </span>
                      <span className="text-[9px] sm:text-[10px] font-medium font-sans-code text-slate-500 mt-0.5 whitespace-nowrap">
                        {pillar.sampleCount > 0 ? `${pillar.avgScore} pt` : '0 pt'}
                      </span>
                    </div>

                    <div 
                      className="w-full bg-slate-100 rounded-t-xl sm:rounded-t-2xl h-[130px] sm:h-[160px] flex items-end p-0.5 sm:p-1 shadow-inner relative overflow-hidden border border-slate-200"
                      title={`${pillar.title}: Rata-rata ${pillar.avgScore} dari ${pillar.bobot} Poin (Capaian ${pillar.avgPct}%)`}
                    >
                      <div 
                        className="w-full rounded-t-lg sm:rounded-t-xl transition-all duration-700 relative group-hover:brightness-110"
                        style={{ 
                          height: isChartVisible ? `${heightPct}%` : '0%', 
                          backgroundColor: pillar.color,
                          boxShadow: `0 4px 12px ${pillar.color}40`
                        }}
                      >
                        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>

                    <span className="text-[9px] sm:text-[11px] text-slate-800 font-sans-code font-bold mt-2 text-center truncate w-full block">
                      {pillar.code}
                    </span>
                    <span className="text-[8px] sm:text-[9px] text-slate-400 font-sans-code truncate w-full text-center block">
                      {pillar.shortTitle}
                    </span>
                    <span className="text-[8px] sm:text-[9px] text-slate-400 font-sans-code font-medium">
                      Maks: {pillar.bobot}pt
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sub-Footer */}
          <div className="pt-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-[10px] sm:text-xs font-sans-code text-slate-500">
            <span className="leading-snug">P1: CV (30pt) · P2: LinkedIn (20pt) · P3: Interview (35pt) · P4: Sikap (15pt)</span>
            <span className="text-gsm-blue-main font-bold whitespace-nowrap">Total: 100 Poin</span>
          </div>
        </div>

        {/* Right Column: Insight Average, Min, Max per Pilar (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-7 shadow-gsm-card border border-gsm-lilac flex flex-col justify-between space-y-4 hover:shadow-gsm-hover transition-all">
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-gsm-blue-main text-2xl">insights</span>
                <h2 className="font-coolvetica font-bold text-lg text-slate-900 tracking-wide">
                  Insight Nilai per Pilar
                </h2>
              </div>
              <p className="text-xs text-slate-500 font-sans-code tracking-wide mt-0.5">
                Rata-rata (Avg), Nilai Minimum & Maximum
              </p>
            </div>
            <span className="text-[10px] font-sans-code font-bold bg-blue-50 text-gsm-blue-main px-3 py-1 rounded-full border border-blue-200">
              4 Pilar Analisis
            </span>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
            {pillarStats.map((pillar) => (
              <div 
                key={pillar.id}
                className="p-3.5 rounded-2xl border border-gsm-lilac hover:border-slate-300 transition-all bg-slate-50/50 flex flex-col justify-between gap-2 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span 
                      className="w-7 h-7 rounded-xl text-white font-sans-code font-bold text-xs flex items-center justify-center shadow-sm"
                      style={{ backgroundColor: pillar.color }}
                    >
                      {pillar.code}
                    </span>
                    <div>
                      <h4 className="font-coolvetica font-bold text-slate-900 text-xs sm:text-sm">
                        {pillar.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-sans-code">
                        Bobot Maks: {pillar.bobot} Poin
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-sans-code text-slate-400 block uppercase font-bold">Rata-Rata</span>
                    <span className="font-coolvetica font-bold text-base text-slate-900">
                      {pillar.avgScore} <span className="text-xs font-sans text-slate-500 font-normal">/ {pillar.bobot} pt</span>
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] font-sans-code">
                  <div className="flex items-center gap-2">
                    <span className="text-[#C86047] bg-[#E59B86]/20 border border-[#E59B86]/40 px-2 py-0.5 rounded-md font-bold text-[10px]">
                      Min: {pillar.minScore} pt
                    </span>
                    <span className="text-[#0082A0] bg-[#00B0D8]/15 border border-[#00B0D8]/40 px-2 py-0.5 rounded-md font-bold text-[10px]">
                      Max: {pillar.maxScore} pt
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 font-bold text-slate-700">
                    <span className="text-[10px] text-slate-400">Capaian:</span>
                    <span>{pillar.avgPct}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-100 text-[11px] font-sans-code text-slate-500 flex items-center justify-between">
            <span>Sampel Terhitung: {gradedStudents.length} Mahasiswa</span>
            <button 
              onClick={onOpenInsert}
              className="text-gsm-blue-main font-bold hover:underline"
            >
              + Input Skor
            </button>
          </div>
        </div>

      </div>

      {/* ═══ 5. Mentor Progress List (Scroll Reveal) ═══ */}
      <div 
        ref={bottomRef}
        className={`bg-white rounded-3xl p-6 sm:p-7 shadow-gsm-card border border-gsm-lilac hover:shadow-gsm-hover transition-all duration-700 ease-out ${
          isBottomVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="flex flex-wrap justify-between items-center gap-3 mb-5 pb-4 border-b border-slate-100">
          <div>
            <h2 className="font-coolvetica font-bold text-lg text-slate-900 tracking-wide">
              Progres Input & Login Mentor
            </h2>
            <p className="text-xs text-slate-500 font-sans-code tracking-wide">
              Status pengisian nilai dan riwayat login per mentor kelompok
            </p>
          </div>
          <span className="text-[11px] bg-blue-50 text-gsm-blue-main border border-gsm-lilac px-3 py-1 rounded-full font-bold font-sans-code tracking-wide">
            {mentorList.length} Mentor Terdaftar
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 font-isi max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
          {mentorList.map((mName) => {
            const mStudents = students.filter(s => 
              s.mentor?.toLowerCase().includes(mName.toLowerCase()) || 
              mName.toLowerCase().includes(s.mentor?.toLowerCase() || '')
            );
            const mGraded = mStudents.filter(s => s.status !== 'Belum Dinilai');
            const lastLogin = getMentorLastLogin(mName, mentorLogins);
            const loginBadge = formatLastLogin(lastLogin);

            return (
              <div key={mName} className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 hover:border-gsm-blue-main hover:bg-slate-50/50 transition-all">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-gsm-blue-gradient text-white flex items-center justify-center font-bold text-xs shadow-sm font-sans-code flex-shrink-0">
                    {mName.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="truncate">
                    <p className="font-serif-judul font-bold text-xs text-slate-900 tracking-wide truncate">{mName}</p>
                    <p className="text-[10px] text-slate-500 font-sans-code tracking-wide">{mGraded.length}/{mStudents.length || 8} Maba Dinilai</p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full font-sans-code tracking-wider flex-shrink-0 ${
                  lastLogin ? 'bg-blue-50 text-gsm-blue-main border border-blue-200' : 'bg-slate-100 text-slate-500'
                }`}>
                  {loginBadge}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══ Super Admin Add Notice Modal (Portal to Body for True Fullscreen Overlay) ═══ */}
      {isAddNoticeOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-4 font-isi animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/80 overflow-hidden p-6 sm:p-7 space-y-5">
            
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-gsm-blue-gradient text-white flex items-center justify-center shadow-md shadow-gsm-blue-main/20">
                  <span className="material-symbols-outlined text-xl">campaign</span>
                </div>
                <div>
                  <h3 className="font-coolvetica font-bold text-lg text-slate-900">
                    Tambah Pengumuman / Reminder
                  </h3>
                  <p className="text-xs text-slate-500 font-sans-code">
                    Khusus Akun Super Admin & Panitia
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddNoticeOpen(false)}
                className="w-8 h-8 min-w-[32px] min-h-[32px] aspect-square rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors flex-shrink-0"
                title="Tutup"
              >
                <span className="material-symbols-outlined text-lg leading-none">close</span>
              </button>
            </div>

            {/* Form Input */}
            <form onSubmit={handleNoticeSubmit} className="space-y-4 text-xs font-isi">
              <div>
                <label className="block font-bold text-slate-700 mb-1 font-sans-code uppercase text-[10px]">
                  Judul Pengumuman:
                </label>
                <input 
                  type="text"
                  required
                  value={newNoticeTitle}
                  onChange={(e) => setNewNoticeTitle(e.target.value)}
                  placeholder="Misal: Batas Akhir Input Nilai Rapot..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-gsm-blue-main focus:bg-white text-slate-900 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 font-sans-code uppercase text-[10px]">
                  Kategori Pengumuman:
                </label>
                <select 
                  value={newNoticeCategory}
                  onChange={(e) => setNewNoticeCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-gsm-blue-main focus:bg-white text-slate-900 font-medium cursor-pointer"
                >
                  <option value="Info">Info Umum</option>
                  <option value="Urgent">Urgent / Penting</option>
                  <option value="Deadline">Deadline Penilaian</option>
                  <option value="System Update">Update Sistem</option>
                </select>
              </div>

              {/* Deadline Setting with Interactive Date & Time Picker */}
              <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <label className="font-bold text-slate-700 font-sans-code uppercase text-[10px] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-gsm-blue-main">event</span>
                    <span>Pilih Tanggal & Jam Batas Waktu (Opsional):</span>
                  </label>
                  {noticeDate && (
                    <span className="text-[10px] text-gsm-blue-main font-bold font-sans-code bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                      {formatDeadlineString(noticeDate, noticeTime)}
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400 font-sans-code mb-1 uppercase">Pilih Tanggal:</span>
                    <input 
                      type="date"
                      value={noticeDate}
                      onChange={(e) => setNoticeDate(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:border-gsm-blue-main focus:ring-1 focus:ring-gsm-blue-main text-slate-800 font-sans-code cursor-pointer"
                    />
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400 font-sans-code mb-1 uppercase">Pilih Jam (WIB):</span>
                    <input 
                      type="time"
                      value={noticeTime}
                      onChange={(e) => setNoticeTime(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:border-gsm-blue-main focus:ring-1 focus:ring-gsm-blue-main text-slate-800 font-sans-code cursor-pointer"
                    />
                  </div>
                </div>

                {/* Quick Shortcut Buttons */}
                <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                  <span className="text-[10px] font-semibold text-slate-400 font-sans-code">Pilihan cepat:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date().toISOString().split('T')[0];
                      setNoticeDate(today);
                      setNoticeTime('23:59');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-gsm-blue-main hover:text-gsm-blue-main text-[10px] font-bold text-slate-600 transition-all shadow-xs"
                  >
                    Hari Ini (23:59)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
                      setNoticeDate(tomorrow);
                      setNoticeTime('23:59');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-gsm-blue-main hover:text-gsm-blue-main text-[10px] font-bold text-slate-600 transition-all shadow-xs"
                  >
                    Besok (23:59)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      const daysToSat = (6 - now.getDay() + 7) % 7 || 7;
                      const sat = new Date(now.getTime() + daysToSat * 86400000).toISOString().split('T')[0];
                      setNoticeDate(sat);
                      setNoticeTime('23:59');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-gsm-blue-main hover:text-gsm-blue-main text-[10px] font-bold text-slate-600 transition-all shadow-xs"
                  >
                    Sabtu ini (23:59)
                  </button>
                  {noticeDate && (
                    <button
                      type="button"
                      onClick={() => {
                        setNoticeDate('');
                        setNoticeTime('23:59');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-[10px] font-bold text-rose-600 border border-rose-200 transition-all shadow-xs"
                    >
                      ✕ Hapus Deadline
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 font-sans-code uppercase text-[10px]">
                  Deskripsi / Isi Pengumuman:
                </label>
                <textarea 
                  required
                  rows={3}
                  value={newNoticeDesc}
                  onChange={(e) => setNewNoticeDesc(e.target.value)}
                  placeholder="Tuliskan detail pengumuman atau instruksi untuk para mentor..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs outline-none focus:border-gsm-blue-main focus:bg-white text-slate-800 leading-relaxed"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddNoticeOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gsm-blue-main hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-gsm-blue-main/20 transition-all"
                >
                  <span className="material-symbols-outlined text-base">send</span>
                  <span>Publikasikan Pengumuman</span>
                </button>
              </div>
            </form>

          </div>
        </div>,
        document.body
      )}

      {/* ═══ Notice Detail Modal (Clean White Card Layout) ═══ */}
      {selectedNoticeDetail && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 font-isi animate-in fade-in duration-200"
          onClick={() => setSelectedNoticeDetail(null)}
        >
          <div 
            className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden p-6 sm:p-8 space-y-5 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Detail */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {renderCategoryPill(selectedNoticeDetail.category)}
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-400 text-xs font-sans-code font-medium">{selectedNoticeDetail.date}</span>
                </div>
                <h3 className="font-coolvetica font-bold text-xl sm:text-2xl text-slate-900 leading-snug tracking-tight">
                  {selectedNoticeDetail.title}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedNoticeDetail(null)}
                className="w-8 h-8 min-w-[32px] min-h-[32px] aspect-square rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors flex-shrink-0"
                title="Tutup"
              >
                <span className="material-symbols-outlined text-lg leading-none">close</span>
              </button>
            </div>

            {/* Deadline Banner if exists (Minimalist Clean Neutral Card) */}
            {selectedNoticeDetail.deadline && (
              <div className="p-3.5 sm:p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center gap-3.5 text-xs">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 flex-shrink-0 shadow-xs">
                  <span className="material-symbols-outlined text-xl text-slate-500">schedule</span>
                </div>
                <div>
                  <span className="font-bold block text-[10px] uppercase tracking-wider font-sans-code text-slate-400">Batas Waktu (Deadline):</span>
                  <span className="font-bold text-slate-800 font-sans-code text-xs sm:text-sm">{selectedNoticeDetail.deadline}</span>
                </div>
              </div>
            )}

            {/* Body / Description Content (Clean natural typography on pure white) */}
            <div className="text-xs sm:text-sm text-slate-700 leading-relaxed font-isi whitespace-pre-line py-1 max-h-[340px] overflow-y-auto custom-scrollbar pr-1">
              {selectedNoticeDetail.description}
            </div>

            {/* Footer Detail */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-sans-code text-slate-500">
              <span className="text-slate-600 font-sans-code text-xs font-semibold">
                {selectedNoticeDetail.author === 'Super Administrator HRD' ? 'HRD HMSI Pilar Aksi' : (selectedNoticeDetail.author || 'Panitia Rawat Maba')}
              </span>
              <button
                type="button"
                onClick={() => setSelectedNoticeDetail(null)}
                className="px-6 py-2.5 bg-gsm-blue-main hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-gsm-blue-main/20 hover:shadow-lg font-reddit"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ═══ 6. Interactive KPI Student List Modal (Siap Cetak / Pending) ═══ */}
      {kpiModalType && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 font-isi animate-in fade-in duration-200"
          onClick={() => setKpiModalType(null)}
        >
          <div 
            className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-gsm-lilac overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={`p-5 sm:p-6 text-white relative overflow-hidden flex-shrink-0 ${
              kpiModalType === 'GRADED' ? 'bg-gsm-blue-gradient' : 'bg-gradient-to-r from-[#D96B4F] to-[#E59B86]'
            }`}>
              {/* Background ambient pattern */}
              <div className="absolute inset-0 bg-[url('/assets/BG4.svg')] bg-cover bg-center opacity-20 pointer-events-none" />

              <div className="relative z-10 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white flex-shrink-0 shadow-sm">
                    <span className="material-symbols-outlined text-2xl">
                      {kpiModalType === 'GRADED' ? 'verified' : 'pending_actions'}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="bg-white/20 backdrop-blur-md text-white font-sans-code font-bold text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-white/30">
                        {kpiModalType === 'GRADED' ? 'Status: Siap Cetak (Nilai & Pesan Lengkap)' : 'Status: Belum Lengkap / Pending'}
                      </span>
                      <span className="text-xs text-white/80 font-sans-code font-bold">
                        {kpiModalStudents.length} Mahasiswa
                      </span>
                    </div>
                    <h3 className="font-coolvetica font-bold text-lg sm:text-2xl text-white mt-1 leading-tight tracking-tight">
                      {kpiModalType === 'GRADED' 
                        ? 'Daftar Mahasiswa Siap Cetak Rapot' 
                        : 'Daftar Mahasiswa Belum Selesai (Pending)'}
                    </h3>
                    <p className="text-xs text-white/90 font-isi mt-0.5">
                      {kpiModalType === 'GRADED'
                        ? 'Daftar mahasiswa yang telah dinilai dan sudah memiliki pesan/evaluasi mentor lengkap (100% selesai).'
                        : 'Daftar mahasiswa yang belum dinilai atau belum melengkapi pesan dan catatan mentor.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setKpiModalType(null)}
                  className="w-9 h-9 min-w-[36px] min-h-[36px] aspect-square rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all flex-shrink-0 shadow-xs border border-white/25"
                  title="Tutup Modal"
                >
                  <span className="material-symbols-outlined text-xl leading-none">close</span>
                </button>
              </div>
            </div>

            {/* Filter & Search Toolbar */}
            <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
              {/* Search Bar */}
              <div className="relative flex-1 min-w-[220px]">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg pointer-events-none">
                  search
                </span>
                <input 
                  type="text"
                  placeholder="Cari nama, NRP, kelompok, mentor..."
                  value={kpiModalSearch}
                  onChange={(e) => setKpiModalSearch(e.target.value)}
                  className="w-full pl-10 pr-9 py-2 bg-white border border-slate-200 rounded-xl text-xs font-isi text-slate-800 placeholder-slate-400 focus:outline-none focus:border-gsm-blue-main shadow-xs"
                />
                {kpiModalSearch && (
                  <button 
                    onClick={() => setKpiModalSearch('')}
                    className="w-6 h-6 min-w-[24px] min-h-[24px] aspect-square rounded-full bg-slate-200 hover:bg-slate-300 text-slate-500 hover:text-slate-700 flex items-center justify-center absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm leading-none">close</span>
                  </button>
                )}
              </div>

              {/* Group Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600 font-sans-code">Kelompok:</span>
                <select
                  value={kpiModalGroup}
                  onChange={(e) => setKpiModalGroup(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-sans-code font-bold text-slate-700 outline-none focus:border-gsm-blue-main shadow-xs cursor-pointer"
                >
                  <option value="ALL">Semua Kelompok ({kpiModalUniqueGroups.length})</option>
                  {kpiModalUniqueGroups.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Student List Container (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 custom-scrollbar">
              {kpiModalStudents.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">person_search</span>
                  <p className="text-sm font-bold text-slate-600 font-coolvetica">Tidak ada mahasiswa yang sesuai filter</p>
                  <p className="text-xs font-sans-code text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau filter kelompok.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {kpiModalStudents.map((student) => {
                    const isGraded = kpiModalType === 'GRADED';
                    const hasScore = Number(student.finalScore || 0) > 0 || Object.values(student.scores || {}).some(v => Number(v) > 0);
                    const initials = (student.name || 'MB').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
                    const stStatus = student.studentStatus || student.student_status || 'Active';
                    const statusConf = STUDENT_STATUS_CONFIG[stStatus] || STUDENT_STATUS_CONFIG['Active'];

                    return (
                      <div 
                        key={student.id || student.nim}
                        className="bg-white border border-slate-200/90 hover:border-gsm-blue-main rounded-2xl p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-3 group"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-gsm-blue-gradient text-white flex items-center justify-center font-bold text-xs font-sans-code shadow-xs flex-shrink-0">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-serif-judul font-bold text-sm text-slate-900 truncate leading-snug">
                                {student.name}
                              </h4>
                              <p className="text-[11px] text-slate-500 font-sans-code">
                                {student.nim} • {student.prodi || 'Sistem Informasi'}
                              </p>
                            </div>
                          </div>

                          {/* Student Status & Evaluation Badges */}
                          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                            {/* Student Status Badge (Active, Hilang, Pindah, Tidak Mengumpulkan) */}
                            <span className={`inline-flex items-center gap-1 text-[10px] font-sans-code font-bold px-2.5 py-0.5 rounded-full border shadow-2xs ${statusConf.bg}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${statusConf.dot}`} />
                              <span>{statusConf.label}</span>
                            </span>

                            {/* Evaluation Status Badge */}
                            {isGraded ? (
                              <div className="text-right">
                                <span className="font-coolvetica font-bold text-base text-gsm-blue-main block leading-tight">
                                  {student.finalScore} <span className="text-[10px] text-slate-400 font-normal">/100</span>
                                </span>
                                <span className="inline-block bg-blue-50 text-gsm-blue-main border border-blue-200 text-[9px] font-bold font-sans-code px-2 py-0.5 rounded-full">
                                  {student.predicate || 'Siap Oprec'}
                                </span>
                              </div>
                            ) : hasScore ? (
                              <div className="text-right">
                                <span className="font-coolvetica font-bold text-sm text-amber-600 block leading-tight">
                                  {student.finalScore || 0} <span className="text-[10px] text-slate-400 font-normal">/100</span>
                                </span>
                                <span className="inline-block bg-amber-50 text-amber-700 border border-amber-300 text-[9px] font-bold font-sans-code px-2 py-0.5 rounded-full">
                                  Belum Ada Pesan
                                </span>
                              </div>
                            ) : (
                              <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[9px] font-bold font-sans-code px-2.5 py-0.5 rounded-full">
                                Belum Dinilai
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Meta Tags: Kelompok & Mentor */}
                        <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-slate-100 text-[11px] font-sans-code text-slate-500">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="material-symbols-outlined text-xs text-slate-400">group</span>
                            <span className="font-semibold text-slate-700 truncate">{student.kelompok}</span>
                            <span className="text-slate-300">•</span>
                            <span className="truncate text-slate-500">{student.mentor}</span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 pt-1">
                          {isGraded ? (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setKpiModalType(null);
                                  if (onOpenPdf) onOpenPdf(student);
                                }}
                                className="flex-1 py-1.5 px-3 bg-gsm-blue-main hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs font-reddit"
                              >
                                <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                                <span>Cetak Rapot PDF</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setKpiModalType(null);
                                  if (onOpenInsert) onOpenInsert(student);
                                }}
                                className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition-all"
                                title="Edit Nilai"
                              >
                                <span className="material-symbols-outlined text-sm">edit</span>
                                <span>Edit</span>
                              </button>
                            </>
                          ) : hasScore ? (
                            <button
                              type="button"
                              onClick={() => {
                                setKpiModalType(null);
                                if (onOpenInsert) onOpenInsert(student);
                              }}
                              className="w-full py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs font-reddit"
                            >
                              <span className="material-symbols-outlined text-sm">edit_note</span>
                              <span>+ Lengkapi Pesan Mentor</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setKpiModalType(null);
                                if (onOpenInsert) onOpenInsert(student);
                              }}
                              className="w-full py-1.5 px-3 bg-gsm-blue-main hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs font-reddit"
                            >
                              <span className="material-symbols-outlined text-sm">rate_review</span>
                              <span>+ Input Nilai Mahasiswa</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between text-xs font-sans-code text-slate-500 flex-shrink-0">
              <span>Menampilkan <strong>{kpiModalStudents.length}</strong> mahasiswa</span>
              <button
                type="button"
                onClick={() => setKpiModalType(null)}
                className="px-5 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-xl transition-all shadow-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
