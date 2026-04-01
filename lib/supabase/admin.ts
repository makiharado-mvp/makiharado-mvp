import { createClient } from '@supabase/supabase-js'

// Admin client uses the service role key — server-side only, never expose to browser.
// Used only in API routes that need to read across all users (e.g. sending reminders).
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
