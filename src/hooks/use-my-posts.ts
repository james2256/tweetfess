'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Submission, SubmitterInfo, SubmissionLimitsData } from '@/types'
import { apiClient } from '@/lib/api-client'

interface UseMyPostsParams {
  submitter: SubmitterInfo | null
  isAnonUser: boolean
}

export function useMyPosts({ submitter, isAnonUser }: UseMyPostsParams) {
  const [myPosts, setMyPosts] = useState<Submission[]>([])
  const [limits, setLimits] = useState<SubmissionLimitsData | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchMyPosts = useCallback(async () => {
    if (!submitter) return
    setIsLoading(true)
    try {
      const data = await apiClient.getMyPosts()
      setMyPosts(data.submissions)
      // Also capture limits data if present (now properly typed)
      if (data.limits) {
        setLimits(data.limits)
      }
    } catch {
      // silently fail
    } finally {
      setIsLoading(false)
    }
  }, [submitter])

  // Fetch my posts when user logs in
  useEffect(() => {
    if (submitter && !isAnonUser) {
      fetchMyPosts()
    } else {
      setMyPosts([])
      setLimits(null)
    }
  }, [submitter, isAnonUser, fetchMyPosts])

  const refetch = useCallback(async () => {
    return fetchMyPosts()
  }, [fetchMyPosts])

  return {
    myPosts,
    limits,
    isLoading,
    fetchMyPosts,
    refetch,
  }
}
