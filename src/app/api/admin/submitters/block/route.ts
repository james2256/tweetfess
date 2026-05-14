import { db } from '@/lib/db'
import { verifyAdmin } from '@/lib/admin-auth'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/admin/submitters/block — Block a user from submitting
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
    let blocklist: string[] = []
    if (setting) {
      try {
        const parsed = JSON.parse(setting.value)
        if (Array.isArray(parsed)) {
          blocklist = parsed.filter((u: unknown) => typeof u === 'string' && u.trim())
        }
      } catch { /* empty */ }
    }

    if (blocklist.includes(normalizedUsername)) {
      return NextResponse.json({ error: 'User sudah diblokir' }, { status: 400 })
    }

    blocklist.push(normalizedUsername)

    await db.setting.upsert({
      where: { key: 'blocked_usernames' },
      update: { value: JSON.stringify(blocklist) },
      create: { key: 'blocked_usernames', value: JSON.stringify(blocklist) },
    })

    // Also remove from whitelist if present (blocked takes priority)
    const whitelistSetting = await db.setting.findUnique({ where: { key: 'whitelist_usernames' } })
    if (whitelistSetting) {
      try {
        const parsed = JSON.parse(whitelistSetting.value)
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter((u: string) => u.toLowerCase().trim() !== normalizedUsername)
          if (filtered.length !== parsed.length) {
            await db.setting.upsert({
              where: { key: 'whitelist_usernames' },
              update: { value: JSON.stringify(filtered) },
              create: { key: 'whitelist_usernames', value: JSON.stringify(filtered) },
            })
          }
        }
      } catch { /* ignore */ }
    }

    return NextResponse.json({ success: true, blocked: normalizedUsername })
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
