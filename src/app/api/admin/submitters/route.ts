import { db } from '@/lib/db'
import { verifyAdmin } from '@/lib/admin-auth'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/admin/submitters — List all submitters with their submission counts
export async function GET(req: NextRequest) {
  const auth = verifyAdmin(req.headers.get('authorization'))
  if (!auth.authorized) return auth.response

  const submitters = await db.submitter.findMany({
    select: {
      id: true,
      username: true,
      displayName: true,
      profileImage: true,
      twitterId: true,
      createdAt: true,
      _count: {
        select: {
          submissions: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Also get submission counts by status for each submitter
  const submittersWithStats = await Promise.all(
    submitters.map(async (s) => {
      const posted = await db.submission.count({
        where: { submitterId: s.id, status: 'posted' },
      })
      const pending = await db.submission.count({
        where: { submitterId: s.id, status: 'pending' },
      })
      const rejected = await db.submission.count({
        where: { submitterId: s.id, status: 'rejected' },
      })
      const postFailed = await db.submission.count({
        where: { submitterId: s.id, status: 'post_failed' },
      })
      return {
        id: s.id,
        username: s.username,
        displayName: s.displayName,
        profileImage: s.profileImage,
        twitterId: s.twitterId,
        createdAt: s.createdAt,
        totalSubmissions: s._count.submissions,
        posted,
        pending,
        rejected,
        postFailed,
      }
    })
  )

  return NextResponse.json({ submitters: submittersWithStats })
}
