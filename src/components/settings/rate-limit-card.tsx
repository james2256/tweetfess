'use client'

import { useState } from 'react'
import { Clock, ChevronDown, Loader2, Shield } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { RateLimitSettings } from '@/types'

interface RateLimitCardProps {
  rateLimits: RateLimitSettings
  setRateLimits: (v: RateLimitSettings) => void
  isSaving: boolean
  saveFilterSettings: () => void
}

const RATE_FIELDS: { key: keyof RateLimitSettings; label: string; hint: string; min: number; max: number }[] = [
  { key: 'submissionCooldown', label: 'Cooldown (menit)', hint: 'Antar pesan per user', min: 0, max: 60 },
  { key: 'submissionDailyCap', label: 'Batas harian', hint: 'Pesan/user/hari', min: 1, max: 100 },
  { key: 'userPendingCap', label: 'Batas antrean/user', hint: 'Maks pesan pending per user', min: 1, max: 50 },
  { key: 'globalSubmissionDailyCap', label: 'Batas harian global', hint: 'Maks pesan dari semua user/hari', min: 0, max: 10000 },
  { key: 'autoPostCooldown', label: 'Auto-post jeda (detik)', hint: 'Antar tweet ke X', min: 0, max: 120 },
  { key: 'autoPostWindowCap', label: 'Batas auto-post', hint: 'Maks tweet per window', min: 0, max: 500 },
  { key: 'autoPostWindowMinutes', label: 'Window (menit)', hint: 'Ukuran window waktu', min: 1, max: 1440 },
  { key: 'userPostDailyCap', label: 'Batas post/user/hari', hint: 'Maks tweet per user per hari di X', min: 0, max: 100 },
]

export function RateLimitCard({
  rateLimits,
  setRateLimits,
  isSaving,
  saveFilterSettings,
}: RateLimitCardProps) {
  const [open, setOpen] = useState(true)

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="shadow-sm border-[#EFF3F4]">
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-[#F7F9F9]/50 rounded-t-lg transition-colors">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#536471]" /> Rate Limiting
              <Badge variant="outline" className="text-[9px] px-1 py-0 bg-[#F7F9F9] text-[#536471] border-[#EFF3F4]">
                {rateLimits.submissionCooldown}m / {rateLimits.submissionDailyCap}/day
              </Badge>
              <ChevronDown className={`w-4 h-4 text-[#71767B] ml-auto transition-transform ${open ? 'rotate-180' : ''}`} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {RATE_FIELDS.map((field) => (
                <div key={field.key}>
                  <label className="text-[10px] font-medium text-[#536471] block mb-1">{field.label}</label>
                  <Input
                    type="number"
                    min={field.min}
                    max={field.max}
                    value={rateLimits[field.key]}
                    onChange={(e) => setRateLimits({ ...rateLimits, [field.key]: parseInt(e.target.value) || field.min })}
                    className="text-xs h-8"
                  />
                  <p className="text-[9px] text-[#71767B] mt-0.5">{field.hint}</p>
                </div>
              ))}
            </div>
            <div className="bg-[#F7F9F9] rounded-lg p-2 border border-[#EFF3F4] space-y-1">
              <p className="text-[10px] font-medium text-[#536471]">Cara kerja:</p>
              <ul className="text-[10px] text-[#71767B] space-y-0.5 list-disc list-inside">
                <li><strong>Cooldown</strong> — user harus menunggu sebelum kirim pesan lagi</li>
                <li><strong>Batas harian</strong> — maksimal pesan per user per 24 jam</li>
                <li><strong>Batas antrean/user</strong> — maks {rateLimits.userPendingCap} pesan pending per user, sisanya ditolak</li>
                <li><strong>Batas harian global</strong> — maks {rateLimits.globalSubmissionDailyCap} pesan dari semua user per hari</li>
                <li><strong>Auto-post jeda</strong> — jika ada pesan baru dalam {rateLimits.autoPostCooldown} detik setelah auto-post terakhir, masuk antrean admin</li>
                <li><strong>Batas auto-post</strong> — maks {rateLimits.autoPostWindowCap} tweet per {rateLimits.autoPostWindowMinutes} menit, mencegah 226 dari X</li>
                <li><strong>Batas post/user</strong> — maks {rateLimits.userPostDailyCap} tweet per user per hari di X, sisanya masuk antrean</li>
              </ul>
            </div>
            <Button
              onClick={saveFilterSettings}
              disabled={isSaving}
              className="w-full bg-[#0F1419] hover:bg-[#272c30]"
            >
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Shield className="w-4 h-4 mr-2" />}
              Simpan Rate Limits
            </Button>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
