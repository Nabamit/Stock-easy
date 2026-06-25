-- Stock Easy Seed Data
-- Default test accounts for development
-- Run AFTER 001_initial_schema.sql
-- Passwords are hashed with bcrypt (cost 12):
--   admin123  -> $2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.G2oQKqKqKqKqKq (placeholder - use seed script)

-- NOTE: Use `npm run db:seed` which hashes passwords correctly via Node.js bcrypt.
-- This SQL file documents the seed structure; the Node seed script is authoritative.

-- Expected accounts after seeding:
-- Admin:     admin@stockeasy.in / admin123 (central_admin)
-- Owner 1:   owner1@test.com / owner123 (shop_owner, Test Pharmacy - approved)
-- Owner 2:   owner2@test.com / owner123 (shop_owner, Pending Pharmacy - pending)
