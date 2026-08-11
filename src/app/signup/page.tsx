'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { createCheckoutSession } from '@/app/actions/stripe'
import { LIFETIME_PLAN_PRICE_JPY } from '@/lib/plans'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [plan, setPlan] = useState<'free' | 'paid'>('free')
  const [errorMsg, setErrorMsg] = useState('')
  const [infoMsg, setInfoMsg] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg('')
    setInfoMsg('')
    setIsSubmitting(true)

    const { data, error } = await supabase.auth.signUp({ email, password })

    if (error) {
      setErrorMsg('登録に失敗しました。' + error.message)
      setIsSubmitting(false)
      return
    }

    if (data.session) {
      // メール確認が不要な設定の場合はそのままログイン状態になる
      if (plan === 'paid') {
        await createCheckoutSession() // 内部でStripeの決済ページへリダイレクトする
        return
      }
      router.push('/mypage')
      router.refresh()
    } else {
      // メール確認が必要な設定の場合は確認メールの案内を表示
      setInfoMsg(
        plan === 'paid'
          ? '確認メールを送信しました。メール内のリンクから登録を完了後、マイページから有料登録にお進みください。'
          : '確認メールを送信しました。メール内のリンクから登録を完了してください。'
      )
      setIsSubmitting(false)
    }
  }

  return (
    <main className="max-w-md mx-auto p-4 min-h-screen flex items-center justify-center">
      <div className="w-full p-6 bg-white border rounded-lg shadow-md">
        <h1 className="text-xl font-bold mb-6 text-center text-gray-800">ユーザー新規登録</h1>
        {errorMsg && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">
            {errorMsg}
          </div>
        )}
        {infoMsg && (
          <div className="mb-4 text-sm text-blue-700 bg-blue-50 p-2 rounded border border-blue-200">
            {infoMsg}
          </div>
        )}
        <form onSubmit={handleSignup} className="space-y-4">
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
              minLength={6}
              placeholder="6文字以上"
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">会員種別</label>
            <div className="space-y-2">
              <label className="flex items-start gap-2 p-2 border rounded cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="plan"
                  checked={plan === 'free'}
                  onChange={() => setPlan('free')}
                  className="mt-0.5"
                />
                <span className="text-sm text-gray-700">無料会員</span>
              </label>
              <label className="flex items-start gap-2 p-2 border rounded cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="plan"
                  checked={plan === 'paid'}
                  onChange={() => setPlan('paid')}
                  className="mt-0.5"
                />
                <span className="text-sm text-gray-700">
                  有料会員（¥{LIFETIME_PLAN_PRICE_JPY} 買い切り）
                </span>
              </label>
            </div>
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 transition disabled:opacity-50"
          >
            {isSubmitting
              ? plan === 'paid'
                ? '登録中...（この後決済ページに移動します）'
                : '登録中...'
              : plan === 'paid'
                ? '登録して決済に進む'
                : '登録する'}
          </button>
        </form>
        <p className="mt-4 text-sm text-center text-gray-500">
          すでにアカウントをお持ちの方は{' '}
          <Link href="/login" className="text-blue-600 hover:underline">
            ログイン
          </Link>
        </p>
      </div>
    </main>
  )
}
