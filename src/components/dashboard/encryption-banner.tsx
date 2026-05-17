'use client'

import { ShieldAlert } from 'lucide-react'

interface EncryptionBannerProps {
  encryptionEnabled: boolean | undefined
}

export function EncryptionBanner({ encryptionEnabled }: EncryptionBannerProps) {
  // Don't show until we know the status (undefined = still loading)
  if (encryptionEnabled === undefined || encryptionEnabled === true) return null

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-start gap-2">
      <ShieldAlert className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
      <div className="space-y-1">
        <p className="text-sm font-medium text-amber-800">
          Enkripsi tidak aktif
        </p>
        <p className="text-xs text-amber-700">
          ENCRYPTION_KEY belum dikonfigurasi. Data sensitif (API key, cookie, password) disimpan dalam plaintext di database.
          Buat key dengan <code className="bg-amber-100 px-1 rounded">openssl rand -hex 32</code> lalu set di environment variables.
        </p>
      </div>
    </div>
  )
}
