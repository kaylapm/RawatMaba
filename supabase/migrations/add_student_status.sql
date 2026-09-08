-- Migration to add student_status column to students table
-- Run this in Supabase SQL Editor if not already executed

ALTER TABLE students 
ADD COLUMN IF NOT EXISTS student_status VARCHAR(50) DEFAULT 'Active';

-- Update existing students to 'Active' if null
UPDATE students 
SET student_status = 'Active' 
WHERE student_status IS NULL;

-- Comment for documentation
COMMENT ON COLUMN students.student_status IS 'Status of student: Active, Hilang, Pindah, or Tidak Mengumpulkan';
