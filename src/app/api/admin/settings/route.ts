import { db } from '@/lib/db'
import { parseXCookies } from '@/lib/twitter-post-cookie'
import { NextRequest, NextResponse } from 'next/server'

const VALID_KEYS = [
  'x_cookie_string',
  'x_query_id',
  'x_bearer_token',
  'twitterapi_keys',
  'twitterapi_proxy',
  'post_method',
]
const MAX_VALUE_LENGTH = 50000 // Larger for twitterapi_keys (JSON array)
const VALID_POST_METHODS = ['direct', 'api', 'auto']

// GET /api/admin/settings — Return all settings (values masked)
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'
  if (authHeader !== `Bearer ${adminPassword}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const settings = await db.setting.findMany()

  // Mask all values — but show more for non-sensitive keys
  const masked = settings.map((s) => {
    let displayValue = ''
    if (s.value) {
      if (s.key === 'twitterapi_keys') {
        // Show key count and first 8 chars of each key
        try {
          const keys = JSON.parse(s.value) as string[]
          displayValue = `${keys.length} key(s): ${keys.map((k) => k.slice(0, 8) + '...').join(', ')}`
        } catch {
          displayValue = s.value.slice(0, 20) + '...'
        }
      } else if (s.key === 'post_method') {
        displayValue = s.value // post_method is not sensitive
      } else if (s.key === 'twitterapi_proxy') {
        // Mask password in proxy URL
        displayValue = s.value.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')
      } else {
        displayValue = s.value.slice(0, 8) + '...'
      }
    }
    return {
      key: s.key,
      value: displayValue,
      updatedAt: s.updatedAt,
    }
  })

  return NextResponse.json({ settings: masked })
}

// POST /api/admin/settings — Upsert a setting
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'
  if (authHeader !== `Bearer ${adminPassword}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { key, value } = body

  if (!key || typeof value !== 'string') {
    return NextResponse.json({ error: 'key and value are required' }, { status: 400 })
  }

  // Validate known keys only
  if (!VALID_KEYS.includes(key)) {
    return NextResponse.json(
      { error: `Invalid key. Valid keys: ${VALID_KEYS.join(', ')}` },
      { status: 400 }
    )
  }

  // Cap value length
  if (value.length > MAX_VALUE_LENGTH) {
    return NextResponse.json(
      { error: `Value too long (max ${MAX_VALUE_LENGTH} characters)` },
      { status: 400 }
    )
  }

  // Validate cookie string has required fields
  if (key === 'x_cookie_string') {
    if (!value.includes('auth_token=') || !value.includes('ct0=')) {
      return NextResponse.json(
        {
          error:
            'Cookie string must contain both auth_token and ct0. Copy the full cookie string from your browser.',
        },
        { status: 400 }
      )
    }
  }

  // Validate twitterapi_keys is valid JSON array
  if (key === 'twitterapi_keys') {
    try {
      const parsed = JSON.parse(value)
      if (!Array.isArray(parsed)) {
        return NextResponse.json(
          { error: 'twitterapi_keys must be a JSON array of API keys, e.g. ["key1","key2"]' },
          { status: 400 }
        )
      }
      // Validate each key is a non-empty string
      for (const k of parsed) {
        if (typeof k !== 'string' || !k.trim()) {
          return NextResponse.json(
            { error: 'Each API key must be a non-empty string.' },
            { status: 400 }
          )
        }
      }
    } catch {
      return NextResponse.json(
        { error: 'twitterapi_keys must be valid JSON, e.g. ["key1","key2"]' },
        { status: 400 }
      )
    }
  }

  // Validate post_method value
  if (key === 'post_method') {
    if (!VALID_POST_METHODS.includes(value)) {
      return NextResponse.json(
        { error: `post_method must be one of: ${VALID_POST_METHODS.join(', ')}` },
        { status: 400 }
      )
    }
  }

  // Validate proxy URL format (basic)
  if (key === 'twitterapi_proxy' && value.trim()) {
    if (!value.match(/^https?:\/\/.+/)) {
      return NextResponse.json(
        { error: 'Proxy must be a valid HTTP/HTTPS URL, e.g. http://user:pass@ip:port' },
        { status: 400 }
      )
    }
  }

  const setting = await db.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  })

  // Return parsed confirmation for cookie string so admin can verify
  if (key === 'x_cookie_string') {
    const parsed = parseXCookies(value)
    return NextResponse.json({
      setting: { key: setting.key, updatedAt: setting.updatedAt },
      parsed: {
        auth_token: parsed.auth_token ? parsed.auth_token.slice(0, 8) + '****' : 'NOT FOUND',
        ct0: parsed.ct0 ? parsed.ct0.slice(0, 8) + '****' : 'NOT FOUND',
      },
    })
  }

  // Return count for twitterapi_keys
  if (key === 'twitterapi_keys') {
    const keys = JSON.parse(value) as string[]
    return NextResponse.json({
      setting: { key: setting.key, updatedAt: setting.updatedAt },
      keyCount: keys.length,
    })
  }

  return NextResponse.json({
    setting: { key: setting.key, updatedAt: setting.updatedAt },
  })
}

// DELETE /api/admin/settings — Delete a setting
export async function DELETE(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'
  if (authHeader !== `Bearer ${adminPassword}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const key = searchParams.get('key')

  if (!key) {
    return NextResponse.json({ error: 'key query param is required' }, { status: 400 })
  }

  if (!VALID_KEYS.includes(key)) {
    return NextResponse.json(
      { error: `Invalid key. Valid keys: ${VALID_KEYS.join(', ')}` },
      { status: 400 }
    )
  }

  await db.setting.deleteMany({ where: { key } })
  return NextResponse.json({ success: true })
}
