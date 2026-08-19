import React, { useState, useRef } from 'react';

// Supabase project URL (from env) — used to call Edge Function
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export default function GeneratePdfModal({ isOpen, onClose, student, students }) {
  const [selectedStudent, setSelectedStudent] = useState(student || students[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState(null); // 'sent' | 'error' | null
  const [lastErrorMessage, setLastErrorMessage] = useState('');
  const rapotRef = useRef(null);

  if (!isOpen) return null;

  const currentStudent = selectedStudent || students[0];

  // Helper: generate PDF blob and return base64 string
  const generatePdfBase64 = async () => {
    const html2pdfModule = await import('html2pdf.js');
    const html2pdf = html2pdfModule.default || html2pdfModule;
    const element = rapotRef.current;
    const opt = {
      margin:       0.3,
      filename:     `Rapot_${currentStudent.nim}_${currentStudent.name.replace(/\s+/g, '_')}.pdf`,
      image:        { type: 'jpeg', quality: 0.95 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
    };
    // Output as blob, then convert to base64
    const pdfBlob = await html2pdf().set(opt).from(element).outputPdf('blob');
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result); // data:application/pdf;base64,...
      reader.onerror  = reject;
      reader.readAsDataURL(pdfBlob);
    });
  };

  const handleDownloadPdf = async () => {
    setIsGenerating(true);
    try {
      const html2pdfModule = await import('html2pdf.js');
      const html2pdf = html2pdfModule.default || html2pdfModule;
      const element = rapotRef.current;
      const opt = {
        margin:       0.3,
        filename:     `Rapot_Rawat_Maba_${currentStudent.nim}_${currentStudent.name.replace(/\s+/g, '_')}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
      };
      await html2pdf().set(opt).from(element).save();
      setIsGenerating(false);
    } catch (err) {
      console.error(err);
      setIsGenerating(false);
      window.print();
    }
  };

  const handleSendEmail = async () => {
    setIsSendingEmail(true);
    setEmailStatus(null);
    setLastErrorMessage('');

    const recipientEmail = currentStudent.email || 'kaylaputrimaharani@gmail.com';
    const pdfFilename = `Rapot_Rawat_Maba_${currentStudent.nim}_${currentStudent.name.replace(/\s+/g, '_')}.pdf`;

    try {
      // 1. Generate PDF as base64
      const pdfDataUrl = await generatePdfBase64();
      const pdfBase64 = pdfDataUrl.split(',')[1];

      // 2. Call Supabase Edge Function
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-rapot-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          to_email:      recipientEmail,
          to_name:       currentStudent.name,
          student_nim:   currentStudent.nim,
          student_prodi: currentStudent.prodi,
          kelompok:      currentStudent.kelompok,
          mentor:        currentStudent.mentor,
          nilai_akhir:   currentStudent.finalScore,
          predikat:      currentStudent.predicate,
          status:        currentStudent.status,
          pdf_base64:    pdfBase64,
          pdf_filename:  pdfFilename,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const errorDetail = data.details?.message || (typeof data.error === 'string' ? data.error : JSON.stringify(data.error || 'Failed to send email'));
        setLastErrorMessage(errorDetail);
        throw new Error(errorDetail);
      }

      // Auto download PDF as backup for user
      const link = document.createElement('a');
      link.href = pdfDataUrl;
      link.download = pdfFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setEmailStatus('sent');
      setTimeout(() => setEmailStatus(null), 6000);
    } catch (err) {
      console.error('Email error:', err);
      setEmailStatus('error');
      setTimeout(() => setEmailStatus(null), 8000);
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto font-isi">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden relative my-6">
        
        {/* Modal Top Control Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex flex-wrap items-center justify-between gap-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-gsm-cream text-2xl">picture_as_pdf</span>
            <div>
              <h3 className="font-coolvetica font-bold text-lg text-white">Generate Rapot PDF Resmi</h3>
              <p className="text-xs text-slate-400 font-sans-code">Preview dan unduh Rapot Rawat Maba format GSM FIX</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Student Picker */}
            <select 
              value={currentStudent.id}
              onChange={(e) => {
                const s = students.find(item => item.id === e.target.value);
                if (s) setSelectedStudent(s);
              }}
              className="bg-slate-800 border border-slate-700 text-xs font-sans-code text-white rounded-xl px-3 py-2 outline-none"
            >
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.nim} - {s.name}</option>
              ))}
            </select>

            {/* Download PDF Button */}
            <button 
              onClick={handleDownloadPdf}
              disabled={isGenerating}
              className="bg-gsm-blue-main hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-md flex items-center gap-2 font-reddit"
            >
              <span className="material-symbols-outlined text-base">download</span>
              <span>{isGenerating ? 'Mengunduh...' : 'Download PDF'}</span>
            </button>

            {/* Send Email Button */}
            <button 
              onClick={handleSendEmail}
              disabled={isSendingEmail || isGenerating}
              className={`font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-md flex items-center gap-2 font-reddit ${
                emailStatus === 'sent'
                  ? 'bg-[#00B0D8] text-white'
                  : emailStatus === 'error'
                  ? 'bg-[#C86047] text-white'
                  : 'bg-gsm-blue-main hover:bg-[#002ec4] text-white'
              }`}
            >
              <span className="material-symbols-outlined text-base">
                {emailStatus === 'sent' ? 'check_circle' : emailStatus === 'error' ? 'error' : 'mail'}
              </span>
              <span>
                {isSendingEmail
                  ? 'Mengirim...'
                  : emailStatus === 'sent'
                  ? 'Terkirim!'
                  : emailStatus === 'error'
                  ? 'Gagal Kirim'
                  : 'Kirim ke Email'}
              </span>
            </button>

            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-white bg-slate-800 rounded-full p-2 transition-all"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Email recipient info bar */}
        {(currentStudent.email || true) && (
          <div className="bg-blue-50 border-b border-gsm-lilac px-6 py-2.5 flex items-center gap-2.5">
            <span className="material-symbols-outlined text-gsm-blue-main text-sm">info</span>
            <p className="text-xs text-slate-700 font-isi">
              Email rapot akan dikirim ke: <span className="font-bold font-sans-code text-gsm-blue-main">{currentStudent.email || 'kaylaputrimaharani@gmail.com'}</span>
              {' '}— Subject: <span className="font-semibold text-slate-900">[RAPOT RAWAT MABA 2026] Hasil Evaluasi - {currentStudent.name}</span>
            </p>
          </div>
        )}

        {/* Error Banner when email sending fails */}
        {emailStatus === 'error' && (
          <div className="bg-rose-50 border-b border-rose-200 px-6 py-3 flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-rose-600 text-lg">error</span>
              <p className="text-xs text-rose-800 font-isi leading-snug">
                <strong>Gagal Mengirim Email dari Server:</strong> {lastErrorMessage || 'Secret RESEND_API_KEY belum terpasang di Dashboard Supabase Cloud'}
              </p>
            </div>
            <button 
              onClick={() => setEmailStatus(null)}
              className="text-rose-500 hover:text-rose-800 text-xs font-bold font-sans-code px-2 py-1 rounded-md hover:bg-rose-100 transition-colors"
            >
              ✕
            </button>
          </div>
        )}

        {/* Printable Rapot Preview Container */}
        <div className="p-3 sm:p-6 md:p-8 bg-slate-100 max-h-[75vh] overflow-y-auto overflow-x-auto">
          
          <div 
            ref={rapotRef} 
            className="bg-white p-5 sm:p-8 md:p-10 rounded-2xl shadow-xl border border-slate-300 relative text-slate-900 max-w-3xl mx-auto min-w-[320px]"
          >
            {/* GSM Background Watermark Accent */}
            <img 
              src="/assets/Adobe Express - file 2.png" 
              alt="Pillar Graphic" 
              className="absolute right-6 top-8 w-32 h-auto opacity-10 pointer-events-none"
            />
            <img 
              src="/assets/Bintang.png" 
              alt="Star Motif" 
              className="absolute left-6 bottom-6 w-20 h-20 opacity-10 pointer-events-none"
            />

            {/* Official Header */}
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-6">
              <div className="flex items-center gap-4">
                <img src="/assets/Logo HRD.png" alt="Logo HRD" className="w-14 h-14 object-contain" />
                <div>
                  <h2 className="font-coolvetica font-bold text-2xl text-gsm-blue-main tracking-tight">
                    PANITIA RAWAT MABA 2026
                  </h2>
                  <p className="text-xs text-slate-600 font-sans-code font-bold uppercase tracking-wider">
                    LEMBAR HASIL EVALUASI KARAKTER & AKADEMIK (RAPOT)
                  </p>
                  <p className="text-[10px] text-slate-400 font-sans-code">
                    Dokumen GSM Resmi Ditandatangani Secara Digital
                  </p>
                </div>
              </div>

              <div className="text-right font-sans-code">
                <span className="inline-block bg-slate-900 text-gsm-cream text-[10px] font-bold px-3 py-1 rounded-full uppercase">
                  T.A. 2026/2027
                </span>
                <p className="text-[11px] text-slate-500 font-sans-code mt-1">No. Reg: {currentStudent.id}</p>
              </div>
            </div>

            {/* Student Metadata Card */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs font-isi mb-6">
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-bold font-sans-code">Nama Mahasiswa</span>
                <p className="font-serif-judul font-bold text-sm text-slate-900">{currentStudent.name}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-bold font-sans-code">NRP</span>
                <p className="font-sans-code font-bold text-sm text-slate-900">{currentStudent.nim}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-bold font-sans-code">Program Studi</span>
                <p className="font-medium text-slate-800">{currentStudent.prodi}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-bold font-sans-code">Kelompok & Mentor</span>
                <p className="font-medium text-slate-800">{currentStudent.kelompok} — {currentStudent.mentor}</p>
              </div>
            </div>

            {/* Score Breakdown Table — 4 Pilar Rubrik */}
            <div className="mb-6">
              <h4 className="font-coolvetica font-bold text-xs text-slate-900 uppercase tracking-wider mb-3">
                I. Rincian Capaian Pilar Evaluasi Rawat Maba
              </h4>
              
              <table className="w-full border-collapse text-xs font-isi">
                <thead>
                  <tr className="bg-slate-900 text-white uppercase text-[10px] font-bold font-sans-code">
                    <th className="py-2.5 px-3 text-left">Pilar</th>
                    <th className="py-2.5 px-3 text-left">Aspek Penilaian</th>
                    <th className="py-2.5 px-3 text-center">Bobot</th>
                    <th className="py-2.5 px-3 text-right">Skor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 border-b border-slate-200">
                  <tr>
                    <td className="py-2.5 px-3 font-sans-code">P1</td>
                    <td className="py-2.5 px-3 font-medium">CV & Portofolio</td>
                    <td className="py-2.5 px-3 text-center text-slate-500 font-sans-code">30 poin</td>
                    <td className="py-2.5 px-3 text-right font-bold font-sans-code text-slate-900">
                      {currentStudent.pillarScores?.p1_score || 0}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-sans-code">P2</td>
                    <td className="py-2.5 px-3 font-medium">Optimalisasi LinkedIn</td>
                    <td className="py-2.5 px-3 text-center text-slate-500 font-sans-code">20 poin</td>
                    <td className="py-2.5 px-3 text-right font-bold font-sans-code text-slate-900">
                      {currentStudent.pillarScores?.p2_score || 0}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-sans-code">P3</td>
                    <td className="py-2.5 px-3 font-medium">Simulasi Interview</td>
                    <td className="py-2.5 px-3 text-center text-slate-500 font-sans-code">35 poin</td>
                    <td className="py-2.5 px-3 text-right font-bold font-sans-code text-slate-900">
                      {currentStudent.pillarScores?.p3_score || 0}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-sans-code">P4</td>
                    <td className="py-2.5 px-3 font-medium">Sikap & Partisipasi</td>
                    <td className="py-2.5 px-3 text-center text-slate-500 font-sans-code">15 poin</td>
                    <td className="py-2.5 px-3 text-right font-bold font-sans-code text-slate-900">
                      {currentStudent.pillarScores?.p4_score || 0}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Final Grade Summary Card */}
            <div className="bg-slate-900 text-white p-5 rounded-2xl flex items-center justify-between shadow-md mb-6">
              <div>
                <span className="text-[10px] text-slate-300 font-sans-code uppercase tracking-wider block">
                  Nilai Akhir Rapot
                </span>
                <div className="flex items-center gap-3 mt-1">
                  <span className="font-coolvetica font-bold text-4xl text-gsm-cream">
                    {currentStudent.finalScore}
                  </span>
                  <span className="bg-gsm-cream text-slate-950 font-bold text-xs sm:text-sm px-3.5 py-1 rounded-full font-reddit border border-yellow-200">
                    Predikat {currentStudent.predicate}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-300 font-sans-code uppercase block">Status Kelulusan</span>
                <span className="font-coolvetica font-bold text-sm text-[#00B0D8] block mt-0.5">
                  {currentStudent.status}
                </span>
              </div>
            </div>

            {/* Evaluation Notes & Signatures */}
            <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-200 text-xs font-isi">
              <div>
                <span className="font-bold text-slate-900 uppercase block mb-1 text-[11px] font-sans-code">
                  Catatan Evaluasi Mentor:
                </span>
                <p className="text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed text-[11px]">
                  "{currentStudent.notes || 'Peserta telah mengikuti evaluasi mentoring Rawat Maba 2026 meliputi CV & Portofolio, LinkedIn, Simulasi Interview, dan Sikap & Partisipasi.'}"
                </p>
              </div>

              <div className="text-center space-y-12">
                <div>
                  <p className="text-slate-500 text-[10px] font-sans-code">Kota Kampus, {currentStudent.lastUpdated || '12 Desember 2026'}</p>
                  <p className="font-bold text-slate-900 text-[11px] mt-0.5">Mentor Kelompok Rawat Maba</p>
                </div>

                <div className="pt-2">
                  <p className="font-serif-judul font-bold text-slate-900 underline">{currentStudent.mentor}</p>
                  <p className="text-[10px] text-slate-400 font-sans-code">NIP / NIDN. 198504122010121004</p>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
