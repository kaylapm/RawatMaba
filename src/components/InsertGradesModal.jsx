import React, { useState, useEffect } from 'react';

// ═══════════════════════════════════════════════════════════════
// WARNA RESMI GSM & RUBRIK PENILAIAN RAWAT MABA 2026
// Warna GSM: #003CEC (Blue), #00B0D8 (Cyan), #C896E0 (Lavender), #E59B86 (Peach), #F4F6C0 (Cream), #DCD6F7 (Lilac), #0A1128 (Dark Blue)
// ═══════════════════════════════════════════════════════════════
export const PILLARS = [
  {
    id: 'p1',
    code: 'P1',
    title: 'CV & Portofolio',
    shortTitle: 'CV & Portofolio',
    icon: 'contact_page',
    color: '#003CEC', // GSM Blue Main
    bgLight: 'bg-[#003CEC]/5',
    borderLight: 'border-[#003CEC]/30',
    badgeText: 'text-[#003CEC]',
    bobot: 30,
    indicators: [
      {
        key: 'p1_struktur_cv',
        label: 'Struktur & Format CV',
        bobot: 6,
        desc: 'Kerapian tata letak, urutan section (data diri, pendidikan, pengalaman, skill), dan konsistensi format penulisan.',
        rubrik: {
          1: 'CV tidak terstruktur, urutan section membingungkan, format tidak konsisten.',
          2: 'Format ada sedikit keteraturan namun masih banyak section tertukar dan inkonsisten.',
          3: 'Struktur cukup jelas namun ada beberapa bagian yang kurang rapi/konsisten.',
          4: 'Struktur rapi dan tertata dengan baik, format mayoritas konsisten dengan sedikit catatan minor.',
          5: 'Struktur sangat rapi, section berurutan logis, format konsisten dari awal hingga akhir.'
        }
      },
      {
        key: 'p1_kelengkapan_info',
        label: 'Kelengkapan Informasi',
        bobot: 6,
        desc: 'Kelengkapan data diri, riwayat pendidikan, pengalaman organisasi/kepanitiaan, dan keterampilan (skill) yang dicantumkan.',
        rubrik: {
          1: 'Informasi sangat minim, banyak bagian penting yang tidak diisi.',
          2: 'Informasi dasar terisi namun data penting (pengalaman/skill) masih sangat kurang.',
          3: 'Informasi cukup lengkap namun ada bagian yang masih kurang detail.',
          4: 'Informasi lengkap dan jelas di sebagian besar bagian penting dengan deskripsi baik.',
          5: 'Informasi lengkap, detail, dan mencakup seluruh aspek yang relevan.'
        }
      },
      {
        key: 'p1_relevansi_divisi',
        label: 'Relevansi dengan Divisi/Kepanitiaan Tujuan',
        bobot: 6,
        desc: 'Kesesuaian pengalaman dan skill yang ditonjolkan dengan divisi/kepanitiaan yang disasar peserta.',
        rubrik: {
          1: 'Isi CV tidak disesuaikan sama sekali dengan divisi/kepanitiaan yang dituju.',
          2: 'Ada sedikit kaitan namun belum menonjolkan kecocokan dengan divisi tujuan.',
          3: 'Ada penyesuaian namun belum maksimal menonjolkan poin yang relevan.',
          4: 'Pengalaman dan skill relevan sudah ditonjolkan dengan baik sesuai divisi tujuan.',
          5: 'Isi CV sangat disesuaikan, poin relevan dengan divisi/kepanitiaan ditonjolkan jelas.'
        }
      },
      {
        key: 'p1_kualitas_penulisan',
        label: 'Kualitas Penulisan',
        bobot: 6,
        desc: 'Penggunaan action verbs, hasil yang terukur/kuantitatif, serta bebas dari typo dan kesalahan tata bahasa.',
        rubrik: {
          1: 'Banyak typo, penulisan pasif, tidak ada hasil terukur yang disebutkan.',
          2: 'Masih banyak typo atau kalimat pasif, data pendukung belum terlihat.',
          3: 'Penulisan cukup baik, sedikit typo, sebagian pengalaman disertai hasil terukur.',
          4: 'Penulisan aktif dan rapi, minim typo, sebagian besar poin didukung data kuantitatif.',
          5: 'Penulisan aktif dan terukur (mis. "meningkatkan partisipasi 20%"), bebas typo.'
        }
      },
      {
        key: 'p1_kesesuaian_jenis_cv',
        label: 'Kesesuaian Jenis CV (ATS-Friendly/Creative)',
        bobot: 6,
        desc: 'Ketepatan memilih dan menerapkan format ATS-Friendly CV atau Creative CV sesuai kebutuhan/konteks pendaftaran.',
        rubrik: {
          1: 'Pemilihan jenis CV tidak tepat atau tidak dipahami peserta.',
          2: 'Jenis CV dipilih namun formatnya masih rancu antara ATS dan Creative.',
          3: 'Jenis CV sudah dipilih namun penerapannya belum maksimal.',
          4: 'Jenis CV dipilih dengan tepat dan penerapannya teratur sesuai konteks.',
          5: 'Jenis CV dipilih dan diterapkan dengan tepat sesuai konteks pendaftaran.'
        }
      }
    ]
  },
  {
    id: 'p2',
    code: 'P2',
    title: 'Optimalisasi LinkedIn',
    shortTitle: 'LinkedIn Profile',
    icon: 'share',
    color: '#00B0D8', // GSM Cyan
    bgLight: 'bg-[#00B0D8]/10',
    borderLight: 'border-[#00B0D8]/40',
    badgeText: 'text-[#00B0D8]',
    bobot: 20,
    indicators: [
      {
        key: 'p2_kelengkapan_profil',
        label: 'Kelengkapan Profil',
        bobot: 7,
        desc: 'Kelengkapan foto profil, headline, ringkasan (about), riwayat pendidikan, dan pengalaman pada akun LinkedIn.',
        rubrik: {
          1: 'Profil sangat minim, banyak bagian kosong (foto/headline/about tidak diisi).',
          2: 'Hanya foto dan data dasar terisi, headline dan about masih kosong atau minim.',
          3: 'Profil cukup lengkap, namun ada beberapa bagian penting belum diisi maksimal.',
          4: 'Profil terisi lengkap dengan headline dan about yang rapi serta riwayat terstruktur.',
          5: 'Profil lengkap dan terisi rapi di seluruh bagian utama.'
        }
      },
      {
        key: 'p2_personal_branding',
        label: 'Personal Branding',
        bobot: 7,
        desc: 'Kualitas headline dan ringkasan (about) dalam mencerminkan citra diri secara profesional dan menarik.',
        rubrik: {
          1: 'Headline/about generik, tidak mencerminkan kekuatan/minat peserta.',
          2: 'Headline/about sangat singkat dan belum menggambarkan nilai jual peserta.',
          3: 'Headline/about cukup mencerminkan diri namun masih umum.',
          4: 'Headline/about mencerminkan minat dan keahlian spesifik dengan bahasa profesional.',
          5: 'Headline/about spesifik, menarik, dan mencerminkan personal branding yang kuat.'
        }
      },
      {
        key: 'p2_konsistensi_cv',
        label: 'Konsistensi dengan CV',
        bobot: 6,
        desc: 'Keselarasan informasi pengalaman dan keterampilan antara profil LinkedIn dengan CV yang disusun.',
        rubrik: {
          1: 'Informasi LinkedIn dan CV banyak yang tidak sinkron.',
          2: 'Banyak perbedaan informasi riwayat atau skill antara LinkedIn dan CV.',
          3: 'Sebagian besar informasi sudah selaras, ada sedikit perbedaan.',
          4: 'Informasi LinkedIn dan CV selaras dengan perbedaan minor yang tidak substansial.',
          5: 'Informasi LinkedIn dan CV selaras sepenuhnya.'
        }
      }
    ]
  },
  {
    id: 'p3',
    code: 'P3',
    title: 'Simulasi Interview',
    shortTitle: 'Simulasi Interview',
    icon: 'co_present',
    color: '#C896E0', // GSM Lavender
    bgLight: 'bg-[#C896E0]/15',
    borderLight: 'border-[#C896E0]/40',
    badgeText: 'text-[#9B51E0]',
    bobot: 35,
    indicators: [
      {
        key: 'p3_struktur_jawaban_star',
        label: 'Struktur Jawaban (Framework STAR)',
        bobot: 8,
        desc: 'Kemampuan menyusun jawaban secara runtut menggunakan Situation, Task, Action, Result.',
        rubrik: {
          1: 'Jawaban tidak terstruktur, melompat-lompat, sulit dipahami alurnya.',
          2: 'Alur jawaban kurang jelas, elemen STAR belum tampak.',
          3: 'Jawaban cukup runtut namun belum konsisten menerapkan STAR.',
          4: 'Jawaban runtut dan sebagian besar menerapkan STAR dengan baik.',
          5: 'Jawaban runtut dan konsisten menerapkan STAR dengan jelas.'
        }
      },
      {
        key: 'p3_komunikasi_bahasa_tubuh',
        label: 'Komunikasi & Bahasa Tubuh',
        bobot: 7,
        desc: 'Kejelasan intonasi, artikulasi, kontak mata, serta bahasa tubuh selama simulasi interview.',
        rubrik: {
          1: 'Komunikasi kurang jelas, bahasa tubuh kaku/tidak mendukung penyampaian.',
          2: 'Intonasi monoton, kontak mata minim, bahasa tubuh ragu-ragu.',
          3: 'Komunikasi cukup jelas, bahasa tubuh mendukung meski belum maksimal.',
          4: 'Artikulasi jelas, kontak mata baik, bahasa tubuh profesional dan komunikatif.',
          5: 'Komunikasi jelas dan meyakinkan, bahasa tubuh mendukung penyampaian.'
        }
      },
      {
        key: 'p3_kepercayaan_diri',
        label: 'Kepercayaan Diri',
        bobot: 7,
        desc: 'Tingkat kepercayaan diri peserta dalam menjawab pertanyaan tanpa terlihat gugup berlebihan.',
        rubrik: {
          1: 'Terlihat sangat gugup, ragu-ragu, suara/jawaban tidak yakin.',
          2: 'Rasa gugup masih mendominasi sehingga jawaban kurang lancar.',
          3: 'Cukup percaya diri meski masih terlihat sedikit gugup di beberapa bagian.',
          4: 'Percaya diri dan tenang dalam menyampaikan sebagian besar argumen.',
          5: 'Percaya diri secara konsisten dari awal hingga akhir sesi.'
        }
      },
      {
        key: 'p3_relevansi_jawaban',
        label: 'Relevansi Jawaban dengan Pertanyaan',
        bobot: 7,
        desc: 'Ketepatan jawaban dalam menjawab inti pertanyaan yang diajukan mentor, tanpa keluar konteks.',
        rubrik: {
          1: 'Jawaban sering tidak nyambung/keluar dari konteks pertanyaan.',
          2: 'Jawaban agak melebar dan butuh diarahkan ulang oleh mentor.',
          3: 'Jawaban relevan namun kadang bertele-tele sebelum ke inti jawaban.',
          4: 'Jawaban fokus pada inti pertanyaan dengan penjelasan yang padat dan relevan.',
          5: 'Jawaban relevan, tepat sasaran, dan efisien dalam penyampaian.'
        }
      },
      {
        key: 'p3_pertanyaan_sulit',
        label: 'Kemampuan Menjawab Pertanyaan Sulit',
        bobot: 6,
        desc: 'Kemampuan menjawab pertanyaan reflektif/menantang, seperti kelemahan diri atau situasi tertekan.',
        rubrik: {
          1: 'Kesulitan besar menjawab, jawaban defensif atau menghindar.',
          2: 'Tertekan saat menghadapi pertanyaan sulit dan respon belum terarah.',
          3: 'Mampu menjawab dengan cukup baik meski butuh waktu berpikir lebih lama.',
          4: 'Mampu menjawab pertanyaan sulit secara logis dan tenang dengan pendekatan positif.',
          5: 'Mampu menjawab dengan tenang, jujur, dan tetap membangun kesan positif.'
        }
      }
    ]
  },
  {
    id: 'p4',
    code: 'P4',
    title: 'Sikap & Partisipasi',
    shortTitle: 'Sikap & Partisipasi',
    icon: 'handshake',
    color: '#E59B86', // GSM Peach
    bgLight: 'bg-[#E59B86]/15',
    borderLight: 'border-[#E59B86]/40',
    badgeText: 'text-[#C86047]',
    bobot: 15,
    indicators: [
      {
        key: 'p4_keaktifan_diskusi',
        label: 'Keaktifan Diskusi/Bertanya',
        bobot: 4,
        desc: 'Tingkat keaktifan peserta bertanya dan berdiskusi selama sesi training maupun mentoring.',
        rubrik: {
          1: 'Pasif, tidak pernah bertanya/berpartisipasi dalam diskusi.',
          2: 'Sangat jarang berpartisipasi dan hanya merespons saat ditunjuk langsung.',
          3: 'Cukup aktif, sesekali bertanya atau menanggapi diskusi.',
          4: 'Aktif bertanya dan memberikan kontribusi pendapat yang konstruktif secara teratur.',
          5: 'Sangat aktif bertanya dan memberikan tanggapan yang relevan.'
        }
      },
      {
        key: 'p4_kedisiplinan',
        label: 'Kedisiplinan & Presensi',
        bobot: 4,
        desc: 'Ketepatan waktu kehadiran dan ketepatan waktu pengumpulan take-home assignment (CV & LinkedIn).',
        rubrik: {
          1: 'Sering terlambat/tidak mengumpulkan tugas tepat waktu.',
          2: 'Pernah terlambat hadir dan pengumpulan tugas melewati batas waktu tanpa izin.',
          3: 'Cukup disiplin, sesekali terlambat namun tetap menyelesaikan tugas.',
          4: 'Disiplin tinggi, hadir tepat waktu dan tugas dikumpulkan tepat sebelum tenggat.',
          5: 'Selalu tepat waktu dalam kehadiran maupun pengumpulan tugas.'
        }
      },
      {
        key: 'p4_kolaborasi_kelompok',
        label: 'Kolaborasi dalam Kelompok Mentoring',
        bobot: 4,
        desc: 'Kemampuan bekerja sama dan berkontribusi positif dalam dinamika kelompok mentoring.',
        rubrik: {
          1: 'Kurang kooperatif, cenderung menyendiri dalam kelompok.',
          2: 'Kurang inisiatif membantu rekan sekelompok, hanya mengerjakan bagian sendiri.',
          3: 'Cukup kooperatif dan mau terlibat dalam kegiatan kelompok.',
          4: 'Bekerja sama dengan baik, komunikatif, dan saling membantu dalam dinamika tim.',
          5: 'Sangat kooperatif, aktif mendukung dan membantu rekan sekelompok.'
        }
      },
      {
        key: 'p4_keterbukaan_feedback',
        label: 'Keterbukaan Menerima Feedback',
        bobot: 3,
        desc: 'Sikap peserta dalam menerima dan merespons masukan/kritik yang diberikan mentor.',
        rubrik: {
          1: 'Menutup diri/defensif terhadap masukan yang diberikan.',
          2: 'Menerima masukan dengan enggan dan lambat melakukan revisi.',
          3: 'Cukup terbuka, menerima masukan meski belum banyak menindaklanjuti.',
          4: 'Terbuka dan antusias menerima masukan serta menunjukkan itikad perbaikan nyata.',
          5: 'Sangat terbuka, menerima masukan dan langsung berusaha menerapkannya.'
        }
      }
    ]
  }
];

export const SCALE_GUIDE = [
  { score: 1, label: 'Kurang', desc: 'Belum menunjukkan pemahaman/kemampuan sama sekali pada indikator ini; perlu pendampingan intensif.', badgeBg: 'bg-[#E59B86]/20', badgeText: 'text-[#C86047]', border: 'border-[#E59B86]/40' },
  { score: 2, label: 'Cukup Kurang', desc: 'Menunjukkan sedikit pemahaman/kemampuan, namun masih banyak kekurangan mendasar.', badgeBg: 'bg-[#E59B86]/10', badgeText: 'text-[#C86047]', border: 'border-[#E59B86]/30' },
  { score: 3, label: 'Cukup', desc: 'Menunjukkan pemahaman/kemampuan dasar yang memadai, namun belum konsisten atau maksimal.', badgeBg: 'bg-[#C896E0]/20', badgeText: 'text-[#8A3AB9]', border: 'border-[#C896E0]/40' },
  { score: 4, label: 'Baik', desc: 'Menunjukkan pemahaman/kemampuan yang baik dan cukup konsisten, dengan sedikit catatan perbaikan.', badgeBg: 'bg-[#00B0D8]/15', badgeText: 'text-[#0082A0]', border: 'border-[#00B0D8]/40' },
  { score: 5, label: 'Sangat Baik', desc: 'Menunjukkan pemahaman/kemampuan yang sangat baik, konsisten, dan siap diterapkan langsung.', badgeBg: 'bg-[#003CEC]/15', badgeText: 'text-[#003CEC]', border: 'border-[#003CEC]/40' }
];

export function calcPillarScore(pillar, scores) {
  if (!pillar || !scores) return 0;
  let total = 0;
  pillar.indicators.forEach(ind => {
    const skor = Number(scores[ind.key] || 0);
    total += (skor / 5) * ind.bobot;
  });
  return Math.round(total * 10) / 10;
}

export function calcFinalScore(scores) {
  if (!scores) return 0;
  let total = 0;
  PILLARS.forEach(pillar => {
    total += calcPillarScore(pillar, scores);
  });
  return Math.round(total * 10) / 10;
}

export function getPredicate(score) {
  if (!score || score === 0) return { grade: '-', text: 'Belum Dinilai', color: 'text-slate-600 bg-slate-100 border-slate-200', desc: 'Mahasiswa belum mendapatkan evaluasi mentoring lengkap.' };
  if (score >= 90) return { grade: 'Sangat Siap Oprec', text: 'Sangat Siap Oprec', color: 'text-[#003CEC] bg-[#003CEC]/10 border-[#003CEC]/30', desc: 'Peserta sangat siap mengikuti Open Recruitment kepanitiaan. Dorong untuk mendaftar dan siap menjadi role model.' };
  if (score >= 75) return { grade: 'Siap Oprec', text: 'Siap Oprec', color: 'text-[#0082A0] bg-[#00B0D8]/15 border-[#00B0D8]/40', desc: 'Peserta sudah siap mengikuti Open Recruitment kepanitiaan dengan beberapa catatan minor untuk terus diasah.' };
  if (score >= 60) return { grade: 'Cukup Siap', text: 'Perlu Latihan Tambahan', color: 'text-[#8A3AB9] bg-[#C896E0]/20 border-[#C896E0]/40', desc: 'Peserta memiliki dasar yang cukup namun disarankan berlatih kembali (review CV/LinkedIn atau simulasi interview tambahan).' };
  return { grade: 'Perlu Pendampingan', text: 'Perlu Pendampingan Lanjutan', color: 'text-[#C86047] bg-[#E59B86]/20 border-[#E59B86]/40', desc: 'Peserta memerlukan pendampingan lanjutan intensif dari mentor sebelum mendaftar kepanitiaan.' };
}

export default function InsertGradesModal({ isOpen, onClose, students = [], onSaveGrade, initialStudentId }) {
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [activePillarTab, setActivePillarTab] = useState(0); // 0: P1, 1: P2, 2: P3, 3: P4, 4: Summary
  const [notes, setNotes] = useState('');
  const [openRubrikIndex, setOpenRubrikIndex] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const [scores, setScores] = useState(() => {
    const init = {};
    PILLARS.forEach(p => p.indicators.forEach(ind => { init[ind.key] = 0; }));
    return init;
  });

  useEffect(() => {
    if (isOpen) {
      const targetId = initialStudentId || students[0]?.id || '';
      setSelectedStudentId(targetId);
      const student = students.find(s => s.id === targetId) || students[0];
      if (student) {
        loadStudentData(student);
      }
    }
  }, [isOpen, initialStudentId, students]);

  const loadStudentData = (student) => {
    const sc = student.scores || {};
    const newScores = {};
    PILLARS.forEach(p => p.indicators.forEach(ind => {
      newScores[ind.key] = Number(sc[ind.key] || 0);
    }));
    setScores(newScores);
    setNotes(student.notes || '');
    setActivePillarTab(0);
    setOpenRubrikIndex({});
  };

  const handleStudentChange = (id) => {
    setSelectedStudentId(id);
    const s = students.find(item => item.id === id);
    if (s) loadStudentData(s);
  };

  if (!isOpen) return null;

  const currentStudent = students.find(s => s.id === selectedStudentId) || students[0] || {};
  const currentPillar = PILLARS[activePillarTab < 4 ? activePillarTab : 0];
  const isSummaryView = activePillarTab === 4;

  const totalIndicators = 17;
  const filledCount = Object.values(scores).filter(v => Number(v) > 0).length;
  const progressPercentage = Math.round((filledCount / totalIndicators) * 100);

  const finalScore = calcFinalScore(scores);
  const predicateInfo = getPredicate(finalScore);

  const setIndicatorScore = (key, val) => {
    setScores(prev => ({ ...prev, [key]: val }));
  };

  const toggleRubrik = (key) => {
    setOpenRubrikIndex(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentStudent || !currentStudent.id) return;
    
    // Security check: ensure student is within authorized list
    const isAuthorized = students.some(s => s.id === currentStudent.id);
    if (!isAuthorized) {
      alert('Akses tidak diizinkan untuk mahasiswa ini.');
      return;
    }

    setIsSaving(true);

    // Sanitize and clamp all scores strictly between 0 and 5
    const sanitizedScores = {};
    PILLARS.forEach(p => {
      p.indicators.forEach(ind => {
        const rawVal = Number(scores[ind.key] || 0);
        sanitizedScores[ind.key] = isNaN(rawVal) ? 0 : Math.max(0, Math.min(5, Math.round(rawVal)));
      });
    });

    const p1Score = calcPillarScore(PILLARS[0], sanitizedScores);
    const p2Score = calcPillarScore(PILLARS[1], sanitizedScores);
    const p3Score = calcPillarScore(PILLARS[2], sanitizedScores);
    const p4Score = calcPillarScore(PILLARS[3], sanitizedScores);
    const safeFinalScore = calcFinalScore(sanitizedScores);
    const safePredInfo = getPredicate(safeFinalScore);

    const updatedStudentData = {
      ...currentStudent,
      scores: sanitizedScores,
      pillarScores: {
        p1_score: p1Score,
        p2_score: p2Score,
        p3_score: p3Score,
        p4_score: p4Score
      },
      finalScore: safeFinalScore,
      predicate: safePredInfo.grade,
      status: safeFinalScore >= 75 ? 'Lulus' : (safeFinalScore >= 60 ? 'Perlu Latihan' : 'Perlu Pendampingan'),
      notes: (notes || '').slice(0, 1000).trim() || `Mahasiswa telah dievaluasi pada 4 pilar mentoring Rawat Maba.`,
      lastUpdated: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
    };

    await onSaveGrade(updatedStudentData);
    setIsSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 font-isi animate-in fade-in duration-200">
      
      {/* Modal Container */}
      <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-gsm-lilac overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* ═══ 1. Spacious GSM Blue Gradient Header Banner with BG4.svg ═══ */}
        <div className="relative z-10 bg-gsm-blue-gradient text-white px-6 sm:px-8 py-6 flex flex-col justify-between overflow-hidden shadow-md flex-shrink-0">
          
          {/* BG4.svg Ambient Layer */}
          <div 
            className="absolute inset-0 bg-[url('/assets/BG4.svg')] bg-cover bg-center opacity-30 mix-blend-overlay pointer-events-none z-0"
          />
          
          {/* Star Accent from Project Assets */}
          <img 
            src="/assets/Bintang.png" 
            alt="Star" 
            className="absolute -right-4 -bottom-4 w-28 h-28 object-contain opacity-25 pointer-events-none animate-pulse z-0" 
          />

          <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md text-white flex items-center justify-center border border-white/20 shadow-md flex-shrink-0">
                <span className="material-symbols-outlined text-3xl text-gsm-cream">edit_document</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-gsm-cream text-slate-950 font-sans-code font-bold text-[10px] uppercase tracking-wider px-3 py-0.5 rounded-full border border-yellow-200 shadow-sm">
                    Form Penilaian Rapot Mentoring
                  </span>
                  <span className="text-xs text-blue-100 font-sans-code font-semibold">T.A. 2026</span>
                </div>
                <h2 className="font-coolvetica font-bold text-2xl text-white mt-1 drop-shadow-sm">
                  Evaluasi Nilai Mahasiswa Baru
                </h2>
                <p className="text-xs text-blue-100/90 font-isi mt-0.5">
                  Input skor 1–5 pada 4 Pilar Mentoring (CV & Portofolio, LinkedIn, Interview, Sikap & Partisipasi)
                </p>
              </div>
            </div>

            {/* Close Button */}
            <button 
              type="button" 
              onClick={onClose}
              className="text-white/80 hover:text-white bg-white/10 hover:bg-white/25 rounded-full p-2.5 transition-all border border-white/20"
              title="Tutup Form"
            >
              <span className="material-symbols-outlined text-xl leading-none">close</span>
            </button>
          </div>

          {/* Student Selector Card inside Header */}
          <div className="relative z-10 mt-5 pt-4 border-t border-white/20 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-[280px]">
              <span className="text-xs font-bold text-gsm-cream font-sans-code uppercase tracking-wider whitespace-nowrap flex items-center gap-1.5">
                <span className="material-symbols-outlined text-gsm-cream text-base">person</span>
                <span>Pilih Maba:</span>
              </span>
              <select
                value={selectedStudentId}
                onChange={(e) => handleStudentChange(e.target.value)}
                className="w-full max-w-lg bg-white/95 text-slate-900 border border-white/40 rounded-xl px-4 py-2.5 text-xs font-bold font-isi outline-none focus:ring-2 focus:ring-gsm-cream shadow-sm"
              >
                {students.map(s => (
                  <option key={s.id} value={s.id} className="text-slate-900">
                    {s.nim} - {s.name} ({s.kelompok}) - [{s.status}]
                  </option>
                ))}
              </select>
            </div>

            {/* Progress & Live Score Pill */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="bg-white/15 border border-white/25 px-4 py-2 rounded-2xl flex items-center gap-3 backdrop-blur-md">
                <div className="w-24 h-2 bg-white/30 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gsm-cream rounded-full transition-all duration-500"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
                <span className="text-[11px] font-sans-code font-bold text-gsm-cream whitespace-nowrap">
                  {filledCount}/{totalIndicators} ({progressPercentage}%)
                </span>
              </div>

              <div className="bg-white text-slate-900 border border-white/60 px-4 py-2 rounded-2xl flex items-center gap-2.5 shadow-md">
                <span className="text-[10px] font-sans-code uppercase text-slate-500 font-bold">Skor:</span>
                <span className="font-coolvetica font-bold text-lg text-gsm-blue-main leading-none">{finalScore}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${predicateInfo.color}`}>
                  {predicateInfo.grade}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* ═══ 2. Pilar Tabs Navigation (GSM Palette) ═══ */}
        <div className="relative z-10 bg-white border-b border-gsm-lilac px-6 pt-3 flex gap-2 overflow-x-auto custom-scrollbar flex-shrink-0">
          {PILLARS.map((p, idx) => {
            const pScore = calcPillarScore(p, scores);
            const pFilled = p.indicators.filter(ind => Number(scores[ind.key] || 0) > 0).length;
            const pIsDone = pFilled === p.indicators.length;
            const isActive = activePillarTab === idx;

            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setActivePillarTab(idx)}
                className={`pb-3 px-4 rounded-t-2xl text-xs font-bold font-isi transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
                  isActive 
                    ? 'border-[#003CEC] text-[#003CEC] bg-blue-50/60 shadow-sm' 
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <span 
                  className="w-5 h-5 rounded-full text-[10px] font-sans-code font-bold flex items-center justify-center text-white"
                  style={{ backgroundColor: pIsDone ? '#003CEC' : p.color }}
                >
                  {pIsDone ? '✓' : idx + 1}
                </span>
                <span>{p.code}. {p.shortTitle}</span>
                <span className="text-[10px] font-sans-code text-slate-400 font-normal">
                  ({pScore}/{p.bobot} pt)
                </span>
              </button>
            );
          })}

          {/* Summary Tab */}
          <button
            type="button"
            onClick={() => setActivePillarTab(4)}
            className={`pb-3 px-4 rounded-t-2xl text-xs font-bold font-isi transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
              isSummaryView 
                ? 'border-[#003CEC] text-[#003CEC] bg-blue-50/60 shadow-sm' 
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <span className="material-symbols-outlined text-base">fact_check</span>
            <span>Ringkasan Rapot</span>
            <span className="bg-gsm-cream text-slate-950 text-[10px] font-sans-code font-bold px-2 py-0.5 rounded-full border border-yellow-200">
              Total {finalScore}
            </span>
          </button>
        </div>

        {/* ═══ 3. Body: Indicators / Summary Content ═══ */}
        <div className="relative z-10 flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/60">
          
          {/* A. VIEW PER PILAR (0, 1, 2, 3) */}
          {!isSummaryView && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Pilar Banner Info Box */}
              <div 
                className="bg-white rounded-3xl p-5 sm:p-6 border border-gsm-lilac shadow-gsm-card flex flex-wrap items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <div 
                    className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-white shadow-md flex-shrink-0"
                    style={{ backgroundColor: currentPillar.color }}
                  >
                    <span className="material-symbols-outlined text-3xl">{currentPillar.icon}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-sans-code font-bold uppercase tracking-wider text-slate-400">
                      Pilar {activePillarTab + 1} dari 4
                    </span>
                    <h3 className="font-coolvetica font-bold text-xl text-slate-900 mt-0.5">
                      {currentPillar.title}
                    </h3>
                    <p className="text-xs text-slate-500 font-isi">
                      Total Bobot Pilar: <strong className="text-slate-800">{currentPillar.bobot} Poin</strong> ({currentPillar.indicators.length} Indikator Penilaian)
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 border border-gsm-lilac px-5 py-3 rounded-2xl text-right">
                  <span className="text-[10px] font-sans-code uppercase text-slate-400 font-bold block">
                    Capaian Pilar
                  </span>
                  <span className="font-coolvetica font-bold text-2xl" style={{ color: currentPillar.color }}>
                    {calcPillarScore(currentPillar, scores)} <span className="text-sm font-sans text-slate-400 font-normal">/ {currentPillar.bobot} pt</span>
                  </span>
                </div>
              </div>

              {/* Indicator Assessment Cards */}
              <div className="space-y-4">
                {currentPillar.indicators.map((ind, indIdx) => {
                  const currentVal = Number(scores[ind.key] || 0);
                  const isRubrikOpen = !!openRubrikIndex[ind.key];

                  return (
                    <div 
                      key={ind.key} 
                      className={`bg-white rounded-3xl p-5 sm:p-6 border transition-all duration-200 ${
                        currentVal > 0 
                          ? 'border-gsm-blue-main shadow-gsm-hover ring-1 ring-[#003CEC]/10' 
                          : 'border-gsm-lilac hover:border-slate-300 shadow-gsm-card'
                      }`}
                    >
                      {/* Indicator Header */}
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex items-start gap-3">
                          <span 
                            className="w-7 h-7 rounded-xl text-white font-sans-code font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm"
                            style={{ backgroundColor: currentPillar.color }}
                          >
                            {indIdx + 1}
                          </span>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-coolvetica font-bold text-slate-900 text-base">
                                {ind.label}
                              </h4>
                              <span className="bg-slate-100 text-slate-700 text-[10px] font-sans-code font-bold px-2.5 py-0.5 rounded-lg border border-slate-200">
                                Bobot: {ind.bobot} Poin
                              </span>
                              {currentVal > 0 && (
                                <span className="bg-blue-50 text-gsm-blue-main text-[10px] font-sans-code font-bold px-2.5 py-0.5 rounded-lg border border-blue-200">
                                  Poin: {((currentVal / 5) * ind.bobot).toFixed(1)} pt
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 font-isi mt-1 leading-relaxed">
                              {ind.desc}
                            </p>
                          </div>
                        </div>

                        {/* Toggle Rubrik 1-5 */}
                        <button
                          type="button"
                          onClick={() => toggleRubrik(ind.key)}
                          className="flex items-center gap-1 text-[11px] font-bold font-sans-code text-gsm-blue-main hover:text-blue-700 bg-blue-50 hover:bg-blue-100/70 px-3.5 py-1.5 rounded-xl border border-blue-200 transition-all flex-shrink-0 shadow-sm"
                        >
                          <span className="material-symbols-outlined text-base">
                            {isRubrikOpen ? 'expand_less' : 'format_list_bulleted'}
                          </span>
                          <span>{isRubrikOpen ? 'Tutup Rubrik' : 'Rubrik 1–5'}</span>
                        </button>
                      </div>

                      {/* ═══ 1 to 5 Score Radio Buttons Box ═══ */}
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <label className="block text-[10px] font-sans-code font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                          Pilih Skor Penilaian (1 - 5):
                        </label>
                        
                        <div className="grid grid-cols-5 gap-2 sm:gap-3">
                          {[1, 2, 3, 4, 5].map((num) => {
                            const isSelected = currentVal === num;
                            const scaleInfo = SCALE_GUIDE.find(g => g.score === num) || {};

                            return (
                              <button
                                key={num}
                                type="button"
                                onClick={() => setIndicatorScore(ind.key, num)}
                                className={`py-3 px-2 rounded-2xl border flex flex-col items-center justify-center transition-all ${
                                  isSelected 
                                    ? 'text-white shadow-md scale-[1.02]' 
                                    : 'bg-white hover:bg-slate-50 border-gsm-lilac text-slate-700 hover:border-slate-300'
                                }`}
                                style={{
                                  backgroundColor: isSelected ? currentPillar.color : undefined,
                                  borderColor: isSelected ? currentPillar.color : undefined
                                }}
                              >
                                <span className="font-coolvetica font-bold text-xl sm:text-2xl leading-none">
                                  {num}
                                </span>
                                <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider mt-1.5 truncate max-w-full font-isi ${
                                  isSelected ? 'text-white/90' : 'text-slate-500'
                                }`}>
                                  {scaleInfo.label || `Skor ${num}`}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* ═══ Rubrik 1-5 Accordion ═══ */}
                      {isRubrikOpen && (
                        <div className="mt-4 pt-3 border-t border-dashed border-gsm-lilac bg-slate-50/80 rounded-2xl p-4 space-y-2 animate-in fade-in duration-150">
                          <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                            <span className="text-[10px] font-sans-code font-bold uppercase text-slate-600 tracking-wider">
                              Panduan Rubrik Penilaian Lengkap (Skor 1 s.d. 5):
                            </span>
                            <span className="text-[10px] text-slate-400 font-sans-code">
                              Rumus: (Skor/5) × {ind.bobot} Poin
                            </span>
                          </div>

                          <div className="grid grid-cols-1 gap-2 pt-1 text-xs font-isi">
                            {[1, 2, 3, 4, 5].map((num) => {
                              const scaleInfo = SCALE_GUIDE.find(g => g.score === num);
                              const isCurrent = currentVal === num;
                              const rubrikText = ind.rubrik?.[num] || scaleInfo.desc;

                              return (
                                <div 
                                  key={num}
                                  onClick={() => setIndicatorScore(ind.key, num)}
                                  className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                                    isCurrent 
                                      ? 'bg-blue-50 border-gsm-blue-main text-slate-900 font-medium ring-1 ring-gsm-blue-main shadow-sm' 
                                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-600'
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5 flex-shrink-0 min-w-[75px]">
                                    <span className={`px-2 py-0.5 rounded-md font-sans-code font-bold text-[10px] ${scaleInfo.badgeBg} ${scaleInfo.badgeText} border ${scaleInfo.border}`}>
                                      Skor {num}
                                    </span>
                                  </div>
                                  <div className="flex-1">
                                    <span className="font-bold text-slate-800 text-[11px] block sm:inline mr-1">
                                      {scaleInfo.label}:
                                    </span>
                                    <span className="text-slate-600 text-[11px] leading-relaxed">
                                      {rubrikText}
                                    </span>
                                  </div>
                                  {isCurrent && (
                                    <span className="material-symbols-outlined text-gsm-blue-main text-base flex-shrink-0">
                                      check_circle
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>

              {/* Bottom Nav Stepper */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  disabled={activePillarTab === 0}
                  onClick={() => setActivePillarTab(prev => Math.max(0, prev - 1))}
                  className="px-4 py-2.5 rounded-2xl border border-slate-300 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <span className="material-symbols-outlined text-base">arrow_back</span>
                  <span>Pilar Sebelumnya</span>
                </button>

                {activePillarTab < 3 ? (
                  <button
                    type="button"
                    onClick={() => setActivePillarTab(prev => prev + 1)}
                    className="px-5 py-2.5 rounded-2xl bg-gsm-blue-main hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-gsm-blue-main/20 transition-all"
                  >
                    <span>Lanjut ke Pilar {activePillarTab + 2}</span>
                    <span className="material-symbols-outlined text-base">arrow_forward</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActivePillarTab(4)}
                    className="px-5 py-2.5 rounded-2xl bg-gsm-blue-main hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-gsm-blue-main/20 transition-all"
                  >
                    <span>Buka Ringkasan Nilai Rapot</span>
                    <span className="material-symbols-outlined text-base">fact_check</span>
                  </button>
                )}
              </div>

            </div>
          )}

          {/* B. VIEW RINGKASAN NILAI RAPOT (TAB 4) */}
          {isSummaryView && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Summary Profile Box */}
              <div className="bg-white rounded-3xl p-6 border border-gsm-lilac shadow-gsm-card flex flex-wrap items-center justify-between gap-6">
                <div>
                  <span className="bg-gsm-cream text-slate-950 font-sans-code font-bold text-[10px] uppercase tracking-wider px-3 py-1 rounded-full border border-yellow-200">
                    Rekapitulasi Rapot Rawat Maba
                  </span>
                  <h3 className="font-coolvetica font-bold text-2xl text-slate-900 mt-2">
                    {currentStudent.name || 'Nama Mahasiswa'}
                  </h3>
                  <p className="text-xs text-slate-500 font-sans-code mt-0.5">
                    NRP: <strong className="text-slate-800">{currentStudent.nim}</strong> | Kelompok: <strong className="text-slate-800">{currentStudent.kelompok}</strong> | Pembina: <strong className="text-slate-800">{currentStudent.mentor}</strong>
                  </p>
                </div>

                {/* Score Big Card (GSM Blue & Cream) */}
                <div className="bg-gsm-blue-gradient text-white p-5 rounded-2xl flex items-center gap-6 shadow-lg shadow-gsm-blue-main/20 relative overflow-hidden">
                  <div className="relative z-10">
                    <span className="text-[10px] font-sans-code uppercase tracking-wider text-blue-100 block font-bold">
                      Nilai Akhir Rapot
                    </span>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="font-coolvetica font-bold text-4xl text-gsm-cream leading-none">
                        {finalScore}
                      </span>
                      <span className="text-xs text-blue-200 font-sans-code">/ 100</span>
                    </div>
                  </div>

                  <div className="relative z-10 border-l border-white/20 pl-5">
                    <span className="text-[10px] font-sans-code uppercase tracking-wider text-blue-100 block font-bold">
                      Predikat
                    </span>
                    <span className="inline-block mt-1 px-3 py-1 rounded-full text-xs font-bold bg-white text-gsm-blue-main shadow-sm">
                      {predicateInfo.grade}
                    </span>
                  </div>
                </div>
              </div>

              {/* 4 Pillars Breakdown Table (GSM Style) */}
              <div className="bg-white rounded-3xl border border-gsm-lilac shadow-gsm-card overflow-hidden">
                <div className="px-6 py-4 border-b border-gsm-lilac bg-slate-50/70 flex items-center justify-between">
                  <h4 className="font-coolvetica font-bold text-sm text-slate-800 uppercase tracking-wider">
                    Rincian Capaian 4 Pilar Penilaian
                  </h4>
                  <span className="text-xs text-slate-500 font-sans-code">
                    17 Indikator Evaluasi
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-isi border-collapse">
                    <thead>
                      <tr className="bg-slate-100/70 border-b border-slate-200 text-[11px] font-sans-code font-bold uppercase text-slate-600">
                        <th className="py-3.5 px-5">Pilar</th>
                        <th className="py-3.5 px-4">Aspek Penilaian</th>
                        <th className="py-3.5 px-4 text-center">Bobot Maks</th>
                        <th className="py-3.5 px-4 text-center">Nilai Dicapai</th>
                        <th className="py-3.5 px-4">Persentase</th>
                        <th className="py-3.5 px-4 text-center">Status</th>
                        <th className="py-3.5 px-5 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {PILLARS.map((p, pIdx) => {
                        const pScore = calcPillarScore(p, scores);
                        const pct = p.bobot > 0 ? Math.round((pScore / p.bobot) * 100) : 0;
                        const pFilled = p.indicators.filter(ind => Number(scores[ind.key] || 0) > 0).length;

                        return (
                          <tr key={p.id} className="hover:bg-slate-50/80 transition-all">
                            <td className="py-4 px-5 font-sans-code font-bold text-slate-900 whitespace-nowrap">
                              <div className="flex items-center gap-2.5">
                                <span 
                                  className="w-7 h-7 rounded-xl text-white flex items-center justify-center font-bold text-xs shadow-sm"
                                  style={{ backgroundColor: p.color }}
                                >
                                  {p.code}
                                </span>
                                <span>{p.shortTitle}</span>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-slate-600 max-w-xs">
                              <span className="line-clamp-1">{p.title} ({p.indicators.length} indikator)</span>
                            </td>
                            <td className="py-4 px-4 text-center font-sans-code font-bold text-slate-700">
                              {p.bobot} Poin
                            </td>
                            <td className="py-4 px-4 text-center font-sans-code font-bold text-gsm-blue-main text-sm">
                              {pScore} Poin
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-24 h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                  <div 
                                    className="h-full rounded-full transition-all duration-500" 
                                    style={{ width: `${pct}%`, backgroundColor: p.color }}
                                  />
                                </div>
                                <span className="font-sans-code text-[11px] text-slate-700 font-bold">{pct}%</span>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <span className={`text-[10px] font-sans-code font-bold px-2.5 py-1 rounded-full ${
                                pFilled === p.indicators.length ? 'bg-blue-50 text-gsm-blue-main border border-blue-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}>
                                {pFilled === p.indicators.length ? 'Lengkap' : `${pFilled}/${p.indicators.length}`}
                              </span>
                            </td>
                            <td className="py-4 px-5 text-right">
                              <button
                                type="button"
                                onClick={() => setActivePillarTab(pIdx)}
                                className="text-xs font-bold text-gsm-blue-main hover:underline font-sans-code"
                              >
                                Edit
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Notes & Feedback Textarea */}
              <div className="bg-white rounded-3xl p-6 border border-gsm-lilac shadow-gsm-card space-y-2.5">
                <label className="block text-xs font-bold text-slate-800 font-sans-code uppercase tracking-wider flex items-center gap-2">
                  <span className="material-symbols-outlined text-gsm-blue-main text-base">rate_review</span>
                  <span>Catatan Evaluasi & Rekomendasi Mentor:</span>
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Berikan umpan balik konstruktif mengenai kekuatan, poin perbaikan CV/LinkedIn/Interview, serta kesiapan mahasiswa dalam mengikuti Open Recruitment..."
                  className="w-full bg-slate-50 border border-gsm-lilac rounded-2xl p-4 text-xs font-isi text-slate-800 outline-none focus:border-gsm-blue-main focus:bg-white focus:ring-2 focus:ring-gsm-blue-main/10 transition-all leading-relaxed"
                />
              </div>

              {/* Incomplete Warning */}
              {filledCount < totalIndicators && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center gap-3 text-xs text-amber-900 font-isi">
                  <span className="material-symbols-outlined text-amber-600 text-xl flex-shrink-0">warning</span>
                  <span>
                    Masih ada <strong>{totalIndicators - filledCount} indikator</strong> yang belum dinilai. Anda tetap dapat menyimpan draf atau melengkapi indikator terlebih dahulu.
                  </span>
                </div>
              )}

            </div>
          )}

        </div>

        {/* ═══ 4. Modal Footer ═══ */}
        <div className="relative z-10 bg-white border-t border-gsm-lilac px-6 py-4 flex flex-wrap items-center justify-between gap-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl border border-slate-300 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 transition-all"
            >
              Batal
            </button>
            {!isSummaryView && (
              <button
                type="button"
                onClick={() => setActivePillarTab(4)}
                className="px-5 py-2.5 rounded-2xl border border-gsm-lilac text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 flex items-center gap-1.5 transition-all shadow-sm"
              >
                <span className="material-symbols-outlined text-base text-gsm-blue-main">fact_check</span>
                <span>Lihat Ringkasan Rapot</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {isSummaryView && (
              <button
                type="button"
                onClick={() => setActivePillarTab(0)}
                className="px-5 py-2.5 rounded-2xl border border-slate-300 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 flex items-center gap-1.5 transition-all"
              >
                <span className="material-symbols-outlined text-base">edit</span>
                <span>Kembali Edit Skor</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSaving}
              className="px-7 py-2.5 rounded-2xl bg-gsm-blue-main hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-gsm-blue-main/25 hover:shadow-gsm-blue-main/35 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-base">
                {isSaving ? 'hourglass_empty' : 'save'}
              </span>
              <span>{isSaving ? 'Menyimpan Nilai...' : 'Simpan Nilai Rapot'}</span>
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
