'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Submission, SubmitterInfo } from '@/types'
import { apiClient } from '@/lib/api-client'

interface UseMyPostsParams {
  submitter: SubmitterInfo | null
  isAnonUser: boolean
}

export function useMyPosts({ submitter, isAnonUser }: UseMyPostsParams) {
  const [myPosts, setMyPosts] = useState<Submission[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchMyPosts = useCallback(async () => {
    if (!submitter) return
    setIsLoading(true)
    try {
      const data = await apiClient.getMyPosts()
      setMyPosts(data.submissions)
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
    }
  }, [submitter, isAnonUser, fetchMyPosts])

  const refetch = useCallback(async () => {
    return fetchMyPosts()
  }, [fetchMyPosts])

  return {
    myPosts,
    isLoading,
    fetchMyPosts,
    refetch,
  }
}
