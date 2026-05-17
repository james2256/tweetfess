'use client'

import { Wifi, CircleDot, AlertTriangle, Cookie, Shield } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { CookieAuthStatus, ApiLoginStatus } from '@/types'

interface ConnectionBannerProps {
  cookieStatus: CookieAuthStatus | null
  apiLoginStatus: ApiLoginStatus | null
}

export function ConnectionBanner({ cookieStatus, apiLoginStatus }: ConnectionBannerProps) {
  // Show loading skeleton while data is still being fetched
  if (cookieStatus === null) {
    return (
      <Card className="shadow-sm border-[#EFF3F4]">
        <CardContent className="p-3">
          <div className="animate-pulse flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-200" />
            <div className="h-3 bg-gray-200 rounded w-24" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-sm border-[#EFF3F4]">
      <CardContent className="p-3">
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-x-4 sm:gap-y-2 text-xs">
          <span className="font-medium text-[#536471] flex items-center gap-1.5">
            <Wifi className="w-3.5 h-3.5" /> Connection
          </span>
          {/* Direct (Cookie) Status */}
          <span className="flex items-center gap-1.5">
            <CircleDot
              className={`w-3 h-3 ${
                cookieStatus?.configured
                  ? 'text-green-500 fill-green-500'
                  : 'text-red-500 fill-red-500'
              }`}
            />
            <span
              className={
                cookieStatus?.configured
                  ? 'text-green-700 font-medium'
                  : 'text-red-600'
              }
            >
              Direct: {cookieStatus?.configured ? 'Connected' : 'Not configured'}
            </span>
            {cookieStatus?.source && (
              <span className="text-[#71767B]">
                (via {cookieStatus.source === 'database' ? 'Database' : 'Env Var'})
              </span>
            )}
          </span>

          {/* Cookie API / V2 Login — show skeleton if apiLoginStatus still loading */}
          {apiLoginStatus === null ? (
            <span className="flex items-center gap-2">
              <span className="text-[#71767B] hidden sm:inline">|</span>
              <div className="animate-pulse flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-gray-200" />
                <div className="h-3 bg-gray-200 rounded w-20" />
              </div>
            </span>
          ) : (
            <>
              <span className="text-[#71767B] hidden sm:inline">|</span>
              {/* Cookie API Status (Layer 2) */}
              <span className="flex items-center gap-1.5">
                <Cookie className="w-3 h-3 text-[#536471]" />
                <span
                  className={
                    apiLoginStatus.cookieApiReady
                      ? 'text-green-700 font-medium'
                      : 'text-red-600'
                  }
                >
                  Cookie API: {apiLoginStatus.cookieApiReady ? 'Ready' : 'Not ready'}
                </span>
              </span>
              <span className="text-[#71767B] hidden sm:inline">|</span>
              {/* V2 Login Status (Layer 3) */}
              <span className="flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-[#536471]" />
                <span
                  className={
                    !apiLoginStatus.v2LoginEnabled
                      ? 'text-[#71767B]'
                      : apiLoginStatus.hasLoginCookie
                        ? 'text-green-700 font-medium'
                        : apiLoginStatus.hasCredentials
                          ? 'text-amber-600 font-medium'
                          : 'text-red-600'
                  }
                >
                  V2 Login:{' '}
                  {!apiLoginStatus.v2LoginEnabled
                    ? 'Off'
                    : apiLoginStatus.hasLoginCookie
                      ? 'Active'
                      : apiLoginStatus.hasCredentials
                        ? 'Need login'
                        : 'Not configured'}
                </span>
                {apiLoginStatus.v2LoginEnabled && apiLoginStatus.lastLoginAt && (
                  <span className="text-[#71767B]">
                    Last:{' '}
                    {new Date(apiLoginStatus.lastLoginAt).toLocaleDateString('id-ID', {
                      day: '2-digit',
                      month: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                )}
              </span>
            </>
          )}

          {/* Missing credentials warning */}
          {cookieStatus?.missing &&
            cookieStatus.missing.length > 0 &&
            !cookieStatus.configured && (
              <>
                <span className="text-[#71767B] hidden sm:inline">|</span>
                <span className="text-red-500 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Missing:{' '}
                  {cookieStatus.missing
                    .filter((k) => k !== 'x_query_id')
                    .map((k) => k.replace('x_', '').replace(/_/g, ' '))
                    .join(', ')}
                  {cookieStatus.missing.includes('x_query_id') && (
                    <span className="text-[#71767B]">(query ID: auto-fetch)</span>
                  )}
                </span>
              </>
            )}
        </div>
      </CardContent>
    </Card>
  )
}
