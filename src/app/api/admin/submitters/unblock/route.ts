import { db } from '@/lib/db'
import { verifyAdmin } from '@/lib/admin-auth'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/admin/submitters/unblock — Unblock a user
export async function POST(req: NextRequest) {
  const auth = verifyAdmin(req.headers.get('authorization'))
  if (!auth.authorized) return auth.response

  try {
    const { username } = await req.json()
    if (!username || typeof username !== 'string' || !username.trim()) {
      return NextResponse.json({ error: 'Username wajib diisi' }, { status: 400 })
    }

    const normalizedUsername = username.toLowerCase().trim()

    // Get current blocklist
    const setting = await db.setting.findUnique({ where: { key: 'blocked_usernames' } })
    if (!setting) {
      return NextResponse.json({ error: 'User tidak ditemukan di blocklist' }, { status: 400 })
    }

    let blocklist: string[] = []
    try {
      const parsed = JSON.parse(setting.value)
      if (Array.isArray(parsed)) {
        blocklist = parsed.filter((u: unknown) => typeof u === 'string' && u.trim())
      }
    } catch { /* empty */ }

    if (!blocklist.includes(normalizedUsername)) {
      return NextResponse.json({ error: 'User tidak ditemukan di blocklist' }, { status: 400 })
    }

    blocklist = blocklist.filter((u) => u !== normalizedUsername)

    await db.setting.upsert({
      where: { key: 'blocked_usernames' },
      update: { value: JSON.stringify(blocklist) },
      create: { key: 'blocked_usernames', value: JSON.stringify(blocklist) },
    })

    return NextResponse.json({ success: true, unblocked: normalizedUsername })
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
