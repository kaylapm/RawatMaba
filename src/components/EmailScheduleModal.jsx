import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { MENTOR_ACCOUNTS } from './LoginPage';
import { saveEmailSchedulesInSupabase } from '../lib/dataService';

// Format ISO/Date string to local input value "YYYY-MM-DDTHH:mm"
function toLocalInputString(isoOrDate) {
  if (!isoOrDate) return '';
  const d = new Date(isoOrDate);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  const YYYY = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const DD = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${YYYY}-${MM}-${DD}T${hh}:${mm}`;
}

// Clean, Elegant Dual Date & Time Input Field (Split inputs, zero clunky popup)
function DateTimePickerField({ label, value, onChange, placeholder = 'Kosongkan jika bebas' }) {
  const [datePart, timePart] = useMemo(() => {
    if (!value || typeof value !== 'string') return ['', ''];
    const parts = value.split('T');
    return [parts[0] || '', parts[1] || ''];
  }, [value]);

  const handleDateChange = (newDate) => {
    if (!newDate) {
      onChange('');
      return;
    }
    const safeTime = timePart || '08:00';
    onChange(`${newDate}T${safeTime}`);
  };

  const handleTimeChange = (newTime) => {
    if (!newTime) {
      if (datePart) onChange(`${datePart}T08:00`);
      else onChange('');
      return;
    }
    const safeDate = datePart || new Date().toISOString().split('T')[0];
    onChange(`${safeDate}T${newTime}`);
  };

  const handleClear = () => {
    onChange('');
  };

  const formatDisplay = () => {
    if (!value || !datePart) return null;
    try {
      const parts = datePart.split('-');
      if (parts.length !== 3) return null;
      const [y, m, d] = parts.map(Number);
      const dateObj = new Date(y, m - 1, d);
      if (isNaN(dateObj.getTime())) return null;
      return dateObj.toLocaleDateString('id-ID', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }) + (timePart ? `, ${timePart} WIB` : '');
    } catch {
      return null;
    }
  };

  const displayFormatted = formatDisplay();

  return (
    <div className="space-y-1.5 font-isi">
      <div className="flex items-center justify-between">
        <label className="block text-[11px] font-bold text-slate-700 font-reddit">
          {label}
        </label>
        {value ? (
          <button
            type="button"
            onClick={handleClear}
            className="text-[10px] text-slate-400 hover:text-rose-600 font-sans-code font-bold transition-colors"
          >
            Hapus
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-5 gap-2">
        {/* Date Selector */}
        <div className="col-span-3">
          <div className="flex items-center bg-white border border-slate-200/90 rounded-xl overflow-hidden focus-within:border-[#003CEC] focus-within:ring-1 focus-within:ring-[#003CEC]/20 transition-all shadow-2xs">
            <span className="material-symbols-outlined text-slate-400 text-[15px] pl-2.5 flex-shrink-0 select-none">
              calendar_month
            </span>
            <input
              type="date"
              value={datePart}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-full py-2 px-2 text-xs font-sans-code font-semibold text-slate-800 bg-transparent outline-none cursor-pointer"
            />
          </div>
        </div>

        {/* Time Selector */}
        <div className="col-span-2">
          <div className="flex items-center bg-white border border-slate-200/90 rounded-xl overflow-hidden focus-within:border-[#003CEC] focus-within:ring-1 focus-within:ring-[#003CEC]/20 transition-all shadow-2xs">
            <span className="material-symbols-outlined text-slate-400 text-[15px] pl-2 flex-shrink-0 select-none">
              schedule
            </span>
            <input
              type="time"
              value={timePart}
              onChange={(e) => handleTimeChange(e.target.value)}
              className="w-full py-2 px-1.5 text-xs font-sans-code font-semibold text-slate-800 bg-transparent outline-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Readable Formatted Preview */}
      {displayFormatted ? (
        <p className="text-[11px] text-[#003CEC] font-sans-code font-semibold flex items-center gap-1 mt-0.5">
          <span className="material-symbols-outlined text-xs">check_circle</span>
          <span>{displayFormatted}</span>
        </p>
      ) : (
        <p className="text-[10px] text-slate-400 font-isi">{placeholder}</p>
      )}
    </div>
  );
}

export default function EmailScheduleModal({
  isOpen,
  onClose,
  emailSchedules,
  onSaveSchedules,
  showToast
}) {
  const [activeTab, setActiveTab] = useState('global'); // 'global' | 'mentors'
  const [isSaving, setIsSaving] = useState(false);
  const [searchMentor, setSearchMentor] = useState('');
  const [filterMentorMode, setFilterMentorMode] = useState('all'); // 'all' | 'custom' | 'always' | 'disabled'

  // Local draft state
  const [draft, setDraft] = useState({
    isGlobalEnabled: true,
    globalStartTime: '',
    globalEndTime: '',
    mentorOverrides: {}
  });

  // Initialize draft only when modal opens (do not reset on background polling while editing)
  useEffect(() => {
    if (isOpen) {
      const initialOverrides = {};
      if (emailSchedules?.mentorOverrides) {
        Object.entries(emailSchedules.mentorOverrides).forEach(([k, v]) => {
          initialOverrides[k] = {
            mode: v.mode || 'inherit',
            startTime: toLocalInputString(v.startTime),
            endTime: toLocalInputString(v.endTime)
          };
        });
      }
      setDraft({
        isGlobalEnabled: emailSchedules?.isGlobalEnabled ?? true,
        globalStartTime: toLocalInputString(emailSchedules?.globalStartTime),
        globalEndTime: toLocalInputString(emailSchedules?.globalEndTime),
        mentorOverrides: initialOverrides
      });
      setIsSaving(false);
    }
  }, [isOpen]);

  // List of all 34 mentors
  const mentorList = useMemo(() => {
    return Object.entries(MENTOR_ACCOUNTS)
      .filter(([user, data]) => data.role !== 'super_admin')
      .map(([user, data]) => ({
        username: user,
        name: data.name,
        group: data.group || 'Mentoring',
      }));
  }, []);

  // Filtered mentor list
  const filteredMentors = useMemo(() => {
    const q = searchMentor.toLowerCase().trim();
    return mentorList.filter(m => {
      const matchSearch = !q || m.name.toLowerCase().includes(q) || m.group.toLowerCase().includes(q) || m.username.toLowerCase().includes(q);
      if (!matchSearch) return false;

      const override = draft.mentorOverrides?.[m.username] || draft.mentorOverrides?.[m.name];
      const mode = override?.mode || 'inherit';

      if (filterMentorMode === 'custom') return mode === 'custom';
      if (filterMentorMode === 'always') return mode === 'always';
      if (filterMentorMode === 'disabled') return mode === 'disabled';
      return true;
    });
  }, [mentorList, searchMentor, filterMentorMode, draft.mentorOverrides]);

  if (!isOpen) return null;

  // Minimalist status evaluation
  const getScheduleStatus = (mode, startTime, endTime) => {
    if (mode === 'always') {
      return { text: 'Aktif Selalu', color: 'bg-emerald-50 text-emerald-700 border-emerald-200/80', dot: 'bg-emerald-500' };
    }
    if (mode === 'disabled') {
      return { text: 'Nonaktif', color: 'bg-rose-50 text-rose-700 border-rose-200/80', dot: 'bg-rose-500' };
    }
    if (mode === 'inherit') {
      if (!draft.isGlobalEnabled) {
        return { text: 'Global Nonaktif', color: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' };
      }
      return getScheduleStatus('custom', draft.globalStartTime, draft.globalEndTime);
    }

    // Custom mode
    const now = Date.now();
    const start = startTime ? new Date(startTime).getTime() : null;
    const end = endTime ? new Date(endTime).getTime() : null;

    if (start && now < start) {
      return { text: 'Terjadwal', color: 'bg-amber-50 text-amber-700 border-amber-200/80', dot: 'bg-amber-500' };
    }
    if (end && now > end) {
      return { text: 'Selesai', color: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' };
    }
    return { text: 'Aktif Sekarang', color: 'bg-emerald-50 text-emerald-700 border-emerald-200/80', dot: 'bg-emerald-500' };
  };

  const handleGlobalPreset = (type) => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const toInput = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

    if (type === 'now_7days') {
      const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      setDraft(prev => ({
        ...prev,
        isGlobalEnabled: true,
        globalStartTime: toInput(now),
        globalEndTime: toInput(end)
      }));
    } else if (type === 'all_time') {
      setDraft(prev => ({
        ...prev,
        isGlobalEnabled: true,
        globalStartTime: '',
        globalEndTime: ''
      }));
    } else if (type === 'disable') {
      setDraft(prev => ({
        ...prev,
        isGlobalEnabled: false
      }));
    }
  };

  const handleMentorOverrideChange = (username, updates) => {
    setDraft(prev => {
      const current = prev.mentorOverrides?.[username] || { mode: 'inherit', startTime: '', endTime: '' };
      const nextOverrides = {
        ...prev.mentorOverrides,
        [username]: {
          ...current,
          ...updates
        }
      };
      if (nextOverrides[username].mode === 'inherit' && !nextOverrides[username].startTime && !nextOverrides[username].endTime) {
        delete nextOverrides[username];
      }
      return {
        ...prev,
        mentorOverrides: nextOverrides
      };
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await saveEmailSchedulesInSupabase(draft);
      if (res.success) {
        if (onSaveSchedules) onSaveSchedules(draft);
        if (showToast) showToast('Jadwal pengiriman email berhasil disimpan.');
        onClose();
      } else {
        if (showToast) showToast('Gagal menyimpan jadwal ke database.');
      }
    } catch (e) {
      console.error('Error saving schedules:', e);
      if (showToast) showToast('Terjadi kesalahan saat menyimpan jadwal.');
    } finally {
      setIsSaving(false);
    }
  };

  const globalStatus = getScheduleStatus(
    draft.isGlobalEnabled ? 'custom' : 'disabled',
    draft.globalStartTime,
    draft.globalEndTime
  );

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150 font-isi">
      <div 
        className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200/80 flex flex-col max-h-[90vh] overflow-hidden font-isi text-slate-900 relative"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Top Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-white border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white shadow-xs border border-slate-200 text-[#003CEC] flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-xl">schedule</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold font-reddit tracking-tight text-slate-900">
                  Pengaturan Jadwal Email
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-[#003CEC] text-[10px] font-sans-code font-bold uppercase">
                  Super Admin
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-isi">
                Atur tanggal & jam aktif tombol kirim email untuk mentor.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-all border border-slate-200/80 shadow-xs"
            title="Tutup"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        {/* Minimalist Tab Switcher */}
        <div className="px-6 pt-3 border-b border-slate-100 bg-slate-50/40 flex items-center gap-1">
          <button
            onClick={() => setActiveTab('global')}
            className={`px-4 py-2 rounded-xl text-xs font-reddit font-bold flex items-center gap-2 transition-all ${
              activeTab === 'global'
                ? 'bg-white text-[#003CEC] shadow-xs border border-slate-200/80'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            <span className="material-symbols-outlined text-base">public</span>
            <span>Jadwal Global</span>
            <span className={`w-1.5 h-1.5 rounded-full ${draft.isGlobalEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`} />
          </button>

          <button
            onClick={() => setActiveTab('mentors')}
            className={`px-4 py-2 rounded-xl text-xs font-reddit font-bold flex items-center gap-2 transition-all ${
              activeTab === 'mentors'
                ? 'bg-white text-[#003CEC] shadow-xs border border-slate-200/80'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            <span className="material-symbols-outlined text-base">groups</span>
            <span>Jadwal Per-Mentor</span>
            <span className="px-1.5 py-0.2 rounded-md bg-blue-100 text-[#003CEC] text-[10px] font-sans-code font-bold">
              {mentorList.length}
            </span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">

          {/* TAB 1: GLOBAL SCHEDULE */}
          {activeTab === 'global' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              
              {/* Master Global Switch */}
              <div className="p-4 rounded-2xl border border-slate-200/80 bg-white shadow-xs flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-xs sm:text-sm text-slate-900 font-reddit">
                      Pengiriman Email Global
                    </h3>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-sans-code font-semibold border ${globalStatus.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${globalStatus.dot}`}></span>
                      <span>{globalStatus.text}</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Bila dinonaktifkan, seluruh mentor tidak dapat menekan tombol kirim email.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={draft.isGlobalEnabled}
                    onChange={(e) => setDraft(prev => ({ ...prev, isGlobalEnabled: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#003CEC]"></div>
                </label>
              </div>

              {/* Date Time Range Inputs */}
              <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                draft.isGlobalEnabled ? 'border-slate-200/80 bg-white shadow-xs' : 'border-slate-200 bg-slate-50 opacity-60 pointer-events-none'
              }`}>
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900 font-reddit">
                      Rentang Waktu Aktif Global
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Pilih tanggal dan jam buka/tutup tombol kirim email.
                    </p>
                  </div>

                  {/* Minimal Presets */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleGlobalPreset('now_7days')}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-sans-code transition-all"
                    >
                      Buka 7 Hari
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGlobalPreset('all_time')}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-sans-code transition-all"
                    >
                      Selalu Buka
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <DateTimePickerField
                    label="Waktu Mulai Buka (Global)"
                    value={draft.globalStartTime}
                    onChange={(val) => setDraft(prev => ({ ...prev, globalStartTime: val }))}
                    placeholder="Kosongkan jika dibuka langsung."
                  />

                  <DateTimePickerField
                    label="Waktu Batas Tutup (Global)"
                    value={draft.globalEndTime}
                    onChange={(val) => setDraft(prev => ({ ...prev, globalEndTime: val }))}
                    placeholder="Kosongkan jika tidak ada batas tutup."
                  />
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: PER-MENTOR OVERRIDES */}
          {activeTab === 'mentors' && (
            <div className="space-y-3.5 animate-in fade-in duration-200">
              
              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <div className="relative flex-1">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base">
                    search
                  </span>
                  <input
                    type="text"
                    value={searchMentor}
                    onChange={(e) => setSearchMentor(e.target.value)}
                    placeholder="Cari mentor atau kelompok..."
                    className="w-full pl-9 pr-4 py-1.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#003CEC] text-xs font-isi outline-none transition-all"
                  />
                  {searchMentor && (
                    <button
                      onClick={() => setSearchMentor('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <span className="material-symbols-outlined text-xs">close</span>
                    </button>
                  )}
                </div>

                {/* Filter Selector */}
                <div className="flex items-center gap-1 bg-slate-100/80 p-0.5 rounded-xl border border-slate-200 text-[11px] font-sans-code">
                  {[
                    { id: 'all', label: 'Semua' },
                    { id: 'custom', label: 'Jadwal Khusus' },
                    { id: 'always', label: 'Aktif Selalu' },
                    { id: 'disabled', label: 'Nonaktif' }
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setFilterMentorMode(f.id)}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        filterMentorMode === f.id
                          ? 'bg-white text-[#003CEC] font-bold shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mentors List */}
              <div className="space-y-2.5 max-h-[46vh] overflow-y-auto pr-1">
                {filteredMentors.length === 0 ? (
                  <div className="text-center py-10 bg-slate-50/50 rounded-2xl border border-slate-200">
                    <p className="text-xs text-slate-400 font-sans-code">Tidak ditemukan mentor yang cocok.</p>
                  </div>
                ) : (
                  filteredMentors.map((m) => {
                    const override = draft.mentorOverrides?.[m.username] || { mode: 'inherit', startTime: '', endTime: '' };
                    const currentMode = override.mode || 'inherit';
                    const status = getScheduleStatus(currentMode, override.startTime, override.endTime);

                    return (
                      <div
                        key={m.username}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          currentMode !== 'inherit'
                            ? 'bg-blue-50/30 border-blue-200/80 shadow-xs'
                            : 'bg-white border-slate-200/70 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          
                          {/* Mentor & Group Info */}
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-slate-100 text-[#003CEC] flex items-center justify-center font-bold font-sans-code text-xs flex-shrink-0">
                              {m.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-xs text-slate-900 font-reddit truncate max-w-[200px] sm:max-w-[260px]">
                                  {m.name}
                                </h4>
                                <span className="px-2 py-0.2 rounded-md bg-slate-100 text-slate-600 text-[10px] font-sans-code">
                                  {m.group}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 font-sans-code">
                                @{m.username}
                              </p>
                            </div>
                          </div>

                          {/* Mode Selector & Status Badge */}
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-sans-code font-semibold border ${status.color}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`}></span>
                              <span>{status.text}</span>
                            </span>

                            <select
                              value={currentMode}
                              onChange={(e) => handleMentorOverrideChange(m.username, { mode: e.target.value })}
                              className="px-2.5 py-1 rounded-xl border border-slate-200 bg-white text-xs font-isi text-slate-700 outline-none focus:border-[#003CEC] cursor-pointer"
                            >
                              <option value="inherit">Ikuti Global</option>
                              <option value="always">Aktif Selalu</option>
                              <option value="custom">Jadwal Khusus</option>
                              <option value="disabled">Nonaktif</option>
                            </select>
                          </div>

                        </div>

                        {/* Inline Clean Split DateTime Pickers */}
                        {currentMode === 'custom' && (
                          <div className="mt-3 pt-3 border-t border-blue-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs animate-in fade-in duration-150">
                            <DateTimePickerField
                              label={`Mulai Buka (${m.group})`}
                              value={override.startTime || ''}
                              onChange={(val) => handleMentorOverrideChange(m.username, { startTime: val })}
                              placeholder="Mulai buka jadwal kelompok."
                            />

                            <DateTimePickerField
                              label={`Batas Tutup (${m.group})`}
                              value={override.endTime || ''}
                              onChange={(val) => handleMentorOverrideChange(m.username, { endTime: val })}
                              placeholder="Batas akhir jadwal kelompok."
                            />
                          </div>
                        )}

                      </div>
                    );
                  })
                )}
              </div>

            </div>
          )}

        </div>

        {/* Minimalist Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/40 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 font-sans-code">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Auto-Sync Supabase</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-reddit font-bold transition-all"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-1.5 rounded-xl bg-[#003CEC] hover:bg-blue-700 active:scale-95 text-white text-xs font-reddit font-bold transition-all shadow-md shadow-blue-600/20 flex items-center gap-1.5 disabled:opacity-70"
            >
              <span className={`material-symbols-outlined text-sm ${isSaving ? 'animate-spin' : ''}`}>
                {isSaving ? 'progress_activity' : 'save'}
              </span>
              <span>{isSaving ? 'Menyimpan...' : 'Simpan Jadwal'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}
