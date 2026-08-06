'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setErrorMsg('ログインに失敗しました。メールアドレスまたはパスワードを確認してください。')
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
            className="w-full py-2 bg-gray-800 text-white font-semibold rounded hover:bg-gray-900 transition"
          >
            ログイン
          </button>
        </form>
      </div>
    </main>
  )
}