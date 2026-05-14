import { verifyAdmin } from '@/lib/admin-auth'
import { resetCircuitBreaker } from '@/lib/circuit-breaker'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/admin/circuit-breaker/reset — Manually reset the circuit breaker
export async function POST(req: NextRequest) {
  const auth = verifyAdmin(req.headers.get('authorization'))
  if (!auth.authorized) return auth.response

  await resetCircuitBreaker()

  return NextResponse.json({ success: true, message: 'Circuit breaker reset' })
}
