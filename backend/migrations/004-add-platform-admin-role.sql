-- Migration: Add platform_admin role
-- Date: 2026-02-10
-- Description: Add platform administrator role to user_role enum for platform-wide management

-- Step 1: Add platform_admin to user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'platform_admin';

-- Step 2: Verify the enum values
-- Run: SELECT unnest(enum_range(NULL::user_role));
-- Expected: user, admin, platform_admin

-- Note: This allows central platform administration separate from organization admins
-- platform_admin: Full system access, creates/manages all organizations
-- admin (org_admin): Manages only their organization
-- user: Regular user within an organization
