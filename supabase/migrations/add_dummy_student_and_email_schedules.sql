-- ==============================================================================
-- Migration: Add Email Schedules Table & Super Admin Dummy Student
-- Run this in Supabase SQL Editor
-- ==============================================================================

-- 1. Create email_schedules table to store global & per-mentor email dispatch windows
CREATE TABLE IF NOT EXISTS public.email_schedules (
  id VARCHAR(100) PRIMARY KEY DEFAULT 'global_config',
  is_global_enabled BOOLEAN DEFAULT true,
  global_start_time TIMESTAMPTZ,
  global_end_time TIMESTAMPTZ,
  mentor_overrides JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by VARCHAR(150) DEFAULT 'super_admin'
);

-- Enable RLS
ALTER TABLE public.email_schedules ENABLE ROW LEVEL SECURITY;

-- Allow public read access so mentors can check schedule status
DROP POLICY IF EXISTS "Allow public read email_schedules" ON public.email_schedules;
CREATE POLICY "Allow public read email_schedules" 
  ON public.email_schedules FOR SELECT 
  TO anon, authenticated 
  USING (true);

-- Allow public insert/update/upsert
DROP POLICY IF EXISTS "Allow public upsert email_schedules" ON public.email_schedules;
CREATE POLICY "Allow public upsert email_schedules" 
  ON public.email_schedules FOR ALL 
  TO anon, authenticated 
  USING (true)
  WITH CHECK (true);

-- Insert initial default email schedule config if empty
INSERT INTO public.email_schedules (id, is_global_enabled, global_start_time, global_end_time, mentor_overrides)
VALUES (
  'global_config',
  true,
  NOW() - INTERVAL '1 day',
  NOW() + INTERVAL '30 days',
  '{}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- 2. Insert Super Admin Dummy Student (Exclusively for Super Admin Testing)
-- ==============================================================================

-- Mentor: Super Admin
INSERT INTO public.mentors (id, name)
VALUES (
  '10000000-0000-0000-0000-000000000099',
  'Super Admin'
)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Mentoring Group: Kelompok Khusus Admin
INSERT INTO public.mentoring_groups (id, name, mentor_id, year, room)
VALUES (
  '20000000-0000-0000-0000-000000000099',
  'Kelompok Khusus Admin',
  '10000000-0000-0000-0000-000000000099',
  2026,
  'Ruang Testing Super Admin'
)
ON CONFLICT (id) DO UPDATE 
  SET name = EXCLUDED.name, mentor_id = EXCLUDED.mentor_id;

-- Student: Dummy Mahasiswa (Admin Only)
INSERT INTO public.students (id, nrp, name, email, prodi, year, group_id, student_status)
VALUES (
  '30000000-0000-0000-0000-000000000999',
  '5026249999',
  'Dummy Mahasiswa (Admin Only)',
  'dummy.rawatmaba@gmail.com',
  'Sistem Informasi',
  2026,
  '20000000-0000-0000-0000-000000000099',
  'Active'
)
ON CONFLICT (id) DO UPDATE 
  SET name = EXCLUDED.name, 
      nrp = EXCLUDED.nrp,
      email = EXCLUDED.email,
      group_id = EXCLUDED.group_id;

-- Ensure public/anon can update student email & status
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public update students" ON public.students;
CREATE POLICY "Allow public update students" 
  ON public.students FOR UPDATE 
  TO anon, authenticated 
  USING (true)
  WITH CHECK (true);

-- Initial Evaluation with full scores ready for PDF & Email test
INSERT INTO public.rapot_evaluations (
  student_id,
  p1_struktur_cv, p1_kelengkapan_info, p1_relevansi_divisi, p1_kualitas_penulisan, p1_kesesuaian_jenis_cv,
  p2_kelengkapan_profil, p2_personal_branding, p2_konsistensi_cv,
  p3_struktur_jawaban_star, p3_komunikasi_bahasa_tubuh, p3_kepercayaan_diri, p3_relevansi_jawaban, p3_pertanyaan_sulit,
  p4_keaktifan_diskusi, p4_kedisiplinan, p4_kolaborasi_kelompok, p4_keterbukaan_feedback,
  p1_score, p2_score, p3_score, p4_score,
  final_score,
  predicate,
  status,
  notes,
  feedback_apresiasi,
  feedback_saran,
  feedback_oprec
)
VALUES (
  '30000000-0000-0000-0000-000000000999',
  4, 5, 4, 4, 5,
  4, 5, 4,
  5, 4, 5, 4, 5,
  5, 5, 4, 5,
  26.4, 17.4, 32.4, 14.4,
  90.4,
  'A',
  'Sudah Dinilai',
  'Peserta dummy untuk pengujian rapot, fitur email, dan unduh PDF oleh Super Admin.',
  'Menunjukkan pemahaman materi yang sangat baik dan aktif dalam seluruh sesi simulasi.',
  'Pertahankan konsistensi penulisan CV dan perluas portofolio proyek terapan.',
  'Sangat direkomendasikan untuk mendaftar di Divisi Manajemen Acara & Public Relations.'
)
ON CONFLICT (student_id) DO UPDATE 
  SET final_score = EXCLUDED.final_score,
      predicate = EXCLUDED.predicate,
      status = EXCLUDED.status,
      notes = EXCLUDED.notes,
      feedback_apresiasi = EXCLUDED.feedback_apresiasi,
      feedback_saran = EXCLUDED.feedback_saran,
      feedback_oprec = EXCLUDED.feedback_oprec;
