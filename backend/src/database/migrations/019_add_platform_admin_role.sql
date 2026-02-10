-- Add platform_admin role to user_role enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'platform_admin'
  ) THEN
    ALTER TYPE user_role ADD VALUE 'platform_admin';
  END IF;
END $$;
