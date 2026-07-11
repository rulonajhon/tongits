import { createClient } from 'npm:@supabase/supabase-js@2'
import type { Database } from '../../../src/types/database.ts'

/**
 * Service-role client — bypasses RLS entirely. Never expose this key to the
 * browser; it only ever runs inside Edge Functions.
 */
export function createAdminClient() {
  const url = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  return createClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/**
 * Anon-key client bound to the caller's JWT — used only to resolve "who is
 * making this request" via auth.getUser(), never to read/write game data.
 */
export function createCallerClient(authHeader: string) {
  const url = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  return createClient<Database>(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: authHeader } },
  })
}
