import { db } from '@/lib/db'

// ============================================================
// TwitterAPI.io fallback posting module
//
// When direct cookie-based posting fails after all retries,
// this module attempts to post via twitterapi.io as a fallback.
//
// Features:
// - Multi-key rotation (round-robin)
// - Credit monitoring via /oapi/my/info (free endpoint — V12)
// - Automatic key skipping on credit exhaustion / invalid key
// - Post method tracking (returns method: 'fallback')
//
// Verified:
// - V6:  API key validation works
// - V7:  create_tweet_v2 endpoint exists
// - V8:  Webshare proxy passes validation
// - V9:  300 credits/tweet ($0.003)
// - V10: 10k free credits on registration
// - V11: Credit monitoring available
// - V12: /oapi/my/info is free
// - V20: user_login_v2 returns login_cookie
// - V21: Proxy not required for create_tweet_v2 (only for login)
//
// Unverified:
// - U1:  Browser cookies as login_cookies (likely works, untested)
// - U2:  Credit exhaustion error format (handle generically)
// ============================================================

const TWITTERAPI_BASE = 'https://api.twitterapi.io'

interface FallbackResult {
  success: boolean
  tweetId?: string
  error?: string
  method: 'fallback'
  apiKeyUsed?: string
}

interface KeyCredits {
  apiKey: string
  rechargeCredits: number
  bonusCredits: number
  totalCredits: number
  error?: string
}

/**
 * Read twitterapi.io settings from DB.
 * Returns null for missing/invalid values.
 */
async function getTwitterApiSettings(): Promise<{
  keys: string[]
  proxy: string | null
}> {
  const settings = await db.setting.findMany({
    where: {
      key: { in: ['twitterapi_keys', 'twitterapi_proxy'] },
      value: { not: '' },
    },
  })

  const keysSetting = settings.find((s) => s.key === 'twitterapi_keys')
  const proxySetting = settings.find((s) => s.key === 'twitterapi_proxy')

  let keys: string[] = []
  if (keysSetting?.value) {
    try {
      const parsed = JSON.parse(keysSetting.value)
      if (Array.isArray(parsed)) {
        keys = parsed.filter((k: unknown) => typeof k === 'string' && k.trim().length > 0)
      }
    } catch {
      // Invalid JSON — treat as empty
    }
  }

  return {
    keys,
    proxy: proxySetting?.value || null,
  }
}

/**
 * Get the current rotation index (stored as a Setting key).
 * Round-robin through API keys so each post uses the next key.
 */
async function getRotationIndex(): Promise<number> {
  const setting = await db.setting.findUnique({
    where: { key: 'twitterapi_key_index' },
  })
  return setting?.value ? parseInt(setting.value, 10) || 0 : 0
}

/**
 * Update the rotation index after using a key.
 */
async function setRotationIndex(index: number): Promise<void> {
  await db.setting.upsert({
    where: { key: 'twitterapi_key_index' },
    update: { value: String(index) },
    create: { key: 'twitterapi_key_index', value: String(index) },
  })
}

/**
 * Read the X cookie string from DB (same cookies used for direct posting).
 * These will be passed as login_cookies to twitterapi.io.
 *
 * U1 note: Whether browser cookies work as login_cookies is untested.
 * The API validates cookies live against X's servers (V8: dummy cookies
= always "not valid"). Real active cookies should pass validation.
 */
async function getCookieString(): Promise<string | null> {
  const settings = await getSettings()
  const envCookie = process.env.X_COOKIE_STRING?.trim() || null
  return settings.x_cookie_string || envCookie || null
}

/**
 * Batch-read X settings from DB (same helper as twitter-post-cookie.ts).
 */
async function getSettings(): Promise<Record<string, string>> {
  const settings = await db.setting.findMany({
    where: {
      key: { in: ['x_cookie_string', 'x_query_id', 'x_bearer_token'] },
      value: { not: '' },
    },
  })
  const map: Record<string, string> = {}
  for (const s of settings) {
    if (s.value) map[s.key] = s.value
  }
  return map
}

/**
 * Post a tweet via twitterapi.io as a fallback.
 *
 * Flow:
 * 1. Read API keys + proxy from DB
 * 2. Read X cookie string from DB (pass as login_cookies)
 * 3. Round-robin through keys, trying each one
 * 4. Skip keys that are invalid or out of credits
 * 5. Return result with method: 'fallback'
 */
export async function postViaTwitterApi(text: string): Promise<FallbackResult> {
  const { keys, proxy } = await getTwitterApiSettings()

  if (keys.length === 0) {
    return {
      success: false,
      error: 'TwitterAPI.io fallback not configured. Add API keys in Admin → X Settings.',
      method: 'fallback',
    }
  }

  const cookieString = await getCookieString()
  if (!cookieString) {
    return {
      success: false,
      error: 'Cookie string not available for API fallback.',
      method: 'fallback',
    }
  }

  // Build request body — proxy is optional for create_tweet_v2 (V21)
  const body: Record<string, string> = {
    login_cookies: cookieString,
    tweet_text: text,
  }
  if (proxy) {
    body.proxy = proxy
  }

  // Round-robin: start from last used index + 1
  const startIndex = await getRotationIndex()

  for (let i = 0; i < keys.length; i++) {
    const keyIndex = (startIndex + i) % keys.length
    const apiKey = keys[keyIndex]

    try {
      const response = await fetch(`${TWITTERAPI_BASE}/twitter/create_tweet_v2`, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      // Success — update rotation index for next time
      if (response.ok && data?.data?.tweet_id) {
        await setRotationIndex((keyIndex + 1) % keys.length)
        return {
          success: true,
          tweetId: String(data.data.tweet_id),
          method: 'fallback',
          apiKeyUsed: apiKey.slice(0, 8) + '...',
        }
      }

      // Key-specific errors — try next key
      const errorMsg = data?.detail || data?.error || data?.message || JSON.stringify(data)

      // Invalid API key — skip this key, try next
      if (
        response.status === 401 ||
        errorMsg.includes('API key is invalid') ||
        errorMsg.includes('Unauthorized')
      ) {
        continue
      }

      // Rate limit or credit exhaustion — skip this key, try next (U2)
      if (
        response.status === 429 ||
        errorMsg.includes('rate limit') ||
        errorMsg.includes('credits') ||
        errorMsg.includes('quota')
      ) {
        continue
      }

      // Cookie/login error — this affects all keys, no point rotating
      if (
        errorMsg.includes('login_cookies is not valid') ||
        errorMsg.includes('login_cookies is required')
      ) {
        return {
          success: false,
          error: `API fallback: ${errorMsg}. Browser cookies may be incompatible with twitterapi.io (U1).`,
          method: 'fallback',
        }
      }

      // Other error — try next key
      continue
    } catch (error) {
      // Network error with this key — try next
      continue
    }
  }

  // All keys exhausted
  return {
    success: false,
    error: `API fallback: semua ${keys.length} key gagal atau habis credits. Tambahkan key baru di Admin → X Settings.`,
    method: 'fallback',
  }
}

/**
 * Fetch credit info for a single API key.
 * Uses /oapi/my/info — this endpoint is FREE (V12: doesn't consume credits).
 */
export async function getKeyCredits(apiKey: string): Promise<KeyCredits> {
  try {
    const response = await fetch(`${TWITTERAPI_BASE}/oapi/my/info`, {
      headers: { 'x-api-key': apiKey },
    })

    if (!response.ok) {
      return {
        apiKey: apiKey.slice(0, 8) + '...',
        rechargeCredits: 0,
        bonusCredits: 0,
        totalCredits: 0,
        error: `HTTP ${response.status}`,
      }
    }

    const data = await response.json()
    return {
      apiKey: apiKey.slice(0, 8) + '...',
      rechargeCredits: data.recharge_credits || 0,
      bonusCredits: data.total_bonus_credits || 0,
      totalCredits: (data.recharge_credits || 0) + (data.total_bonus_credits || 0),
    }
  } catch (error) {
    return {
      apiKey: apiKey.slice(0, 8) + '...',
      rechargeCredits: 0,
      bonusCredits: 0,
      totalCredits: 0,
      error: error instanceof Error ? error.message : 'Network error',
    }
  }
}

/**
 * Fetch credit info for all configured API keys.
 * Used by admin dashboard to show credit status.
 */
export async function getAllKeyCredits(): Promise<KeyCredits[]> {
  const { keys } = await getTwitterApiSettings()

  if (keys.length === 0) return []

  // Fetch all keys in parallel
  const results = await Promise.all(keys.map((key) => getKeyCredits(key)))
  return results
}
