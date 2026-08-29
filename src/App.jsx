import React, { useState, useEffect, useMemo } from 'react';
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
import LoginPage from './components/LoginPage';
import Footer from './components/Footer';
import { initialStudents, initialClasses, notices as defaultNotices, subjectsCriteria } from './data/mockData';
import { fetchAllRealData, saveStudentGradeToSupabase, updateStudentEmailInSupabase, createNoticeInSupabase, deleteNoticeInSupabase } from './lib/dataService';

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
  const [allClasses, setAllClasses] = useState(initialClasses);
  const [notices, setNotices] = useState(defaultNotices);
  const [mentorLogins, setMentorLogins] = useState({});

  // Modals visibility state
  const [isInsertOpen, setIsInsertOpen] = useState(false);
  const [insertTargetStudent, setInsertTargetStudent] = useState(null);
  const [insertReturnTab, setInsertReturnTab] = useState('students');
  const [isPdfOpen, setIsPdfOpen] = useState(false);
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Toast Notification state
  const [toast, setToast] = useState(null);
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // 1. Initial Load: Fetch DB Data from Supabase
  useEffect(() => {
    async function loadData() {
      const realData = await fetchAllRealData();
      if (realData && realData.students && realData.students.length > 0) {
        setAllStudents(realData.students);
      }
      if (realData && realData.classes && realData.classes.length > 0) {
        setAllClasses(realData.classes);
      }
      if (realData && realData.notices && realData.notices.length > 0) {
        setNotices(realData.notices);
      }
      if (realData && realData.mentorLogins) {
        setMentorLogins(realData.mentorLogins);
      }
    }
    loadData();
  }, []);

  // 2. Check if logged in user is mentor or admin
  const isMentor = currentUser?.role === 'mentor';
  const mentorName = currentUser?.name || '';
  const mentorGroup = currentUser?.group_name || '';

  // 3. Filter Students and Classes based on Mentor Role
  const accessibleStudents = useMemo(() => {
    if (!isMentor) return allStudents;
    
    return allStudents.filter(student => {
      const sGroup = (student.kelompok || '').toLowerCase().trim();
      const sMentor = (student.mentor || '').toLowerCase().trim();
      const uGroup = mentorGroup.toLowerCase().trim();
      const uName = mentorName.toLowerCase().trim();
      
      const isGroupMatch = uGroup && sGroup.includes(uGroup);
      const isMentorNameMatch = uName && (sMentor.includes(uName) || uName.includes(sMentor));
      
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

      const isGroupMatch = uGroup && cName.includes(uGroup);
      const isMentorMatch = uName && (cMentor.includes(uName) || uName.includes(cMentor));

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
              onOpenInsert={() => handleOpenInsertForSpecificStudent(accessibleStudents[0])}
              onOpenPdf={() => handleSelectStudentForPdf(accessibleStudents[0])}
              currentUser={currentUser}
              mentorLogins={mentorLogins}
              onAddNotice={handleAddNotice}
              onDeleteNotice={handleDeleteNotice}
            />
          )}

          {activeTab === 'students' && (
            <StudentsView 
              students={accessibleStudents}
              onSelectStudent={handleSelectStudentForPdf}
              onOpenInsertForStudent={handleOpenInsertForSpecificStudent}
              onUpdateStudentEmail={handleUpdateStudentEmail}
            />
          )}

          {activeTab === 'insert' && (
            <InsertGradesModal 
              isOpen={true}
              isFullScreen={true}
              onClose={() => { setActiveTab(insertReturnTab); setInsertTargetStudent(null); }}
              students={accessibleStudents}
              onSaveGrade={handleSaveGrade}
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

      {/* Global Page Full-Width Footer anchored seamlessly to bottom */}
      <Footer />

    </div>
  );
}
