'use client'

import { Activity } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { PostMethodStats } from '@/types'

interface PostMethodRatesProps {
  postMethodStats: PostMethodStats
}

export function PostMethodRates({ postMethodStats }: PostMethodRatesProps) {
  if (postMethodStats.total === 0) return null

  return (
    <Card className="shadow-sm border-[#EFF3F4]">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#536471]" /> Post Method Rate
          <span className="text-[10px] text-[#71767B] font-normal">
            {postMethodStats.total} post terakhir
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Direct */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#536471] flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              Normal POST
            </span>
            <span className="text-xs font-bold text-[#0F1419]">
              {postMethodStats.directRate}%
            </span>
          </div>
          <div className="w-full bg-[#F7F9F9] rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${postMethodStats.directRate}%` }}
            />
          </div>
          <span className="text-[10px] text-[#71767B]">
            {postMethodStats.direct}/{postMethodStats.total} via direct cookie
          </span>
        </div>
        {/* Retry */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#536471] flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              Retry (226/empty)
            </span>
            <span className="text-xs font-bold text-[#0F1419]">
              {postMethodStats.retryRate}%
            </span>
          </div>
          <div className="w-full bg-[#F7F9F9] rounded-full h-2">
            <div
              className="bg-amber-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${postMethodStats.retryRate}%` }}
            />
          </div>
          <span className="text-[10px] text-[#71767B]">
            {postMethodStats.retry}/{postMethodStats.total} setelah retry
          </span>
        </div>
        {/* Fallback */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#536471] flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-purple-500" />
              API Fallback
            </span>
            <span className="text-xs font-bold text-[#0F1419]">
              {postMethodStats.fallbackRate}%
            </span>
          </div>
          <div className="w-full bg-[#F7F9F9] rounded-full h-2">
            <div
              className="bg-purple-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${postMethodStats.fallbackRate}%` }}
            />
          </div>
          <span className="text-[10px] text-[#71767B]">
            {postMethodStats.fallback}/{postMethodStats.total} via twitterapi.io
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
