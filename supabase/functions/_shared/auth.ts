import { createCallerClient } from './supabaseAdmin.ts'

export interface CallerResult {
  userId: string
  authHeader: string
}

export class UnauthorizedError extends Error {}

/** Verifies the request's JWT and returns the authenticated caller's user id. */
export async function requireCaller(req: Request): Promise<CallerResult> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    throw new UnauthorizedError('Missing Authorization header')
  }
  const client = createCallerClient(authHeader)
  const { data, error } = await client.auth.getUser()
  if (error || !data.user) {
    throw new UnauthorizedError('Invalid or expired session')
  }
  return { userId: data.user.id, authHeader }
}
