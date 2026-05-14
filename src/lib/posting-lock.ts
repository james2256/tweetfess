// ============================================================
// Distributed Posting Lock — PostgreSQL-backed
//
// Prevents concurrent tweet posting via X's cookie-based API.
// Uses an atomic conditional UPDATE on the Setting table so that
// only one serverless function instance can post at a time.
//
// Requires a `posting_lock` row in the Setting table:
//   INSERT INTO "Setting" (id, key, value, "updatedAt")
//   VALUES ('posting_lock', 'posting_lock', '0', NOW())
//   ON CONFLICT (key) DO NOTHING;
//
// Lock lifecycle:
//   value = '0'              → unlocked
//   value = '<epoch_ms>'     → locked since that timestamp
//   Expired (>30s old)       → any requester can steal the lock
// ============================================================

import { db } from '@/lib/db'
import { debug } from '@/lib/debug'

const LOCK_KEY = 'posting_lock'
const LOCK_TIMEOUT_MS = 30_000 // 30s — max time a post attempt can take

/**
 * Atomically acquire the posting lock.
 *
 * Single SQL statement — no TOCTOU gap. Only wins if:
 * - Lock is currently unlocked (value = '0'), OR
 * - Lock has expired (holder crashed / timed out)
 *
 * @returns true if lock acquired, false if someone else holds it
 */
export async function acquirePostingLock(): Promise<boolean> {
  const now = Date.now()
  const cutoff = now - LOCK_TIMEOUT_MS

  const affected = await db.$executeRaw`
    UPDATE "Setting"
    SET value = ${String(now)}, "updatedAt" = NOW()
    WHERE key = ${LOCK_KEY}
      AND (value = '0' OR CAST(value AS BIGINT) < ${cutoff})
  `

  const acquired = affected > 0
  debug('[posting-lock]', acquired ? 'Lock acquired' : 'Lock busy')
  return acquired
}

/**
 * Release the posting lock so the next queued post can proceed.
 */
export async function releasePostingLock(): Promise<void> {
  await db.setting.update({
    where: { key: LOCK_KEY },
    data: { value: '0' },
  })
  debug('[posting-lock] Lock released')
}
