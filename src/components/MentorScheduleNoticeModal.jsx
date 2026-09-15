import React from 'react';
import { createPortal } from 'react-dom';
import { evaluateEmailScheduleForUser } from '../lib/dataService';

export default function MentorScheduleNoticeModal({
  currentUser,
  emailSchedules,
  isOpen,
  onClose
}) {
  if (!isOpen || !currentUser || currentUser.role === 'super_admin' || currentUser.username === 'webdev') {
    return null;
  }

  const scheduleEval = evaluateEmailScheduleForUser(currentUser, emailSchedules);
  const groupName = currentUser?.group_name || 'Kelompok Mentoring';

  const formatDateTime = (isoOrStr) => {
    if (!isoOrStr) return '-';
    const d = new Date(isoOrStr);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) + ' WIB';
  };

  // Find mentor override if any
  const mentorKey = currentUser?.username || currentUser?.name || '';
  const override = emailSchedules?.mentorOverrides?.[mentorKey] || 
                   emailSchedules?.mentorOverrides?.[currentUser?.name] || 
                   null;
  const isCustom = override?.mode === 'custom';
  const startTime = isCustom ? override.startTime : emailSchedules?.globalStartTime;
  const endTime = isCustom ? override.endTime : emailSchedules?.globalEndTime;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150 font-isi">
      <div 
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden text-slate-900 relative"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Top Header */}
        <div className="p-6 bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-white border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white shadow-xs border border-slate-200/80 text-[#003CEC] flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-xl">schedule</span>
            </div>
            <div>
              <h2 className="font-coolvetica font-bold text-xl text-slate-900 tracking-wide">
                Jadwal Kirim Email Rapot
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-[#003CEC] text-[10px] font-sans-code font-bold">
                  {groupName}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {currentUser?.name}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-all border border-slate-200/80 shadow-xs flex-shrink-0"
            title="Tutup"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          
          {/* Status & Schedule Card */}
          <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 font-sans-code uppercase tracking-wider">
                Status Tombol Email
              </span>
              <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-sans-code font-bold border ${
                scheduleEval.isAllowed 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80' 
                  : 'bg-amber-50 text-amber-700 border-amber-200/80'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${scheduleEval.isAllowed ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                <span>{scheduleEval.isAllowed ? 'Aktif Sekarang' : 'Terkunci'}</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200/60 text-xs">
              <div>
                <p className="text-slate-400 font-sans-code text-[11px] mb-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs text-slate-400">calendar_today</span>
                  <span>Waktu Mulai Buka</span>
                </p>
                <p className="font-semibold text-slate-800 font-sans-code text-xs">
                  {startTime ? formatDateTime(startTime) : 'Terbuka Langsung'}
                </p>
              </div>
              <div>
                <p className="text-slate-400 font-sans-code text-[11px] mb-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs text-slate-400">schedule</span>
                  <span>Batas Waktu Tutup</span>
                </p>
                <p className="font-semibold text-slate-800 font-sans-code text-xs">
                  {endTime ? formatDateTime(endTime) : 'Tidak Ada Batas'}
                </p>
              </div>
            </div>
          </div>

          {/* Guide Message */}
          <div className="p-3.5 rounded-2xl bg-blue-50/50 border border-blue-100 flex items-start gap-2.5 text-xs text-slate-700">
            <span className="material-symbols-outlined text-base text-[#003CEC] flex-shrink-0 mt-0.5">info</span>
            <div className="space-y-0.5">
              <p className="font-bold text-slate-900 font-reddit">Petunjuk untuk Mentor</p>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                {scheduleEval.isAllowed 
                  ? 'Tombol kirim email rapot pada preview PDF saat ini sudah dapat digunakan. Pastikan seluruh 17 indikator rubrik dan 3 pesan evaluasi sudah terisi sebelum mengirim rapot ke email mahasiswa.'
                  : scheduleEval.reason || 'Tombol pengiriman email akan otomatis terbuka pada jadwal yang ditentukan panitia.'
                }
              </p>
            </div>
          </div>

          {/* Action Button without arrow */}
          <div className="pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 px-4 rounded-2xl bg-[#003CEC] hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-xs font-reddit transition-all shadow-md shadow-blue-600/20 flex items-center justify-center"
            >
              Mengerti & Lanjutkan ke Dashboard
            </button>
          </div>

        </div>

      </div>
    </div>,
    document.body
  );
}
