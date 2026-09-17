import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { PILLARS, calcPillarScore, getPredicate } from './InsertGradesModal';
import { evaluateEmailScheduleForUser } from '../lib/dataService';

// Format ISO string to readable timestamp "17 Sep, 20:19 WIB"
function formatSentTime(isoString) {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).replace('.', ':') + ' WIB';
  } catch {
    return '';
  }
}

export default function GeneratePdfModal({ 
  isOpen, 
  onClose, 
  student, 
  students = [], 
  allStudents = [],
  currentUser,
  emailSchedules,
  isFullScreen = true,
  onNavigateToInsert,
  onSelectStudent,
  showToast
}) {
  const [selectedStudentId, setSelectedStudentId] = useState(student?.id || students?.[0]?.id);
  const prevStudentPropIdRef = useRef(student?.id);
  const [currentPageIndex, setCurrentPageIndex] = useState(1); // 1..6
  const [previewScale, setPreviewScale] = useState(0.65); // Default fit screen zoom
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailProgress, setEmailProgress] = useState(0);
  const [emailProgressStage, setEmailProgressStage] = useState('');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [emailStatus, setEmailStatus] = useState(null); // 'sent' | 'error' | null
  const [lastErrorMessage, setLastErrorMessage] = useState('');

  // Persistent sent email history to prevent accidental duplicates
  const [sentHistory, setSentHistory] = useState(() => {
    try {
      const raw = localStorage.getItem('rapot_sent_emails_history_v1');
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  });
  const [confirmResendStudent, setConfirmResendStudent] = useState(null);

  // Hidden print container ref for html2pdf
  const pdfExportContainerRef = useRef(null);

  // Sync selectedStudentId ONLY when student prop's ID has actually changed from outside
  useEffect(() => {
    if (student?.id && student.id !== prevStudentPropIdRef.current) {
      prevStudentPropIdRef.current = student.id;
      setSelectedStudentId(student.id);
    } else if (!selectedStudentId && students?.[0]?.id) {
      prevStudentPropIdRef.current = students[0].id;
      setSelectedStudentId(students[0].id);
    }
  }, [student?.id, students, selectedStudentId]);

  const handleSelectStudentChange = (newId) => {
    setSelectedStudentId(newId);
    prevStudentPropIdRef.current = newId;
    const found = students.find(s => s.id === newId);
    if (found && onSelectStudent) {
      onSelectStudent(found);
    }
  };

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
  const mentorTwoWords = rawMentorName || '-';
  const coverMetaLength = String(currentStudent.nim || '').length + kelompokDisplay.length;
  const coverMetaFontSize = coverMetaLength > 34 ? '10px' : coverMetaLength > 28 ? '11px' : '13px';
  const mentorFontSize = mentorTwoWords.length > 24 ? '9px' : mentorTwoWords.length > 18 ? '10px' : '12px';

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
  const numericFinalScore = Number(currentStudent.finalScore);
  const hasEvaluation = Number.isFinite(numericFinalScore) && numericFinalScore > 0 && numericFinalScore <= 100;
  const emailPredicate = hasEvaluation ? predicateInfo.grade : '-';
  const evaluationStatusForEmail = !hasEvaluation
    ? 'Belum Dinilai'
    : numericFinalScore >= 75
      ? 'Lulus'
      : numericFinalScore >= 60
        ? 'Perlu Latihan'
        : 'Perlu Pendampingan';

  // Helper: Overall rank calculation across all students in Maba 2026 (excluding dummy admin test record)
  const rankingPool = (allStudents && allStudents.length > 0 ? allStudents : students || [])
    .filter(s => !s.isDummy && s.nim !== '5026249999');

  const sortedStudents = [...rankingPool].sort((a, b) => (Number(b.finalScore) || 0) - (Number(a.finalScore) || 0));
  const studentRankIndex = sortedStudents.findIndex(s => s.id === currentStudent.id || s.nim === currentStudent.nim);
  const overallRank = studentRankIndex !== -1 ? studentRankIndex + 1 : 1;

  // Helper: generate exact 6-page PDF with progress feedback
  const generateMultiPagePdf = async (onProgress) => {
    const { jsPDF } = await import('jspdf');
    const htmlToImage = await import('html-to-image');

    const container = pdfExportContainerRef.current;
    if (!container) throw new Error('Container export tidak ditemukan');
    const pageElements = Array.from(container.children);

    if (pageElements.length === 0) throw new Error('Halaman rapot tidak ditemukan');

    if (onProgress) onProgress(10, 'Memuat aset font & template rapot...');

    if (document.fonts?.ready) {
      await document.fonts.ready;
    }

    const exportImages = Array.from(container.querySelectorAll('img'));
    await Promise.all(exportImages.map(async (image) => {
      if (!image.complete) {
        await new Promise((resolve, reject) => {
          image.addEventListener('load', resolve, { once: true });
          image.addEventListener('error', () => reject(new Error(`Gambar gagal dimuat: ${image.alt || image.src}`)), { once: true });
        });
      }

      if (!image.naturalWidth) {
        throw new Error(`Gambar gagal dimuat: ${image.alt || image.src}`);
      }

      if (image.decode) {
        try {
          await image.decode();
        } catch {
          // Fallback handled by naturalWidth
        }
      }
    }));

    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const pageLabels = [
      'Halaman 1/6 (Cover)',
      'Halaman 2/6 (Pesan KAHIMA)',
      'Halaman 3/6 (Pesan HRD & PIC)',
      'Halaman 4/6 (Lembar Nilai)',
      'Halaman 5/6 (Feedback Mentor)',
      'Halaman 6/6 (Penutup & Rekap)'
    ];

    for (let i = 0; i < pageElements.length; i++) {
      const pageEl = pageElements[i];
      if (i > 0) {
        pdf.addPage('a4', 'portrait');
      }

      const currentStagePercent = Math.round(15 + ((i + 1) / pageElements.length) * 62);
      if (onProgress) {
        onProgress(currentStagePercent, `Merender ${pageLabels[i] || `Halaman ${i + 1}`}...`);
      }

      await new Promise(resolve => setTimeout(resolve, 35));

      const canvas = await htmlToImage.toCanvas(pageEl, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        width: 794,
        height: 1123,
        cacheBust: true,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
    }

    if (onProgress) onProgress(80, 'Menyusun dokumen PDF...');
    return pdf;
  };

  const handleDownloadPdf = async () => {
    const targetStudent = students?.find(s => s.id === selectedStudentId) || currentStudent;
    if (!targetStudent || !targetStudent.id) return;

    setIsGenerating(true);
    setDownloadProgress(10);
    await new Promise(resolve => setTimeout(resolve, 60));

    const filename = `Rapot_Rawat_Maba_${targetStudent.nim}_${(targetStudent.name || 'Mahasiswa').replace(/\s+/g, '_')}.pdf`;
    try {
      const pdf = await generateMultiPagePdf((pct) => {
        setDownloadProgress(pct);
      });
      setDownloadProgress(95);
      pdf.save(filename);
      setDownloadProgress(100);

      setIsGenerating(false);
      setDownloadProgress(0);
      if (showToast) {
        showToast(`Rapot PDF untuk ${targetStudent.name || 'mahasiswa'} berhasil diunduh!`);
      }
    } catch (err) {
      console.error('PDF Generation Error:', err);
      setIsGenerating(false);
      setDownloadProgress(0);
      if (showToast) {
        showToast(`Gagal mengunduh PDF: ${err.message || 'Terjadi kesalahan'}`);
      }
    }
  };

  // Evaluate whether current user is allowed to send email according to super admin schedule
  const scheduleStatus = evaluateEmailScheduleForUser(currentUser, emailSchedules);

  const handleSendEmailClick = () => {
    if (isSendingEmail || isGenerating) return;

    if (!scheduleStatus.isAllowed) {
      if (showToast) {
        showToast(scheduleStatus.reason || 'Pengiriman email saat ini sedang dikunci.');
      }
      return;
    }

    const targetStudent = students?.find(s => s.id === selectedStudentId) || currentStudent;
    if (!targetStudent || !targetStudent.id) {
      if (showToast) showToast('Data mahasiswa tidak ditemukan.');
      return;
    }

    if (!targetStudent.email || !targetStudent.email.trim()) {
      if (showToast) {
        showToast(`Email untuk ${targetStudent.name || 'mahasiswa'} belum diisi. Silakan masukkan di Data Mahasiswa.`);
      }
      return;
    }

    // Check if this student already received an email before (Warn & Prevent Duplicate Send)
    const existingHistory = sentHistory[targetStudent.id];
    if (existingHistory) {
      setConfirmResendStudent(targetStudent);
    } else {
      executeSendEmail(targetStudent);
    }
  };

  const executeSendEmail = async (targetStudent) => {
    if (isSendingEmail) return;

    const recipientEmail = targetStudent.email.trim();
    const studentName = targetStudent.name || 'Mahasiswa';
    const studentNim = targetStudent.nim || '-';
    const studentProdi = targetStudent.prodi || '-';
    const studentKelompok = targetStudent.kelompok || '-';
    const pdfFilename = `Rapot_Rawat_Maba_${studentNim}_${studentName.replace(/\s+/g, '_')}.pdf`;

    const targetNumericScore = Number(targetStudent.finalScore);
    const targetHasEvaluation = Number.isFinite(targetNumericScore) && targetNumericScore > 0 && targetNumericScore <= 100;
    const targetPredicateInfo = getPredicate(targetStudent.finalScore);
    const targetEmailPredicate = targetHasEvaluation ? targetPredicateInfo.grade : '-';
    const targetStatusForEmail = !targetHasEvaluation
      ? 'Belum Dinilai'
      : targetNumericScore >= 75
        ? 'Lulus'
        : targetNumericScore >= 60
          ? 'Perlu Latihan'
          : 'Perlu Pendampingan';

    setIsSendingEmail(true);
    setEmailProgress(5);
    setEmailProgressStage(`Menyiapkan dokumen rapot untuk ${studentName}...`);
    setEmailStatus(null);
    setLastErrorMessage('');

    let progressInterval = null;

    try {
      // 1. Render all pages and track percentage (5% -> 80%)
      const pdf = await generateMultiPagePdf((pct, stage) => {
        setEmailProgress(pct);
        setEmailProgressStage(stage);
      });

      setEmailProgress(82);
      setEmailProgressStage('Mengonversi file ke format lampiran...');
      const pdfDataUrl = pdf.output('datauristring');
      const pdfBase64 = pdfDataUrl.split(',')[1];

      setEmailProgress(85);
      setEmailProgressStage(`Mengirim email ke ${recipientEmail}...`);

      // Smooth percentage progression (85% -> 96%) while waiting for Edge Function
      progressInterval = setInterval(() => {
        setEmailProgress(prev => {
          if (prev < 96) return prev + 1;
          return prev;
        });
      }, 400);

      // 2. Invoke Supabase Edge Function with a 60s timeout safeguard
      const invokePromise = supabase.functions.invoke('send-rapot-email', {
        body: {
          to_email: recipientEmail,
          to_name: studentName,
          student_nim: studentNim,
          student_prodi: studentProdi,
          kelompok: studentKelompok,
          mentor: mentorTwoWords,
          nilai_akhir: targetHasEvaluation ? targetNumericScore : 0,
          predikat: targetEmailPredicate,
          status: targetStatusForEmail,
          logo_url: new URL('/assets/Logo%20HRD.png', window.location.origin).href,
          pdf_base64: pdfBase64,
          pdf_filename: pdfFilename,
        },
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Koneksi timeout (1 menit). Pastikan Edge Function "send-rapot-email" sudah di-deploy dan kredensial Gmail terpasang di Supabase Secrets.')), 60000)
      );

      const { data, error } = await Promise.race([invokePromise, timeoutPromise]);
      if (progressInterval) clearInterval(progressInterval);

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

      setEmailProgress(100);
      setEmailProgressStage(`Email untuk ${studentName} berhasil dikirim!`);

      // Auto download backup
      pdf.save(pdfFilename);

      // Update sent history in state & localStorage
      const newHistory = {
        ...sentHistory,
        [targetStudent.id]: {
          sentAt: new Date().toISOString(),
          count: (sentHistory[targetStudent.id]?.count || 0) + 1,
          recipient: recipientEmail,
          studentName: studentName
        }
      };
      setSentHistory(newHistory);
      try {
        localStorage.setItem('rapot_sent_emails_history_v1', JSON.stringify(newHistory));
      } catch (e) {}

      setEmailStatus('sent');
      if (showToast) {
        showToast(`Rapot PDF untuk ${studentName} (${recipientEmail}) berhasil dikirimkan!`);
      }
      // Stay on screen indefinitely until the mentor explicitly clicks close / OK
    } catch (err) {
      if (progressInterval) clearInterval(progressInterval);
      console.error('Email error:', err);
      const errMsg = err.message || 'Gagal mengirim email.';
      setLastErrorMessage(errMsg);
      setEmailStatus('error');
      if (showToast) {
        showToast(`Gagal kirim email ke ${recipientEmail}: ${errMsg}`);
      }
      setTimeout(() => {
        setEmailStatus(null);
        setEmailProgress(0);
        setEmailProgressStage('');
      }, 10000);
    } finally {
      if (progressInterval) clearInterval(progressInterval);
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
          ? 'pdf-export-page w-[794px] h-[1123px] max-w-[794px] max-h-[1123px] min-w-[794px] min-h-[1123px] m-0 p-0 shadow-none'
          : 'w-[794px] h-[1123px] max-w-[794px] max-h-[1123px] min-w-[794px] min-h-[1123px] m-0 p-0 rounded-2xl border border-slate-300 shadow-2xl overflow-hidden'
      }`}
      style={{
        boxSizing: 'border-box',
        width: '794px',
        height: '1123px'
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
              top: isTwoLines ? (isPrint ? '56.0%' : '53.0%') : '55.5%',
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
        <p
          className="font-isi font-semibold text-[#003CEC] tracking-normal text-center whitespace-nowrap leading-none"
          style={{ fontSize: coverMetaFontSize }}
        >
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
        <p
          className="font-isi font-semibold text-white text-center whitespace-nowrap leading-none"
          style={{ fontSize: mentorFontSize }}
        >
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
          ? 'pdf-export-page w-[794px] h-[1123px] max-w-[794px] max-h-[1123px] min-w-[794px] min-h-[1123px] m-0 p-0 shadow-none'
          : 'w-[794px] h-[1123px] max-w-[794px] max-h-[1123px] min-w-[794px] min-h-[1123px] m-0 p-0 rounded-2xl border border-slate-300 shadow-2xl overflow-hidden'
      }`}
      style={{
        boxSizing: 'border-box',
        width: '794px',
        height: '1123px'
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
          ? 'pdf-export-page pdf-score-sheet-page w-[794px] h-[1123px] max-w-[794px] max-h-[1123px] min-w-[794px] min-h-[1123px] m-0 p-0 shadow-none'
          : 'w-[794px] h-[1123px] max-w-[794px] max-h-[1123px] min-w-[794px] min-h-[1123px] m-0 p-0 rounded-2xl border border-slate-300 shadow-2xl overflow-hidden'
      }`}
      style={{
        boxSizing: 'border-box',
        width: '794px',
        height: '1123px'
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
          <h2 className="font-serif-judul font-bold text-sm sm:text-base md:text-lg lg:text-xl text-white leading-tight tracking-tight drop-shadow-sm whitespace-normal">
            {currentStudent.name || 'Nama Peserta'}
          </h2>
          <p className="font-sans-code font-bold text-[10px] sm:text-xs text-white/95 mt-1 drop-shadow-sm">
            NRP. {currentStudent.nim || '502624XXXX'}
          </p>
          <p className="font-isi text-[9px] sm:text-[10px] text-white/90 mt-0.5 drop-shadow-sm leading-4 whitespace-normal">
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
          <div className="pdf-score-row flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-5 h-5 rounded-lg bg-gradient-to-br from-[#003CEC] to-[#0066FF] text-white text-[10px] font-bold font-sans-code flex items-center justify-center shadow-sm shadow-blue-500/30 flex-shrink-0">
                P1
              </span>
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-800 whitespace-nowrap">
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
          <div className="pdf-score-row flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-5 h-5 rounded-lg bg-gradient-to-br from-[#00B0D8] to-[#22D3EE] text-white text-[10px] font-bold font-sans-code flex items-center justify-center shadow-sm shadow-cyan-500/30 flex-shrink-0">
                P2
              </span>
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-800 whitespace-nowrap">
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
          <div className="pdf-score-row flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-5 h-5 rounded-lg bg-gradient-to-br from-[#8A3AB9] to-[#C896E0] text-white text-[10px] font-bold font-sans-code flex items-center justify-center shadow-sm shadow-purple-500/30 flex-shrink-0">
                P3
              </span>
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-800 whitespace-nowrap">
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
          <div className="pdf-score-row flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-5 h-5 rounded-lg bg-gradient-to-br from-[#C86047] to-[#E59B86] text-white text-[10px] font-bold font-sans-code flex items-center justify-center shadow-sm shadow-orange-500/30 flex-shrink-0">
                P4
              </span>
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-800 whitespace-nowrap">
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
        <span className="pdf-page-four-final-score font-coolvetica font-bold text-3xl sm:text-4xl md:text-[44px] text-[#FEF08A] tracking-tight leading-none drop-shadow-md">
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
          <span className="whitespace-nowrap text-[9px]">{predicateLabel}</span>
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
                  <span className="inline-block h-4 leading-4 px-1.5 text-center rounded-md bg-[#003CEC]/15 backdrop-blur-sm border border-[#003CEC]/20 text-[#003CEC] font-bold text-[8.5px] font-sans-code">
                    P1
                  </span>
                  <span className="leading-none font-bold text-[9px] sm:text-[10px] text-slate-900 whitespace-nowrap">
                    CV & Portofolio
                  </span>
                </div>
                <span className="inline-block leading-4 text-center font-sans-code font-bold text-[9px] sm:text-[10px] text-[#003CEC] ml-1 flex-shrink-0 bg-white/70 h-4 px-1.5 rounded-full border border-white/80">
                  {p1Score} / 30 Pts
                </span>
              </div>

              <ul className="mt-1 sm:mt-1.5 space-y-0.5 text-[8px] sm:text-[9px] text-slate-700 font-isi">
                <li className="flex items-center gap-1.5 bg-white/40 backdrop-blur-xs px-1.5 py-0.5 rounded-md border border-white/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#003CEC] shadow-[0_0_4px_rgba(0,60,236,0.5)] flex-shrink-0" />
                  <span className="font-medium leading-[1.25] whitespace-normal">Format CV ATS / Creative & Kerapian Layout</span>
                </li>
                <li className="flex items-center gap-1.5 bg-white/40 backdrop-blur-xs px-1.5 py-0.5 rounded-md border border-white/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#003CEC] shadow-[0_0_4px_rgba(0,60,236,0.5)] flex-shrink-0" />
                  <span className="font-medium leading-[1.25] whitespace-normal">Kualitas Penulisan, Data Terukur & Action Verbs</span>
                </li>
                <li className="flex items-center gap-1.5 bg-white/40 backdrop-blur-xs px-1.5 py-0.5 rounded-md border border-white/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#003CEC] shadow-[0_0_4px_rgba(0,60,236,0.5)] flex-shrink-0" />
                  <span className="font-medium leading-[1.25] whitespace-normal">Kesesuaian Pengalaman & Relevansi Divisi</span>
                </li>
              </ul>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 text-[7.5px] sm:text-[8.5px] text-slate-500 font-sans-code">
              <span>Status Pilar:</span>
              <span className="font-bold text-[#003CEC] bg-white/70 inline-block h-4 leading-4 text-center px-1.5 rounded-full border border-white/80">
                {p1Score >= 24 ? 'Sangat Baik' : (p1Score >= 18 ? 'Baik' : 'Perlu Pendampingan')}
              </span>
            </div>
          </div>

          {/* Card 2: P2 Optimalisasi LinkedIn */}
          <div className="bg-white/65 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-white/90 shadow-[0_6px_18px_rgba(0,176,216,0.05)] ring-1 ring-black/[0.02] p-2 sm:p-2.5 flex flex-col justify-between border-t-[2.5px] border-t-[#00B0D8]">
            <div>
              <div className="flex items-center justify-between pb-1 border-b border-slate-200/50">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="inline-block h-4 leading-4 px-1.5 text-center rounded-md bg-[#00B0D8]/15 backdrop-blur-sm border border-[#00B0D8]/20 text-[#0082A0] font-bold text-[8.5px] font-sans-code">
                    P2
                  </span>
                  <span className="leading-none font-bold text-[9px] sm:text-[10px] text-slate-900 whitespace-nowrap">
                    Optimalisasi LinkedIn
                  </span>
                </div>
                <span className="inline-block leading-4 text-center font-sans-code font-bold text-[9px] sm:text-[10px] text-[#0082A0] ml-1 flex-shrink-0 bg-white/70 h-4 px-1.5 rounded-full border border-white/80">
                  {p2Score} / 20 Pts
                </span>
              </div>

              <ul className="mt-1 sm:mt-1.5 space-y-0.5 text-[8px] sm:text-[9px] text-slate-700 font-isi">
                <li className="flex items-center gap-1.5 bg-white/40 backdrop-blur-xs px-1.5 py-0.5 rounded-md border border-white/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00B0D8] shadow-[0_0_4px_rgba(0,176,216,0.5)] flex-shrink-0" />
                  <span className="font-medium leading-[1.25] whitespace-normal">Foto Profil & Banner Profesional Menarik</span>
                </li>
                <li className="flex items-center gap-1.5 bg-white/40 backdrop-blur-xs px-1.5 py-0.5 rounded-md border border-white/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00B0D8] shadow-[0_0_4px_rgba(0,176,216,0.5)] flex-shrink-0" />
                  <span className="font-medium leading-[1.25] whitespace-normal">Headline Menjual & Ringkasan About Summary</span>
                </li>
                <li className="flex items-center gap-1.5 bg-white/40 backdrop-blur-xs px-1.5 py-0.5 rounded-md border border-white/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00B0D8] shadow-[0_0_4px_rgba(0,176,216,0.5)] flex-shrink-0" />
                  <span className="font-medium leading-[1.25] whitespace-normal">Kelengkapan Experience, Skills & Projects</span>
                </li>
              </ul>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 text-[7.5px] sm:text-[8.5px] text-slate-500 font-sans-code">
              <span>Status Pilar:</span>
              <span className="font-bold text-[#0082A0] bg-white/70 inline-block h-4 leading-4 text-center px-1.5 rounded-full border border-white/80">
                {p2Score >= 16 ? 'Sangat Baik' : (p2Score >= 12 ? 'Baik' : 'Perlu Pendampingan')}
              </span>
            </div>
          </div>

          {/* Card 3: P3 Simulasi Interview */}
          <div className="bg-white/65 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-white/90 shadow-[0_6px_18px_rgba(138,58,185,0.05)] ring-1 ring-black/[0.02] p-2 sm:p-2.5 flex flex-col justify-between border-t-[2.5px] border-t-[#8A3AB9]">
            <div>
              <div className="flex items-center justify-between pb-1 border-b border-slate-200/50">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="inline-block h-4 leading-4 px-1.5 text-center rounded-md bg-[#C896E0]/25 backdrop-blur-sm border border-[#C896E0]/30 text-[#8A3AB9] font-bold text-[8.5px] font-sans-code">
                    P3
                  </span>
                  <span className="leading-none font-bold text-[9px] sm:text-[10px] text-slate-900 whitespace-nowrap">
                    Simulasi Interview
                  </span>
                </div>
                <span className="inline-block leading-4 text-center font-sans-code font-bold text-[9px] sm:text-[10px] text-[#8A3AB9] ml-1 flex-shrink-0 bg-white/70 h-4 px-1.5 rounded-full border border-white/80">
                  {p3Score} / 35 Pts
                </span>
              </div>

              <ul className="mt-1 sm:mt-1.5 space-y-0.5 text-[8px] sm:text-[9px] text-slate-700 font-isi">
                <li className="flex items-center gap-1.5 bg-white/40 backdrop-blur-xs px-1.5 py-0.5 rounded-md border border-white/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#8A3AB9] shadow-[0_0_4px_rgba(138,58,185,0.5)] flex-shrink-0" />
                  <span className="font-medium leading-[1.25] whitespace-normal">Artikulasi Jelas, Sikap Tubuh & Eye Contact</span>
                </li>
                <li className="flex items-center gap-1.5 bg-white/40 backdrop-blur-xs px-1.5 py-0.5 rounded-md border border-white/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#8A3AB9] shadow-[0_0_4px_rgba(138,58,185,0.5)] flex-shrink-0" />
                  <span className="font-medium leading-[1.25] whitespace-normal">Struktur Jawaban STAR & Relevansi Konteks</span>
                </li>
                <li className="flex items-center gap-1.5 bg-white/40 backdrop-blur-xs px-1.5 py-0.5 rounded-md border border-white/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#8A3AB9] shadow-[0_0_4px_rgba(138,58,185,0.5)] flex-shrink-0" />
                  <span className="font-medium leading-[1.25] whitespace-normal">Ketepatan Menjawab Pertanyaan Sulit</span>
                </li>
              </ul>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 text-[7.5px] sm:text-[8.5px] text-slate-500 font-sans-code">
              <span>Status Pilar:</span>
              <span className="font-bold text-[#8A3AB9] bg-white/70 inline-block h-4 leading-4 text-center px-1.5 rounded-full border border-white/80">
                {p3Score >= 28 ? 'Sangat Baik' : (p3Score >= 21 ? 'Baik' : 'Perlu Pendampingan')}
              </span>
            </div>
          </div>

          {/* Card 4: P4 Sikap & Partisipasi */}
          <div className="bg-white/65 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-white/90 shadow-[0_6px_18px_rgba(200,96,71,0.05)] ring-1 ring-black/[0.02] p-2 sm:p-2.5 flex flex-col justify-between border-t-[2.5px] border-t-[#C86047]">
            <div>
              <div className="flex items-center justify-between pb-1 border-b border-slate-200/50">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="inline-block h-4 leading-4 px-1.5 text-center rounded-md bg-[#E59B86]/25 backdrop-blur-sm border border-[#E59B86]/30 text-[#C86047] font-bold text-[8.5px] font-sans-code">
                    P4
                  </span>
                  <span className="leading-none font-bold text-[9px] sm:text-[10px] text-slate-900 whitespace-nowrap">
                    Sikap & Partisipasi
                  </span>
                </div>
                <span className="inline-block leading-4 text-center font-sans-code font-bold text-[9px] sm:text-[10px] text-[#C86047] ml-1 flex-shrink-0 bg-white/70 h-4 px-1.5 rounded-full border border-white/80">
                  {p4Score} / 15 Pts
                </span>
              </div>

              <ul className="mt-1 sm:mt-1.5 space-y-0.5 text-[8px] sm:text-[9px] text-slate-700 font-isi">
                <li className="flex items-center gap-1.5 bg-white/40 backdrop-blur-xs px-1.5 py-0.5 rounded-md border border-white/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C86047] shadow-[0_0_4px_rgba(200,96,71,0.5)] flex-shrink-0" />
                  <span className="font-medium leading-[1.25] whitespace-normal">Ketepatan Waktu Presensi & Kehadiran Sesi</span>
                </li>
                <li className="flex items-center gap-1.5 bg-white/40 backdrop-blur-xs px-1.5 py-0.5 rounded-md border border-white/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C86047] shadow-[0_0_4px_rgba(200,96,71,0.5)] flex-shrink-0" />
                  <span className="font-medium leading-[1.25] whitespace-normal">Keaktifan Berdiskusi & Antusiasme Mentoring</span>
                </li>
                <li className="flex items-center gap-1.5 bg-white/40 backdrop-blur-xs px-1.5 py-0.5 rounded-md border border-white/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C86047] shadow-[0_0_4px_rgba(200,96,71,0.5)] flex-shrink-0" />
                  <span className="font-medium leading-[1.25] whitespace-normal">Etika, Sikap Menghargai & Respon Feedback</span>
                </li>
              </ul>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 text-[7.5px] sm:text-[8.5px] text-slate-500 font-sans-code">
              <span>Status Pilar:</span>
              <span className="font-bold text-[#C86047] bg-white/70 inline-block h-4 leading-4 text-center px-1.5 rounded-full border border-white/80">
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
          ? 'pdf-export-page w-[794px] h-[1123px] max-w-[794px] max-h-[1123px] min-w-[794px] min-h-[1123px] m-0 p-0 shadow-none'
          : 'w-[794px] h-[1123px] max-w-[794px] max-h-[1123px] min-w-[794px] min-h-[1123px] m-0 p-0 rounded-2xl border border-slate-300 shadow-2xl overflow-hidden'
      }`}
      style={{
        boxSizing: 'border-box',
        width: '794px',
        height: '1123px'
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
          ? 'pdf-export-page w-[794px] h-[1123px] max-w-[794px] max-h-[1123px] min-w-[794px] min-h-[1123px] m-0 p-0 shadow-none'
          : 'w-[794px] h-[1123px] max-w-[794px] max-h-[1123px] min-w-[794px] min-h-[1123px] m-0 p-0 rounded-2xl border border-slate-300 shadow-2xl overflow-hidden'
      }`}
      style={{
        boxSizing: 'border-box',
        width: '794px',
        height: '1123px'
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
    { num: 1, id: 'cover', title: 'Halaman 1/6 — Cover Rapot', short: 'Cover' },
    { num: 2, id: 'kahima', title: 'Halaman 2/6 — Pesan KAHIMA', short: 'Pesan KAHIMA' },
    { num: 3, id: 'hrd', title: 'Halaman 3/6 — Pesan HRD & PIC', short: 'Pesan HRD & PIC' },
    { num: 4, id: 'scores', title: 'Halaman 4/6 — Lembar Nilai 4 Pilar', short: 'Lembar Nilai' },
    { num: 5, id: 'feedback', title: 'Halaman 5/6 — Feedback Mentor', short: 'Feedback Mentor' },
    { num: 6, id: 'closing', title: 'Halaman 6/6 — Penutup & Rekap', short: 'Penutup' }
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
      
      {/* ═══ 1. Vibrant GSM Hero Banner (Clean & Static) ═══ */}
      <div className="relative bg-gradient-to-r from-[#003CEC] via-[#0066FF] to-[#00B0D8] p-6 sm:p-7 rounded-3xl text-white shadow-xl overflow-hidden flex-shrink-0">
        
        {/* Background Decorative Elements - Static */}
        <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-64 h-64 rounded-full bg-[#002DB3]/40 blur-2xl pointer-events-none" />
        <img 
          src="/assets/Bintang.png" 
          alt="Bintang GSM" 
          className="absolute right-2 bottom-2 w-20 h-20 object-contain opacity-20 pointer-events-none z-0 select-none" 
        />

        <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-white/15 backdrop-blur-md text-white flex items-center justify-center border border-white/20 shadow-md flex-shrink-0 p-3">
              <span className="material-symbols-outlined text-3xl text-gsm-cream">picture_as_pdf</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-gsm-cream text-slate-950 font-sans-code font-bold text-[10px] uppercase tracking-wider px-3 py-0.5 rounded-full border border-yellow-200 shadow-sm">
                  Dokumen Rapot
                </span>
              </div>
              <h2 className="font-coolvetica font-bold text-2xl text-white mt-1 drop-shadow-sm">
                Cetak Rapot Mentoring
              </h2>
              <p className="text-xs text-blue-100/90 font-isi mt-0.5">
                Pratinjau dan unduh dokumen rapot evaluasi peserta mentoring.
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
              onChange={(e) => handleSelectStudentChange(e.target.value)}
              className="w-full max-w-lg bg-white/95 text-slate-900 border border-white/40 rounded-xl px-4 py-2 text-xs font-bold font-isi outline-none focus:ring-2 focus:ring-gsm-cream shadow-sm cursor-pointer"
            >
              {students.map(s => (
                <option key={s.id} value={s.id} className="text-slate-900">
                  {s.nim} - {s.name} ({s.kelompok}) - [{s.status}]
                </option>
              ))}
            </select>
          </div>

          {/* Right: Meta Chips & Score Badge (Solid White Background for Maximum Legibility) */}
          <div className="flex items-center gap-3 flex-shrink-0 flex-wrap">
            <div className="bg-white text-slate-800 border border-white/60 px-4 py-2 rounded-2xl flex items-center gap-3 shadow-md">
              <span className="text-[11px] font-isi text-slate-600">
                Email: <strong className="font-sans-code text-gsm-blue-main font-bold">{currentStudent.email || '-'}</strong>
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-[11px] font-isi text-slate-600">
                Rata-rata: <strong className="font-sans-code text-[#0082A0] font-bold">{groupAvgScore}</strong>
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-[11px] font-isi text-slate-600">
                Peringkat: <strong className="font-sans-code text-emerald-600 font-bold">#{overallRank}</strong>
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

      {/* ═══ 2. Navigation, Zoom Controls & Action Bar ═══ */}
      <div className="glass-panel rounded-2xl p-3 shadow-gsm-card flex flex-wrap items-center justify-between gap-3">
        
        {/* Left: Minimalist Page Switcher ([<] 1 2 3 4 5 6 [>]) */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-2xl border border-slate-200 shadow-inner">
            <button
              type="button"
              onClick={() => setCurrentPageIndex(prev => Math.max(1, prev - 1))}
              disabled={currentPageIndex === 1}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-700 hover:bg-white hover:shadow-xs disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              title="Halaman Sebelumnya"
            >
              <span className="material-symbols-outlined text-lg">chevron_left</span>
            </button>

            {[1, 2, 3, 4, 5, 6].map((num) => {
              const isActive = currentPageIndex === num;
              return (
                <button
                  key={num}
                  type="button"
                  onClick={() => setCurrentPageIndex(num)}
                  className={`w-8 h-8 rounded-xl text-xs font-bold font-sans-code transition-all flex items-center justify-center ${
                    isActive
                      ? 'bg-gsm-blue-main text-white shadow-md shadow-blue-600/30 font-extrabold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                  }`}
                  title={`Halaman ${num}`}
                >
                  {num}
                </button>
              );
            })}

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

          {/* Zoom / Scale Controls for Preview */}
          <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-2xl border border-slate-200 shadow-inner">
            <span className="text-[11px] font-bold font-sans-code text-slate-500 px-2 flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-slate-400">zoom_in</span>
              <span className="hidden md:inline">Zoom:</span>
            </span>
            <button
              type="button"
              onClick={() => setPreviewScale(prev => Math.max(0.4, Number((prev - 0.1).toFixed(2))))}
              className="w-7 h-7 rounded-xl flex items-center justify-center text-slate-700 hover:bg-white transition-all font-bold"
              title="Perkecil Preview"
            >
              <span className="material-symbols-outlined text-base">remove</span>
            </button>
            
            {[
              { label: 'Fit Layar', val: 0.65, title: 'Fit Layar (Tanpa Scroll)' },
              { label: '50%', val: 0.50, title: 'Kompak 50%' },
              { label: '75%', val: 0.75, title: 'Sedang 75%' },
              { label: '100%', val: 1.0, title: 'Penuh 100%' }
            ].map((z) => (
              <button
                key={z.label}
                type="button"
                onClick={() => setPreviewScale(z.val)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold font-sans-code transition-all ${
                  Math.abs(previewScale - z.val) < 0.04
                    ? 'bg-gsm-blue-main text-white shadow-xs'
                    : 'text-slate-600 hover:bg-white'
                }`}
                title={z.title}
              >
                {z.label}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setPreviewScale(prev => Math.min(1.2, Number((prev + 0.1).toFixed(2))))}
              className="w-7 h-7 rounded-xl flex items-center justify-center text-slate-700 hover:bg-white transition-all font-bold"
              title="Perbesar Preview"
            >
              <span className="material-symbols-outlined text-base">add</span>
            </button>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {onNavigateToInsert && (
            <button
              onClick={() => onNavigateToInsert(currentStudent)}
              className="bg-gsm-blue-main hover:bg-blue-700 active:scale-95 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-md shadow-blue-600/25 flex items-center gap-1.5 font-reddit"
            >
              <span className="material-symbols-outlined text-base">edit_note</span>
              <span>Input Nilai</span>
            </button>
          )}

          <button
            onClick={handleDownloadPdf}
            disabled={isGenerating || isSendingEmail}
            className="bg-gsm-blue-main hover:bg-blue-700 active:scale-95 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-md shadow-blue-600/25 flex items-center gap-1.5 font-reddit disabled:opacity-80 disabled:cursor-wait relative overflow-hidden"
          >
            {isGenerating && (
              <div 
                className="absolute inset-0 bg-white/20 transition-all duration-300 ease-out pointer-events-none"
                style={{ width: `${downloadProgress}%` }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {isGenerating ? (
                <span className="font-sans-code font-bold text-amber-200 min-w-[28px] text-right">
                  {downloadProgress}%
                </span>
              ) : (
                <span className="material-symbols-outlined text-base">download</span>
              )}
              <span>{isGenerating ? 'Mengunduh...' : 'Download PDF (6 Hlm)'}</span>
            </span>
          </button>

          {/* Kirim Email Button with Sent History Indicator */}
          {(() => {
            const isAlreadySent = Boolean(sentHistory[currentStudent.id]);
            const sentRecord = sentHistory[currentStudent.id];

            return (
              <button
                type="button"
                onClick={handleSendEmailClick}
                disabled={isSendingEmail || isGenerating || !scheduleStatus.isAllowed}
                title={
                  !scheduleStatus.isAllowed 
                    ? scheduleStatus.reason 
                    : isAlreadySent 
                    ? `Sudah dikirim ${sentRecord?.count || 1}x pada ${formatSentTime(sentRecord?.sentAt)}. Klik untuk konfirmasi kirim ulang.` 
                    : scheduleStatus.isSuperAdmin 
                    ? 'Akses Super Admin: Bebas Kirim' 
                    : 'Kirim Rapot PDF ke Email Mahasiswa'
                }
                className={`font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-md flex items-center gap-1.5 font-reddit relative overflow-hidden ${
                  !scheduleStatus.isAllowed
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300 shadow-none'
                    : isSendingEmail
                    ? 'bg-[#003CEC] text-white shadow-blue-600/30'
                    : isAlreadySent
                    ? 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-emerald-700/25'
                    : 'bg-slate-900 hover:bg-slate-800 active:scale-95 text-white'
                }`}
              >
                {isSendingEmail && (
                  <div 
                    className="absolute inset-0 bg-white/25 transition-all duration-300 ease-out pointer-events-none"
                    style={{ width: `${emailProgress}%` }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  {isSendingEmail ? (
                    <span className="font-sans-code font-bold text-amber-200 min-w-[30px] text-right">
                      {emailProgress}%
                    </span>
                  ) : (
                    <span className="material-symbols-outlined text-base">
                      {!scheduleStatus.isAllowed 
                        ? 'lock_clock' 
                        : isAlreadySent 
                        ? 'mark_email_read' 
                        : 'mail'}
                    </span>
                  )}
                  <span>
                    {!scheduleStatus.isAllowed 
                      ? 'Email Terkunci' 
                      : isSendingEmail 
                      ? 'Mengirim...' 
                      : isAlreadySent 
                      ? `Sudah Terkirim (${sentRecord?.count || 1}x)` 
                      : 'Kirim Email'}
                  </span>
                </span>
              </button>
            );
          })()}
        </div>

      </div>

      {/* Schedule lock notice banner for mentors when outside schedule window */}
      {!scheduleStatus.isAllowed && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-base">schedule_send</span>
            </div>
            <div>
              <p className="font-bold font-reddit text-amber-900">Jadwal Pengiriman Email Sedang Terkunci</p>
              <p className="text-[11px] text-amber-800 font-isi mt-0.5">{scheduleStatus.reason}</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-amber-200/60 text-amber-900 text-[10px] font-sans-code font-bold uppercase tracking-wider flex-shrink-0">
            {scheduleStatus.status}
          </span>
        </div>
      )}

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

      {/* ═══ 3. Scalable Dynamic Single-Page Preview (Zero Scroll Needed on Fit Layar) ═══ */}
      <div className="bg-slate-200/60 p-4 sm:p-6 rounded-3xl shadow-inner border border-slate-300/80 flex flex-col items-center gap-3 overflow-hidden">
        
        {/* Active Page Title Indicator Badge */}
        <div className="flex items-center gap-2 text-xs font-sans-code text-slate-600 font-bold bg-white/90 px-4 py-1.5 rounded-full shadow-xs border border-slate-200">
          <span className="material-symbols-outlined text-[#003CEC] text-base">
            {PAGES[currentPageIndex - 1]?.num === 1 ? 'stars' : PAGES[currentPageIndex - 1]?.num === 6 ? 'flag' : 'article'}
          </span>
          <span>{PAGES[currentPageIndex - 1]?.title}</span>
          <span className="text-slate-400 font-normal ml-1">({Math.round(previewScale * 100)}%)</span>
        </div>

        {/* Dynamic Scaled Canvas Renderer */}
        <div 
          style={{
            width: `${Math.round(794 * previewScale)}px`,
            height: `${Math.round(1123 * previewScale)}px`,
            transition: 'all 0.2s ease-out'
          }}
          className="relative flex-shrink-0 flex items-start justify-center"
        >
          <div 
            style={{
              transform: `scale(${previewScale})`,
              transformOrigin: 'top left',
              width: '794px',
              height: '1123px',
            }}
            className="absolute top-0 left-0"
          >
            <div key={currentPageIndex} className="w-full flex justify-center animate-in fade-in duration-200">
              {renderActivePreviewPage()}
            </div>
          </div>
        </div>

      </div>

      {/* ═══ 3. Print Container mounted ONLY during PDF generation (Zero Page Scroll Impact) ═══ */}
      {(isGenerating || isSendingEmail) && (
        <div 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: '-10000px',
            width: '794px', 
            height: 'auto',
            overflow: 'visible',
            zIndex: -99999, 
            opacity: 1,
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

      {/* ═══ Glassmorphic Email Processing / Standby Notice Modal ═══ */}
      {(isSendingEmail || emailStatus === 'sent') && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[99999] overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 font-isi animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gsm-lilac overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            
            {/* Header with GSM Gradient */}
            <div className={`p-5 text-white relative overflow-hidden transition-colors duration-300 ${
              emailStatus === 'sent' 
                ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500' 
                : 'bg-gradient-to-r from-[#003CEC] via-[#0066FF] to-[#00B0D8]'
            }`}>
              <img 
                src="/assets/Bintang.png" 
                alt="GSM Star" 
                className="absolute right-2 bottom-1 w-16 h-16 opacity-20 pointer-events-none select-none"
              />
              <div className="relative z-10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md text-white flex items-center justify-center border border-white/30 shadow-sm flex-shrink-0">
                    <span className="material-symbols-outlined text-2xl">
                      {emailStatus === 'sent' ? 'mark_email_read' : 'mail_lock'}
                    </span>
                  </div>
                  <div>
                    <span className="bg-white/20 backdrop-blur-md text-white font-sans-code font-bold text-[9px] uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-white/30">
                      {emailStatus === 'sent' ? 'Status: Terkirim' : 'Proses Pengiriman Email'}
                    </span>
                    <h3 className="font-coolvetica font-bold text-lg text-white mt-1 leading-tight">
                      {emailStatus === 'sent' ? 'Email Berhasil Dikirim!' : 'Mohon Tetap di Tab Ini'}
                    </h3>
                  </div>
                </div>

                {emailStatus === 'sent' && (
                  <button
                    type="button"
                    onClick={() => {
                      setEmailStatus(null);
                      setEmailProgress(0);
                      setEmailProgressStage('');
                    }}
                    className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all flex-shrink-0 border border-white/25"
                    title="Tutup Popup"
                  >
                    <span className="material-symbols-outlined text-lg leading-none">close</span>
                  </button>
                )}
              </div>
            </div>

            {/* Body Notice & Progress */}
            <div className="p-6 space-y-4 text-slate-700 bg-white">
              {emailStatus === 'sent' ? (
                <div className="text-center py-2 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-xs">
                    <span className="material-symbols-outlined text-2xl">check_circle</span>
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-base text-slate-900 font-coolvetica">
                      Rapot PDF Berhasil Dikirimkan!
                    </p>
                    <p className="text-xs text-slate-500 font-isi">
                      Dokumen rapot telah terkirim ke alamat email <strong>{currentStudent.email}</strong>.
                    </p>
                  </div>

                  {/* Mentor coordination reminder note */}
                  <div className="bg-blue-50/80 border border-blue-200/80 rounded-2xl p-3 text-left flex items-start gap-2.5 text-xs text-slate-700">
                    <span className="material-symbols-outlined text-gsm-blue-main text-base flex-shrink-0 mt-0.5">info</span>
                    <p className="text-[11px] leading-relaxed">
                      <strong>Info Mentor:</strong> Jika peserta mengabarkan belum menerima email atau Anda ragu statusnya, <strong>silakan chat di grup mentor WhatsApp</strong> agar tim HRD yang mengecek log sistem pengiriman.
                    </p>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEmailStatus(null);
                        setEmailProgress(0);
                        setEmailProgressStage('');
                      }}
                      className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 font-reddit cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">check</span>
                      <span>Tutup & Selesai</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3.5 flex items-start gap-3">
                    <span className="material-symbols-outlined text-amber-600 text-lg flex-shrink-0 mt-0.5">
                      warning
                    </span>
                    <p className="text-xs text-amber-900 font-isi leading-relaxed">
                      <strong>Jangan berpindah tab atau menutup browser</strong> hingga proses selesai (100%), agar seluruh 6 halaman rapot dapat dirender dan dikirim tanpa terhenti.
                    </p>
                  </div>

                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-isi font-medium truncate max-w-[280px]">
                        {emailProgressStage || 'Sedang menyiapkan rapot...'}
                      </span>
                      <span className="font-sans-code font-bold text-[#003CEC] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full text-xs">
                        {emailProgress}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200/70 p-0.5">
                      <div 
                        className="h-full bg-gradient-to-r from-[#003CEC] via-[#0066FF] to-[#00B0D8] rounded-full transition-all duration-300 ease-out shadow-xs"
                        style={{ width: `${emailProgress}%` }}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* ═══ Modal Konfirmasi Pengiriman Ulang Email (Anti Duplikat / Anti Kirim 2x) ═══ */}
      {confirmResendStudent && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[99999] overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 font-isi animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-amber-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            
            {/* Header with Warning Accent */}
            <div className="p-5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white relative overflow-hidden">
              <div className="relative z-10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md text-white flex items-center justify-center border border-white/30 shadow-sm flex-shrink-0">
                    <span className="material-symbols-outlined text-2xl">mark_email_read</span>
                  </div>
                  <div>
                    <span className="bg-white/20 backdrop-blur-md text-white font-sans-code font-bold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-white/30">
                      Peringatan Pengiriman Ulang
                    </span>
                    <h3 className="font-coolvetica font-bold text-lg text-white mt-0.5">
                      Rapot Sudah Pernah Dikirim!
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setConfirmResendStudent(null)}
                  className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all border border-white/25"
                  title="Tutup"
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              </div>
            </div>

            {/* Body Explanation */}
            <div className="p-6 space-y-4 text-slate-700 bg-white">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1 text-xs">
                <p className="font-bold text-slate-900 font-coolvetica text-sm">
                  {confirmResendStudent.name} ({confirmResendStudent.nim})
                </p>
                <p className="text-slate-600 font-sans-code">
                  Tujuan: <strong className="text-gsm-blue-main">{confirmResendStudent.email}</strong>
                </p>
                {sentHistory[confirmResendStudent.id] && (
                  <p className="text-[11px] text-emerald-700 font-sans-code font-bold flex items-center gap-1 mt-1">
                    <span className="material-symbols-outlined text-xs">check_circle</span>
                    <span>Telah dikirim {sentHistory[confirmResendStudent.id].count}x (Terakhir: {formatSentTime(sentHistory[confirmResendStudent.id].sentAt)})</span>
                  </p>
                )}
              </div>

              {/* Warning Notice to Mentor */}
              <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-4 flex items-start gap-3">
                <span className="material-symbols-outlined text-amber-600 text-xl flex-shrink-0 mt-0.5">forum</span>
                <div className="space-y-1 text-xs text-amber-950 font-isi leading-relaxed">
                  <p className="font-bold font-reddit text-amber-900">
                    Harap Chat di Grup Mentor Terlebih Dahulu!
                  </p>
                  <p>
                    Sebelum mengirim ulang, pastikan untuk <strong>bertanya di grup mentor WhatsApp</strong> apakah email rapot peserta sudah masuk atau belum.
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-600 font-medium text-center">
                Apakah Anda yakin tetap ingin mengirimkan ulang rapot ke email mahasiswa ini?
              </p>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmResendStudent(null)}
                  className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 text-xs font-bold rounded-xl transition-all border border-slate-200 flex items-center justify-center font-reddit cursor-pointer text-center"
                >
                  Batal (Jangan Kirim)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const st = confirmResendStudent;
                    setConfirmResendStudent(null);
                    executeSendEmail(st);
                  }}
                  className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-amber-600/20 flex items-center justify-center font-reddit cursor-pointer text-center"
                >
                  Ya, Tetap Kirim Ulang
                </button>
              </div>

            </div>

          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
