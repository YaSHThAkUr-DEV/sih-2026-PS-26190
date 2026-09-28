import { query } from '@/lib/db';

let _userPhotoSchemaChecked = false;

/**
 * Ensures the `avatar_url`, `face_biometrics_enrolled`, and `face_descriptor`
 * columns exist on the `users` table for profile photos and AI face recognition.
 * Runs idempotently once per application runtime.
 */
export async function ensureUserPhotoSchema(): Promise<void> {
  if (_userPhotoSchemaChecked) return;
  try {
    await query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS avatar_url TEXT,
      ADD COLUMN IF NOT EXISTS face_biometrics_enrolled BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS face_descriptor JSONB;
    `);
    _userPhotoSchemaChecked = true;
  } catch (err) {
    console.error('[users-schema] Warning: Failed to ensure users photo & biometrics columns:', err);
  }
}
