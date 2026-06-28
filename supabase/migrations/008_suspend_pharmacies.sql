-- Add is_suspended column to shops table to track admin suspensions
ALTER TABLE shops ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE;
