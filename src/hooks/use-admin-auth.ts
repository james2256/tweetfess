'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { apiClient } from '@/lib/api-client'
import { setAdminCookie, getAdminCookie, clearAdminCookie } from '@/types'
import { useToast } from '@/hooks/use-toast'

export function useAdminAuth() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const [adminToken, setAdminToken] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginOpen, setLoginOpen] = useState(false)
  const { toast } = useToast()
  const initialCheckDone = useRef(false)

  // Restore admin session from cookie on mount
  useEffect(() => {
    if (initialCheckDone.current) return
    initialCheckDone.current = true

    const savedToken = getAdminCookie()
    if (savedToken) {
      // Verify the token is still valid by calling stats
      apiClient.setAdminToken(savedToken)
      apiClient.getStats().then(() => {
        // Token is valid
        setIsAdmin(true)
        setAdminToken(savedToken)
      }).catch(() => {
        // Token invalid — clear cookie
        apiClient.setAdminToken(null)
        clearAdminCookie()
      }).finally(() => {
        setIsChecking(false)
      })
    } else {
      // No saved token — use a microtask to avoid setState in effect
      queueMicrotask(() => setIsChecking(false))
    }
  }, [])

  const login = useCallback(async (password: string) => {
    try {
      const data = await apiClient.adminLogin(password)
      setIsAdmin(true)
      setAdminToken(data.token)
      setAdminCookie(data.token)
      apiClient.setAdminToken(data.token)
      setLoginOpen(false)
      setLoginPassword('')
      toast({ title: 'Login berhasil!', description: 'Selamat datang, Admin.' })
      return true
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login gagal'
      toast({ title: 'Login gagal', description: message, variant: 'destructive' })
      return false
    }
  }, [toast])

  const logout = useCallback(() => {
    setIsAdmin(false)
    setAdminToken('')
    apiClient.setAdminToken(null)
    clearAdminCookie()
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
