-- Add doctor_name column to bills table
ALTER TABLE bills ADD COLUMN IF NOT EXISTS doctor_name TEXT DEFAULT 'Dr. S.K. Roy';
