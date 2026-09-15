import { supabase } from './supabase';
import { initialStudents, initialClasses, notices as initialNotices, subjectsCriteria } from '../data/mockData';
import { PILLARS, calcPillarScore, calcFinalScore, getPredicate } from '../components/InsertGradesModal';

// All 17 indicator column names for Supabase queries
const INDICATOR_COLUMNS = [
  'p1_struktur_cv', 'p1_kelengkapan_info', 'p1_relevansi_divisi', 'p1_kualitas_penulisan', 'p1_kesesuaian_jenis_cv',
  'p2_kelengkapan_profil', 'p2_personal_branding', 'p2_konsistensi_cv',
  'p3_struktur_jawaban_star', 'p3_komunikasi_bahasa_tubuh', 'p3_kepercayaan_diri', 'p3_relevansi_jawaban', 'p3_pertanyaan_sulit',
  'p4_keaktifan_diskusi', 'p4_kedisiplinan', 'p4_kolaborasi_kelompok', 'p4_keterbukaan_feedback',
];

const PILLAR_SCORE_COLUMNS = ['p1_score', 'p2_score', 'p3_score', 'p4_score'];

export async function fetchAllRealData() {
  try {
    // 1. Fetch Students from Supabase with student_status and rubrik columns
    let dbStudents = null;
    let studentErr = null;

    try {
      const queryWithStatus = await supabase
        .from('students')
        .select(`
          id,
          nrp,
          name,
          email,
          prodi,
          year,
          group_id,
          student_status,
          mentoring_groups (
            id,
            name,
            mentors (
              name
            )
          ),
          rapot_evaluations (
            ${INDICATOR_COLUMNS.join(',\n            ')},
            ${PILLAR_SCORE_COLUMNS.join(',\n            ')},
            final_score,
            predicate,
            status,
            notes,
            feedback_apresiasi,
            feedback_saran,
            feedback_oprec,
            updated_at
          )
        `)
        .not('group_id', 'is', null);

      if (!queryWithStatus.error) {
        dbStudents = queryWithStatus.data;
      } else {
        const queryFallback = await supabase
          .from('students')
          .select(`
            id,
            nrp,
            name,
            email,
            prodi,
            year,
            group_id,
            mentoring_groups (
              id,
              name,
              mentors (
                name
              )
            ),
            rapot_evaluations (
              ${INDICATOR_COLUMNS.join(',\n              ')},
              ${PILLAR_SCORE_COLUMNS.join(',\n              ')},
              final_score,
              predicate,
              status,
              notes,
              feedback_apresiasi,
              feedback_saran,
              feedback_oprec,
              updated_at
            )
          `)
          .not('group_id', 'is', null);

        dbStudents = queryFallback.data;
        studentErr = queryFallback.error;
      }
    } catch (e) {
      studentErr = e;
    }

    // 2. Fetch Dynamic Notices/Announcements from Supabase
    let fetchedNotices = initialNotices;
    try {
      const { data: dbNotices, error: noticeErr } = await supabase
        .from('notices')
        .select('*')
        .order('created_at', { ascending: false });

      if (!noticeErr && dbNotices && dbNotices.length > 0) {
        fetchedNotices = dbNotices.map(n => ({
          id: n.id,
          title: n.title,
          description: n.description,
          category: n.category || 'Info',
          date: n.date || (n.created_at ? new Date(n.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Baru saja'),
          deadline: n.deadline || null,
          author: n.author || 'Panitia Rawat Maba'
        }));
      }
    } catch (nErr) {
      console.warn('Could not fetch notices from Supabase, using defaults:', nErr);
    }

    const validStudents = (dbStudents || []).filter(s => s.group_id && s.mentoring_groups?.name);

    if (studentErr || !validStudents || validStudents.length === 0) {
      console.warn('Using local dataset as Supabase table is empty or loading...', studentErr);
      return {
        students: initialStudents,
        classes: initialClasses,
        notices: fetchedNotices,
        subjectsCriteria
      };
    }

    // Read local cache for student status & emails if needed
    let localStatuses = {};
    let localEmails = {};
    try {
      localStatuses = JSON.parse(localStorage.getItem('rapot_student_statuses') || '{}');
      localEmails = JSON.parse(localStorage.getItem('rapot_student_emails') || '{}');
    } catch (e) {}

    // Format DB Students with new rubrik structure
    const formattedStudents = validStudents.map(s => {
      const groupName = s.mentoring_groups?.name || 'Kelompok Mentoring';
      const mentorName = s.mentoring_groups?.mentors?.name || 'Mentor Mentoring';
      const ev = s.rapot_evaluations?.[0] || s.rapot_evaluations || {};

      // Build scores object from all 17 indicators
      const scores = {};
      INDICATOR_COLUMNS.forEach(col => {
        scores[col] = Number(ev[col] || 0);
      });

      const finalScore = Number(ev.final_score || 0);
      const studentStatus = s.student_status || localStatuses[s.id] || localStatuses[s.nrp] || 'Active';
      const studentEmail = s.email || localEmails[s.id] || localEmails[s.nrp] || '';

      return {
        id: s.id,
        nim: s.nrp,
        name: s.name,
        email: studentEmail,
        prodi: s.prodi,
        kelompok: groupName,
        mentor: mentorName,
        studentStatus: studentStatus,
        student_status: studentStatus,
        status: ev.status || 'Belum Dinilai',
        finalScore: finalScore,
        predicate: ev.predicate || '-',
        scores: scores,
        pillarScores: {
          p1_score: Number(ev.p1_score || 0),
          p2_score: Number(ev.p2_score || 0),
          p3_score: Number(ev.p3_score || 0),
          p4_score: Number(ev.p4_score || 0),
        },
        notes: ev.notes || `Belum dinilai oleh mentor kelompok ${groupName}.`,
        feedback_apresiasi: ev.feedback_apresiasi || '',
        feedback_saran: ev.feedback_saran || '',
        feedback_oprec: ev.feedback_oprec || '',
        feedbackApresiasi: ev.feedback_apresiasi || '',
        feedbackSaran: ev.feedback_saran || '',
        feedbackOprec: ev.feedback_oprec || '',
        lastUpdated: ev.updated_at ? new Date(ev.updated_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Belum Diisi'
      };
    });

    // Ensure Super Admin Dummy Student is present in dataset for testing
    const dummyStoredEmail = localEmails['30000000-0000-0000-0000-000000000999'] || localEmails['5026249999'] || SUPER_ADMIN_DUMMY_STUDENT.email;
    const resolvedDummy = {
      ...SUPER_ADMIN_DUMMY_STUDENT,
      email: dummyStoredEmail
    };
    const hasDummy = formattedStudents.some(s => s.nim === '5026249999' || s.id === '30000000-0000-0000-0000-000000000999');
    if (!hasDummy) {
      formattedStudents.push(resolvedDummy);
    } else {
      const dIdx = formattedStudents.findIndex(s => s.nim === '5026249999' || s.id === '30000000-0000-0000-0000-000000000999');
      if (dIdx !== -1 && (!formattedStudents[dIdx].email || formattedStudents[dIdx].email === 'dummy.rawatmaba@gmail.com') && dummyStoredEmail) {
        formattedStudents[dIdx].email = dummyStoredEmail;
      }
    }

    // Fetch profiles for last_login_at timestamps
    const { data: dbProfiles } = await supabase
      .from('profiles')
      .select('name, username, last_login_at');

    const mentorLogins = {};
    if (dbProfiles) {
      dbProfiles.forEach(p => {
        if (p.last_login_at) {
          if (p.name) {
            mentorLogins[p.name] = p.last_login_at;
            mentorLogins[p.name.toLowerCase()] = p.last_login_at;
            const firstName = p.name.split(' ')[0].toLowerCase();
            mentorLogins[firstName] = p.last_login_at;
          }
          if (p.username) {
            mentorLogins[p.username] = p.last_login_at;
            mentorLogins[p.username.toLowerCase()] = p.last_login_at;
          }
        }
      });
    }

    // Fetch Email Schedules
    const emailSchedules = await fetchEmailSchedules();

    // Extract Unique Groups
    const formattedClasses = buildClassesFromStudents(formattedStudents);

    return {
      students: formattedStudents,
      classes: formattedClasses,
      notices: fetchedNotices,
      subjectsCriteria,
      mentorLogins,
      emailSchedules
    };

  } catch (err) {
    console.error('Error fetching Supabase data:', err);
    return {
      students: [SUPER_ADMIN_DUMMY_STUDENT, ...initialStudents],
      classes: initialClasses,
      notices: initialNotices,
      subjectsCriteria,
      mentorLogins: {},
      emailSchedules: await fetchEmailSchedules()
    };
  }
}

export function isStudentReadyToPrint(student) {
  if (!student) return false;
  const hasScore = Number(student.finalScore || 0) > 0 || Object.values(student.scores || {}).some(v => Number(v) > 0);
  if (!hasScore) return false;

  const hasPesan = Boolean(
    (student.feedback_apresiasi && student.feedback_apresiasi.trim()) ||
    (student.feedbackApresiasi && student.feedbackApresiasi.trim()) ||
    (student.feedback_saran && student.feedback_saran.trim()) ||
    (student.feedbackSaran && student.feedbackSaran.trim()) ||
    (student.feedback_oprec && student.feedback_oprec.trim()) ||
    (student.feedbackOprec && student.feedbackOprec.trim())
  );

  return hasScore && hasPesan;
}

export function buildClassesFromStudents(students = []) {
  if (!students || students.length === 0) return initialClasses;
  const groupNames = Array.from(new Set(students.map(s => s.kelompok))).filter(Boolean);
  if (groupNames.length === 0) return initialClasses;
  return groupNames.map((g, idx) => {
    const members = students.filter(s => s.kelompok === g);
    const mentorName = members[0]?.mentor || 'Mentor';
    const readyMembers = members.filter(isStudentReadyToPrint);
    const membersCount = members.length;
    const gradedCount = readyMembers.length;
    const progressPercent = membersCount > 0 ? Math.round((gradedCount / membersCount) * 100) : 0;
    return {
      id: `KEL-${String(idx + 1).padStart(2, '0')}`,
      name: g,
      mentor: mentorName,
      membersCount: membersCount,
      gradedCount: gradedCount,
      progress: progressPercent,
      status: progressPercent === 100 ? 'Selesai' : (progressPercent > 0 ? `${progressPercent}%` : 'Belum Mulai'),
      room: `Ruang Mentoring ${g}`,
      schedule: "Setiap Sabtu, 08.00 WIB"
    };
  });
}

// ═══════════════════════════════════════════════════════════════
// NOTICES / PENGUMUMAN CRUD FOR SUPER ADMIN
// ═══════════════════════════════════════════════════════════════
export async function createNoticeInSupabase(notice) {
  try {
    const newNotice = {
      title: notice.title,
      description: notice.description,
      category: notice.category || 'Info',
      date: notice.date || new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
      deadline: notice.deadline || null,
      author: notice.author || 'Panitia Rawat Maba',
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('notices')
      .insert([newNotice])
      .select()
      .single();

    if (error) {
      console.warn('Supabase insert notice fallback to local:', error);
      return { success: true, data: { ...newNotice, id: Date.now().toString() } };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Error creating notice:', err);
    return { success: true, data: { ...notice, id: Date.now().toString() } };
  }
}

export async function deleteNoticeInSupabase(noticeId) {
  try {
    const { error } = await supabase
      .from('notices')
      .delete()
      .eq('id', noticeId);

    if (error) {
      console.warn('Supabase delete notice error:', error);
    }
    return { success: true };
  } catch (err) {
    console.error('Error deleting notice:', err);
    return { success: false, error: err };
  }
}

export function getMentorLastLogin(mentorName, mentorLogins = {}) {
  if (!mentorName) return null;
  let localLogins = {};
  try {
    localLogins = JSON.parse(localStorage.getItem('rapot_mentor_logins') || '{}');
  } catch (e) {}

  const nameClean = String(mentorName).trim().toLowerCase();
  const nameTokens = nameClean.split(/\s+/).filter(t => t.length > 2 && t !== 'muhammad');

  const dicts = [mentorLogins, localLogins];

  for (const dict of dicts) {
    if (!dict) continue;
    
    // 1. Direct exact or lowercase match
    if (dict[mentorName]) return dict[mentorName];
    if (dict[nameClean]) return dict[nameClean];

    // 2. Token overlap match
    for (const key of Object.keys(dict)) {
      if (!key || !dict[key]) continue;
      const kClean = key.toLowerCase();
      const kTokens = kClean.split(/\s+/).filter(t => t.length > 2 && t !== 'muhammad');

      if (nameClean.includes(kClean) || kClean.includes(nameClean)) {
        return dict[key];
      }

      const hasTokenMatch = nameTokens.some(t => kTokens.includes(t));
      if (hasTokenMatch) {
        return dict[key];
      }
    }
  }

  return null;
}

export async function updateUserLastLogin(user) {
  if (!user) return;
  try {
    const nowIso = new Date().toISOString();
    const uName = typeof user === 'string' ? user : (user.name || user.username || '');
    const uUsername = typeof user === 'object' ? (user.username || '') : '';
    const cleanName = String(uName).trim();
    
    const stored = JSON.parse(localStorage.getItem('rapot_mentor_logins') || '{}');
    if (cleanName) {
      stored[cleanName] = nowIso;
      stored[cleanName.toLowerCase()] = nowIso;
      cleanName.split(/\s+/).forEach(token => {
        if (token.length > 2 && token.toLowerCase() !== 'muhammad') {
          stored[token.toLowerCase()] = nowIso;
        }
      });
    }

    if (uUsername) {
      stored[uUsername] = nowIso;
      stored[String(uUsername).toLowerCase()] = nowIso;
    }

    localStorage.setItem('rapot_mentor_logins', JSON.stringify(stored));

    if (uUsername) {
      await supabase
        .from('profiles')
        .update({ last_login_at: nowIso })
        .eq('username', uUsername);
    }

    if (cleanName) {
      const nonGenericToken = cleanName.split(/\s+/).find(t => t.length > 2 && t.toLowerCase() !== 'muhammad') || cleanName;
      await supabase
        .from('profiles')
        .update({ last_login_at: nowIso })
        .ilike('name', `%${nonGenericToken}%`);
    }

    console.log('Successfully recorded last_login_at for:', cleanName, 'at:', nowIso);
  } catch (err) {
    console.warn('Error updating last login timestamp:', err);
  }
}

export async function saveStudentGradeToSupabase(student) {
  try {
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(student.id);
    
    let dbStudentId = null;

    if (isUuid) {
      dbStudentId = student.id;
    } else {
      const { data: stdData } = await supabase
        .from('students')
        .select('id')
        .eq('nrp', String(student.nim).trim())
        .maybeSingle();

      if (stdData && stdData.id) {
        dbStudentId = stdData.id;
      }
    }

    if (!dbStudentId) {
      console.warn("Could not resolve Supabase student UUID for NRP:", student.nim);
      return { success: false, error: "Student UUID not found in Supabase DB" };
    }

    const scores = student.scores || {};
    const pillarScores = student.pillarScores || {};

    const evaluationData = {
      student_id: dbStudentId,
      p1_struktur_cv: Number(scores.p1_struktur_cv || 0),
      p1_kelengkapan_info: Number(scores.p1_kelengkapan_info || 0),
      p1_relevansi_divisi: Number(scores.p1_relevansi_divisi || 0),
      p1_kualitas_penulisan: Number(scores.p1_kualitas_penulisan || 0),
      p1_kesesuaian_jenis_cv: Number(scores.p1_kesesuaian_jenis_cv || 0),
      p2_kelengkapan_profil: Number(scores.p2_kelengkapan_profil || 0),
      p2_personal_branding: Number(scores.p2_personal_branding || 0),
      p2_konsistensi_cv: Number(scores.p2_konsistensi_cv || 0),
      p3_struktur_jawaban_star: Number(scores.p3_struktur_jawaban_star || 0),
      p3_komunikasi_bahasa_tubuh: Number(scores.p3_komunikasi_bahasa_tubuh || 0),
      p3_kepercayaan_diri: Number(scores.p3_kepercayaan_diri || 0),
      p3_relevansi_jawaban: Number(scores.p3_relevansi_jawaban || 0),
      p3_pertanyaan_sulit: Number(scores.p3_pertanyaan_sulit || 0),
      p4_keaktifan_diskusi: Number(scores.p4_keaktifan_diskusi || 0),
      p4_kedisiplinan: Number(scores.p4_kedisiplinan || 0),
      p4_kolaborasi_kelompok: Number(scores.p4_kolaborasi_kelompok || 0),
      p4_keterbukaan_feedback: Number(scores.p4_keterbukaan_feedback || 0),
      p1_score: Number(pillarScores.p1_score || 0),
      p2_score: Number(pillarScores.p2_score || 0),
      p3_score: Number(pillarScores.p3_score || 0),
      p4_score: Number(pillarScores.p4_score || 0),
      final_score: Number(student.finalScore || 0),
      predicate: String(student.predicate || '-'),
      status: String(student.status || 'Belum Dinilai'),
      notes: String(student.notes || ''),
      feedback_apresiasi: String(student.feedback_apresiasi || student.feedbackApresiasi || ''),
      feedback_saran: String(student.feedback_saran || student.feedbackSaran || ''),
      feedback_oprec: String(student.feedback_oprec || student.feedbackOprec || ''),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('rapot_evaluations')
      .upsert(evaluationData, { onConflict: 'student_id' });

    if (error) {
      console.error('Supabase evaluation upsert error:', error);
      return { success: false, error };
    }

    console.log('Successfully saved evaluation to Supabase DB for student:', student.name);
    return { success: true, data };
  } catch (err) {
    console.error('Error saving evaluation to Supabase:', err);
    return { success: false, error: err };
  }
}

// Update student email directly in Supabase students table
export async function updateStudentEmailInSupabase(studentId, newEmail) {
  try {
    const cleanEmail = (newEmail || '').trim();

    // 1. Immediately persist to localStorage for instant local reactivity
    try {
      const localEmails = JSON.parse(localStorage.getItem('rapot_student_emails') || '{}');
      localEmails[studentId] = cleanEmail;
      localStorage.setItem('rapot_student_emails', JSON.stringify(localEmails));
    } catch (e) {}

    // Update in-memory dummy constant if targeting the dummy student
    if (studentId === '30000000-0000-0000-0000-000000000999' || studentId === '5026249999') {
      SUPER_ADMIN_DUMMY_STUDENT.email = cleanEmail;
    }

    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(studentId);
    let query = supabase.from('students').update({ email: cleanEmail });
    if (isUuid) {
      query = query.eq('id', studentId);
    } else {
      query = query.eq('nrp', String(studentId).trim());
    }

    const { data, error } = await query;

    if (error) {
      console.warn('Supabase student email update note (saved locally):', error.message || error);
      return { success: true, localOnly: true, data };
    }

    console.log('Successfully updated student email in Supabase DB for ID:', studentId);
    return { success: true, data };
  } catch (err) {
    console.error('Exception updating student email in Supabase:', err);
    return { success: true, localOnly: true };
  }
}

// Clear/reset all evaluation scores for a student back to zero
export async function clearStudentGradeInSupabase(studentId) {
  try {
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(studentId);
    
    let dbStudentId = studentId;

    if (!isUuid) {
      const { data: stdData } = await supabase
        .from('students')
        .select('id')
        .eq('nrp', String(studentId).trim())
        .maybeSingle();

      if (stdData && stdData.id) {
        dbStudentId = stdData.id;
      } else {
        console.warn("Could not resolve Supabase student UUID for clearing:", studentId);
        return { success: false, error: "Student UUID not found" };
      }
    }

    const resetData = {
      student_id: dbStudentId,
      p1_struktur_cv: 0,
      p1_kelengkapan_info: 0,
      p1_relevansi_divisi: 0,
      p1_kualitas_penulisan: 0,
      p1_kesesuaian_jenis_cv: 0,
      p2_kelengkapan_profil: 0,
      p2_personal_branding: 0,
      p2_konsistensi_cv: 0,
      p3_struktur_jawaban_star: 0,
      p3_komunikasi_bahasa_tubuh: 0,
      p3_kepercayaan_diri: 0,
      p3_relevansi_jawaban: 0,
      p3_pertanyaan_sulit: 0,
      p4_keaktifan_diskusi: 0,
      p4_kedisiplinan: 0,
      p4_kolaborasi_kelompok: 0,
      p4_keterbukaan_feedback: 0,
      p1_score: 0,
      p2_score: 0,
      p3_score: 0,
      p4_score: 0,
      final_score: 0,
      predicate: '-',
      status: 'Belum Dinilai',
      notes: '',
      feedback_apresiasi: '',
      feedback_saran: '',
      feedback_oprec: '',
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('rapot_evaluations')
      .upsert(resetData, { onConflict: 'student_id' });

    if (error) {
      console.error('Supabase evaluation clear error:', error);
      return { success: false, error };
    }

    console.log('Successfully cleared evaluation for student ID:', dbStudentId);
    return { success: true, data };
  } catch (err) {
    console.error('Error clearing evaluation in Supabase:', err);
    return { success: false, error: err };
  }
}

// Update student status (Active, Hilang, Pindah, Tidak Mengumpulkan) in Supabase students table
export async function updateStudentStatusInSupabase(studentId, newStatus) {
  try {
    const cleanStatus = (newStatus || 'Active').trim();
    
    // 1. Cache to localStorage for instant reactivity and persistent fallback
    try {
      const localStatuses = JSON.parse(localStorage.getItem('rapot_student_statuses') || '{}');
      localStatuses[studentId] = cleanStatus;
      localStorage.setItem('rapot_student_statuses', JSON.stringify(localStatuses));
    } catch (e) {}

    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(studentId);
    
    let query = supabase.from('students').update({ student_status: cleanStatus });
    if (isUuid) {
      query = query.eq('id', studentId);
    } else {
      query = query.eq('nrp', String(studentId).trim());
    }

    const { data, error } = await query;
    if (error) {
      console.warn('Supabase student_status update note (local cache preserved):', error.message || error);
      return { success: true, localOnly: true, data };
    }

    console.log('Successfully updated student_status in Supabase for:', studentId, '->', cleanStatus);
    return { success: true, data };
  } catch (err) {
    console.error('Exception updating student status:', err);
    return { success: true, localOnly: true };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SUPER ADMIN DUMMY STUDENT (Exclusively visible to Super Admin)
// ═══════════════════════════════════════════════════════════════════════════
export const SUPER_ADMIN_DUMMY_STUDENT = {
  id: '30000000-0000-0000-0000-000000000999',
  nim: '5026249999',
  name: 'Dummy Mahasiswa (Admin Only)',
  email: 'dummy.rawatmaba@gmail.com',
  prodi: 'Sistem Informasi',
  kelompok: 'Kelompok Khusus Admin',
  mentor: 'Super Admin',
  studentStatus: 'Active',
  student_status: 'Active',
  status: 'Sudah Dinilai',
  finalScore: 90.4,
  predicate: 'A',
  scores: {
    p1_struktur_cv: 4, p1_kelengkapan_info: 5, p1_relevansi_divisi: 4, p1_kualitas_penulisan: 4, p1_kesesuaian_jenis_cv: 5,
    p2_kelengkapan_profil: 4, p2_personal_branding: 5, p2_konsistensi_cv: 4,
    p3_struktur_jawaban_star: 5, p3_komunikasi_bahasa_tubuh: 4, p3_kepercayaan_diri: 5, p3_relevansi_jawaban: 4, p3_pertanyaan_sulit: 5,
    p4_keaktifan_diskusi: 5, p4_kedisiplinan: 5, p4_kolaborasi_kelompok: 4, p4_keterbukaan_feedback: 5,
  },
  pillarScores: {
    p1_score: 26.4,
    p2_score: 17.4,
    p3_score: 32.4,
    p4_score: 14.4
  },
  notes: 'Peserta dummy untuk pengujian rapot, fitur email, dan unduh PDF oleh Super Admin.',
  feedback_apresiasi: 'Menunjukkan pemahaman materi yang sangat baik dan aktif dalam seluruh sesi simulasi.',
  feedback_saran: 'Pertahankan konsistensi penulisan CV dan perluas portofolio proyek terapan.',
  feedback_oprec: 'Sangat direkomendasikan untuk mendaftar di Divisi Manajemen Acara & Public Relations.',
  feedbackApresiasi: 'Menunjukkan pemahaman materi yang sangat baik dan aktif dalam seluruh sesi simulasi.',
  feedbackSaran: 'Pertahankan konsistensi penulisan CV dan perluas portofolio proyek terapan.',
  feedbackOprec: 'Sangat direkomendasikan untuk mendaftar di Divisi Manajemen Acara & Public Relations.',
  isDummy: true,
  lastUpdated: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
};

// ═══════════════════════════════════════════════════════════════════════════
// EMAIL DISPATCH SCHEDULE MANAGEMENT (Super Admin Configurable)
// ═══════════════════════════════════════════════════════════════════════════


export const DEFAULT_EMAIL_SCHEDULES = {
  isGlobalEnabled: true,
  globalStartTime: '', // format: 'YYYY-MM-DDTHH:mm'
  globalEndTime: '',
  mentorOverrides: {
    // [mentorUsernameOrName]: { mode: 'inherit' | 'always' | 'disabled' | 'custom', startTime: '', endTime: '' }
  }
};

export async function fetchEmailSchedules() {
  try {
    const { data, error } = await supabase
      .from('email_schedules')
      .select('*')
      .eq('id', 'global_config')
      .maybeSingle();

    if (!error && data) {
      return {
        isGlobalEnabled: data.is_global_enabled ?? true,
        globalStartTime: data.global_start_time || '',
        globalEndTime: data.global_end_time || '',
        mentorOverrides: data.mentor_overrides || {}
      };
    }
    if (error) {
      console.warn('Supabase fetch email_schedules error:', error.message || error);
    }
  } catch (err) {
    console.error('Could not fetch email_schedules from Supabase DB:', err);
  }

  return DEFAULT_EMAIL_SCHEDULES;
}

export async function saveEmailSchedulesInSupabase(schedules) {
  try {
    const payload = {
      id: 'global_config',
      is_global_enabled: schedules.isGlobalEnabled ?? true,
      global_start_time: schedules.globalStartTime ? new Date(schedules.globalStartTime).toISOString() : null,
      global_end_time: schedules.globalEndTime ? new Date(schedules.globalEndTime).toISOString() : null,
      mentor_overrides: schedules.mentorOverrides || {},
      updated_at: new Date().toISOString(),
      updated_by: 'super_admin'
    };

    const { data, error } = await supabase
      .from('email_schedules')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.error('Supabase email_schedules save error:', error.message || error);
      return { success: false, error };
    }

    console.log('Successfully saved email schedules directly to Supabase DB');
    return { success: true, data };
  } catch (err) {
    console.error('Exception saving email schedules to Supabase DB:', err);
    return { success: false, error: err };
  }
}

export function evaluateEmailScheduleForUser(currentUser, schedules) {
  // 1. Super Admin always has master bypass access
  if (currentUser?.role === 'super_admin' || currentUser?.username === 'webdev') {
    return {
      isAllowed: true,
      isSuperAdmin: true,
      status: 'active',
      reason: 'Akses Super Admin: Pengiriman email aktif tanpa batasan jadwal.'
    };
  }

  if (!schedules) {
    return { isAllowed: true, status: 'active', reason: '' };
  }

  const now = Date.now();
  const mentorUsername = currentUser?.username || '';
  const mentorName = (currentUser?.name || '').trim().toLowerCase();

  // Find mentor override by username, exact name, or partial match
  let override = null;
  if (schedules.mentorOverrides) {
    if (mentorUsername && schedules.mentorOverrides[mentorUsername]) {
      override = schedules.mentorOverrides[mentorUsername];
    } else if (currentUser?.name && schedules.mentorOverrides[currentUser.name]) {
      override = schedules.mentorOverrides[currentUser.name];
    } else {
      const entry = Object.entries(schedules.mentorOverrides).find(([key]) => {
        const k = key.trim().toLowerCase();
        return k === mentorUsername.toLowerCase() || k === mentorName || mentorName.includes(k) || k.includes(mentorName);
      });
      if (entry) override = entry[1];
    }
  }

  const mode = override?.mode || 'inherit';

  // Specific Mentor Mode: Always Active
  if (mode === 'always') {
    return { isAllowed: true, status: 'active', reason: 'Jadwal email aktif khusus untuk mentor kelompok Anda.' };
  }

  // Specific Mentor Mode: Disabled
  if (mode === 'disabled') {
    return {
      isAllowed: false,
      status: 'disabled',
      reason: 'Pengiriman email saat ini dinonaktifkan untuk kelompok Anda oleh Super Admin.'
    };
  }

  // Specific Mentor Mode: Custom Schedule Window
  if (mode === 'custom') {
    const start = override?.startTime ? new Date(override.startTime).getTime() : null;
    const end = override?.endTime ? new Date(override.endTime).getTime() : null;

    if (start && now < start) {
      const startStr = new Date(start).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
      return {
        isAllowed: false,
        status: 'scheduled',
        reason: `Tombol email baru akan aktif pada ${startStr} WIB sesuai jadwal kelompok Anda.`
      };
    }

    if (end && now > end) {
      const endStr = new Date(end).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
      return {
        isAllowed: false,
        status: 'expired',
        reason: `Waktu pengiriman email untuk kelompok Anda telah berakhir pada ${endStr} WIB.`
      };
    }

    return { isAllowed: true, status: 'active', reason: 'Jadwal pengiriman email kelompok Anda saat ini sedang dibuka.' };
  }

  // Inherit Global Schedule Mode
  if (!schedules.isGlobalEnabled) {
    return {
      isAllowed: false,
      status: 'disabled',
      reason: 'Fitur pengiriman email sedang dinonaktifkan secara global oleh Super Admin.'
    };
  }

  const gStart = schedules.globalStartTime ? new Date(schedules.globalStartTime).getTime() : null;
  const gEnd = schedules.globalEndTime ? new Date(schedules.globalEndTime).getTime() : null;

  if (gStart && now < gStart) {
    const startStr = new Date(gStart).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
    return {
      isAllowed: false,
      status: 'scheduled',
      reason: `Tombol email baru akan aktif pada ${startStr} WIB sesuai jadwal panitia.`
    };
  }

  if (gEnd && now > gEnd) {
    const endStr = new Date(gEnd).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
    return {
      isAllowed: false,
      status: 'expired',
      reason: `Waktu pengiriman email telah berakhir pada ${endStr} WIB.`
    };
  }

  return { isAllowed: true, status: 'active', reason: 'Jadwal pengiriman email saat ini sedang dibuka.' };
}



