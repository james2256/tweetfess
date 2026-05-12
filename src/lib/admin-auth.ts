import { NextResponse } from 'next/server'

/**
 * Admin authentication helper.
 *
 * SECURITY: ADMIN_PASSWORD env var is REQUIRED in production.
 * There is no fallback — if unset, admin routes return 500 with
 * a clear error message instead of silently accepting 'admin123'.
 */

/**
 * Verify an Authorization header against the admin password.
 * Returns { authorized: true } if valid, or a NextResponse error if not.
 */
export function verifyAdmin(authHeader: string | null):
  | { authorized: true }
  | { authorized: false; response: NextResponse } {
  const password = process.env.ADMIN_PASSWORD
  if (!password) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'ADMIN_PASSWORD env var is not set. Configure it in Vercel → Settings → Environment Variables.' },
        { status: 500 }
      ),
    }
  }
  if (authHeader !== `Bearer ${password}`) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }
  return { authorized: true }
}
