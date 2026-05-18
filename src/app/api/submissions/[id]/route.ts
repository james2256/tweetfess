import { db } from '@/lib/db'
import { executePostAndRecord, withErrorBoundary } from '@/lib/execute-post'
import { verifyAdmin, getAdminTokenFromRequest } from '@/lib/admin-auth'
import { debug } from '@/lib/debug'
import { decodeHtmlEntities } from '@/lib/content-filter'
import { getFilterSettings } from '@/lib/filter-settings'
import { checkStalePosting } from '@/lib/stale-posting'
import { NextRequest, NextResponse } from 'next/server'

// Vercel serverless function timeout — approve+post can take up to 15s with retries
export const maxDuration = 30

// PATCH /api/submissions/[id] - Approve (auto-post) or reject
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = verifyAdmin(getAdminTokenFromRequest(req))
  if (!auth.authorized) return auth.response

  return withErrorBoundary(async () => {
    const { id } = await params
    const body = await req.json()
    const { status } = body

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Status tidak valid' }, { status: 400 })
    }

    let submission = await db.submission.findUnique({ where: { id } })
    if (!submission) {
      return NextResponse.json({ error: 'Submission tidak ditemukan' }, { status: 404 })
    }

    if (submission.status === 'posted') {
      return NextResponse.json(
        { error: 'Submission sudah diposting' },
        { status: 400 }
      )
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
      return NextResponse.json(
        { error: 'Submission sudah ditolak' },
        { status: 400 }
      )
    }

    if (submission.status !== 'pending' && submission.status !== 'post_failed' && submission.status !== 'censored') {
      return NextResponse.json(
        { error: `Status tidak valid: ${submission.status}` },
        { status: 400 }
      )
    }

    // If approving, auto-post to X via cookie auth (with retry + fallback)
    if (status === 'approved') {
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
        debug('[approve route] Posting lock busy')
        return NextResponse.json(
          { error: 'Sedang ada posting lain yang berjalan. Coba lagi dalam beberapa detik.' },
          { status: 409 }
        )
      }
      if (postResult.underLockAbortReason === 'global_post_daily_cap_reached') {
        debug('[approve route] Global post daily cap reached:', postResult.error)
        return NextResponse.json(
          { error: `Batas post harian global tercapai (${postResult.error}). Naikkan batas di Rate Limit settings.` },
          { status: 400 }
        )
      }
      if (postResult.casAborted) {
        debug('[approve route] Submission status changed before posting, aborting')
        return NextResponse.json(
          { error: 'Submission sedang diproses oleh proses lain.' },
          { status: 409 }
        )
      }
      if (postResult.success) {
        debug('[approve route] Post succeeded! tweetId:', postResult.tweetId, 'method:', postResult.method)

        // Build descriptive message based on method used
        let description = ''
        if (postResult.method === 'direct') {
          description = 'Pesan otomatis diposting ke X.'
        } else if (postResult.method === 'retry') {
          description = `Pesan diposting setelah retry (${postResult.retriesUsed}x).`
        } else if (postResult.method === 'fallback_cookie') {
          description = 'Pesan diposting via Cookie API (twitterapi.io).'
        } else if (postResult.method === 'fallback_login') {
          description = 'Pesan diposting via V2 Login API (twitterapi.io).'
        }

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
          autoPosted: true,
          tweetId: postResult.tweetId,
          postMethod: postResult.method,
          description,
        })
      } else {
        debug('[approve route] Post failed:', postResult.error, 'method:', postResult.method)
        // Context-aware hint based on error type
        const errorMsg = postResult.error || ''
        let hint = ''
        if (errorMsg.includes('code: 344') || errorMsg.includes('daily limit')) {
          hint = 'Batas harian tweet tercapai. Coba lagi besok.'
        } else if (errorMsg.includes('code: 32') || errorMsg.includes('Could not authenticate')) {
          hint = 'Cookie expired. Perbarui cookie di X Settings lalu klik "Post to X".'
        } else if (errorMsg.includes('code: 88') || errorMsg.includes('Rate limit')) {
          hint = 'Rate limit tercapai. Tunggu beberapa menit lalu coba lagi.'
        } else if (errorMsg.includes('226') || errorMsg.includes('automated')) {
          hint = 'X mendeteksi otomatisasi (226). Semua retry gagal. Coba lagi dalam 1-2 menit.'
        } else if (errorMsg.includes('Empty tweet_results') || errorMsg.includes('silently rejected')) {
          hint = 'Tweet ditolak X (empty results). Semua retry gagal. Coba lagi dalam 1-2 menit.'
        } else if (errorMsg.includes('Fallback API') || errorMsg.includes('fallback')) {
          hint = 'Direct post gagal, fallback API juga gagal. Periksa API keys dan cookie.'
        } else {
          hint = 'Cek X Settings lalu klik "Post to X" untuk retry.'
        }

        const updated = await db.submission.findUnique({ where: { id } })
        return NextResponse.json({
          submission: updated,
          autoPosted: false,
          error: `Disetujui, tapi gagal posting ke X: ${errorMsg}. ${hint}`,
          postMethod: postResult.method,
        })
      }
    }

    // Reject — conditional update prevents overwriting if status changed
    // between our fetch and this write (e.g. another admin approved it).
    const rejectResult = await db.submission.updateMany({
      where: { id, status: { in: ['pending', 'post_failed', 'censored'] } },
      data: { status: 'rejected' },
    })
    if (rejectResult.count === 0) {
      return NextResponse.json({ error: 'Status berubah — coba refresh halaman.' }, { status: 409 })
    }
    const updated = await db.submission.findUnique({ where: { id } })

    return NextResponse.json({ submission: updated })
  })
}

// DELETE /api/submissions/[id] - Delete a submission
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = verifyAdmin(getAdminTokenFromRequest(req))
  if (!auth.authorized) return auth.response

  try {
    const { id } = await params

    const submission = await db.submission.findUnique({ where: { id } })
    if (!submission) {
      return NextResponse.json({ error: 'Submission tidak ditemukan' }, { status: 404 })
    }

    // Prevent deleting a submission that is currently being posted to X
    // (would orphan the tweet — it posts but we lose the record)
    // However, if the posting is stale (>2 min), auto-recover so the admin can delete.
    if (submission.status === 'posting') {
      const stale = await checkStalePosting(submission)
      if (!stale.isStale) {
        return NextResponse.json({ error: 'Tidak bisa menghapus pesan yang sedang diposting. Coba lagi dalam beberapa menit.' }, { status: 409 })
      }
      // Stale posting auto-recovered — fall through to delete below.
      // WARNING: The tweet may have been posted to X before the crash.
      // Deleting the DB record means we lose track of it — but the admin
      // is explicitly choosing to delete, so this is acceptable.
    }

    // Conditional delete — only succeeds if status is not 'posting'.
    // Prevents the race where checkStalePosting recovers an old 'posting',
    // but another process has since set a fresh 'posting' (e.g. admin approved).
    const deleted = await db.submission.deleteMany({
      where: { id, status: { not: 'posting' } },
    })
    if (deleted.count === 0) {
      return NextResponse.json({ error: 'Tidak bisa menghapus pesan yang sedang diposting. Coba lagi dalam beberapa menit.' }, { status: 409 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[submissions] Delete error:', e)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
