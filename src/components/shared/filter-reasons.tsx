'use client'

import { Badge } from '@/components/ui/badge'
import { ShieldAlert } from 'lucide-react'
import { getFilterReasonLabel, parseFilterReasons } from '@/types'

interface FilterReasonsProps {
  filterReasons: string | null
}

export function FilterReasons({ filterReasons }: FilterReasonsProps) {
  const reasons = parseFilterReasons(filterReasons)
  if (reasons.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      <Badge
        variant="outline"
        className="text-[8px] px-1 py-0 bg-amber-50 text-amber-700 border-amber-200 gap-0.5"
      >
        <ShieldAlert className="w-2.5 h-2.5" />
        {reasons.length} filter flag{reasons.length > 1 ? 's' : ''}
      </Badge>
      {reasons.slice(0, 3).map((reason, i) => {
        const label = getFilterReasonLabel(reason)
        return (
          <span
            key={i}
            className="text-[8px] px-1 py-0.5 rounded bg-red-50 text-red-600 border border-red-200"
          >
            {label}
          </span>
        )
      })}
      {reasons.length > 3 && (
        <span className="text-[8px] text-[#71767B]">
          +{reasons.length - 3} more
        </span>
      )}
    </div>
  )
}
