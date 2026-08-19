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
    // 1. Fetch Students from Supabase with new rubrik columns
    const { data: dbStudents, error: studentErr } = await supabase
      .from('students')
      .select(`
        id,
        nrp,
        name,
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
          ${INDICATOR_COLUMNS.join(',\n          ')},
          ${PILLAR_SCORE_COLUMNS.join(',\n          ')},
          final_score,
          predicate,
          status,
          notes,
          updated_at
        )
      `);

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

    if (studentErr || !dbStudents || dbStudents.length === 0) {
      console.warn('Using local dataset as Supabase table is empty or loading...', studentErr);
      return {
        students: initialStudents,
        classes: initialClasses,
        notices: fetchedNotices,
        subjectsCriteria
      };
    }

    // Format DB Students with new rubrik structure
    const formattedStudents = dbStudents.map(s => {
      const groupName = s.mentoring_groups?.name || 'Kelompok Mentoring';
      const mentorName = s.mentoring_groups?.mentors?.name || 'Pembina Mentoring';
      const ev = s.rapot_evaluations?.[0] || s.rapot_evaluations || {};

      // Build scores object from all 17 indicators
      const scores = {};
      INDICATOR_COLUMNS.forEach(col => {
        scores[col] = Number(ev[col] || 0);
      });

      const finalScore = Number(ev.final_score || 0);

      return {
        id: s.id,
        nim: s.nrp,
        name: s.name,
        prodi: s.prodi,
        kelompok: groupName,
        mentor: mentorName,
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
        lastUpdated: ev.updated_at ? new Date(ev.updated_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Belum Diisi'
      };
    });

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

    // Extract Unique Groups
    const groupNames = Array.from(new Set(formattedStudents.map(s => s.kelompok)));
    const formattedClasses = groupNames.map((g, idx) => {
      const members = formattedStudents.filter(s => s.kelompok === g);
      const mentorName = members[0]?.mentor || 'Pembina';
      const graded = members.filter(s => s.status !== 'Belum Dinilai');
      const membersCount = members.length;
      const gradedCount = graded.length;
      const progressPercent = membersCount > 0 ? Math.round((gradedCount / membersCount) * 100) : 0;
      return {
        id: `KEL-${idx + 1}`,
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

    return {
      students: formattedStudents,
      classes: formattedClasses,
      notices: fetchedNotices,
      subjectsCriteria,
      mentorLogins
    };

  } catch (err) {
    console.error('Error fetching Supabase data:', err);
    return {
      students: initialStudents,
      classes: initialClasses,
      notices: initialNotices,
      subjectsCriteria,
      mentorLogins: {}
    };
  }
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
