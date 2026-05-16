import { NextResponse } from 'next/server'
import {
  generateRandomString,
  generateCodeChallenge,
  buildTwitterAuthUrl,
  getBaseUrl,
  getOAuth2Credentials,
} from '@/lib/twitter-auth'
import { db } from '@/lib/db'

// GET /api/auth/twitter - Start Twitter OAuth 2.0 flow
// Stores PKCE code_verifier and CSRF state in the database (OAuthFlow table)
// so the callback can read them regardless of which browser context processes it.
// This fixes mobile login where X's WebView has a separate cookie store from Chrome/Safari.
// Cookies are still set as a fallback for desktop / no-X-app scenarios.
export async function GET() {
  const creds = getOAuth2Credentials()

  if (!creds) {
    return NextResponse.json(
      { error: 'Twitter OAuth belum dikonfigurasi. Tambahkan OAUTH2_CLIENT_ID dan OAUTH2_CLIENT_SECRET ke env vars.' },
      { status: 500 }
    )
  }

  // Generate PKCE parameters
  const codeVerifier = generateRandomString()
  const codeChallenge = generateCodeChallenge(codeVerifier)
  const randomState = generateRandomString(32)

  // Store state in database — this survives cross-browser-context redirects
  // (e.g. Chrome → X app → X WebView) where cookies would be lost.
  // flowId is encoded into the state param sent to X, so the callback can
  // look up the record. The full state (flowId.randomState) is verified for CSRF.
  const flow = await db.oAuthFlow.create({
    data: {
      codeVerifier,
      state: randomState, // stored separately for CSRF verification
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min TTL
    },
  })

  // Encode flowId into the state parameter: "flowId.randomState"
  // X echoes this exact string back in the callback, so we can extract flowId
  // to look up the DB record, then verify the full string matches.
  const stateParam = `${flow.id}.${randomState}`

  // Build redirect URI (must match what's configured in Twitter Developer Portal)
  const baseUrl = getBaseUrl()
  const redirectUri = `${baseUrl}/api/auth/twitter/callback`

  // Build the authorization URL
  const authUrl = buildTwitterAuthUrl(creds.clientId, redirectUri, stateParam, codeChallenge)

  // Store code_verifier and state in cookies as fallback for desktop / no-X-app scenarios
  const response = NextResponse.redirect(authUrl)

  response.cookies.set('twitter_oauth_verifier', codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  })

  response.cookies.set('twitter_oauth_state', stateParam, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  })

  // Store flowId in a readable cookie so the callback can try DB lookup first
  response.cookies.set('twitter_oauth_flow_id', flow.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  })

  return response
}
