'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { MAX_LOGIN_ATTEMPTS, LOGIN_LOCKOUT_SECONDS } from '@/lib/loginLockout'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [lockedUntil, setLockedUntil] = useState<number | null>(null)
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const router = useRouter()
  const supabase = createClient()

  // ロック中は1秒ごとに残り時間を更新し、時間が来たら自動解除する
  useEffect(() => {
    if (!lockedUntil) return
    const interval = setInterval(() => {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000)
      if (remaining <= 0) {
        setLockedUntil(null)
        setFailedAttempts(0)
        clearInterval(interval)
      } else {
        setRemainingSeconds(remaining)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [lockedUntil])

  const isLocked = lockedUntil !== null

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (isLocked) return
    setErrorMsg('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      const nextAttempts = failedAttempts + 1
      if (nextAttempts >= MAX_LOGIN_ATTEMPTS) {
        setLockedUntil(Date.now() + LOGIN_LOCKOUT_SECONDS * 1000)
        setRemainingSeconds(LOGIN_LOCKOUT_SECONDS)
        setFailedAttempts(0)
        setErrorMsg(`ログイン失敗が続いたため、${LOGIN_LOCKOUT_SECONDS}秒間ログインを制限します。`)
      } else {
        setFailedAttempts(nextAttempts)
        setErrorMsg('ログインに失敗しました。メールアドレスまたはパスワードを確認してください。')
      }
    } else {
      router.push('/admin/dashboard')
      router.refresh()
    }
  }

  return (
    <main className="max-w-md mx-auto p-4 min-h-screen flex items-center justify-center">
      <div className="w-full p-6 bg-white border rounded-lg shadow-md">
        <h1 className="text-xl font-bold mb-6 text-center text-gray-800">運営者ログイン</h1>
        {errorMsg && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">
            {errorMsg}
          </div>
        )}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">パスワード</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={isLocked}
            className="w-full py-2 bg-gray-800 text-white font-semibold rounded hover:bg-gray-900 transition disabled:opacity-50"
          >
            {isLocked ? `${remainingSeconds}秒後に再試行可能` : 'ログイン'}
          </button>
        </form>
      </div>
    </main>
  )
}