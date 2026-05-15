import crypto from 'crypto'
import { NextResponse } from 'next/server'

/**
 * Admin authentication helper.
 *
 * SECURITY: ADMIN_PASSWORD env var is REQUIRED in production.
 * There is no fallback — if unset, admin routes return 500 with
 * a clear error message instead of silently accepting 'admin123'.
 *
 * The admin password is NEVER exposed to the client. Instead, on
 * login, we derive an HMAC token from the password and return that.
 * Subsequent requests authenticate with this derived token, which
 * cannot be reversed back to the raw password.
 */

// Domain label for HMAC derivation — decoupled from NEXTAUTH_SECRET
// so admin token rotation is independent of user session signing.
const ADMIN_TOKEN_LABEL = 'tweetfess:admin:v1'

/**
 * Derive a token from the admin password using HMAC-SHA256.
 * This token is safe to send to the client — it cannot be reversed
 * back to the raw password. Rotating ADMIN_PASSWORD invalidates all
 * existing tokens (same behavior as before).
 */
export function deriveAdminToken(password: string): string {
  return crypto
    .createHmac('sha256', password)
    .update(ADMIN_TOKEN_LABEL)
    .digest('hex')
}

/**
 * Verify an Authorization header against the admin password.
 * Returns { authorized: true } if valid, or a NextResponse error if not.
 *
 * Compares the submitted Bearer token against the HMAC-derived token
 * using crypto.timingSafeEqual to prevent timing side-channel attacks.
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

  if (!authHeader) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  // Extract token from "Bearer <token>" header
  const submitted = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : authHeader

  // Derive the expected token from the password (same as login route)
  const expectedToken = deriveAdminToken(password)

  // Timing-safe comparison to prevent leaking token via response time
  const submittedBuf = Buffer.from(submitted)
  const expectedBuf = Buffer.from(expectedToken)
  const isMatch = submittedBuf.length === expectedBuf.length
    && crypto.timingSafeEqual(submittedBuf, expectedBuf)

  if (!isMatch) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }
  return { authorized: true }
}
