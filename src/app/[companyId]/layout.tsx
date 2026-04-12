'use client'

import { useParams, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Home } from 'lucide-react'
import { FeedbackButton } from '@/components/FeedbackButton'

const PORTAL_URL = process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3000'

const COMPANY_CONFIG: Record<string, { name: string; displayName: string }> = {
  junestry: {
    name: 'junestry',
    displayName: '株式会社ジュネストリー',
  },
}

// オーナーアカウント
const OWNER_ACCOUNTS: Record<string, string> = {
  'junestry': 'owner',
}

function decodeToken(token: string): { role: string; company: string; exp: number } | null {
  try {
    return JSON.parse(atob(token))
  } catch {
    return null
  }
}

function generateToken(role: string, companyId: string): string {
  const payload = {
    role,
    company: companyId,
    exp: Date.now() + 24 * 60 * 60 * 1000,
  }
  return btoa(JSON.stringify(payload))
}

export default function CompanyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const params = useParams()
  const searchParams = useSearchParams()
  const companyId = params.companyId as string
  const company = COMPANY_CONFIG[companyId] || { name: companyId, displayName: companyId }

  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)
  const [authToken, setAuthToken] = useState<string>('')
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')

  useEffect(() => {
    const urlToken = searchParams.get('auth_token')

    if (urlToken) {
      const decoded = decodeToken(urlToken)
      if (decoded && decoded.exp > Date.now() && decoded.company === companyId) {
        sessionStorage.setItem(`auth_${companyId}`, urlToken)
        setAuthToken(urlToken)
        setIsAuthorized(true)
        window.history.replaceState({}, '', window.location.pathname)
        return
      }
    }

    const sessionToken = sessionStorage.getItem(`auth_${companyId}`)
    if (sessionToken) {
      const decoded = decodeToken(sessionToken)
      if (decoded && decoded.exp > Date.now() && decoded.company === companyId) {
        setAuthToken(sessionToken)
        setIsAuthorized(true)
        return
      } else {
        sessionStorage.removeItem(`auth_${companyId}`)
      }
    }

    setIsAuthorized(false)
  }, [companyId, searchParams])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')

    // オーナーアカウント確認
    if (loginId === companyId && password === OWNER_ACCOUNTS[companyId]) {
      const token = generateToken('owner', companyId)
      sessionStorage.setItem(`auth_${companyId}`, token)
      setAuthToken(token)
      setIsAuthorized(true)
    } else {
      setLoginError('IDまたはパスワードが正しくありません')
    }
  }

  if (isAuthorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500 text-sm">認証確認中...</div>
      </div>
    )
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm max-w-sm w-full">
          <h2 className="text-lg font-bold text-gray-900 mb-2 text-center">定量定性評価</h2>
          <p className="text-sm text-gray-500 mb-6 text-center">{company.displayName}</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">ログインID</label>
              <input
                type="text"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="ログインID"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">パスワード</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="パスワード"
              />
            </div>

            {loginError && (
              <p className="text-xs text-red-500 text-center">{loginError}</p>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              ログイン
            </button>
          </form>

          <div className="mt-6 pt-4 border-t text-center">
            <a href={PORTAL_URL} className="text-sm text-teal-600 hover:text-teal-800">
              ポータルへ移動
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-lg font-bold text-gray-900">定量定性評価</h1>
              <span className="text-xs text-gray-500">{company.displayName}</span>
            </div>
            <nav className="flex items-center gap-6">
              <a href={`/${companyId}`} className="text-sm text-gray-600 hover:text-gray-900">
                ダッシュボード
              </a>
              <a href={`/${companyId}/evaluations`} className="text-sm text-gray-600 hover:text-gray-900">
                評価一覧
              </a>
              <a href={`/${companyId}/rankings`} className="text-sm text-gray-600 hover:text-gray-900">
                ランキング
              </a>
              <a href={`/${companyId}/rules`} className="text-sm text-gray-600 hover:text-gray-900">
                評価ルール
              </a>
              <div className="h-4 w-px bg-gray-300" />
              <button
                onClick={() => { window.close(); window.location.href = `${PORTAL_URL}?auth_token=${authToken}` }}
                className="flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-800"
              >
                <Home size={14} />
                ポータル
              </button>
            </nav>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-6">
        {children}
      </main>
      <FeedbackButton appId="teiryou" appName="定量定性評価" tokenKey={`auth_${companyId}`} />
    </>
  )
}
