import React, { useState, useMemo, useEffect, useRef } from 'react';
import { getMentorLastLogin } from '../lib/dataService';
import { PILLARS, calcPillarScore } from './InsertGradesModal';

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
  onDeleteNotice
}) {
  const [selectedMentor, setSelectedMentor] = useState('ALL');
  
  // Super Admin Notice Modal State
  const [isAddNoticeOpen, setIsAddNoticeOpen] = useState(false);
  const [newNoticeTitle, setNewNoticeTitle] = useState('');
  const [newNoticeDesc, setNewNoticeDesc] = useState('');
  const [newNoticeCategory, setNewNoticeCategory] = useState('Info');
  const [newNoticeDeadline, setNewNoticeDeadline] = useState('');

  // ═══════════════════════════════════════════════════════════════
  // SCROLL REVEAL OBSERVERS FOR SECTIONS
  // ═══════════════════════════════════════════════════════════════
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

  const isSuperAdmin = currentUser?.role === 'super_admin' || currentUser?.role === 'admin';
  const isMentor = currentUser?.role === 'mentor';
  const mentorGroupName = students?.[0]?.kelompok || 'Kelompok Mentoring';

  // Get list of unique mentors
  const mentorList = Array.from(new Set((students || []).map(s => s?.mentor))).filter(Boolean).sort();

  // Filter students based on search term and selected mentor filter
  const filteredStudents = useMemo(() => {
    return (students || []).filter(student => {
      if (!student) return false;
      const term = (searchTerm || '').toLowerCase();
      const matchesSearch = 
        (student.name || '').toLowerCase().includes(term) ||
        (student.nim || '').toLowerCase().includes(term) ||
        (student.kelompok || '').toLowerCase().includes(term) ||
        (student.prodi || '').toLowerCase().includes(term);
      
      const matchesMentor = selectedMentor === 'ALL' || student.mentor === selectedMentor;

      return matchesSearch && matchesMentor;
    });
  }, [students, searchTerm, selectedMentor]);

  // Dynamic stats
  const totalStudents = filteredStudents.length;
  const gradedStudents = filteredStudents.filter(s => s.status !== 'Belum Dinilai' && (s.finalScore > 0 || Object.values(s.scores || {}).some(v => v > 0)));
  const unratedStudents = filteredStudents.filter(s => !gradedStudents.includes(s));
  const totalClassesCount = isMentor ? 1 : (selectedMentor === 'ALL' ? classes.length : 1);

  // ═══════════════════════════════════════════════════════════════
  // STATISTIK ANALITIK 4 PILAR GSM (Average, Min, Max)
  // ═══════════════════════════════════════════════════════════════
  const pillarStats = useMemo(() => {
    const dataset = gradedStudents.length > 0 ? gradedStudents : [];

    return PILLARS.map(pillar => {
      const scoresList = dataset.map(s => {
        if (s.pillarScores && s.pillarScores[`${pillar.id}_score`] !== undefined && s.pillarScores[`${pillar.id}_score`] > 0) {
          return Number(s.pillarScores[`${pillar.id}_score`]);
        }
        return calcPillarScore(pillar, s.scores || {});
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
        avgPct: avgPct,
        minScore: Math.round(min * 10) / 10,
        maxScore: Math.round(max * 10) / 10,
        sampleCount: scoresList.length
      };
    });
  }, [gradedStudents]);

  const handleNoticeSubmit = (e) => {
    e.preventDefault();
    if (!newNoticeTitle.trim() || !newNoticeDesc.trim()) return;

    if (onAddNotice) {
      onAddNotice({
        title: newNoticeTitle.trim(),
        description: newNoticeDesc.trim(),
        category: newNoticeCategory,
        deadline: newNoticeDeadline.trim() || null,
        author: currentUser?.name || 'Panitia Rawat Maba',
        date: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
      });
    }

    setNewNoticeTitle('');
    setNewNoticeDesc('');
    setNewNoticeCategory('Info');
    setNewNoticeDeadline('');
    setIsAddNoticeOpen(false);
  };

  return (
    <div className="space-y-8 font-isi relative z-10 w-full">
      
      {/* ═══ 1. Uniform Academic Header Banner matching Kriteria & Rubrik ═══ */}
      <div className="relative bg-white p-6 sm:p-8 rounded-3xl shadow-gsm-card border border-gsm-lilac flex flex-wrap items-center justify-between gap-6 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
        
        {/* Watermark BG4.svg */}
        <div 
          className="absolute inset-0 bg-[url('/assets/BG4.svg')] bg-cover bg-center opacity-[0.06] pointer-events-none z-0"
        />

        <div className="relative z-10 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gsm-blue-gradient text-white flex items-center justify-center shadow-md shadow-gsm-blue-main/20 flex-shrink-0">
            <span className="material-symbols-outlined text-3xl">dashboard</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-gsm-cream text-slate-950 font-sans-code font-bold text-[10px] uppercase tracking-wider px-3 py-0.5 rounded-full border border-yellow-200">
                Dashboard Rekapitulasi
              </span>
              <span className="text-xs text-slate-400 font-sans-code font-bold">Departemen HRD</span>
            </div>
            <h1 className="font-coolvetica font-bold text-2xl text-slate-900 mt-1">
              Rekapitulasi & Statistik Penilaian Rapot
            </h1>
            <p className="text-xs text-slate-500 font-isi mt-0.5">
              {isMentor 
                ? `Monitoring capaian 4 pilar evaluasi kelompok: ${mentorGroupName} (${totalStudents} Maba)` 
                : `Monitoring capaian 4 pilar evaluasi, status pengisian nilai per mentor, dan sebaran data mahasiswa.`}
            </p>
          </div>
        </div>

        {/* Header Right Controls */}
        <div className="relative z-10 flex flex-wrap items-center gap-3">
          {!isMentor && (
            <div className="flex items-center gap-2 bg-slate-50 border border-gsm-lilac px-3 py-1.5 rounded-2xl shadow-sm">
              <span className="material-symbols-outlined text-sm text-gsm-blue-main">filter_list</span>
              <span className="text-[11px] font-bold text-slate-700 font-sans-code">Mentor:</span>
              <select 
                value={selectedMentor}
                onChange={(e) => setSelectedMentor(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 outline-none font-isi cursor-pointer"
              >
                <option value="ALL">Semua Mentor ({mentorList.length})</option>
                {mentorList.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          )}

          <div className="bg-blue-50 border border-gsm-lilac px-4 py-2.5 rounded-2xl text-center shadow-sm">
            <span className="text-[10px] font-sans-code text-slate-500 uppercase font-bold block">Dinilai</span>
            <span className="font-coolvetica font-bold text-xl text-gsm-blue-main">{gradedStudents.length}/{totalStudents}</span>
          </div>
        </div>
      </div>

      {/* ═══ 2. 4 Dynamic KPI Summary Cards Grid (Scroll Staggered Reveal) ═══ */}
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
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs font-semibold text-slate-500 font-isi tracking-wide">
                {isMentor ? 'Kelompok Anda' : 'Total Kelompok'}
              </span>
              <span className="bg-blue-50 text-gsm-blue-main text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-gsm-lilac font-sans-code tracking-wider">
                {isMentor ? mentorGroupName : (selectedMentor === 'ALL' ? '34 Kelompok' : selectedMentor)}
              </span>
            </div>
            <div className="flex items-end gap-3 my-1">
              <span className="font-coolvetica font-bold text-3xl text-slate-900 tracking-wide">{totalClassesCount}</span>
              <span className="text-xs text-slate-400 font-sans-code mb-1 tracking-wide">{isMentor ? mentorGroupName : 'Kelompok Mentoring'}</span>
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 font-sans-code flex items-center justify-between tracking-wide">
            <span>{isMentor ? `Mentor: ${currentUser?.name}` : (selectedMentor === 'ALL' ? '34 Mentor Aktif' : `Mentor: ${selectedMentor}`)}</span>
            <span className="text-gsm-blue-main font-bold">100% Aktif</span>
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
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs font-semibold text-slate-500 font-isi tracking-wide">Jumlah Mahasiswa Maba</span>
              <span className="bg-cyan-50 text-cyan-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-gsm-cyan/30 font-sans-code tracking-wider">
                Departemen HRD
              </span>
            </div>
            <div className="flex items-end gap-3 my-1">
              <span className="font-coolvetica font-bold text-3xl text-slate-900 tracking-wide">{totalStudents}</span>
              <span className="text-xs text-slate-400 font-sans-code mb-1 tracking-wide">Mahasiswa</span>
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 font-sans-code flex items-center justify-between tracking-wide">
            <span>{isMentor ? `Anggota Kelompok ${mentorGroupName}` : 'Maba SI & Inovasi Digital'}</span>
            <span className="text-gsm-blue-main font-bold">Terdaftar</span>
          </div>
        </div>

        {/* KPI 3: Nilai Selesai */}
        <div 
          className={`bg-white rounded-3xl p-6 shadow-gsm-card border border-gsm-lilac hover:shadow-gsm-hover transition-all duration-500 flex flex-col justify-between ${
            isKpiVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
          style={{ transitionDelay: '190ms' }}
        >
          <div>
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs font-semibold text-slate-500 font-isi tracking-wide">Rapot Selesai Dinilai</span>
              <span className="bg-gsm-cream text-slate-950 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-yellow-200 font-sans-code tracking-wider">
                {Math.round((gradedStudents.length / (totalStudents || 1)) * 100)}% Selesai
              </span>
            </div>
            <div className="flex items-end gap-3 my-1">
              <span className="font-coolvetica font-bold text-3xl text-slate-900 tracking-wide">{gradedStudents.length}</span>
              <span className="text-xs text-slate-400 font-sans-code mb-1 tracking-wide">/ {totalStudents} Maba</span>
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 font-sans-code flex items-center justify-between tracking-wide">
            <span>Siap Cetak Rapot</span>
            <button onClick={onOpenInsert} className="text-gsm-blue-main font-bold hover:underline">Input Nilai</button>
          </div>
        </div>

        {/* KPI 4: Belum Dinilai */}
        <div 
          className={`bg-white rounded-3xl p-6 shadow-gsm-card border border-gsm-lilac hover:shadow-gsm-hover transition-all duration-500 flex flex-col justify-between ${
            isKpiVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
          style={{ transitionDelay: '260ms' }}
        >
          <div>
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs font-semibold text-slate-500 font-isi tracking-wide">Belum Dinilai (Pending)</span>
              <span className="bg-[#E59B86]/20 text-[#C86047] text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-[#E59B86]/40 font-sans-code tracking-wider">
                {unratedStudents.length} Maba
              </span>
            </div>
            <div className="flex items-end gap-3 my-1">
              <span className="font-coolvetica font-bold text-3xl text-slate-900 tracking-wide">{unratedStudents.length}</span>
              <span className="text-xs text-slate-400 font-sans-code mb-1 tracking-wide">Maba Belum Nilai</span>
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 font-sans-code flex items-center justify-between tracking-wide">
            <span>Perlu Penilaian Mentor</span>
            <button onClick={onOpenInsert} className="text-[#C86047] font-bold hover:underline">Isi Skor</button>
          </div>
        </div>

      </div>

      {/* ═══ 3. Main Analytics: Sumbu X 4 Pilar Bar Chart + Insight (Scroll Reveal) ═══ */}
      <div 
        ref={chartRef}
        className={`grid grid-cols-1 lg:grid-cols-12 gap-6 transition-all duration-700 ease-out ${
          isChartVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        
        {/* Left Column: Grade Distribution Chart per Pilar (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-7 shadow-gsm-card border border-gsm-lilac flex flex-col justify-between hover:shadow-gsm-hover transition-all">
          <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-gsm-blue-main text-2xl">bar_chart</span>
                <h2 className="font-coolvetica font-bold text-lg text-slate-900 tracking-wide">
                  Statistik Capaian Rata-Rata per Pilar
                </h2>
              </div>
              <p className="text-xs text-slate-500 font-sans-code tracking-wide mt-0.5">
                Capaian kompetensi 4 pilar mentoring mahasiswa baru ({gradedStudents.length} mahasiswa telah dinilai)
              </p>
            </div>

            <div className="flex items-center gap-2 text-[10px] font-sans-code bg-slate-50 border border-gsm-lilac px-3 py-1 rounded-full">
              <span className="w-2.5 h-2.5 rounded-full bg-gsm-blue-main"></span>
              <span className="text-slate-600 font-bold">Rata-Rata Capaian (%)</span>
            </div>
          </div>

          {/* Bar Chart Sumbu X: 4 Pilar */}
          <div className="relative flex-1 min-h-[240px] flex items-end justify-between px-4 pb-10 pt-8 border-b border-slate-100">
            {/* Grid background dashed lines */}
            <div className="absolute left-12 right-0 top-0 h-full flex flex-col justify-between pb-10 pointer-events-none opacity-40">
              <div className="w-full border-t border-dashed border-slate-300"></div>
              <div className="w-full border-t border-dashed border-slate-300"></div>
              <div className="w-full border-t border-dashed border-slate-300"></div>
              <div className="w-full border-t border-dashed border-slate-300"></div>
            </div>

            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-[10px] text-slate-400 font-sans-code pb-10 pointer-events-none">
              <span>100%</span>
              <span>75%</span>
              <span>50%</span>
              <span>0%</span>
            </div>

            {/* 4 Pillars Bars (Sumbu X) */}
            <div className="relative z-10 w-full flex items-end justify-around pl-12 gap-3 sm:gap-6">
              {pillarStats.map((pillar) => {
                const heightPct = pillar.sampleCount > 0 ? Math.max(8, pillar.avgPct) : 10;

                return (
                  <div key={pillar.id} className="flex-1 flex flex-col items-center group max-w-[90px]">
                    <span className="text-[11px] font-bold font-sans-code text-slate-800 mb-1.5 opacity-90 group-hover:scale-110 transition-all">
                      {pillar.sampleCount > 0 ? `${pillar.avgScore} pt` : '0 pt'}
                    </span>

                    <div className="w-full bg-slate-100 rounded-t-2xl h-[160px] flex items-end p-1 shadow-inner relative overflow-hidden border border-slate-200">
                      <div 
                        className="w-full rounded-t-xl transition-all duration-700 relative group-hover:brightness-110"
                        style={{ 
                          height: isChartVisible ? `${heightPct}%` : '0%', 
                          backgroundColor: pillar.color,
                          boxShadow: `0 4px 12px ${pillar.color}40`
                        }}
                      >
                        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>

                    <span className="text-[10px] sm:text-[11px] text-slate-800 font-sans-code font-bold mt-2.5 text-center truncate w-full block">
                      {pillar.code}
                    </span>
                    <span className="text-[9px] text-slate-400 font-sans-code truncate w-full text-center block">
                      {pillar.shortTitle}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sub-Footer */}
          <div className="pt-4 flex flex-wrap items-center justify-between text-xs font-sans-code text-slate-500">
            <span>P1: CV (30pt) · P2: LinkedIn (20pt) · P3: Interview (35pt) · P4: Sikap (15pt)</span>
            <span className="text-gsm-blue-main font-bold">Total: 100 Poin</span>
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

      {/* ═══ 4. Mentor Progress & Dynamic Reminders (Scroll Reveal) ═══ */}
      <div 
        ref={bottomRef}
        className={`grid grid-cols-1 lg:grid-cols-12 gap-6 transition-all duration-700 ease-out ${
          isBottomVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        
        {/* Mentor Progress List (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 shadow-gsm-card border border-gsm-lilac flex flex-col hover:shadow-gsm-hover transition-all">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="font-coolvetica font-bold text-lg text-slate-900 tracking-wide">
                Progres Input Mentor
              </h2>
              <p className="text-xs text-slate-500 font-sans-code tracking-wide">
                Status pengisian nilai per mentor kelompok
              </p>
            </div>
            <span className="text-[11px] bg-blue-50 text-gsm-blue-main border border-gsm-lilac px-3 py-1 rounded-full font-bold font-sans-code tracking-wide">
              {mentorList.length} Mentor
            </span>
          </div>

          <div className="space-y-3 flex-1 max-h-[380px] overflow-y-auto font-isi pr-1 custom-scrollbar">
            {mentorList.map((mName) => {
              const mStudents = students.filter(s => 
                s.mentor?.toLowerCase().includes(mName.toLowerCase()) || 
                mName.toLowerCase().includes(s.mentor?.toLowerCase() || '')
              );
              const mGraded = mStudents.filter(s => s.status !== 'Belum Dinilai');
              const lastLogin = getMentorLastLogin(mName, mentorLogins);
              const loginBadge = formatLastLogin(lastLogin);

              return (
                <div key={mName} className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 hover:border-gsm-blue-main transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gsm-blue-gradient text-white flex items-center justify-center font-bold text-xs shadow-sm font-sans-code">
                      {mName.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-serif-judul font-bold text-xs text-slate-900 tracking-wide">{mName}</p>
                      <p className="text-[10px] text-slate-500 font-sans-code tracking-wide">{mGraded.length}/{mStudents.length || 8} Maba Dinilai</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full font-sans-code tracking-wider ${
                    lastLogin ? 'bg-blue-50 text-gsm-blue-main border border-blue-200' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {loginBadge}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Reminders / Notice Board with Super Admin Add & Delete Action (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-gsm-blue-main text-2xl">notifications_active</span>
              <div>
                <h2 className="font-coolvetica font-bold text-lg text-slate-900 tracking-wide">
                  Reminder & Pengumuman Panitia
                </h2>
                <span className="text-[11px] font-sans-code text-slate-500 tracking-wide">{notices.length} Catatan Aktif</span>
              </div>
            </div>

            {/* Super Admin Add Notice Button */}
            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => setIsAddNoticeOpen(true)}
                className="bg-gsm-blue-main hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-2xl transition-all shadow-md shadow-gsm-blue-main/20 flex items-center gap-1.5 font-reddit"
              >
                <span className="material-symbols-outlined text-base">add_circle</span>
                <span>Tambah Pengumuman</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {notices.map((notice, idx) => {
              const cat = (notice.category || 'Info').toLowerCase();
              let badgeStyle = 'bg-blue-50 text-gsm-blue-main border border-gsm-lilac';
              if (cat.includes('urgent') || cat.includes('darurat')) {
                badgeStyle = 'bg-[#E59B86]/20 text-[#C86047] border border-[#E59B86]/40';
              } else if (cat.includes('deadline') || cat.includes('tenggat')) {
                badgeStyle = 'bg-[#E59B86]/30 text-rose-900 border border-rose-300';
              } else if (cat.includes('system') || cat.includes('update')) {
                badgeStyle = 'bg-[#C896E0]/20 text-[#8A3AB9] border border-[#C896E0]/40';
              }

              return (
                <div 
                  key={notice.id}
                  className={`bg-white rounded-3xl p-5 shadow-gsm-card border border-gsm-lilac hover:border-gsm-blue-main transition-all duration-500 relative overflow-hidden flex flex-col justify-between group ${
                    isBottomVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-6 scale-95'
                  }`}
                  style={{ transitionDelay: `${idx * 80}ms` }}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] font-sans-code ${badgeStyle}`}>
                        {notice.category || 'Info'}
                      </span>
                      <span className="text-slate-400 text-[10px] font-sans-code">{notice.date}</span>
                    </div>

                    <h3 className="font-serif-judul font-bold text-xs text-slate-900 leading-snug mb-1.5 tracking-wide">
                      {notice.title}
                    </h3>
                    <p className="text-[11px] text-slate-600 line-clamp-3 font-isi leading-relaxed">
                      {notice.description}
                    </p>

                    {notice.deadline && (
                      <div className="mt-2.5 inline-flex items-center gap-1 text-[10px] font-sans-code font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                        <span className="material-symbols-outlined text-xs">schedule</span>
                        <span>Deadline: {notice.deadline}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] font-sans-code text-slate-400">
                    <span>{notice.author || 'Panitia Rawat Maba'}</span>

                    {/* Delete button for Super Admin */}
                    {isSuperAdmin && onDeleteNotice ? (
                      <button
                        type="button"
                        onClick={() => {
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
                      <span className="text-gsm-blue-main font-bold">Terverifikasi</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* ═══ Super Admin Add Notice Modal ═══ */}
      {isAddNoticeOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 font-isi animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-gsm-lilac overflow-hidden p-6 sm:p-7 space-y-5">
            
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
                className="text-slate-400 hover:text-slate-700 bg-slate-100 p-2 rounded-full"
              >
                <span className="material-symbols-outlined text-base leading-none">close</span>
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
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs outline-none focus:border-gsm-blue-main focus:bg-white text-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 font-sans-code uppercase text-[10px]">
                    Kategori Pengumuman:
                  </label>
                  <select
                    value={newNoticeCategory}
                    onChange={(e) => setNewNoticeCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs outline-none focus:border-gsm-blue-main focus:bg-white text-slate-800 cursor-pointer"
                  >
                    <option value="Info">Info Umum</option>
                    <option value="Urgent">Urgent / Penting</option>
                    <option value="Deadline">Deadline Penilaian</option>
                    <option value="System Update">System Update</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1 font-sans-code uppercase text-[10px]">
                    Batas Waktu (Opsional):
                  </label>
                  <input 
                    type="text"
                    value={newNoticeDeadline}
                    onChange={(e) => setNewNoticeDeadline(e.target.value)}
                    placeholder="Misal: Jumat, 23:59 WIB"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs outline-none focus:border-gsm-blue-main focus:bg-white text-slate-800"
                  />
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
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gsm-blue-main hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-gsm-blue-main/20"
                >
                  <span className="material-symbols-outlined text-base">send</span>
                  <span>Publikasikan Pengumuman</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
