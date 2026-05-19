'use client'

import { UserCheck } from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { UserListCard } from '@/components/shared/user-list-card'
import type { UserListCardConfig } from '@/components/shared/user-list-card'

const WHITELIST_CONFIG: UserListCardConfig = {
  icon: UserCheck,
  title: 'Whitelist',
  description: 'User di whitelist bebas dari cooldown & batas harian. Berguna untuk testing. Dikelola secara atomik — tidak akan bentrok jika ada admin lain yang sedang mengubah.',
  emptyText: 'Belum ada user di whitelist',
  duplicateText: 'User sudah ada di whitelist',
  addErrorText: 'Gagal menambahkan ke whitelist',
  addApi: (username) => apiClient.whitelistUser(username),
  removeApi: (username) => apiClient.unwhitelistUser(username),
  addSuccessText: (username) => `${username} ditambahkan ke whitelist`,
  removeSuccessText: (username) => `${username} dihapus dari whitelist`,
  removeErrorText: 'Gagal menghapus dari whitelist',
  addButtonClass: 'bg-[#0F1419] hover:bg-[#272c30]',
  badgeClass: '',
  rowClass: 'bg-[#F7F9F9]',
  usernameClass: 'text-[#0F1419]',
  removeButtonHoverClass: 'hover:text-red-500 hover:bg-red-50',
}

interface WhitelistCardProps {
  whitelistUsernames: string[]
  onWhitelistChange: () => void
}

export function WhitelistCard({ whitelistUsernames, onWhitelistChange }: WhitelistCardProps) {
  return (
    <UserListCard
      config={WHITELIST_CONFIG}
      usernames={whitelistUsernames}
      onChange={onWhitelistChange}
    />
  )
}
