/**
 * Conditional debug logging — only logs when DEBUG env var is set.
 *
 * Set DEBUG=1 in Vercel env vars or .env to enable.
 * Remove or unset to disable (production-clean logs).
 *
 * Usage:
 *   import { debug } from '@/lib/debug'
 *   debug('user_login_v2 response:', data)
 */

const DEBUG_ENABLED = !!process.env.DEBUG

export function debug(...args: unknown[]): void {
  if (DEBUG_ENABLED) {
    console.log('[debug]', ...args)
  }
}

export function debugError(...args: unknown[]): void {
  if (DEBUG_ENABLED) {
    console.error('[debug]', ...args)
  }
}
