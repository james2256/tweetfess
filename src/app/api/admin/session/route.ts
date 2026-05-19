import { verifyAdmin, getAdminTokenFromRequest } from '@/lib/admin-auth'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/admin/session — Lightweight session check (no DB queries)
// Returns 200 if the HttpOnly admin cookie is valid, 401 otherwise.
// Use this instead of /api/admin/stats for session validation.
export async function GET(req: NextRequest) {
  const auth = verifyAdmin(getAdminTokenFromRequest(req))
  if (!auth.authorized) return auth.response
  return NextResponse.json({ authenticated: true })
}
