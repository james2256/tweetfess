import { NextRequest, NextResponse } from 'next/server'
import { getSubmitterFromNextRequest } from '@/lib/twitter-auth'
import { db } from '@/lib/db'

// GET /api/auth/me - Check if user is logged in via Twitter OAuth
export async function GET(req: NextRequest) {
  try {
    const submitter = await getSubmitterFromNextRequest(req)

    if (!submitter) {
      return NextResponse.json({ authenticated: false })
    }

    // Check if user is blocked
    let blocked = false
    if (submitter.username) {
      const setting = await db.setting.findUnique({ where: { key: 'blocked_usernames' } })
      if (setting) {
        try {
          const blockedList: string[] = JSON.parse(setting.value)
          blocked = blockedList.includes(submitter.username.toLowerCase())
        } catch {
          // invalid JSON, treat as not blocked
        }
      }
    }

    return NextResponse.json({
      authenticated: true,
      submitter,
      blocked,
    })
  } catch {
    return NextResponse.json({ authenticated: false })
  }
}
