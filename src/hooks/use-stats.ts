'use client'

import { useState, useCallback } from 'react'
import type { Stats, CookieAuthStatus, PostMethodStats, KeyCredits, ApiLoginStatus, PostMethod } from '@/types'
import { apiClient } from '@/lib/api-client'

interface UseStatsParams {
  adminToken: string
}

// Callbacks to sync filter settings, circuit breaker, and blocked usernames from stats
interface UseStatsCallbacks {
  onFilterSettings?: (settings: Stats['filterSettings']) => void
  onCircuitBreaker?: (status: { paused: boolean; failCount: number; pausedUntil: number | null; threshold: number } | null) => void
  onBlockedUsernames?: (usernames: string[]) => void
  onPostMethodSetting?: (method: PostMethod) => void
}

export function useStats({ adminToken }: UseStatsParams, callbacks?: UseStatsCallbacks) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [cookieStatus, setCookieStatus] = useState<CookieAuthStatus | null>(null)
  const [postMethodStats, setPostMethodStats] = useState<PostMethodStats | null>(null)
  const [apiCredits, setApiCredits] = useState<KeyCredits[]>([])
  const [apiLoginStatus, setApiLoginStatus] = useState<ApiLoginStatus | null>(null)
  const [postMethodSetting, setPostMethodSetting] = useState<PostMethod>('auto')

  const fetchStats = useCallback(async () => {
    if (!adminToken) return
    try {
      const data = await apiClient.getStats()
      setStats(data)
      setCookieStatus(data.cookieAuthStatus)
      if (data.postMethodStats) setPostMethodStats(data.postMethodStats)
      if (data.apiCredits) setApiCredits(data.apiCredits)
      if (data.apiLoginStatus) setApiLoginStatus(data.apiLoginStatus)
      if (data.postMethodSetting) {
        setPostMethodSetting(data.postMethodSetting)
        callbacks?.onPostMethodSetting?.(data.postMethodSetting)
      }
      // Notify parent hooks of filter settings from stats response
      if (data.filterSettings) {
        callbacks?.onFilterSettings?.(data.filterSettings)
      }
      // Circuit breaker from filter settings
      if (data.filterSettings) {
        const cb = (data.filterSettings as Stats['filterSettings'] & { circuitBreaker?: { paused: boolean; failCount: number; pausedUntil: number | null; threshold: number } }).circuitBreaker
        if (cb) callbacks?.onCircuitBreaker?.(cb)
        if (data.filterSettings.blockedUsernames) callbacks?.onBlockedUsernames?.(data.filterSettings.blockedUsernames)
      }
    } catch {
      // silently fail
    }
  }, [adminToken, callbacks])

  const refetch = useCallback(async () => {
    return fetchStats()
  }, [fetchStats])

  return {
    stats,
    cookieStatus,
    postMethodStats,
    apiCredits,
    apiLoginStatus,
    postMethodSetting,
    setPostMethodSetting,
    fetchStats,
    refetch,
  }
}
