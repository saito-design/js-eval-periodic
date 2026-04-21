'use client'

import { createContext, useContext } from 'react'

/** ポータルのロール種別 */
export type PortalRole = 'owner' | 'manager' | 'store' | 'staff'

/** 認証情報 */
export interface AuthInfo {
  role: PortalRole
  company: string
  storeId?: string
  token: string
}

const AuthContext = createContext<AuthInfo | null>(null)

export function AuthProvider({
  value,
  children,
}: {
  value: AuthInfo
  children: React.ReactNode
}) {
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthInfo {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}

/** トークンをデコードする */
export function decodeAuthToken(
  token: string
): { role: PortalRole; company: string; storeId?: string; exp: number } | null {
  try {
    return JSON.parse(atob(token))
  } catch {
    return null
  }
}

/** ロールが「自店舗のみ」に制限されるかどうか */
export function isStoreRestricted(role: PortalRole): boolean {
  return role === 'store' || role === 'staff'
}

/** ロールが管理系（owner/manager）かどうか */
export function isAdminRole(role: PortalRole): boolean {
  return role === 'owner' || role === 'manager'
}
