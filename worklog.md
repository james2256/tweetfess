# Tweetfess Fix Implementation Worklog

---
Task ID: 1.3
Agent: main
Task: Phase 1.3 — ENCRYPTION_KEY warning on missing key

Work Log:
- Added startup `console.error` in `src/lib/encrypt.ts` when ENCRYPTION_KEY is not set
- Added throttled warning (once per minute) when `encrypt()` called without key
- Added `isEncryptionEnabled()` export for admin UI consumption
- Added `encryptionEnabled` field to `/api/admin/stats` and `/api/admin/summary` responses
- Added `encryptionEnabled` to `Stats` type in `src/types/index.ts`
- Created `EncryptionBanner` component (`src/components/dashboard/encryption-banner.tsx`)
- Added banner to admin dashboard (`src/app/admin/page.tsx`) and settings page (`src/app/admin/settings/page.tsx`)

Stage Summary:
- Operators now get clear warnings when encryption is disabled
- Admin UI shows prominent amber warning banner when ENCRYPTION_KEY is not configured

---
Task ID: 1.1
Agent: main
Task: Phase 1.1 — Encrypt OAuth tokens at rest

Work Log:
- Added `import { encrypt } from '@/lib/encrypt'` to `src/lib/twitter-auth.ts`
- Wrapped all 5 `oauth2AccessToken` and `oauth2RefreshToken` write locations with `encrypt()`
- Updated Prisma schema comments to note tokens are "encrypted at rest"
- Removed unused `@@index([oauth2AccessToken])` from schema (nothing uses this index)

Stage Summary:
- OAuth tokens are now encrypted at rest using AES-256-GCM
- `decryptSetting()` handles migration from plaintext (already built for this pattern)
- Index removed since encrypted blobs can't be indexed; `twitterId` serves as lookup key

---
Task ID: 2.3+1.2
Agent: subagent (full-stack-developer)
Task: Phase 2.3 + 1.2 — Move getFilterSettings to src/lib/ + HttpOnly admin cookie

Work Log:
- Created `src/lib/filter-settings.ts` with extracted `FILTER_SETTING_KEYS`, `parseIntSafe`, `DEFAULT_RATE_LIMITS`, `RateLimitSettings`, `getFilterSettings()`, `getGeminiApiKey()`
- Updated `src/app/api/admin/filter-settings/route.ts` to import from `@/lib/filter-settings`
- Updated `src/types/index.ts` to re-export `DEFAULT_RATE_LIMITS` from `@/lib/filter-settings`
- Updated all 8 files importing `getFilterSettings` from old route path
- Updated all files importing `DEFAULT_RATE_LIMITS`
- Added `getAdminTokenFromRequest()` to `src/lib/admin-auth.ts` (cookie first, header fallback)
- Updated login route to set HttpOnly cookie on response
- Created `/api/admin/logout` route to clear HttpOnly cookie
- Updated all 20 `verifyAdmin()` call sites to use `getAdminTokenFromRequest(req)`
- Updated `use-admin-auth.ts` to use cookie-based auth (no more client-side token storage)
- Updated `api-client.ts` to remove `setAdminToken`/`getAdminToken` (cookie sent automatically)
- Removed `setAdminCookie`, `getAdminCookie`, `clearAdminCookie` from `src/types/index.ts`
- Updated admin layout and header to not depend on adminToken value

Stage Summary:
- Business logic properly separated from route file
- Admin auth now uses HttpOnly cookies (XSS-resistant)
- Backward compatible: curl/API users can still use Authorization header
- 20 call sites migrated in single pass

---
Task ID: 2.1
Agent: main
Task: Phase 2.1 — Fix queued:true lies

Work Log:
- L565: Changed from `queued: true, status: 201` to `status: 409` with appropriate error message
- L625/L646: Changed from `queued: true` to `postFailed: true` with Indonesian error message
- Updated `src/app/page.tsx` to handle 409 specifically (shows "Status berubah" toast)
- Added `postFailed` handling in success path (shows "Gagal auto-post" toast)

Stage Summary:
- L565 now returns 409 Conflict — client knows submission is in unknown state
- L625/L646 now return `postFailed: true` — client knows auto-post failed but submission exists
- No more misleading "Pesanmu sudah masuk antrean" when not actually queued

---
Task ID: 2.2
Agent: main
Task: Phase 2.2 — Separate posting from pending count

Work Log:
- Changed stats route `pending` from `(pending + posting)` to just `pending`
- Added `posting` field to stats response
- Added `posting` to `Stats` interface
- Added "Posting" stat card to StatsGrid (blue, with Loader2 icon)
- Updated submitters route similarly
- Updated use-stats.ts lightweight mode to include `posting`

Stage Summary:
- Admin dashboard now shows separate "Menunggu" (pending) and "Posting" (actively being posted) counts
- No more inflated pending count from in-flight posts

---
Task ID: 3.1-3.6
Agent: subagent (full-stack-developer)
Task: Phase 3 — Robustness & Resilience

Work Log:
- 3.1: Changed `||` to `??` in api-client, added structured data to ApiError
- 3.2: Added cursor-based pagination to submitters endpoint (limit + cursor + hasMore)
- 3.3: Added `PAIR_JSON_URL` env var, schema validation, drastic-change detection
- 3.4: Removed 30s duplicate poll from layout, dashboard dispatches stats-update event
- 3.5: Added `GEMINI_MODEL` env var, created `/api/admin/gemini-status` health check, added Test button
- 3.6: Added `data.error` check in retryPost before showing success toast

Stage Summary:
- API errors now preserve structured data for better debugging
- Submitters list scales with pagination
- pair.json fetch is validated and configurable
- Single source of truth for pending count (no duplicate polling)
- Gemini model is configurable and health-checkable
- retryPost no longer silently ignores errors

---
Task ID: 4.1-4.6
Agent: subagent (full-stack-developer)
Task: Phase 4 — UI/UX & Accessibility + Documentation

Work Log:
- 4.1: Fixed `text-mutedforeground` → `text-muted-foreground` typo
- 4.2: Added `autoApprove` prop to ConfessionForm with conditional text
- 4.3: Added skeleton loading state to ConnectionBanner when props are null
- 4.4: Replaced custom toggle buttons with shadcn Switch + proper ARIA labels
- 4.5: Removed duplicate Gemini status badges from toggle label
- 4.6: Added "intentionally unencrypted" documentation comments to jsonb route files

Stage Summary:
- All UI/UX issues addressed
- Accessibility improved (Switch components have built-in ARIA)
- Documentation clarifies why blocked/whitelist usernames are not encrypted
