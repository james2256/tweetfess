'use client'

import { useState } from 'react'
import { Users, Ban, Filter, RefreshCw, Loader2, User } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { SubmitterWithStats } from '@/types'

interface UsersDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  submitters: SubmitterWithStats[]
  blockedUsernames: string[]
  isLoading: boolean
  onFetchSubmitters: () => void
  onBlock: (username: string) => Promise<void>
  onUnblock: (username: string) => Promise<void>
}

export function UsersDialog({
  open,
  onOpenChange,
  submitters,
  blockedUsernames,
  isLoading,
  onFetchSubmitters,
  onBlock,
  onUnblock,
}: UsersDialogProps) {
  const [search, setSearch] = useState('')

  // Reset search when dialog closes
  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen)
    if (!isOpen) setSearch('')
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" /> Pengguna
          </DialogTitle>
          <DialogDescription>
            Kelola pengguna — blokir yang spam atau bermasalah.
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Input
            placeholder="Cari username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs border-[#EFF3F4]"
          />
          <Filter className="w-3.5 h-3.5 text-[#71767B] absolute left-2.5 top-1/2 -translate-y-1/2" />
          {search && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#71767B] hover:text-[#0F1419]"
              onClick={() => setSearch('')}
            >
              ×
            </button>
          )}
        </div>

        <div
          className="flex-1 overflow-y-auto space-y-4 pr-1"
          style={{ scrollbarWidth: 'thin' }}
        >
          {/* Blocklist */}
          {blockedUsernames.filter((u) =>
            u.includes(search.toLowerCase())
          ).length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Ban className="w-4 h-4 text-red-500" />
                <span className="text-sm font-semibold text-[#0F1419]">
                  Blocklist
                </span>
                <Badge
                  variant="destructive"
                  className="text-[9px] px-1.5 py-0"
                >
                  {blockedUsernames.length} diblokir
                </Badge>
              </div>
              <div className="space-y-1">
                {blockedUsernames
                  .filter((u) => u.includes(search.toLowerCase()))
                  .map((username) => (
                    <div
                      key={username}
                      className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg text-xs"
                    >
                      <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                        <Ban className="w-3.5 h-3.5 text-red-400" />
                      </div>
                      <span className="font-medium text-[#0F1419]">
                        @{username}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-[10px] h-6 px-2 ml-auto text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200 flex-shrink-0"
                        onClick={() => onUnblock(username)}
                      >
                        Unblock
                      </Button>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* All Users */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#536471]" />
              <span className="text-sm font-semibold text-[#0F1419]">
                Semua Pengguna
              </span>
              {submitters.length > 0 && (
                <Badge
                  variant="secondary"
                  className="text-[9px] px-1.5 py-0"
                >
                  {submitters.length}
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                className="text-[10px] h-6 px-2 ml-auto"
                onClick={onFetchSubmitters}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3" />
                )}
              </Button>
            </div>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-[#536471]" />
              </div>
            ) : submitters.length === 0 ? (
              <p className="text-xs text-[#71767B] text-center py-6">
                Klik refresh untuk memuat daftar pengguna
              </p>
            ) : (
              <div
                className="max-h-96 overflow-y-auto space-y-1 pr-1"
                style={{ scrollbarWidth: 'thin' }}
              >
                {(() => {
                  const filtered = submitters.filter((s) => {
                    if (!search) return true
                    const q = search.toLowerCase()
                    return (
                      s.username.toLowerCase().includes(q) ||
                      (s.displayName?.toLowerCase().includes(q) ?? false)
                    )
                  })
                  if (filtered.length === 0 && search) {
                    return (
                      <div className="text-center py-6">
                        <p className="text-xs text-[#536471]">
                          Tidak ada hasil untuk &ldquo;{search}&rdquo;
                        </p>
                        <Button
                          variant="link"
                          className="text-xs text-[#71767B] mt-1"
                          onClick={() => setSearch('')}
                        >
                          Hapus pencarian
                        </Button>
                      </div>
                    )
                  }
                  return filtered.map((s) => {
                    const isBlocked = blockedUsernames.includes(
                      s.username.toLowerCase()
                    )
                    return (
                      <div
                        key={s.id}
                        className={`flex items-center gap-2 p-2 rounded-lg text-xs ${
                          isBlocked
                            ? 'bg-red-50 border border-red-200'
                            : 'bg-[#F7F9F9] border border-[#EFF3F4]'
                        }`}
                      >
                        {s.profileImage ? (
                          <img
                            src={s.profileImage}
                            alt=""
                            className="w-8 h-8 rounded-full flex-shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-[#EFF3F4] flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-[#71767B]" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-[#0F1419] truncate">
                              @{s.username}
                            </span>
                            {isBlocked && (
                              <Badge
                                variant="destructive"
                                className="text-[8px] px-1 py-0"
                              >
                                BLOCKED
                              </Badge>
                            )}
                          </div>
                          <span className="text-[#71767B]">
                            {s.totalSubmissions} pesan · {s.posted} posted ·{' '}
                            {s.pending} pending
                          </span>
                        </div>
                        {!isBlocked ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-[10px] h-6 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 flex-shrink-0"
                            onClick={() => onBlock(s.username)}
                          >
                            <Ban className="w-3 h-3 mr-1" /> Block
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-[10px] h-6 px-2 text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200 flex-shrink-0"
                            onClick={() => onUnblock(s.username)}
                          >
                            Unblock
                          </Button>
                        )}
                      </div>
                    )
                  })
                })()}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
