'use client'

import { useState } from 'react'
import {
  ChevronDown,
  Activity,
  RotateCcw,
  Loader2,
  Shield,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { CircuitBreakerStatus, RateLimitSettings } from '@/types'

interface CircuitBreakerCardProps {
  circuitBreakerStatus: CircuitBreakerStatus | null
  liveRemainingMinutes: number
  rateLimits: RateLimitSettings
  setRateLimits: (v: RateLimitSettings) => void
  reset: () => void
  isSaving: boolean
  saveFilterSettings: () => void
}

export function CircuitBreakerCard({
  circuitBreakerStatus,
  liveRemainingMinutes,
  rateLimits,
  setRateLimits,
  reset,
  isSaving,
  saveFilterSettings,
}: CircuitBreakerCardProps) {
  const [open, setOpen] = useState(true)

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="shadow-sm border-[#EFF3F4]">
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-[#F7F9F9]/50 rounded-t-lg transition-colors">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#536471]" /> Circuit Breaker
              {circuitBreakerStatus?.paused && (
                <Badge variant="destructive" className="text-[9px] px-1.5 py-0">
                  PAUSED — {liveRemainingMinutes}m tersisa
                </Badge>
              )}
              {!circuitBreakerStatus?.paused && circuitBreakerStatus && circuitBreakerStatus.failCount > 0 && (
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                  {circuitBreakerStatus.failCount}/{circuitBreakerStatus.threshold} gagal
                </Badge>
              )}
              {!circuitBreakerStatus?.paused && (!circuitBreakerStatus || circuitBreakerStatus.failCount === 0) && (
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-green-50 text-green-700 border-green-300">
                  Active
                </Badge>
              )}
              <ChevronDown className={`w-4 h-4 text-[#71767B] ml-auto transition-transform ${open ? 'rotate-180' : ''}`} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-3">
            {/* Status display */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium text-[#536471]">Status</span>
              {circuitBreakerStatus?.paused && (
                <>
                  <Badge variant="destructive" className="text-[9px] px-1.5 py-0">
                    PAUSED — {liveRemainingMinutes}m tersisa
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-[9px] h-5 px-2 ml-auto"
                    onClick={reset}
                  >
                    <RotateCcw className="w-3 h-3 mr-1" /> Reset
                  </Button>
                </>
              )}
              {!circuitBreakerStatus?.paused && circuitBreakerStatus && circuitBreakerStatus.failCount > 0 && (
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                  {circuitBreakerStatus.failCount}/{circuitBreakerStatus.threshold} gagal
                </Badge>
              )}
              {!circuitBreakerStatus?.paused && (!circuitBreakerStatus || circuitBreakerStatus.failCount === 0) && (
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-green-50 text-green-700 border-green-300">
                  ✅ Active — no recent failures
                </Badge>
              )}
            </div>

            {/* Threshold + Cooldown inputs */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-medium text-[#536471] block mb-1">Kegagalan berturut-turut</label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={rateLimits.circuitBreakerThreshold}
                  onChange={(e) => setRateLimits({ ...rateLimits, circuitBreakerThreshold: parseInt(e.target.value) || 1 })}
                  className="text-xs h-8"
                />
                <p className="text-[9px] text-[#71767B] mt-0.5">Gagal N kali → pause auto-post</p>
              </div>
              <div>
                <label className="text-[10px] font-medium text-[#536471] block mb-1">Jeda circuit breaker (menit)</label>
                <Input
                  type="number"
                  min={1}
                  max={1440}
                  value={rateLimits.circuitBreakerCooldownMinutes}
                  onChange={(e) => setRateLimits({ ...rateLimits, circuitBreakerCooldownMinutes: parseInt(e.target.value) || 1 })}
                  className="text-xs h-8"
                />
                <p className="text-[9px] text-[#71767B] mt-0.5">Durasi pause auto-post</p>
              </div>
            </div>

            {/* How it works */}
            <div className="bg-[#F7F9F9] rounded-lg p-2 border border-[#EFF3F4] space-y-1">
              <p className="text-[10px] font-medium text-[#536471]">Cara kerja:</p>
              <ul className="text-[10px] text-[#71767B] space-y-0.5 list-disc list-inside">
                <li>Jika {rateLimits.circuitBreakerThreshold}x gagal posting berturut-turut, auto-post di-pause selama {rateLimits.circuitBreakerCooldownMinutes} menit</li>
                <li>Submissions masih bisa di-approve manual oleh admin saat circuit breaker aktif</li>
                <li>Reset manual untuk melanjutkan auto-post sebelum waktu habis</li>
              </ul>
            </div>

            <Button
              onClick={saveFilterSettings}
              disabled={isSaving}
              className="w-full bg-[#0F1419] hover:bg-[#272c30]"
            >
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Shield className="w-4 h-4 mr-2" />}
              Simpan Circuit Breaker
            </Button>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
