import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Header from './components/Header';
import OverviewGuideView from './components/OverviewGuideView';
import OverviewDashboard from './components/OverviewDashboard';
import StudentsView from './components/StudentsView';
import ClassesView from './components/ClassesView';
import SubjectsView from './components/SubjectsView';
import InsertGradesModal from './components/InsertGradesModal';
import GeneratePdfModal from './components/GeneratePdfModal';
import BatchUploadModal from './components/BatchUploadModal';
import EditProfileModal from './components/EditProfileModal';
import EmailScheduleModal from './components/EmailScheduleModal';
import MentorScheduleNoticeModal from './components/MentorScheduleNoticeModal';
import LoginPage from './components/LoginPage';
import Footer from './components/Footer';
import { initialStudents, initialClasses, notices as defaultNotices, subjectsCriteria } from './data/mockData';
import { supabase } from './lib/supabase';
import { 
  fetchAllRealData, 
  buildClassesFromStudents,
  saveStudentGradeToSupabase, 
  clearStudentGradeInSupabase, 
  updateStudentEmailInSupabase, 
  updateStudentStatusInSupabase, 
  createNoticeInSupabase, 
  deleteNoticeInSupabase,
  DEFAULT_EMAIL_SCHEDULES
} from './lib/dataService';
import { MENTOR_ACCOUNTS } from './components/LoginPage';

const SESSION_STORAGE_KEY = 'rapot_rawat_maba_session_24h';
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 Hours Session Stay

export default function App() {
  // Persistent 24-Hour Session State
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem(SESSION_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.user && parsed.expiresAt && Date.now() < parsed.expiresAt) {
          return parsed.user;
        } else {
          localStorage.removeItem(SESSION_STORAGE_KEY);
        }
      }
    } catch (e) {
      console.warn('Could not read session:', e);
    }
    return null;
  });

  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Real Datasets State from Supabase
  const [allStudents, setAllStudents] = useState(initialStudents);
  const [notices, setNotices] = useState(defaultNotices);
  const [mentorLogins, setMentorLogins] = useState({});
  const [emailSchedules, setEmailSchedules] = useState(DEFAULT_EMAIL_SCHEDULES);

  // Realtime Sync Status
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(true);

  // Modals visibility state
  const [isInsertOpen, setIsInsertOpen] = useState(false);
  const [insertTargetStudent, setInsertTargetStudent] = useState(null);
  const [insertReturnTab, setInsertReturnTab] = useState('students');
  const [isPdfOpen, setIsPdfOpen] = useState(false);
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isMentorScheduleNoticeOpen, setIsMentorScheduleNoticeOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Auto-prompt mentor with schedule notice popup on session start
  useEffect(() => {
    if (currentUser && currentUser.role === 'mentor') {
      const seen = sessionStorage.getItem(`rapot_mentor_notice_seen_${currentUser.username}`);
      if (!seen) {
        setIsMentorScheduleNoticeOpen(true);
      }
    }
  }, [currentUser?.username, currentUser?.role]);

  // Active Session Watchdog: Enforce strict 1x24h auto-logout in realtime
  useEffect(() => {
    if (!currentUser) return;

    const verifySessionExpiry = () => {
      try {
        const stored = localStorage.getItem(SESSION_STORAGE_KEY);
        if (!stored) {
          setCurrentUser(null);
          return;
        }
        const parsed = JSON.parse(stored);
        if (!parsed?.expiresAt || Date.now() >= parsed.expiresAt) {
          localStorage.removeItem(SESSION_STORAGE_KEY);
          setCurrentUser(null);
          showToast('Sesi login Anda telah habis (1x24 jam). Silakan login kembali.');
        }
      } catch (e) {
        console.warn('Session verification exception:', e);
      }
    };

    // Verify immediately
    verifySessionExpiry();

    // Check periodically every 15 seconds
    const interval = setInterval(verifySessionExpiry, 15000);

    // Also verify when user returns to / focuses the tab
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        verifySessionExpiry();
      }
    };
    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', verifySessionExpiry);

    return () => {
      clearInterval(interval);
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', verifySessionExpiry);
    };
  }, [currentUser]);

  // Toast Notification state
  const [toast, setToast] = useState(null);
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Derive allClasses dynamically so grade/status changes immediately update group stats
  const allClasses = useMemo(() => {
    return buildClassesFromStudents(allStudents);
  }, [allStudents]);

  // Unified Data Fetcher & Realtime Sync Handler
  const refreshData = useCallback(async (manual = false) => {
    try {
      if (manual) setIsSyncing(true);
      const realData = await fetchAllRealData();

      if (realData && realData.students && realData.students.length > 0) {
        setAllStudents(realData.students);
      }
      if (realData && realData.notices && realData.notices.length > 0) {
        setNotices(realData.notices);
      }
      if (realData && realData.mentorLogins) {
        setMentorLogins(realData.mentorLogins);
      }
      if (realData && realData.emailSchedules) {
        setEmailSchedules(realData.emailSchedules);
      }

      if (manual) {
        showToast('Data realtime berhasil disinkronkan!');
      }
    } catch (err) {
      console.warn('Realtime fetch failed:', err);
      if (manual) {
        showToast('Gagal memuat pembaruan data.');
      }
    } finally {
      if (manual) {
        setTimeout(() => setIsSyncing(false), 400);
      }
    }
  }, []);

  // 1. Initial Load & Realtime Supabase Postgres Changes Subscription
  useEffect(() => {
    let isMounted = true;

    // Auto-sync currentUser latest profile name & role directly from Supabase DB
    if (currentUser?.username) {
      supabase
        .from('profiles')
        .select('id, name, role, username')
        .eq('username', currentUser.username)
        .maybeSingle()
        .then(({ data: dbProfile }) => {
          if (dbProfile && dbProfile.name && isMounted) {
            setCurrentUser(prev => {
              const fallbackData = MENTOR_ACCOUNTS[dbProfile.username];
              const groupName = fallbackData?.group || prev?.group_name || null;
              const updated = {
                ...prev,
                name: dbProfile.name,
                role: dbProfile.role || prev?.role || (dbProfile.username === 'webdev' ? 'super_admin' : 'mentor'),
                group_name: groupName
              };

              // Preserve original login session expiration (strictly 24h from login)
              let preservedExpiresAt = Date.now() + SESSION_DURATION_MS;
              let preservedLoginAt = Date.now();
              try {
                const existing = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || '{}');
                if (existing?.expiresAt) preservedExpiresAt = existing.expiresAt;
                if (existing?.loginAt) preservedLoginAt = existing.loginAt;
              } catch {}

              localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
                user: updated,
                loginAt: preservedLoginAt,
                expiresAt: preservedExpiresAt
              }));
              return updated;
            });
          }
        })
        .catch(profErr => console.warn('Could not sync user profile from DB:', profErr));
    }

    // Initial Fetch
    refreshData(false);

    // Supabase Realtime Subscription Channel
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rapot_evaluations' },
        (payload) => {
          console.log('[Realtime] rapot_evaluations updated:', payload.eventType);
          if (isMounted) refreshData(false);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'students' },
        (payload) => {
          console.log('[Realtime] students updated:', payload.eventType);
          if (isMounted) refreshData(false);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notices' },
        (payload) => {
          console.log('[Realtime] notices updated:', payload.eventType);
          if (isMounted) refreshData(false);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        (payload) => {
          console.log('[Realtime] profiles updated:', payload.eventType);
          if (isMounted) refreshData(false);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'email_schedules' },
        (payload) => {
          console.log('[Realtime] email_schedules updated:', payload.eventType);
          if (isMounted) refreshData(false);
        }
      )
      .subscribe((status) => {
        if (!isMounted) return;
        if (status === 'SUBSCRIBED') {
          setIsRealtimeConnected(true);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsRealtimeConnected(false);
        }
      });

    // Window Focus Listener (Fast sync when returning to tab)
    const handleFocus = () => {
      if (isMounted) refreshData(false);
    };
    window.addEventListener('focus', handleFocus);

    // Periodic Background Polling Fallback (every 25 seconds)
    const intervalId = setInterval(() => {
      if (isMounted) refreshData(false);
    }, 25000);

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
      window.removeEventListener('focus', handleFocus);
      clearInterval(intervalId);
    };
  }, [currentUser?.username, refreshData]);

  // 2. Check if logged in user is mentor or admin
  const isMentor = currentUser?.role === 'mentor';
  const mentorName = currentUser?.name || '';
  const mentorGroup = currentUser?.group_name || MENTOR_ACCOUNTS[currentUser?.username]?.group || '';

  // 3. Filter Students and Classes based on Mentor Role
  const accessibleStudents = useMemo(() => {
    if (!isMentor) return allStudents;
    
    return allStudents.filter(student => {
      // Mentors must never see dummy students or Admin-only test records
      if (
        student.isDummy || 
        student.mentor === 'Super Admin' || 
        student.kelompok === 'Kelompok Khusus Admin' || 
        student.nim === '5026249999' ||
        student.id === '30000000-0000-0000-0000-000000000999'
      ) {
        return false;
      }

      const sGroup = (student.kelompok || '').toLowerCase().trim();
      const sMentor = (student.mentor || '').toLowerCase().trim();
      const uGroup = mentorGroup.toLowerCase().trim();
      const uName = mentorName.toLowerCase().trim();
      
      const isGroupMatch = uGroup && (sGroup === uGroup);
      const isMentorNameMatch = uName && (sMentor === uName || sMentor.includes(uName) || uName.includes(sMentor));
      
      return isGroupMatch || isMentorNameMatch;
    });
  }, [allStudents, isMentor, mentorGroup, mentorName]);

  const accessibleClasses = useMemo(() => {
    if (!isMentor) return allClasses;

    return allClasses.filter(cls => {
      const cName = (cls.name || '').toLowerCase().trim();
      const cMentor = (cls.mentor || '').toLowerCase().trim();
      const uGroup = mentorGroup.toLowerCase().trim();
      const uName = mentorName.toLowerCase().trim();

      const isGroupMatch = uGroup && (cName === uGroup);
      const isMentorMatch = uName && (cMentor === uName || cMentor.includes(uName) || uName.includes(cMentor));

      return isGroupMatch || isMentorMatch;
    });
  }, [allClasses, isMentor, mentorGroup, mentorName]);

  // Handlers for Grade Updates
  const handleSaveGrade = async (updatedStudent) => {
    // Update state in RAM
    setAllStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s));
    
    // Inject and save to Supabase Database
    const res = await saveStudentGradeToSupabase(updatedStudent);
    if (res.success) {
      showToast(`Nilai rapot ${updatedStudent.name} berhasil disimpan!`);
    } else {
      const errMsg = res.error?.message || res.error?.details || JSON.stringify(res.error) || 'Unknown error';
      console.error('GAGAL simpan ke Supabase:', errMsg);
      showToast(`Gagal menyimpan ke database: ${errMsg}`);
    }
  };

  const handleUpdateStudentEmail = async (studentId, newEmail) => {
    // 1. Update state in RAM
    setAllStudents(prev => prev.map(s => s.id === studentId ? { ...s, email: newEmail } : s));
    
    // 2. Persist to Supabase Database
    const res = await updateStudentEmailInSupabase(studentId, newEmail);
    if (res.success) {
      showToast('Alamat email mahasiswa berhasil diperbarui!');
    } else {
      showToast('Gagal menyimpan email ke database.');
    }
  };

  const handleUpdateStudentStatus = async (studentId, newStatus) => {
    // 1. Update state in RAM
    setAllStudents(prev => prev.map(s => s.id === studentId ? { ...s, studentStatus: newStatus, student_status: newStatus } : s));
    
    // 2. Persist to Supabase Database & localStorage
    const res = await updateStudentStatusInSupabase(studentId, newStatus);
    if (res.success) {
      showToast(`Status mahasiswa berhasil diubah ke "${newStatus}"`);
    } else {
      showToast('Gagal menyimpan status ke database.');
    }
  };

  const handleBatchSuccess = (filename) => {
    showToast(`Data rapot dari ${filename} berhasil diimpor!`);
  };

  const handleSelectStudentForPdf = (studentObj) => {
    if (studentObj) setSelectedStudent(studentObj);
    setActiveTab('pdf');
  };

  const handleOpenInsertForSpecificStudent = (studentObj, returnTab = 'students') => {
    if (studentObj) setInsertTargetStudent(studentObj);
    setInsertReturnTab(returnTab);
    setActiveTab('insert');
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (e) {}
    setCurrentUser(null);
    showToast('Sampai jumpa lagi! Terima kasih atas dedikasinya.');
  };

  // Handlers for Notices (Super Admin CRUD)
  const handleAddNotice = async (noticeData) => {
    const res = await createNoticeInSupabase(noticeData);
    if (res.success && res.data) {
      setNotices(prev => [res.data, ...prev]);
      showToast('Pengumuman baru berhasil dipublikasikan!');
    } else {
      showToast('Gagal mempublikasikan pengumuman ke database.');
    }
  };

  const handleDeleteNotice = async (noticeId) => {
    const res = await deleteNoticeInSupabase(noticeId);
    if (res.success) {
      setNotices(prev => prev.filter(n => n.id !== noticeId));
      showToast('Pengumuman telah berhasil dihapus.');
    }
  };

  // Handler for clearing/resetting a student's grade
  const handleClearGrade = async (studentId, studentName) => {
    const res = await clearStudentGradeInSupabase(studentId);
    if (res.success) {
      // Reset local state for this student
      setAllStudents(prev => prev.map(s => {
        if (s.id !== studentId) return s;
        const emptyScores = {};
        Object.keys(s.scores || {}).forEach(k => { emptyScores[k] = 0; });
        return {
          ...s,
          scores: emptyScores,
          pillarScores: { p1_score: 0, p2_score: 0, p3_score: 0, p4_score: 0 },
          finalScore: 0,
          predicate: '-',
          status: 'Belum Dinilai',
          feedback_apresiasi: '',
          feedback_saran: '',
          feedback_oprec: '',
          feedbackApresiasi: '',
          feedbackSaran: '',
          feedbackOprec: '',
        };
      }));
      showToast(`Nilai ${studentName || 'mahasiswa'} berhasil direset ke 0.`);
    } else {
      showToast('Gagal menghapus nilai. Silakan coba lagi.');
    }
  };

  // IF NOT LOGGED IN: Render Login Page
  if (!currentUser) {
    return (
      <LoginPage 
        onLoginSuccess={(user) => {
          try {
            const sessionData = {
              user,
              loginAt: Date.now(),
              expiresAt: Date.now() + SESSION_DURATION_MS
            };
            localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
          } catch (e) {
            console.warn('Could not persist session:', e);
          }
          setCurrentUser(user);
          if (user?.role === 'mentor') {
            setIsMentorScheduleNoticeOpen(true);
          }
          showToast(`Selamat datang, ${user.name || user.username}!`);
        }} 
      />
    );
  }

  // IF LOGGED IN: Render Dashboard Application
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans relative selection:bg-[#003CEC] selection:text-white flex flex-col">
      
      {/* GLOBAL BACKGROUND for non-overview tabs */}
      {activeTab !== 'overview' && (
        <div className="fixed inset-0 pointer-events-none z-0 bg-slate-50 overflow-hidden">
          <div 
            className="absolute inset-0 bg-[url('/assets/BG1.png')] bg-cover bg-center bg-no-repeat opacity-25 pointer-events-none"
          ></div>
        </div>
      )}

      {/* Toast Notification (GSM Style, Warm & Human) */}
      {toast && (
        <div className="fixed top-24 right-4 sm:right-8 z-50 bg-white/95 backdrop-blur-xl border border-gsm-lilac shadow-gsm-hover text-slate-900 rounded-2xl px-4 sm:px-5 py-3 flex items-center gap-3 animate-in slide-in-from-top-3 duration-300 font-isi max-w-[90vw]">
          <div className="w-8 h-8 rounded-xl bg-gsm-blue-gradient text-white flex items-center justify-center shadow-md shadow-gsm-blue-main/20 flex-shrink-0">
            <span className="material-symbols-outlined text-base">verified</span>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900 leading-snug">{toast}</p>
            <p className="text-[10px] text-slate-400 font-sans-code mt-0.5">Rapot Rawat Maba • HRD</p>
          </div>
        </div>
      )}

      {/* Top Header Navigation with Mobile Support */}
      <Header 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenInsert={() => handleOpenInsertForSpecificStudent(accessibleStudents[0])}
        onOpenPdf={() => handleSelectStudentForPdf(accessibleStudents[0])}
        onOpenEditProfile={() => setIsEditProfileOpen(true)}
        onOpenScheduleEmail={() => setIsScheduleModalOpen(true)}
        isSyncing={isSyncing}
        isRealtimeConnected={isRealtimeConnected}
        onRefreshData={refreshData}
      />

      {/* Main Page Container with flex-1 to push footer to absolute bottom */}
      <main className={activeTab === 'overview' ? 'w-full flex-1 relative z-10' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full relative z-10'}>
        <div key={activeTab} className="animate-view-transition w-full">
          {activeTab === 'overview' && (
            <OverviewGuideView 
              onOpenInsert={() => handleOpenInsertForSpecificStudent(accessibleStudents[0])}
              onOpenPdf={() => handleSelectStudentForPdf(accessibleStudents[0])}
              onOpenBatch={() => setIsBatchOpen(true)}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === 'dashboard' && (
            <OverviewDashboard 
              students={accessibleStudents}
              classes={accessibleClasses}
              notices={notices}
              searchTerm={searchTerm}
              onOpenInsert={(s) => handleOpenInsertForSpecificStudent(s || accessibleStudents[0], 'dashboard')}
              onOpenPdf={(s) => handleSelectStudentForPdf(s || accessibleStudents[0])}
              currentUser={currentUser}
              mentorLogins={mentorLogins}
              onAddNotice={handleAddNotice}
              onDeleteNotice={handleDeleteNotice}
              isSyncing={isSyncing}
              isRealtimeConnected={isRealtimeConnected}
              onRefresh={refreshData}
            />
          )}

          {activeTab === 'students' && (
            <StudentsView 
              students={accessibleStudents}
              onSelectStudent={handleSelectStudentForPdf}
              onOpenInsertForStudent={handleOpenInsertForSpecificStudent}
              onUpdateStudentEmail={handleUpdateStudentEmail}
              onUpdateStudentStatus={handleUpdateStudentStatus}
              onClearGrade={handleClearGrade}
            />
          )}

          {activeTab === 'insert' && (
            <InsertGradesModal 
              isOpen={true}
              isFullScreen={true}
              onClose={() => { setActiveTab(insertReturnTab); setInsertTargetStudent(null); }}
              students={accessibleStudents}
              onSaveGrade={handleSaveGrade}
              onClearGrade={handleClearGrade}
              initialStudentId={insertTargetStudent?.id || null}
            />
          )}

          {activeTab === 'pdf' && (
            <GeneratePdfModal 
              isOpen={true}
              isFullScreen={true}
              onClose={() => setActiveTab('students')}
              student={selectedStudent || accessibleStudents[0]}
              students={accessibleStudents}
              allStudents={allStudents}
              currentUser={currentUser}
              emailSchedules={emailSchedules}
              showToast={showToast}
              onNavigateToInsert={(s) => {
                setInsertTargetStudent(s);
                setActiveTab('insert');
              }}
            />
          )}

          {activeTab === 'classes' && !isMentor && (
            <ClassesView 
              classes={accessibleClasses}
              students={allStudents}
              mentorLogins={mentorLogins}
              onOpenInsert={(student) => handleOpenInsertForSpecificStudent(student, 'classes')}
              onClearGrade={handleClearGrade}
            />
          )}

          {activeTab === 'subjects' && (
            <SubjectsView />
          )}
        </div>
      </main>

      {/* Modals & Dialogs for Secondary Functions */}
      <BatchUploadModal 
        isOpen={isBatchOpen}
        onClose={() => setIsBatchOpen(false)}
        onBatchSuccess={handleBatchSuccess}
      />

      <EditProfileModal 
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        currentUser={currentUser}
        onUpdateUser={(updatedUser) => setCurrentUser(updatedUser)}
        showToast={showToast}
      />

      <EmailScheduleModal 
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        emailSchedules={emailSchedules}
        onSaveSchedules={(newSchedules) => setEmailSchedules(newSchedules)}
        showToast={showToast}
      />

      <MentorScheduleNoticeModal 
        isOpen={isMentorScheduleNoticeOpen}
        currentUser={currentUser}
        emailSchedules={emailSchedules}
        onClose={() => {
          if (currentUser?.username) {
            sessionStorage.setItem(`rapot_mentor_notice_seen_${currentUser.username}`, 'true');
          }
          setIsMentorScheduleNoticeOpen(false);
        }}
      />

      {/* Global Page Full-Width Footer anchored seamlessly to bottom */}
      <Footer />

    </div>
  );
}
