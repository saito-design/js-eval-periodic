import { NextRequest } from 'next/server'

/** ポータルのロール種別 */
export type PortalRole = 'owner' | 'manager' | 'store' | 'staff'

/** デコード済み認証情報 */
export interface DecodedAuth {
  role: PortalRole
  company: string
  storeId?: string
  exp: number
}

/**
 * リクエストから認証トークンを取得・検証する。
 * Authorization: Bearer <token> ヘッダーを想定。
 * 検証に失敗した場合は null を返す。
 */
export function getAuthFromRequest(request: NextRequest): DecodedAuth | null {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.slice(7)
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'))
    if (
      typeof decoded.role !== 'string' ||
      typeof decoded.company !== 'string' ||
      typeof decoded.exp !== 'number'
    ) {
      return null
    }
    if (decoded.exp < Date.now()) return null
    return decoded as DecodedAuth
  } catch {
    return null
  }
}

/** ロールが「自店舗のみ」に制限されるかどうか */
export function isStoreRestricted(role: PortalRole): boolean {
  return role === 'store' || role === 'staff'
}
