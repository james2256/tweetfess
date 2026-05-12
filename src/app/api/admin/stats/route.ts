import { db } from '@/lib/db'
import { getCookieAuthStatus } from '@/lib/twitter-post-cookie'
import { getAllKeyCredits } from '@/lib/twitter-api-fallback'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/admin/stats - Get dashboard stats + post method ratio + API credits
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'

  if (authHeader !== `Bearer ${adminPassword}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [pending, approved, rejected, posted, total, submitters, cookieAuthStatus, postMethodStats, apiCredits] =
    await Promise.all([
      db.submission.count({ where: { status: 'pending' } }),
      db.submission.count({ where: { status: 'approved' } }),
      db.submission.count({ where: { status: 'rejected' } }),
      db.submission.count({ where: { status: 'posted' } }),
      db.submission.count(),
      db.submitter.count(),
      getCookieAuthStatus(),
      getPostMethodStats(),
      getAllKeyCredits(),
    ])

  return NextResponse.json({
    pending,
    approved,
    rejected,
    posted,
    total,
    submitters,
    cookieAuthStatus,
    postMethodStats,
    apiCredits,
  })
}

/**
 * Calculate post method statistics from posted submissions.
 * Returns counts and success rates for direct/retry/fallback methods.
 */
async function getPostMethodStats(): Promise<{
  total: number
  direct: number
  retry: number
  fallback: number
  directRate: number
  retryRate: number
  fallbackRate: number
}> {
  // Get all posted submissions with their postMethod
  const postedSubmissions = await db.submission.findMany({
    where: { status: 'posted' },
    select: { postMethod: true },
  })

  const total = postedSubmissions.length
  const direct = postedSubmissions.filter((s) => s.postMethod === 'direct').length
  const retry = postedSubmissions.filter((s) => s.postMethod === 'retry').length
  const fallback = postedSubmissions.filter((s) => s.postMethod === 'fallback').length
  const unknown = total - direct - retry - fallback // Posts before postMethod was added

  return {
    total,
    direct: direct + unknown, // Legacy posts (no postMethod) count as direct
    retry,
    fallback,
    directRate: total > 0 ? Math.round(((direct + unknown) / total) * 1000) / 10 : 0,
    retryRate: total > 0 ? Math.round((retry / total) * 1000) / 10 : 0,
    fallbackRate: total > 0 ? Math.round((fallback / total) * 1000) / 10 : 0,
  }
}
