// ============================================================
// twitter-api-fallback.ts — Barrel re-export for backward compatibility
//
// All implementation moved to domain-specific modules:
//   - twitter-api-shared.ts    (types, helpers, DB primitives)
//   - twitter-cookie-api.ts    (Layer 2: Cookie API posting)
//   - twitter-v2-login.ts      (Layer 3: V2 Login API + login + status)
//   - twitter-api-credits.ts   (API credits + caching)
//
// This barrel ensures all existing imports from '@/lib/twitter-api-fallback'
// continue working without any changes to consumer files.
//
// Consumer files:
//   - src/app/api/admin/summary/route.ts  (getApiCreditsNonBlocking, getApiLoginStatus)
//   - src/app/api/admin/stats/route.ts    (getApiCreditsNonBlocking, getApiLoginStatus)
//   - src/lib/circuit-breaker.ts           (invalidateCreditsCache — dynamic import)
//   - src/lib/twitter-post-cookie.ts       (postViaCookieApi, postViaTwitterApi, isV2LoginEnabled)
//   - src/app/api/admin/settings/route.ts (loginViaTwitterApi)
// ============================================================

// --- Types (from shared, canonical KeyCredits lives in @/types) ---
export type { FallbackResult, KeyCredits, LoginResult } from './twitter-api-shared'

// --- Shared helpers (new — eliminate clones) ---
// NOTE: readSettingsMap and callCreateTweetV2 are internal infrastructure
// used by the domain modules. They're NOT re-exported here because no
// external consumer needs them. Import directly from './twitter-api-shared'
// if ever needed in the future.
export {
  cookieStringToLoginCookies,
  maskApiKey,
  maskProxyUrl,
  extractTweetId,
} from './twitter-api-shared'

// --- Layer 2: Cookie API ---
export { postViaCookieApi } from './twitter-cookie-api'

// --- Layer 3: V2 Login API + login + status ---
export {
  loginViaTwitterApi,
  isV2LoginEnabled,
  postViaTwitterApi,
  getApiLoginStatus,
} from './twitter-v2-login'

// --- Credits + caching ---
export {
  getKeyCredits,
  getAllKeyCredits,
  getApiCreditsNonBlocking,
  getCachedApiCredits,
  invalidateCreditsCache,
} from './twitter-api-credits'
