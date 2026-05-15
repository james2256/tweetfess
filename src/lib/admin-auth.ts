import crypto from 'crypto'
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
 *
 * Uses crypto.timingSafeEqual to prevent timing side-channel attacks
 * that could leak the password byte-by-byte through response time differences.
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

  // Extract token from "Bearer <token>" header
  const expectedHeader = `Bearer ${password}`
  if (!authHeader) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  // Timing-safe comparison to prevent leaking password via response time
  const headerBuf = Buffer.from(authHeader)
  const expectedBuf = Buffer.from(expectedHeader)
  const isMatch = headerBuf.length === expectedBuf.length
    && crypto.timingSafeEqual(headerBuf, expectedBuf)

  if (!isMatch) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }
  return { authorized: true }
}
