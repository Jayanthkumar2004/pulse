/*
# Phase 1: Add email column to profiles

The profiles table was created without an `email` column. The spec requires it.
This migration adds the column and backfills it from auth.users, then updates
the handle_new_user trigger to populate it on signup.
*/

-- Add email column (nullable for backward compat, but we backfill immediately)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email text;

-- Backfill from auth.users
UPDATE profiles p
SET email = au.email
FROM auth.users au
WHERE p.id = au.id AND p.email IS NULL;

-- Add an index for email lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles (email);

-- Update the trigger function to capture email on new signups
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, username, full_name, email)
  VALUES (
    NEW.id,
    coalesce(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    coalesce(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        username = EXCLUDED.username;
  RETURN NEW;
END;
$$;
