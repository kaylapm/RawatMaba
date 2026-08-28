import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { PILLARS, calcPillarScore, getPredicate } from './InsertGradesModal';

export default function GeneratePdfModal({ 
  isOpen, 
  onClose, 
  student, 
  students = [], 
  isFullScreen = true,
  onNavigateToInsert,
  showToast
}) {
  const [selectedStudentId, setSelectedStudentId] = useState(student?.id || students?.[0]?.id);
  const [currentPageIndex, setCurrentPageIndex] = useState(1); // 1..6
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState(null); // 'sent' | 'error' | null
  const [lastErrorMessage, setLastErrorMessage] = useState('');

  // Hidden print container ref for html2pdf
  const pdfExportContainerRef = useRef(null);

  useEffect(() => {
    if (student?.id) {
      setSelectedStudentId(student.id);
    } else if (students?.[0]?.id && !selectedStudentId) {
      setSelectedStudentId(students[0].id);
    }
  }, [student, isOpen, students]);

  if (isOpen === false && !isFullScreen) return null;

  // Always resolve the freshest student object
  const currentStudent = students?.find(s => s.id === selectedStudentId) || student || students?.[0] || {};

  // Compute pillar scores dynamically with fallbacks
  const p1Score = currentStudent.pillarScores?.p1_score ?? (currentStudent.scores ? calcPillarScore(PILLARS[0], currentStudent.scores) : 0);
  const p2Score = currentStudent.pillarScores?.p2_score ?? (currentStudent.scores ? calcPillarScore(PILLARS[1], currentStudent.scores) : 0);
  const p3Score = currentStudent.pillarScores?.p3_score ?? (currentStudent.scores ? calcPillarScore(PILLARS[2], currentStudent.scores) : 0);
  const p4Score = currentStudent.pillarScores?.p4_score ?? (currentStudent.scores ? calcPillarScore(PILLARS[3], currentStudent.scores) : 0);

  // Group and mentor name formatting
  const kelompokDisplay = currentStudent.kelompok?.startsWith('Kelompok')
    ? currentStudent.kelompok
    : `Kelompok ${currentStudent.kelompok || '-'}`;

  const rawMentorName = (currentStudent.mentor || '').replace(/^Kak\s*/i, '').trim();
  const mentorTwoWords = rawMentorName ? rawMentorName.split(/\s+/).slice(0, 2).join(' ') : '-';

  // Group average score calculation
  const groupStudents = (students || []).filter(s => {
    if (!s.kelompok || !currentStudent.kelompok) return false;
    const sKel = String(s.kelompok).toLowerCase().replace(/^kelompok\s*/i, '').trim();
    const cKel = String(currentStudent.kelompok).toLowerCase().replace(/^kelompok\s*/i, '').trim();
    return sKel === cKel;
  });

  const validGroupScores = groupStudents
    .map(s => Number(s.finalScore || 0))
    .filter(sc => sc > 0);

  const groupAvgScore = validGroupScores.length > 0
    ? (Math.round((validGroupScores.reduce((a, b) => a + b, 0) / validGroupScores.length) * 10) / 10).toFixed(1)
    : (currentStudent.finalScore ? Number(currentStudent.finalScore).toFixed(1) : '0.0');

  // Helper: Extract 2-letter Initials for Avatar
  const getInitials = (name) => {
    if (!name) return 'MB';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  // Helper: Predicate formatting
  const predicateInfo = getPredicate(currentStudent.finalScore);
  const predicateLabel = currentStudent.predicate && currentStudent.predicate !== '-' 
    ? currentStudent.predicate 
    : predicateInfo.grade;

  // Helper: Overall rank calculation across all students
  const sortedStudents = [...(students || [])].sort((a, b) => (Number(b.finalScore) || 0) - (Number(a.finalScore) || 0));
  const studentRankIndex = sortedStudents.findIndex(s => s.id === currentStudent.id);
  const overallRank = studentRankIndex !== -1 ? studentRankIndex + 1 : 1;

  // Helper: generate exact 6-page PDF by rendering each page canvas individually (100% exact 6 pages, Zero Cutoffs!)
  const generateMultiPagePdf = async () => {
    const { jsPDF } = await import('jspdf');
    const html2canvasModule = await import('html2canvas');
    const html2canvas = html2canvasModule.default || html2canvasModule;

    // Small delay to ensure images in the newly mounted DOM are fully ready
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const container = pdfExportContainerRef.current;
    if (!container) throw new Error('Container export tidak ditemukan');
    const pageElements = Array.from(container.children);

    if (pageElements.length === 0) throw new Error('Halaman rapot tidak ditemukan');

    // Create a pristine, strict A4 Portrait jsPDF document
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    for (let i = 0; i < pageElements.length; i++) {
      const pageEl = pageElements[i];
      if (i > 0) {
        pdf.addPage('a4', 'portrait');
      }

      const canvas = await html2canvas(pageEl, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      // Stamp exactly 210mm x 297mm full-bleed without any margins or clipping
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
    }

    return pdf;
  };

  const handleDownloadPdf = async () => {
    setIsGenerating(true);
    const filename = `Rapot_Rawat_Maba_${currentStudent.nim}_${(currentStudent.name || 'Mahasiswa').replace(/\s+/g, '_')}.pdf`;
    try {
      const pdf = await generateMultiPagePdf();
      pdf.save(filename);

      setIsGenerating(false);
      if (showToast) {
        showToast(`Rapot PDF untuk ${currentStudent.name || 'mahasiswa'} berhasil diunduh!`);
      }
    } catch (err) {
      console.error('PDF Generation Error:', err);
      setIsGenerating(false);
      if (showToast) {
        showToast(`Gagal mengunduh PDF: ${err.message || 'Terjadi kesalahan'}`);
      }
    }
  };

  const handleSendEmail = async () => {
    if (!currentStudent.email || !currentStudent.email.trim()) {
      if (showToast) {
        showToast(`Email untuk ${currentStudent.name || 'mahasiswa'} belum diisi. Silakan masukkan di Data Mahasiswa.`);
      }
      return;
    }

    setIsSendingEmail(true);
    setEmailStatus(null);
    setLastErrorMessage('');

    const recipientEmail = currentStudent.email.trim();
    const pdfFilename = `Rapot_Rawat_Maba_${currentStudent.nim}_${(currentStudent.name || 'Mahasiswa').replace(/\s+/g, '_')}.pdf`;

    try {
      const pdf = await generateMultiPagePdf();
      const pdfDataUrl = pdf.output('datauristring');
      const pdfBase64 = pdfDataUrl.split(',')[1];

      const { data, error } = await supabase.functions.invoke('send-rapot-email', {
        body: {
          to_email: recipientEmail,
          to_name: currentStudent.name,
          student_nim: currentStudent.nim,
          student_prodi: currentStudent.prodi,
          kelompok: currentStudent.kelompok,
          mentor: mentorTwoWords,
          nilai_akhir: currentStudent.finalScore,
          predikat: predicateLabel,
          status: currentStudent.status,
          pdf_base64: pdfBase64,
          pdf_filename: pdfFilename,
        },
      });

      if (error) {
        let errorDetail = error.message;
        try {
          if (error.context) {
            const errJson = await error.context.json();
            if (errJson?.error) errorDetail = errJson.error;
          }
        } catch {}
        setLastErrorMessage(errorDetail || 'Gagal mengirim email.');
        throw new Error(errorDetail || 'Gagal mengirim email.');
      }

      if (data?.error) {
        setLastErrorMessage(data.error);
        throw new Error(data.error);
      }

      // Auto download backup
      pdf.save(pdfFilename);

      setEmailStatus('sent');
      if (showToast) {
        showToast(`Rapot PDF berhasil dikirimkan ke ${recipientEmail}!`);
      }
      setTimeout(() => setEmailStatus(null), 6000);
    } catch (err) {
      console.error('Email error:', err);
      setLastErrorMessage(prev => prev || err.message || 'Gagal mengirim email.');
      setEmailStatus('error');
      setTimeout(() => setEmailStatus(null), 10000);
    } finally {
      setIsSendingEmail(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // REUSABLE PAGE 1: COVER RAPOT (Overlay text directly on template slots)
  // ═══════════════════════════════════════════════════════════════════════════
  const renderCoverPage = (isPrint = false) => (
    <div
      className={`relative w-full bg-white overflow-hidden ${
        isPrint
          ? 'w-[794px] h-[1123px] max-w-[794px] max-h-[1123px] min-w-[794px] min-h-[1123px] m-0 p-0 shadow-none'
          : 'aspect-[1/1.414] max-w-[760px] w-full mx-auto rounded-3xl border border-slate-300 shadow-2xl'
      }`}
      style={{
        boxSizing: 'border-box',
        ...(isPrint ? { width: '794px', height: '1123px' } : {})
      }}
    >
      {/* Background Vector Template from /assets/Rapot/1 - COVER.svg */}
      <img
        src="/assets/Rapot/1 - COVER.png"
        alt="Cover Template Rawat Maba"
        crossOrigin="anonymous"
        className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none z-0"
      />

      {/* 1. Student Name: Large prominent SVG Text with crisp rounded vector stroke */}
      {(() => {
        const studentName = (currentStudent.name || 'Nama Peserta').trim();
        const words = studentName.split(/\s+/);
        
        let lines = [studentName];
        if (words.length >= 3) {
          lines = [words.slice(0, 2).join(' '), words.slice(2).join(' ')];
        } else if (words.length === 2 && studentName.length > 20) {
          lines = [words[0], words[1]];
        }

        const isTwoLines = lines.length === 2;
        const maxLineLen = Math.max(...lines.map(l => l.length));
        
        const dynamicFontSize = isTwoLines
          ? (maxLineLen > 18 ? 76 : (maxLineLen > 14 ? 86 : 94))
          : (maxLineLen > 24 ? 85 : (maxLineLen > 18 ? 100 : 116));
        const dynamicStrokeWidth = isTwoLines ? 20 : 24;
        const gradId = isPrint ? "coverNameStrokeGradPrint" : "coverNameStrokeGrad";

        return (
          <div 
            className="absolute left-0 right-0 z-10 flex items-center justify-center pointer-events-none px-6 sm:px-10"
            style={{ 
              top: isTwoLines ? '53.0%' : '55.5%', 
              height: isTwoLines ? '15.0%' : '12.0%' 
            }}
          >
            <svg viewBox={isTwoLines ? "0 0 1200 240" : "0 0 1200 170"} className="w-full h-full max-w-[92%] overflow-visible">
              <defs>
                <linearGradient 
                  id={gradId} 
                  x1="0%" 
                  y1="0%" 
                  x2="100%" 
                  y2="0%"
                >
                  <stop offset="0%" stopColor="#002DB3" />
                  <stop offset="35%" stopColor="#0055FF" />
                  <stop offset="70%" stopColor="#00B0D8" />
                  <stop offset="100%" stopColor="#38BDF8" />
                </linearGradient>
              </defs>
              {isTwoLines ? (
                <>
                  <text
                    x="50%"
                    y="28%"
                    dominantBaseline="central"
                    textAnchor="middle"
                    className="title-student-cover-gsm"
                    fontFamily="Coolvetica, Space Grotesk, sans-serif"
                    fontWeight="bold"
                    fontSize={dynamicFontSize}
                    fill="#ffffff"
                    stroke={`url(#${gradId})`}
                    strokeWidth={dynamicStrokeWidth}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    paintOrder="stroke fill"
                    style={{ 
                      letterSpacing: '0.06em',
                      stroke: `url(#${gradId})`
                    }}
                  >
                    {lines[0]}
                  </text>
                  <text
                    x="50%"
                    y="72%"
                    dominantBaseline="central"
                    textAnchor="middle"
                    className="title-student-cover-gsm"
                    fontFamily="Coolvetica, Space Grotesk, sans-serif"
                    fontWeight="bold"
                    fontSize={dynamicFontSize}
                    fill="#ffffff"
                    stroke={`url(#${gradId})`}
                    strokeWidth={dynamicStrokeWidth}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    paintOrder="stroke fill"
                    style={{ 
                      letterSpacing: '0.06em',
                      stroke: `url(#${gradId})`
                    }}
                  >
                    {lines[1]}
                  </text>
                </>
              ) : (
                <text
                  x="50%"
                  y="52%"
                  dominantBaseline="central"
                  textAnchor="middle"
                  className="title-student-cover-gsm"
                  fontFamily="Coolvetica, Space Grotesk, sans-serif"
                  fontWeight="bold"
                  fontSize={dynamicFontSize}
                  fill="#ffffff"
                  stroke={`url(#${gradId})`}
                  strokeWidth={dynamicStrokeWidth}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  paintOrder="stroke fill"
                  style={{ 
                    letterSpacing: '0.06em',
                    stroke: `url(#${gradId})`
                  }}
                >
                  {lines[0]}
                </text>
              )}
            </svg>
          </div>
        );
      })()}

      {/* 2. Top White Pill: Exact mathematical SVG coordinates (y: 70.78%, height: 3.72%, x: 22.86%) */}
      <div 
        className="absolute z-10 flex items-center justify-center pointer-events-none px-2"
        style={{ top: '70.78%', left: '22.86%', right: '22.86%', height: '3.72%' }}
      >
        <p className="font-isi font-extrabold text-xs sm:text-sm md:text-[16px] text-[#003CEC] tracking-normal text-center truncate leading-none">
          NRP. <span className="font-sans-code">{currentStudent.nim || '502624XXXX'}</span>
          <span className="mx-2 text-[#003CEC]">•</span>
          <span>{kelompokDisplay}</span>
        </p>
      </div>

      {/* 3. Bottom Blue Pill: Exact mathematical SVG coordinates for right-side mentor slot (y: 74.5%, height: 4.8%, x: 54.5%) */}
      <div 
        className="absolute z-10 flex items-center justify-center pointer-events-none px-3"
        style={{ top: '74.5%', left: '54.5%', right: '23%', height: '4.8%' }}
      >
        <p className="font-isi font-extrabold text-xs sm:text-sm md:text-[16px] text-white text-center truncate leading-none">
          {mentorTwoWords}
        </p>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // REUSABLE STATIC PAGES: HALAMAN 2 (KAHIMA) & HALAMAN 3 (KAWADEP HRD & PIC)
  // ═══════════════════════════════════════════════════════════════════════════
  const renderStaticPage = (imagePath, altText, isPrint = false) => (
    <div
      className={`relative w-full bg-white overflow-hidden ${
        isPrint
          ? 'w-[794px] h-[1123px] max-w-[794px] max-h-[1123px] min-w-[794px] min-h-[1123px] m-0 p-0 shadow-none'
          : 'aspect-[1/1.414] max-w-[760px] w-full mx-auto rounded-3xl border border-slate-300 shadow-2xl'
      }`}
      style={{
        boxSizing: 'border-box',
        ...(isPrint ? { width: '794px', height: '1123px' } : {})
      }}
    >
      <img
        src={imagePath}
        alt={altText}
        crossOrigin="anonymous"
        className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none z-0"
      />
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // REUSABLE PAGE 4: LEMBAR NILAI PESERTA DENGAN TEMPLATE 4 - Nilai Peserta.png
  // ═══════════════════════════════════════════════════════════════════════════
  const renderScoreSheetPage = (isPrint = false) => (
    <div
      className={`relative w-full bg-white overflow-hidden text-slate-900 ${
        isPrint
          ? 'w-[794px] h-[1123px] max-w-[794px] max-h-[1123px] min-w-[794px] min-h-[1123px] m-0 p-0 shadow-none'
          : 'aspect-[1/1.414] max-w-[760px] w-full mx-auto rounded-3xl border border-slate-300 shadow-2xl'
      }`}
      style={{
        boxSizing: 'border-box',
        ...(isPrint ? { width: '794px', height: '1123px' } : {})
      }}
    >
      {/* 1. Official Page 4 Background Template */}
      <img
        src="/assets/Rapot/4 - Nilai Peserta.png"
        alt="Template Nilai Peserta Rawat Maba"
        crossOrigin="anonymous"
        className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none z-0"
      />

      {/* 2. Top Profile Banner: Student Avatar & Info */}
      <div 
        className="absolute z-10 flex items-center gap-3 sm:gap-4 pointer-events-none"
        style={{ top: '22.0%', left: '16.5%', right: '14.5%', height: '11.0%' }}
      >
        {/* Left Circle: Initials Avatar with Gradient */}
        <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-[72px] md:h-[72px] rounded-full bg-gradient-to-br from-[#003CEC] via-[#0082A0] to-[#00B0D8] text-white font-bold text-base sm:text-xl md:text-2xl flex items-center justify-center shadow-lg border-2 border-white/50 flex-shrink-0">
          {getInitials(currentStudent.name)}
        </div>

        {/* Right Info: Student Name, NRP, and Group/Mentor (Without "Kak") */}
        <div className="flex flex-col justify-center min-w-0 pr-2">
          <h2 className="font-serif-judul font-bold text-sm sm:text-base md:text-lg lg:text-xl text-white truncate leading-tight tracking-tight drop-shadow-sm">
            {currentStudent.name || 'Nama Peserta'}
          </h2>
          <p className="font-sans-code font-bold text-[10px] sm:text-xs text-white/95 mt-1 drop-shadow-sm">
            NRP. {currentStudent.nim || '502624XXXX'}
          </p>
          <p className="font-isi text-[10px] sm:text-xs text-white/90 mt-0.5 truncate drop-shadow-sm">
            {kelompokDisplay} <span className="mx-1.5 opacity-75">•</span> Mentor : {mentorTwoWords}
          </p>
        </div>
      </div>

      {/* 3. Left Section: Skor 4 Pilar (Premium Glassmorphic GSM Cards) */}
      <div 
        className="absolute z-10 flex flex-col justify-between pointer-events-none"
        style={{ top: '37.0%', left: '16.2%', width: '45.2%', height: '20.2%' }}
      >
        {/* P1 Card */}
        <div className="bg-white/60 backdrop-blur-xl px-3.5 py-2 rounded-2xl border border-white/90 shadow-[0_6px_20px_rgba(0,60,236,0.06)] ring-1 ring-black/[0.02] flex flex-col justify-center transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-5 h-5 rounded-lg bg-gradient-to-br from-[#003CEC] to-[#0066FF] text-white text-[10px] font-bold font-sans-code flex items-center justify-center shadow-sm shadow-blue-500/30 flex-shrink-0">
                P1
              </span>
              <span className="text-[11px] sm:text-xs font-bold text-slate-800 truncate">
                CV & Portofolio
              </span>
            </div>
            <div className="font-sans-code font-bold text-[11px] sm:text-xs text-[#003CEC] ml-2 flex-shrink-0 drop-shadow-xs">
              {p1Score} <span className="text-[9px] font-normal text-slate-400">/ 30</span>
            </div>
          </div>
          <div className="w-full bg-slate-200/50 backdrop-blur-sm h-1.5 rounded-full overflow-hidden mt-1.5 border border-white/60">
            <div 
              className="h-full bg-gradient-to-r from-[#003CEC] via-[#0066FF] to-[#00B0D8] rounded-full shadow-[0_0_8px_rgba(0,60,236,0.4)]"
              style={{ width: `${Math.min(100, Math.round((p1Score / 30) * 100))}%` }}
            />
          </div>
        </div>

        {/* P2 Card */}
        <div className="bg-white/60 backdrop-blur-xl px-3.5 py-2 rounded-2xl border border-white/90 shadow-[0_6px_20px_rgba(0,176,216,0.06)] ring-1 ring-black/[0.02] flex flex-col justify-center transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-5 h-5 rounded-lg bg-gradient-to-br from-[#00B0D8] to-[#22D3EE] text-white text-[10px] font-bold font-sans-code flex items-center justify-center shadow-sm shadow-cyan-500/30 flex-shrink-0">
                P2
              </span>
              <span className="text-[11px] sm:text-xs font-bold text-slate-800 truncate">
                Optimalisasi LinkedIn
              </span>
            </div>
            <div className="font-sans-code font-bold text-[11px] sm:text-xs text-[#0082A0] ml-2 flex-shrink-0 drop-shadow-xs">
              {p2Score} <span className="text-[9px] font-normal text-slate-400">/ 20</span>
            </div>
          </div>
          <div className="w-full bg-slate-200/50 backdrop-blur-sm h-1.5 rounded-full overflow-hidden mt-1.5 border border-white/60">
            <div 
              className="h-full bg-gradient-to-r from-[#0082A0] via-[#00B0D8] to-[#22D3EE] rounded-full shadow-[0_0_8px_rgba(0,176,216,0.4)]"
              style={{ width: `${Math.min(100, Math.round((p2Score / 20) * 100))}%` }}
            />
          </div>
        </div>

        {/* P3 Card */}
        <div className="bg-white/60 backdrop-blur-xl px-3.5 py-2 rounded-2xl border border-white/90 shadow-[0_6px_20px_rgba(138,58,185,0.06)] ring-1 ring-black/[0.02] flex flex-col justify-center transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-5 h-5 rounded-lg bg-gradient-to-br from-[#8A3AB9] to-[#C896E0] text-white text-[10px] font-bold font-sans-code flex items-center justify-center shadow-sm shadow-purple-500/30 flex-shrink-0">
                P3
              </span>
              <span className="text-[11px] sm:text-xs font-bold text-slate-800 truncate">
                Simulasi Interview
              </span>
            </div>
            <div className="font-sans-code font-bold text-[11px] sm:text-xs text-[#8A3AB9] ml-2 flex-shrink-0 drop-shadow-xs">
              {p3Score} <span className="text-[9px] font-normal text-slate-400">/ 35</span>
            </div>
          </div>
          <div className="w-full bg-slate-200/50 backdrop-blur-sm h-1.5 rounded-full overflow-hidden mt-1.5 border border-white/60">
            <div 
              className="h-full bg-gradient-to-r from-[#8A3AB9] via-[#A855F7] to-[#C896E0] rounded-full shadow-[0_0_8px_rgba(138,58,185,0.4)]"
              style={{ width: `${Math.min(100, Math.round((p3Score / 35) * 100))}%` }}
            />
          </div>
        </div>

        {/* P4 Card */}
        <div className="bg-white/60 backdrop-blur-xl px-3.5 py-2 rounded-2xl border border-white/90 shadow-[0_6px_20px_rgba(200,96,71,0.06)] ring-1 ring-black/[0.02] flex flex-col justify-center transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-5 h-5 rounded-lg bg-gradient-to-br from-[#C86047] to-[#E59B86] text-white text-[10px] font-bold font-sans-code flex items-center justify-center shadow-sm shadow-orange-500/30 flex-shrink-0">
                P4
              </span>
              <span className="text-[11px] sm:text-xs font-bold text-slate-800 truncate">
                Sikap & Partisipasi
              </span>
            </div>
            <div className="font-sans-code font-bold text-[11px] sm:text-xs text-[#C86047] ml-2 flex-shrink-0 drop-shadow-xs">
              {p4Score} <span className="text-[9px] font-normal text-slate-400">/ 15</span>
            </div>
          </div>
          <div className="w-full bg-slate-200/50 backdrop-blur-sm h-1.5 rounded-full overflow-hidden mt-1.5 border border-white/60">
            <div 
              className="h-full bg-gradient-to-r from-[#C86047] via-[#EA580C] to-[#E59B86] rounded-full shadow-[0_0_8px_rgba(200,96,71,0.4)]"
              style={{ width: `${Math.min(100, Math.round((p4Score / 15) * 100))}%` }}
            />
          </div>
        </div>
      </div>

      {/* 4. Right Section: Final Score & Predikat inside Blue Box */}
      {/* Final Score Number */}
      <div 
        className="absolute z-10 flex items-center justify-center pointer-events-none"
        style={{ top: '39.8%', left: '64.5%', width: '22.0%', height: '5.5%' }}
      >
        <span className="font-coolvetica font-bold text-3xl sm:text-4xl md:text-[44px] text-[#FEF08A] tracking-tight leading-none drop-shadow-md">
          {currentStudent.finalScore || 0}
        </span>
      </div>

      {/* Predicate Pill Badge */}
      <div 
        className="absolute z-10 flex items-center justify-center pointer-events-none"
        style={{ top: '46.6%', left: '64.5%', width: '22.0%', height: '3.6%' }}
      >
        <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-xl rounded-full text-white font-bold text-[10px] sm:text-xs border border-white/40 shadow-inner max-w-full">
          <span className="text-[#FEF08A] text-xs">✦</span>
          <span className="truncate">{predicateLabel}</span>
        </div>
      </div>

      {/* 4b. Group Average Card (Glassmorphic Card aligned with P4) */}
      <div 
        className="absolute z-10 pointer-events-none flex flex-col items-center justify-center bg-white/65 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-white/90 shadow-[0_4px_16px_rgba(0,60,236,0.06)] ring-1 ring-black/[0.02] px-2 py-1 text-center"
        style={{ top: '51.5%', left: '64.5%', width: '22.0%', height: '5.7%' }}
      >
        <span className="text-[7.5px] sm:text-[8.5px] font-sans-code font-bold uppercase text-slate-500 tracking-wider">
          Rata-Rata Kelompok
        </span>
        <div className="flex items-baseline gap-1 mt-0.5 leading-none">
          <span className="font-coolvetica font-bold text-sm sm:text-base md:text-lg text-[#003CEC] drop-shadow-xs">
            {groupAvgScore}
          </span>
          <span className="text-[7px] sm:text-[8px] font-sans-code text-slate-400">
            / 100
          </span>
        </div>
      </div>

      {/* 5. Bottom Section: 2x2 Grid of Elegant Glassmorphic GSM Pillar Breakdown Cards */}
      <div 
        className="absolute z-10 pointer-events-none"
        style={{ top: '62.8%', left: '16.2%', width: '70.8%', height: '22.8%' }}
      >
        <div className="grid grid-cols-2 gap-2 sm:gap-2.5 w-full h-full">
          
          {/* Card 1: P1 CV & Portofolio */}
          <div className="bg-white/65 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-white/90 shadow-[0_6px_18px_rgba(0,60,236,0.05)] ring-1 ring-black/[0.02] p-2 sm:p-2.5 flex flex-col justify-between border-t-[2.5px] border-t-[#003CEC]">
            <div>
              <div className="flex items-center justify-between pb-1 border-b border-slate-200/50">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="px-1.5 py-0.2 rounded-md bg-[#003CEC]/15 backdrop-blur-sm border border-[#003CEC]/20 text-[#003CEC] font-bold text-[8.5px] font-sans-code">
                    P1
                  </span>
                  <span className="font-bold text-[10px] sm:text-[11px] text-slate-900 truncate">
                    CV & Portofolio
                  </span>
                </div>
                <span className="font-sans-code font-bold text-[9px] sm:text-[10px] text-[#003CEC] ml-1 flex-shrink-0 bg-white/70 px-1.5 py-0.2 rounded-full border border-white/80">
                  {p1Score} / 30 Pts
                </span>
              </div>

              <ul className="mt-1 sm:mt-1.5 space-y-0.5 text-[8px] sm:text-[9px] text-slate-700 font-isi">
                <li className="flex items-center gap-1.5 bg-white/40 backdrop-blur-xs px-1.5 py-0.5 rounded-md border border-white/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#003CEC] shadow-[0_0_4px_rgba(0,60,236,0.5)] flex-shrink-0" />
                  <span className="truncate font-medium">Format CV ATS / Creative & Kerapian Layout</span>
                </li>
                <li className="flex items-center gap-1.5 bg-white/40 backdrop-blur-xs px-1.5 py-0.5 rounded-md border border-white/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#003CEC] shadow-[0_0_4px_rgba(0,60,236,0.5)] flex-shrink-0" />
                  <span className="truncate font-medium">Kualitas Penulisan, Data Terukur & Action Verbs</span>
                </li>
                <li className="flex items-center gap-1.5 bg-white/40 backdrop-blur-xs px-1.5 py-0.5 rounded-md border border-white/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#003CEC] shadow-[0_0_4px_rgba(0,60,236,0.5)] flex-shrink-0" />
                  <span className="truncate font-medium">Kesesuaian Pengalaman & Relevansi Divisi</span>
                </li>
              </ul>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 text-[7.5px] sm:text-[8.5px] text-slate-500 font-sans-code">
              <span>Status Pilar:</span>
              <span className="font-bold text-[#003CEC] bg-white/70 px-1.5 py-0.2 rounded-full border border-white/80">
                {p1Score >= 24 ? 'Sangat Baik' : (p1Score >= 18 ? 'Baik' : 'Perlu Pendampingan')}
              </span>
            </div>
          </div>

          {/* Card 2: P2 Optimalisasi LinkedIn */}
          <div className="bg-white/65 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-white/90 shadow-[0_6px_18px_rgba(0,176,216,0.05)] ring-1 ring-black/[0.02] p-2 sm:p-2.5 flex flex-col justify-between border-t-[2.5px] border-t-[#00B0D8]">
            <div>
              <div className="flex items-center justify-between pb-1 border-b border-slate-200/50">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="px-1.5 py-0.2 rounded-md bg-[#00B0D8]/15 backdrop-blur-sm border border-[#00B0D8]/20 text-[#0082A0] font-bold text-[8.5px] font-sans-code">
                    P2
                  </span>
                  <span className="font-bold text-[10px] sm:text-[11px] text-slate-900 truncate">
                    Optimalisasi LinkedIn
                  </span>
                </div>
                <span className="font-sans-code font-bold text-[9px] sm:text-[10px] text-[#0082A0] ml-1 flex-shrink-0 bg-white/70 px-1.5 py-0.2 rounded-full border border-white/80">
                  {p2Score} / 20 Pts
                </span>
              </div>

              <ul className="mt-1 sm:mt-1.5 space-y-0.5 text-[8px] sm:text-[9px] text-slate-700 font-isi">
                <li className="flex items-center gap-1.5 bg-white/40 backdrop-blur-xs px-1.5 py-0.5 rounded-md border border-white/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00B0D8] shadow-[0_0_4px_rgba(0,176,216,0.5)] flex-shrink-0" />
                  <span className="truncate font-medium">Foto Profil & Banner Profesional Menarik</span>
                </li>
                <li className="flex items-center gap-1.5 bg-white/40 backdrop-blur-xs px-1.5 py-0.5 rounded-md border border-white/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00B0D8] shadow-[0_0_4px_rgba(0,176,216,0.5)] flex-shrink-0" />
                  <span className="truncate font-medium">Headline Menjual & Ringkasan About Summary</span>
                </li>
                <li className="flex items-center gap-1.5 bg-white/40 backdrop-blur-xs px-1.5 py-0.5 rounded-md border border-white/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00B0D8] shadow-[0_0_4px_rgba(0,176,216,0.5)] flex-shrink-0" />
                  <span className="truncate font-medium">Kelengkapan Experience, Skills & Projects</span>
                </li>
              </ul>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 text-[7.5px] sm:text-[8.5px] text-slate-500 font-sans-code">
              <span>Status Pilar:</span>
              <span className="font-bold text-[#0082A0] bg-white/70 px-1.5 py-0.2 rounded-full border border-white/80">
                {p2Score >= 16 ? 'Sangat Baik' : (p2Score >= 12 ? 'Baik' : 'Perlu Pendampingan')}
              </span>
            </div>
          </div>

          {/* Card 3: P3 Simulasi Interview */}
          <div className="bg-white/65 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-white/90 shadow-[0_6px_18px_rgba(138,58,185,0.05)] ring-1 ring-black/[0.02] p-2 sm:p-2.5 flex flex-col justify-between border-t-[2.5px] border-t-[#8A3AB9]">
            <div>
              <div className="flex items-center justify-between pb-1 border-b border-slate-200/50">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="px-1.5 py-0.2 rounded-md bg-[#C896E0]/25 backdrop-blur-sm border border-[#C896E0]/30 text-[#8A3AB9] font-bold text-[8.5px] font-sans-code">
                    P3
                  </span>
                  <span className="font-bold text-[10px] sm:text-[11px] text-slate-900 truncate">
                    Simulasi Interview
                  </span>
                </div>
                <span className="font-sans-code font-bold text-[9px] sm:text-[10px] text-[#8A3AB9] ml-1 flex-shrink-0 bg-white/70 px-1.5 py-0.2 rounded-full border border-white/80">
                  {p3Score} / 35 Pts
                </span>
              </div>

              <ul className="mt-1 sm:mt-1.5 space-y-0.5 text-[8px] sm:text-[9px] text-slate-700 font-isi">
                <li className="flex items-center gap-1.5 bg-white/40 backdrop-blur-xs px-1.5 py-0.5 rounded-md border border-white/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#8A3AB9] shadow-[0_0_4px_rgba(138,58,185,0.5)] flex-shrink-0" />
                  <span className="truncate font-medium">Artikulasi Jelas, Sikap Tubuh & Eye Contact</span>
                </li>
                <li className="flex items-center gap-1.5 bg-white/40 backdrop-blur-xs px-1.5 py-0.5 rounded-md border border-white/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#8A3AB9] shadow-[0_0_4px_rgba(138,58,185,0.5)] flex-shrink-0" />
                  <span className="truncate font-medium">Struktur Jawaban STAR & Relevansi Konteks</span>
                </li>
                <li className="flex items-center gap-1.5 bg-white/40 backdrop-blur-xs px-1.5 py-0.5 rounded-md border border-white/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#8A3AB9] shadow-[0_0_4px_rgba(138,58,185,0.5)] flex-shrink-0" />
                  <span className="truncate font-medium">Ketepatan Menjawab Pertanyaan Sulit</span>
                </li>
              </ul>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 text-[7.5px] sm:text-[8.5px] text-slate-500 font-sans-code">
              <span>Status Pilar:</span>
              <span className="font-bold text-[#8A3AB9] bg-white/70 px-1.5 py-0.2 rounded-full border border-white/80">
                {p3Score >= 28 ? 'Sangat Baik' : (p3Score >= 21 ? 'Baik' : 'Perlu Pendampingan')}
              </span>
            </div>
          </div>

          {/* Card 4: P4 Sikap & Partisipasi */}
          <div className="bg-white/65 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-white/90 shadow-[0_6px_18px_rgba(200,96,71,0.05)] ring-1 ring-black/[0.02] p-2 sm:p-2.5 flex flex-col justify-between border-t-[2.5px] border-t-[#C86047]">
            <div>
              <div className="flex items-center justify-between pb-1 border-b border-slate-200/50">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="px-1.5 py-0.2 rounded-md bg-[#E59B86]/25 backdrop-blur-sm border border-[#E59B86]/30 text-[#C86047] font-bold text-[8.5px] font-sans-code">
                    P4
                  </span>
                  <span className="font-bold text-[10px] sm:text-[11px] text-slate-900 truncate">
                    Sikap & Partisipasi
                  </span>
                </div>
                <span className="font-sans-code font-bold text-[9px] sm:text-[10px] text-[#C86047] ml-1 flex-shrink-0 bg-white/70 px-1.5 py-0.2 rounded-full border border-white/80">
                  {p4Score} / 15 Pts
                </span>
              </div>

              <ul className="mt-1 sm:mt-1.5 space-y-0.5 text-[8px] sm:text-[9px] text-slate-700 font-isi">
                <li className="flex items-center gap-1.5 bg-white/40 backdrop-blur-xs px-1.5 py-0.5 rounded-md border border-white/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C86047] shadow-[0_0_4px_rgba(200,96,71,0.5)] flex-shrink-0" />
                  <span className="truncate font-medium">Ketepatan Waktu Presensi & Kehadiran Sesi</span>
                </li>
                <li className="flex items-center gap-1.5 bg-white/40 backdrop-blur-xs px-1.5 py-0.5 rounded-md border border-white/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C86047] shadow-[0_0_4px_rgba(200,96,71,0.5)] flex-shrink-0" />
                  <span className="truncate font-medium">Keaktifan Berdiskusi & Antusiasme Mentoring</span>
                </li>
                <li className="flex items-center gap-1.5 bg-white/40 backdrop-blur-xs px-1.5 py-0.5 rounded-md border border-white/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C86047] shadow-[0_0_4px_rgba(200,96,71,0.5)] flex-shrink-0" />
                  <span className="truncate font-medium">Etika, Sikap Menghargai & Respon Feedback</span>
                </li>
              </ul>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 text-[7.5px] sm:text-[8.5px] text-slate-500 font-sans-code">
              <span>Status Pilar:</span>
              <span className="font-bold text-[#C86047] bg-white/70 px-1.5 py-0.2 rounded-full border border-white/80">
                {p4Score >= 12 ? 'Sangat Baik' : (p4Score >= 9 ? 'Baik' : 'Perlu Pendampingan')}
              </span>
            </div>
          </div>

        </div>
      </div>

    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // REUSABLE PAGE 5: FEEDBACK DARI MENTOR (3 KARTU SURAT)
  // ═══════════════════════════════════════════════════════════════════════════
  const renderFeedbackPage = (isPrint = false) => (
    <div
      className={`relative w-full bg-white overflow-hidden text-slate-900 ${
        isPrint
          ? 'w-[794px] h-[1123px] max-w-[794px] max-h-[1123px] min-w-[794px] min-h-[1123px] m-0 p-0 shadow-none'
          : 'aspect-[1/1.414] max-w-[760px] w-full mx-auto rounded-3xl border border-slate-300 shadow-2xl'
      }`}
      style={{
        boxSizing: 'border-box',
        ...(isPrint ? { width: '794px', height: '1123px' } : {})
      }}
    >
      {/* 1. Official Page 5 Template Background */}
      <img
        src="/assets/Rapot/5 - Feedback dari mentor.png"
        alt="Template Feedback dari Mentor Rawat Maba"
        crossOrigin="anonymous"
        className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none z-0"
      />

      {/* 2. Slot 1: Apresiasi Mentor */}
      <div 
        className="absolute z-10 flex flex-col justify-start pointer-events-none p-5 sm:p-7 md:p-8 overflow-hidden"
        style={{ top: '29.0%', left: '7.2%', right: '5.5%', height: '14.0%' }}
      >
        <p className="font-isi text-slate-800 text-[11px] sm:text-xs md:text-[14px] leading-relaxed italic">
          {currentStudent.feedback_apresiasi || currentStudent.feedbackApresiasi
            ? `"${currentStudent.feedback_apresiasi || currentStudent.feedbackApresiasi}"`
            : '-'}
        </p>
      </div>

      {/* 3. Slot 2: Saran Pengembangan */}
      <div 
        className="absolute z-10 flex flex-col justify-start pointer-events-none p-5 sm:p-7 md:p-8 overflow-hidden"
        style={{ top: '49.5%', left: '7.2%', right: '5.5%', height: '14.0%' }}
      >
        <p className="font-isi text-slate-800 text-[11px] sm:text-xs md:text-[14px] leading-relaxed italic">
          {currentStudent.feedback_saran || currentStudent.feedbackSaran
            ? `"${currentStudent.feedback_saran || currentStudent.feedbackSaran}"`
            : '-'}
        </p>
      </div>

      {/* 4. Slot 3: Catatan Persiapan Open Recruitment */}
      <div 
        className="absolute z-10 flex flex-col justify-start pointer-events-none p-5 sm:p-7 md:p-8 overflow-hidden"
        style={{ top: '70.0%', left: '7.2%', right: '5.5%', height: '14.0%' }}
      >
        <p className="font-isi text-slate-800 text-[11px] sm:text-xs md:text-[14px] leading-relaxed italic">
          {currentStudent.feedback_oprec || currentStudent.feedbackOprec
            ? `"${currentStudent.feedback_oprec || currentStudent.feedbackOprec}"`
            : '-'}
        </p>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // REUSABLE PAGE 6: CLOSING (FINAL SCORE, PREDIKAT, PERINGKAT)
  // ═══════════════════════════════════════════════════════════════════════════
  const renderClosingPage = (isPrint = false) => (
    <div
      className={`relative w-full bg-white overflow-hidden text-slate-900 ${
        isPrint
          ? 'w-[794px] h-[1123px] max-w-[794px] max-h-[1123px] min-w-[794px] min-h-[1123px] m-0 p-0 shadow-none'
          : 'aspect-[1/1.414] max-w-[760px] w-full mx-auto rounded-3xl border border-slate-300 shadow-2xl'
      }`}
      style={{
        boxSizing: 'border-box',
        ...(isPrint ? { width: '794px', height: '1123px' } : {})
      }}
    >
      {/* 1. Official Page 6 Closing Background */}
      <img
        src="/assets/Rapot/6 - Closing.png"
        alt="Template Closing Rapot Rawat Maba"
        crossOrigin="anonymous"
        className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none z-0"
      />

      {/* 2. Slot 1: Final Score (Left) - Perfectly centered over "Final Score" label */}
      <div 
        className="absolute z-10 flex items-center justify-center pointer-events-none text-center"
        style={{ top: '56.8%', left: '8.0%', width: '27.0%', height: '6.8%' }}
      >
        <span className="font-coolvetica font-bold text-3xl sm:text-4xl md:text-5xl text-[#FEF08A] tracking-tight drop-shadow-md leading-none whitespace-nowrap">
          {currentStudent.finalScore || 0}
        </span>
      </div>

      {/* 3. Slot 2: Predikat (Middle) - Perfectly centered over "Predikat" label */}
      <div 
        className="absolute z-10 flex items-center justify-center pointer-events-none text-center"
        style={{ top: '56.8%', left: '30.0%', width: '40.0%', height: '6.8%' }}
      >
        <span className="font-coolvetica font-bold text-xl sm:text-2xl md:text-[28px] lg:text-[32px] text-white tracking-normal drop-shadow-md leading-none whitespace-nowrap px-1">
          {predicateLabel}
        </span>
      </div>

      {/* 4. Slot 3: Peringkat (Right) - Optically centered over "Peringkat" label */}
      <div 
        className="absolute z-10 flex items-center justify-center pointer-events-none text-center"
        style={{ top: '56.8%', left: '66.8%', width: '26.0%', height: '6.8%' }}
      >
        <span className="font-coolvetica font-bold text-3xl sm:text-4xl md:text-5xl text-white tracking-tight drop-shadow-md leading-none whitespace-nowrap">
          #{overallRank}
        </span>
      </div>
    </div>
  );

  const PAGES = [
    { num: 1, id: 'cover', title: 'Halaman 1 dari 6 — Cover Rapot Mentoring Rawat Maba', short: 'Cover' },
    { num: 2, id: 'kahima', title: 'Halaman 2 dari 6 — Pesan dari Ketua Himpunan (KAHIMA)', short: 'Pesan KAHIMA' },
    { num: 3, id: 'hrd', title: 'Halaman 3 dari 6 — Pesan dari Kawadep HRD & PIC', short: 'Pesan HRD & PIC' },
    { num: 4, id: 'scores', title: 'Halaman 4 dari 6 — Lembar Nilai 4 Pilar Mahasiswa', short: 'Lembar Nilai' },
    { num: 5, id: 'feedback', title: 'Halaman 5 dari 6 — Feedback Khusus Mentor', short: 'Feedback Mentor' },
    { num: 6, id: 'closing', title: 'Halaman 6 dari 6 — Closing & Rekapitulasi Prestasi', short: 'Closing' }
  ];

  const renderActivePreviewPage = () => {
    switch (currentPageIndex) {
      case 1:
        return renderCoverPage(false);
      case 2:
        return renderStaticPage('/assets/Rapot/2 - Pesan dari KAHIMA.png', 'Pesan dari KAHIMA', false);
      case 3:
        return renderStaticPage('/assets/Rapot/3. Pesan dri Kawadep HRD dan PIC.png', 'Pesan dari Kawadep HRD dan PIC', false);
      case 4:
        return renderScoreSheetPage(false);
      case 5:
        return renderFeedbackPage(false);
      case 6:
        return renderClosingPage(false);
      default:
        return renderCoverPage(false);
    }
  };

  return (
    <div className="w-full space-y-5 animate-in fade-in duration-300 font-isi pb-12">
      
      {/* ═══ 1. Vibrant GSM Hero Banner (Identical to Input Nilai) ═══ */}
      <div className="relative bg-gradient-to-r from-[#003CEC] via-[#0066FF] to-[#00B0D8] p-6 sm:p-8 rounded-3xl text-white shadow-xl overflow-hidden flex-shrink-0">
        
        {/* Background Decorative Elements */}
        <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-64 h-64 rounded-full bg-[#002DB3]/40 blur-2xl pointer-events-none" />
        <img 
          src="/assets/Bintang.png" 
          alt="Bintang GSM" 
          className="absolute -right-4 -bottom-4 w-28 h-28 object-contain opacity-25 pointer-events-none animate-pulse z-0" 
        />

        <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md text-white flex items-center justify-center border border-white/20 shadow-md flex-shrink-0">
              <span className="material-symbols-outlined text-3xl text-gsm-cream">picture_as_pdf</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-gsm-cream text-slate-950 font-sans-code font-bold text-[10px] uppercase tracking-wider px-3 py-0.5 rounded-full border border-yellow-200 shadow-sm">
                  Dokumen Rapot Mentoring
                </span>
              </div>
              <h2 className="font-coolvetica font-bold text-2xl text-white mt-1 drop-shadow-sm">
                Generate & Cetak Rapot Resmi
              </h2>
              <p className="text-xs text-blue-100/90 font-isi mt-0.5">
                Preview Dokumen A4 Lengkap 6 Halaman: Cover, Pesan KAHIMA, Pesan Kawadep & PIC, Lembar Nilai, Feedback Mentor, dan Closing
              </p>
            </div>
          </div>

          {/* Close Button */}
          {onClose && (
            <button 
              type="button" 
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 text-white/80 hover:text-white flex items-center justify-center transition-all border border-white/20 flex-shrink-0 shadow-sm"
              title="Kembali ke Data Mahasiswa"
            >
              <span className="material-symbols-outlined text-xl flex items-center justify-center leading-none select-none">close</span>
            </button>
          )}
        </div>

        {/* Student Selector & Live Stats Row inside Hero Banner */}
        <div className="relative z-10 mt-5 pt-4 border-t border-white/20 flex flex-wrap items-center justify-between gap-4">
          
          {/* Left: Student Selector */}
          <div className="flex items-center gap-3 flex-1 min-w-[280px]">
            <span className="text-xs font-bold text-gsm-cream font-sans-code uppercase tracking-wider whitespace-nowrap flex items-center gap-1.5">
              <span className="material-symbols-outlined text-gsm-cream text-base">person</span>
              <span>Pilih Maba:</span>
            </span>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full max-w-lg bg-white/95 text-slate-900 border border-white/40 rounded-xl px-4 py-2.5 text-xs font-bold font-isi outline-none focus:ring-2 focus:ring-gsm-cream shadow-sm cursor-pointer"
            >
              {students.map(s => (
                <option key={s.id} value={s.id} className="text-slate-900">
                  {s.nim} - {s.name} ({s.kelompok}) - [{s.status}]
                </option>
              ))}
            </select>
          </div>

          {/* Right: Meta Chips & Score Badge */}
          <div className="flex items-center gap-3 flex-shrink-0 flex-wrap">
            <div className="bg-white/15 border border-white/25 px-4 py-2 rounded-2xl flex items-center gap-3 backdrop-blur-md">
              <span className="text-[11px] font-isi text-white/90">
                Email: <strong className="font-sans-code text-gsm-cream font-bold">{currentStudent.email || '-'}</strong>
              </span>
              <span className="text-white/40">•</span>
              <span className="text-[11px] font-isi text-white/90">
                Rata-rata: <strong className="font-sans-code text-yellow-300 font-bold">{groupAvgScore}</strong>
              </span>
              <span className="text-white/40">•</span>
              <span className="text-[11px] font-isi text-white/90">
                Peringkat: <strong className="font-sans-code text-emerald-300 font-bold">#{overallRank}</strong>
              </span>
            </div>

            <div className="bg-white text-slate-900 border border-white/60 px-4 py-2 rounded-2xl flex items-center gap-2.5 shadow-md">
              <span className="text-[10px] font-sans-code uppercase text-slate-500 font-bold">Final Score:</span>
              <span className="font-coolvetica font-bold text-lg text-gsm-blue-main leading-none">{currentStudent.finalScore || 0}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getPredicate(currentStudent.finalScore).color}`}>
                {predicateLabel}
              </span>
            </div>
          </div>

        </div>

      </div>

      {/* ═══ 2. Navigation & Action Bar ═══ */}
      <div className="bg-white rounded-2xl p-3 shadow-gsm-card border border-gsm-lilac flex flex-wrap items-center justify-between gap-3">
        
        {/* Left: Minimalist Page Switcher ([<] 1 2 3 4 5 6 [>]) */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold font-sans-code text-slate-400 uppercase tracking-wider ml-1 hidden sm:inline">
            Halaman:
          </span>
          <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-2xl border border-slate-200 shadow-inner">
            {/* Previous Arrow */}
            <button
              type="button"
              onClick={() => setCurrentPageIndex(prev => Math.max(1, prev - 1))}
              disabled={currentPageIndex === 1}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-700 hover:bg-white hover:shadow-xs disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              title="Halaman Sebelumnya"
            >
              <span className="material-symbols-outlined text-lg">chevron_left</span>
            </button>

            {/* Numbers 1 2 3 4 5 6 */}
            {[1, 2, 3, 4, 5, 6].map((num) => {
              const isActive = currentPageIndex === num;
              return (
                <button
                  key={num}
                  type="button"
                  onClick={() => setCurrentPageIndex(num)}
                  className={`w-8 h-8 rounded-xl text-xs font-bold font-sans-code transition-all flex items-center justify-center ${
                    isActive
                      ? 'bg-gradient-to-r from-[#003CEC] to-[#00B0D8] text-white shadow-md shadow-blue-600/30 font-extrabold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                  }`}
                  title={`Halaman ${num}`}
                >
                  {num}
                </button>
              );
            })}

            {/* Next Arrow */}
            <button
              type="button"
              onClick={() => setCurrentPageIndex(prev => Math.min(6, prev + 1))}
              disabled={currentPageIndex === 6}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-700 hover:bg-white hover:shadow-xs disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              title="Halaman Selanjutnya"
            >
              <span className="material-symbols-outlined text-lg">chevron_right</span>
            </button>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {onNavigateToInsert && (
            <button
              onClick={() => onNavigateToInsert(currentStudent)}
              className="bg-gsm-linear-exact hover:opacity-90 active:scale-95 text-white font-bold text-xs px-4 py-2 rounded-2xl transition-all shadow-md shadow-blue-600/25 flex items-center gap-1.5 font-reddit"
            >
              <span className="material-symbols-outlined text-base">edit_note</span>
              <span>Input Nilai</span>
            </button>
          )}

          <button
            onClick={handleDownloadPdf}
            disabled={isGenerating}
            className="bg-gsm-linear-exact hover:opacity-90 active:scale-95 text-white font-bold text-xs px-4 py-2 rounded-2xl transition-all shadow-md shadow-blue-600/25 flex items-center gap-1.5 font-reddit"
          >
            <span className="material-symbols-outlined text-base">
              {isGenerating ? 'progress_activity' : 'download'}
            </span>
            <span>{isGenerating ? 'Mengunduh...' : 'Download PDF (6 Hlm)'}</span>
          </button>

          <button
            onClick={handleSendEmail}
            disabled={isSendingEmail || isGenerating}
            className={`font-bold text-xs px-4 py-2 rounded-2xl transition-all shadow-md flex items-center gap-1.5 font-reddit ${
              emailStatus === 'sent'
                ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                : emailStatus === 'error'
                ? 'bg-rose-600 text-white shadow-rose-500/20'
                : 'bg-slate-900 hover:bg-slate-800 active:scale-95 text-white'
            }`}
          >
            <span className="material-symbols-outlined text-base">
              {emailStatus === 'sent' ? 'check_circle' : emailStatus === 'error' ? 'error' : 'mail'}
            </span>
            <span>
              {isSendingEmail ? 'Mengirim...' : emailStatus === 'sent' ? 'Terkirim!' : 'Kirim Email'}
            </span>
          </button>
        </div>

      </div>

      {/* Error notification if email failed */}
      {emailStatus === 'error' && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-5 py-3 rounded-2xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-rose-600 text-base">error</span>
            <span><strong>Gagal Mengirim Email:</strong> {lastErrorMessage || 'Periksa API Key di dashboard Supabase.'}</span>
          </div>
          <button onClick={() => setEmailStatus(null)} className="text-rose-500 hover:text-rose-800 font-bold">✕</button>
        </div>
      )}

      {/* ═══ 2. Fast & Smooth Single-Page Canvas Preview (No Laggy Vertical Scroll) ═══ */}
      <div className="bg-slate-200/70 p-4 sm:p-8 rounded-3xl shadow-inner border border-slate-300/80 flex flex-col items-center gap-3">
        
        {/* Active Page Title Indicator Badge */}
        <div className="flex items-center gap-2 text-xs font-sans-code text-slate-600 font-bold bg-white/90 px-4 py-1.5 rounded-full shadow-xs border border-slate-200">
          <span className="material-symbols-outlined text-[#003CEC] text-base">
            {PAGES[currentPageIndex - 1]?.num === 1 ? 'stars' : PAGES[currentPageIndex - 1]?.num === 6 ? 'flag' : 'article'}
          </span>
          <span>{PAGES[currentPageIndex - 1]?.title}</span>
        </div>

        {/* Dynamic Single Active Page Renderer */}
        <div key={currentPageIndex} className="w-full flex justify-center animate-in fade-in duration-200">
          {renderActivePreviewPage()}
        </div>

      </div>

      {/* ═══ 3. Print Container mounted ONLY during PDF generation (Zero Page Scroll Impact) ═══ */}
      {(isGenerating || isSendingEmail) && (
        <div 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            width: '794px', 
            height: '1123px',
            overflow: 'hidden',
            zIndex: -99999, 
            opacity: 0, 
            pointerEvents: 'none' 
          }} 
          aria-hidden="true"
        >
          <div ref={pdfExportContainerRef} style={{ width: '794px', background: '#ffffff' }}>
            <div data-page="1" style={{ width: '794px', height: '1123px', overflow: 'hidden' }}>{renderCoverPage(true)}</div>
            <div data-page="2" style={{ width: '794px', height: '1123px', overflow: 'hidden' }}>{renderStaticPage('/assets/Rapot/2 - Pesan dari KAHIMA.png', 'Pesan dari KAHIMA', true)}</div>
            <div data-page="3" style={{ width: '794px', height: '1123px', overflow: 'hidden' }}>{renderStaticPage('/assets/Rapot/3. Pesan dri Kawadep HRD dan PIC.png', 'Pesan dari Kawadep HRD dan PIC', true)}</div>
            <div data-page="4" style={{ width: '794px', height: '1123px', overflow: 'hidden' }}>{renderScoreSheetPage(true)}</div>
            <div data-page="5" style={{ width: '794px', height: '1123px', overflow: 'hidden' }}>{renderFeedbackPage(true)}</div>
            <div data-page="6" style={{ width: '794px', height: '1123px', overflow: 'hidden' }}>{renderClosingPage(true)}</div>
          </div>
        </div>
      )}

    </div>
  );
}
