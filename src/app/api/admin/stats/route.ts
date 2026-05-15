import { db } from '@/lib/db'
import { getCookieAuthStatus } from '@/lib/twitter-post-cookie'
import { getCachedApiCredits, getApiLoginStatus } from '@/lib/twitter-api-fallback'
import { verifyAdmin } from '@/lib/admin-auth'
import { getFilterSettings } from '@/app/api/admin/filter-settings/route'
import { getCircuitBreakerStatus } from '@/lib/circuit-breaker'
import { NextRequest, NextResponse } from 'next/server'

// Vercel serverless function timeout — multiple DB queries + external API calls
export const maxDuration = 30

// GET /api/admin/stats - Get dashboard stats + post method ratio + API credits + login status
export async function GET(req: NextRequest) {
  const auth = verifyAdmin(req.headers.get('authorization'))
  if (!auth.authorized) return auth.response

  try {
  // 1. Single GROUP BY for all submission counts (was 6 separate count() queries)
  const statusCounts = await db.$queryRaw<
    { status: string; count: bigint }[]
  >`
    SELECT status, COUNT(*) as count
    FROM "Submission"
    GROUP BY status
  `
  const counts: Record<string, number> = {}
  let total = 0
  for (const row of statusCounts) {
    const c = Number(row.count)
    counts[row.status] = c
    total += c
  }

  // 2. Submitter count + post method stats (also a GROUP BY) in parallel with the rest
  const [submitters, postMethodStats, cookieAuthStatus, apiCredits, apiLoginStatus, postMethodSetting, filterSettingsData] =
    await Promise.all([
      db.submitter.count(),
      getPostMethodStats(),
      getCookieAuthStatus(),
      getCachedApiCredits(),   // Cached — no external API calls on every request
      getApiLoginStatus(),
      getPostMethodSetting(),
      getFilterSettings(),
    ])

  // Get circuit breaker status separately (needs filterSettings.rateLimits)
  const circuitBreaker = await getCircuitBreakerStatus(filterSettingsData.rateLimits)

  return NextResponse.json({
    pending: (counts['pending'] || 0) + (counts['posting'] || 0),
    postFailed: counts['post_failed'] || 0,
    rejected: counts['rejected'] || 0,
    posted: counts['posted'] || 0,
    total,
    submitters,
    cookieAuthStatus,
    postMethodStats,
    apiCredits,
    apiLoginStatus,
    postMethodSetting,
    filterSettings: filterSettingsData,
    circuitBreaker,
  })
  } catch (error) {
    console.error('Stats GET error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
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
  // Single GROUP BY instead of loading all posted rows into JS
  const rows = await db.$queryRaw<
    { postMethod: string | null; count: bigint }[]
  >`
    SELECT "postMethod", COUNT(*) as count
    FROM "Submission"
    WHERE status = 'posted'
    GROUP BY "postMethod"
  `

  let direct = 0
  let retry = 0
  let fallback = 0
  let unknown = 0

  for (const row of rows) {
    const count = Number(row.count)
    if (row.postMethod === 'direct') direct = count
    else if (row.postMethod === 'retry') retry = count
    else if (row.postMethod === 'fallback') fallback = count
    else unknown += count // Legacy posts (no postMethod) count as direct
  }

  const total = direct + retry + fallback + unknown

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

/**
 * Get the current post_method setting from DB.
 * Returns 'direct', 'api', or 'auto' (default).
 */
async function getPostMethodSetting(): Promise<string> {
  const setting = await db.setting.findUnique({ where: { key: 'post_method' } })
  const value = setting?.value
  if (value === 'direct' || value === 'api' || value === 'auto') return value
  return 'auto'
}
