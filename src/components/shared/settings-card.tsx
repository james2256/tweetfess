'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import type { LucideIcon } from 'lucide-react'

interface SettingsCardProps {
  icon: LucideIcon
  iconClassName?: string
  title: string
  badges?: React.ReactNode
  defaultOpen?: boolean
  contentClassName?: string
  children: React.ReactNode
}

export function SettingsCard({
  icon: Icon,
  iconClassName = 'text-[#536471]',
  title,
  badges,
  defaultOpen = true,
  contentClassName = 'space-y-4',
  children,
}: SettingsCardProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="shadow-sm border-[#EFF3F4]">
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-[#F7F9F9]/50 rounded-t-lg transition-colors">
            <CardTitle className="text-sm sm:text-base flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <Icon className={`w-4 h-4 shrink-0 ${iconClassName}`} /> <span>{title}</span>
              {badges}
              <ChevronDown className={`w-4 h-4 text-[#71767B] ml-auto transition-transform ${open ? 'rotate-180' : ''}`} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className={contentClassName}>
            {children}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
