'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { CircuitBreakerStatus } from '@/types'
import { apiClient } from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'

interface UseCircuitBreakerParams {
  adminToken: string
}

export function useCircuitBreaker({ adminToken }: UseCircuitBreakerParams) {
  const [circuitBreakerStatus, setCircuitBreakerStatus] = useState<CircuitBreakerStatus | null>(null)
  const [liveRemainingMinutes, setLiveRemainingMinutes] = useState(0)
  const { toast } = useToast()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Compute live countdown from pausedUntil timestamp
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (!circuitBreakerStatus?.paused || !circuitBreakerStatus.pausedUntil) {
      return
    }

    const compute = () => {
      const remaining = circuitBreakerStatus.pausedUntil! - Date.now()
      if (remaining <= 0) {
        setLiveRemainingMinutes(0)
        // Auto-clear paused state when timer expires
        setCircuitBreakerStatus((prev) => prev ? { ...prev, paused: false, pausedUntil: null } : null)
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
        return
      }
      setLiveRemainingMinutes(Math.ceil(remaining / 60000))
    }

    // Start interval — the first tick after 1s will set the initial value
    // This avoids calling setState directly in the effect body
    intervalRef.current = setInterval(compute, 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [circuitBreakerStatus?.paused, circuitBreakerStatus?.pausedUntil])

  // Accept initial status from stats response
  const setStatus = useCallback((status: CircuitBreakerStatus | null) => {
    setCircuitBreakerStatus(status)
  }, [])

  const reset = useCallback(async () => {
    if (!adminToken) return
    try {
      await apiClient.resetCircuitBreaker()
      setCircuitBreakerStatus((prev) => prev ? { ...prev, paused: false, failCount: 0, pausedUntil: null } : null)
      toast({ title: 'Circuit breaker direset' })
    } catch {
      // ignore
    }
  }, [adminToken, toast])

  return {
    circuitBreakerStatus,
    liveRemainingMinutes,
    setStatus,
    reset,
  }
}
