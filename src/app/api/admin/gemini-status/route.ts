import { isEncryptionEnabled, decryptSetting } from '@/lib/encrypt'
import { verifyAdmin, getAdminTokenFromRequest } from '@/lib/admin-auth'
import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite'

export async function GET(req: NextRequest) {
  const auth = verifyAdmin(getAdminTokenFromRequest(req))
  if (!auth.authorized) return auth.response

  // Get the Gemini API key
  const setting = await db.setting.findUnique({ where: { key: 'gemini_api_key' } })
  if (!setting?.value) {
    return NextResponse.json({ healthy: false, model: GEMINI_MODEL, encryptionEnabled: isEncryptionEnabled(), error: 'No API key configured' })
  }

  const apiKey = decryptSetting(setting.value).trim()
  if (!apiKey) {
    return NextResponse.json({ healthy: false, model: GEMINI_MODEL, encryptionEnabled: isEncryptionEnabled(), error: 'API key is empty' })
  }

  try {
    // Lightweight health check — fetch model info, not generateContent
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}?key=${apiKey}`,
      { signal: AbortSignal.timeout(5000) }
    )
    return NextResponse.json({
      healthy: resp.ok,
      model: GEMINI_MODEL,
      encryptionEnabled: isEncryptionEnabled(),
      error: resp.ok ? null : `HTTP ${resp.status}`,
    })
  } catch (err) {
    return NextResponse.json({
      healthy: false,
      model: GEMINI_MODEL,
      encryptionEnabled: isEncryptionEnabled(),
      error: err instanceof Error ? err.message : 'Unknown error',
    })
  }
}
