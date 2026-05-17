'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { apiClient, ApiError } from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'

export function useAdminAuth() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  // adminToken is kept as a truthy indicator for backward compat with hooks
  // that check `if (!adminToken) return`. The actual auth is via HttpOnly cookie.
  const [adminToken, setAdminToken] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginOpen, setLoginOpen] = useState(false)
  const { toast } = useToast()
  const initialCheckDone = useRef(false)

  // Check if the HttpOnly cookie-based session is valid on mount
  useEffect(() => {
    if (initialCheckDone.current) return
    initialCheckDone.current = true

    apiClient.getStats().then(() => {
      // Cookie is valid — we're authenticated
      setIsAdmin(true)
      setAdminToken('session')
    }).catch(() => {
      // Not authenticated or session expired
    }).finally(() => {
      setIsChecking(false)
    })
  }, [])

  const login = useCallback(async (password: string) => {
    try {
      await apiClient.adminLogin(password)
      // Server sets the HttpOnly cookie — client just tracks state
      setIsAdmin(true)
      setAdminToken('session')
      setLoginOpen(false)
      setLoginPassword('')
      toast({ title: 'Login berhasil!', description: 'Selamat datang, Admin.' })
      return true
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.message : (err instanceof Error ? err.message : 'Login gagal')
      toast({ title: 'Login gagal', description: message, variant: 'destructive' })
      return false
    }
  }, [toast])

  const logout = useCallback(async () => {
    try {
      await apiClient.adminLogout()
    } catch {
      // Best effort — clear local state regardless
    }
    setIsAdmin(false)
    setAdminToken('')
    toast({ title: 'Logout berhasil' })
  }, [toast])

  return {
    isAdmin,
    isChecking,
    adminToken,
    login,
    logout,
    loginPassword,
    setLoginPassword,
    loginOpen,
    setLoginOpen,
  }
}
