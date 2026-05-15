import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { deriveAdminToken } from '@/lib/admin-auth'

// POST /api/admin/login - Verify admin password
// Uses crypto.timingSafeEqual to prevent timing side-channel attacks.
// Returns an HMAC-derived token instead of the raw password —
// the raw password never leaves the server.
export async function POST(req: NextRequest) {
  try {
    const adminPassword = process.env.ADMIN_PASSWORD
    if (!adminPassword) {
      return NextResponse.json(
        { error: 'ADMIN_PASSWORD env var is not set. Configure it in Vercel → Settings → Environment Variables.' },
        { status: 500 }
      )
    }

    const body = await req.json()
    const { password } = body

    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Password salah' }, { status: 401 })
    }

    // Timing-safe comparison to prevent leaking password via response time
    const passwordBuf = Buffer.from(String(password))
    const expectedBuf = Buffer.from(String(adminPassword))
    const isMatch = passwordBuf.length === expectedBuf.length
      && crypto.timingSafeEqual(passwordBuf, expectedBuf)

    if (isMatch) {
      // Derive a token from the password — raw password is never exposed to the client
      const token = deriveAdminToken(adminPassword)
      return NextResponse.json({ success: true, token })
    }

    return NextResponse.json({ error: 'Password salah' }, { status: 401 })
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}
