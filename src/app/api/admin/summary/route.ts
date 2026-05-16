import { db } from '@/lib/db'
import { getCookieAuthStatus } from '@/lib/twitter-post-cookie'
import { getApiCreditsNonBlocking, getApiLoginStatus } from '@/lib/twitter-api-fallback'
import { verifyAdmin } from '@/lib/admin-auth'
import { getFilterSettings } from '@/app/api/admin/filter-settings/route'
import { getCircuitBreakerStatus } from '@/lib/circuit-breaker'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/admin/summary — Lightweight settings summary for the Settings page.
 *
 * Unlike /api/admin/stats (which runs 16+ DB queries + external API calls for
 * submission counts, post method stats, submitter counts, etc.), this endpoint
 * only returns what the Settings page actually needs:
 *   - filterSettings + circuitBreaker (for filter/limits tab)
 *   - cookieAuthStatus (for direct posting card)
 *   - apiLoginStatus + apiCredits (for API fallback card)
 *   - postMethodSetting (for posting method toggle)
 *
 * No submission counts, no post method stats, no submitter count.
 */
export async function GET(req: NextRequest) {
  const auth = verifyAdmin(req.headers.get('authorization'))
  if (!auth.authorized) return auth.response

  try {
    const [cookieAuthStatus, apiLoginStatus, filterSettingsData] =
      await Promise.all([
        getCookieAuthStatus(),
        getApiLoginStatus(),
        getFilterSettings(),
      ])

    // API credits — non-blocking: returns cached data or null, kicks off background fetch
    const apiCredits = getApiCreditsNonBlocking()

    // Circuit breaker needs filterSettings.rateLimits
    const circuitBreaker = await getCircuitBreakerStatus(filterSettingsData.rateLimits)

    // Post method setting
    const setting = await db.setting.findUnique({ where: { key: 'post_method' } })
    const postMethodSetting = setting?.value === 'direct' || setting?.value === 'api' || setting?.value === 'auto'
      ? setting.value
      : 'auto'

    return NextResponse.json({
      cookieAuthStatus,
      apiCredits,
      apiLoginStatus,
      postMethodSetting,
      filterSettings: filterSettingsData,
      circuitBreaker,
    })
  } catch (error) {
    console.error('Summary GET error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
