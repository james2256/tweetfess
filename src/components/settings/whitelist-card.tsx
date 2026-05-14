'use client'

import { useState } from 'react'
import { UserCheck, ChevronDown, Loader2, Shield } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface WhitelistCardProps {
  whitelistText: string
  setWhitelistText: (v: string) => void
  isSaving: boolean
  saveFilterSettings: () => void
}

export function WhitelistCard({
  whitelistText,
  setWhitelistText,
  isSaving,
  saveFilterSettings,
}: WhitelistCardProps) {
  const [open, setOpen] = useState(true)

  const userCount = whitelistText.split(/[,\n]+/).filter(u => u.trim()).length

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="shadow-sm border-[#EFF3F4]">
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-[#F7F9F9]/50 rounded-t-lg transition-colors">
            <CardTitle className="text-base flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-[#536471]" /> Whitelist
              {userCount > 0 && (
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                  {userCount} user
                </Badge>
              )}
              <ChevronDown className={`w-4 h-4 text-[#71767B] ml-auto transition-transform ${open ? 'rotate-180' : ''}`} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-3">
            <div>
              <label className="text-[10px] font-medium text-[#536471] block mb-1">Username X (bypass rate limit)</label>
              <Textarea
                value={whitelistText}
                onChange={(e) => setWhitelistText(e.target.value)}
                placeholder="username1, username2, username3"
                className="text-xs min-h-[60px] font-mono border-[#EFF3F4]"
              />
              <p className="text-[9px] text-[#71767B] mt-1">Pisahkan dengan koma atau baris baru. User ini bebas dari cooldown & batas harian. Berguna untuk testing.</p>
            </div>
            <Button
              onClick={saveFilterSettings}
              disabled={isSaving}
              className="w-full bg-[#0F1419] hover:bg-[#272c30]"
            >
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Shield className="w-4 h-4 mr-2" />}
              Simpan Whitelist
            </Button>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
