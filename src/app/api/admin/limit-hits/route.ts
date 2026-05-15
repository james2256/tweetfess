import { db } from '@/lib/db'
import { verifyAdmin } from '@/lib/admin-auth'
import { NextRequest, NextResponse } from 'next/server'

const LIMIT_TYPE_LABELS: Record<string, string> = {
  cooldown: 'Cooldown',
  daily_cap: 'Batas harian',
  pending_cap: 'Batas antrean',
  global_cap: 'Batas global',
  post_cap: 'Batas post',
}

// GET /api/admin/limit-hits — Limit health stats for the last 24h
export async function GET(req: NextRequest) {
  const auth = verifyAdmin(req.headers.get('authorization'))
  if (!auth.authorized) return auth.response

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

  // Hits per limit type (total + unique users)
  const hitsByType = await db.limitHit.groupBy({
    by: ['limitType'],
    where: { createdAt: { gte: twentyFourHoursAgo } },
    _count: { _all: true },
  })

  // Unique users per limit type
  const uniqueUsersByType = await db.limitHit.groupBy({
    by: ['limitType'],
    where: { createdAt: { gte: twentyFourHoursAgo } },
    _count: { username: true },
  })

  // Wait... groupBy _count on username still counts all rows, not distinct.
  // Need raw SQL for distinct count.

  const distinctByType = await db.$queryRaw<
    { limitType: string; uniqueUsers: bigint }[]
  >`
    SELECT "limitType", COUNT(DISTINCT username) as "uniqueUsers"
    FROM "LimitHit"
    WHERE "createdAt" >= ${twentyFourHoursAgo}
    GROUP BY "limitType"
  `

  // Top blocked users (24h)
  const topUsers = await db.limitHit.groupBy({
    by: ['username'],
    where: { createdAt: { gte: twentyFourHoursAgo } },
    _count: { _all: true },
    orderBy: { _count: { _all: 'desc' } },
    take: 10,
  })

  // Build summary
  const summary = Object.keys(LIMIT_TYPE_LABELS).map((type) => {
    const hitRow = hitsByType.find((r) => r.limitType === type)
    const distinctRow = distinctByType.find((r) => r.limitType === type)
    return {
      limitType: type,
      label: LIMIT_TYPE_LABELS[type],
      totalHits: hitRow?._count._all ?? 0,
      uniqueUsers: Number(distinctRow?.uniqueUsers ?? 0),
    }
  })

  // Total hits for cleanup reference
  const totalHits = hitsByType.reduce((sum, r) => sum + r._count._all, 0)

  return NextResponse.json({
    summary,
    topUsers: topUsers.map((u) => ({
      username: u.username,
      hits: u._count._all,
    })),
    totalHits,
    windowHours: 24,
  })
}
