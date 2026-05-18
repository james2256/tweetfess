import { db } from '@/lib/db'
import { executePostAndRecord, withErrorBoundary } from '@/lib/execute-post'
import { verifyAdmin, getAdminTokenFromRequest } from '@/lib/admin-auth'
import { debug } from '@/lib/debug'
import { decodeHtmlEntities } from '@/lib/content-filter'
import { getFilterSettings } from '@/lib/filter-settings'
import { checkStalePosting } from '@/lib/stale-posting'
import { NextRequest, NextResponse } from 'next/server'

// Vercel serverless function timeout — retry loop can take up to 15s
export const maxDuration = 30

// POST /api/submissions/[id]/post - Post submission to X (manual retry)
// Uses the full retry + fallback flow from postTweetViaCookie
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = verifyAdmin(getAdminTokenFromRequest(req))
  if (!auth.authorized) return auth.response

  return withErrorBoundary(async () => {
    const { id } = await params

    let submission = await db.submission.findUnique({ where: { id } })
    if (!submission) {
      return NextResponse.json({ error: 'Submission tidak ditemukan' }, { status: 404 })
    }

    if (submission.status === 'posted') {
      return NextResponse.json({ error: 'Submission sudah diposting' }, { status: 400 })
    }

    if (submission.status === 'posting') {
      const stale = await checkStalePosting(submission)
      if (!stale.isStale) {
        return NextResponse.json(
          { error: 'Submission sedang diproses (posting ke X). Coba lagi dalam beberapa menit.' },
          { status: 409 }
        )
      }
      // Stale posting auto-recovered — re-fetch with updated status and fall through.
      const refreshed = await db.submission.findUnique({ where: { id } })
      if (!refreshed) {
        return NextResponse.json({ error: 'Submission tidak ditemukan' }, { status: 404 })
      }
      submission = refreshed
    }

    if (submission.status === 'rejected') {
      return NextResponse.json({ error: 'Submission sudah ditolak' }, { status: 400 })
    }

    // Only pending, censored, and post_failed statuses can be retried
    if (submission.status !== 'pending' && submission.status !== 'post_failed' && submission.status !== 'censored') {
      return NextResponse.json({ error: `Status tidak valid untuk retry: ${submission.status}` }, { status: 400 })
    }

    // Load filter settings before executePostAndRecord (which acquires the posting lock internally)
    const filterSettings = await getFilterSettings()

    // Delegated: lock → CAS → post → record → release
    const postResult = await executePostAndRecord({
      submissionId: id,
      message: decodeHtmlEntities(submission.message),
      rateLimits: filterSettings.rateLimits,
      casStatuses: ['pending', 'post_failed', 'censored'],
    })

    // Map result to HTTP response (caller decides status + shape)
    if (postResult.lockBusy) {
      debug('[post route] Posting lock busy')
      return NextResponse.json(
        { error: 'Sedang ada posting lain yang berjalan. Coba lagi dalam beberapa detik.' },
        { status: 409 }
      )
    }
    if (postResult.underLockAbortReason === 'global_post_daily_cap_reached') {
      debug('[post route] Global post daily cap reached:', postResult.error)
      return NextResponse.json(
        { error: `Batas post harian global tercapai (${postResult.error}). Naikkan batas di Rate Limit settings.` },
        { status: 400 }
      )
    }
    if (postResult.casAborted) {
      debug('[post route] Submission status changed before posting, aborting')
      return NextResponse.json(
        { error: 'Submission sedang diproses oleh proses lain.' },
        { status: 409 }
      )
    }
    if (postResult.success) {
      debug('[post route] Post succeeded! tweetId:', postResult.tweetId, 'method:', postResult.method, 'retries:', postResult.retriesUsed)
      if (postResult.warning) {
        return NextResponse.json({
          autoPosted: true,
          tweetId: postResult.tweetId,
          postMethod: postResult.method,
          warning: postResult.warning,
        })
      }
      const updated = await db.submission.findUnique({ where: { id } })
      return NextResponse.json({
        submission: updated,
        tweetId: postResult.tweetId,
        postMethod: postResult.method,
        retriesUsed: postResult.retriesUsed,
      })
    } else {
      debug('[post route] Post failed:', postResult.error, 'method:', postResult.method)
      return NextResponse.json(
        { error: `Gagal posting ke X: ${postResult.error}`, postMethod: postResult.method },
        { status: 502 }
      )
    }
  })
}
