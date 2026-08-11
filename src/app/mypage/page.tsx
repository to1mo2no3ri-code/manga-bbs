import Link from 'next/link'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getLevel, getNextLevelThreshold } from '@/lib/levels'
import { getAvailableTitles } from '@/lib/titles'
import { LIFETIME_PLAN_PRICE_JPY } from '@/lib/plans'
import { createCheckoutSession } from '@/app/actions/stripe'
import SubmitButton from '@/components/SubmitButton'
import LogoutButton from '@/components/LogoutButton'
import TitlePicker from '@/components/TitlePicker'

export const revalidate = 0

export default async function MyPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string }>
}) {
  const { payment } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const [{ data: profile }, { count: postCount }] = await Promise.all([
    supabase.from('profiles').select('username, title, plan').eq('id', user.id).single(),
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
  ])

  const totalPosts = postCount ?? 0
  const level = getLevel(totalPosts)
  const nextThreshold = getNextLevelThreshold(totalPosts)
  const availableTitles = getAvailableTitles(level)

  // ユーザーネーム更新 Server Action
  async function updateUsername(formData: FormData) {
    'use server'
    const username = (formData.get('username') as string)?.trim()
    if (!username) return

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('profiles').update({ username }).eq('id', user.id)
    revalidatePath('/mypage')
  }

  // 肩書更新 Server Action（現在のレベルで解放済みの肩書かをサーバー側でも検証する）
  async function updateTitle(title: string) {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { count } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
    const currentLevel = getLevel(count ?? 0)

    if (!getAvailableTitles(currentLevel).includes(title)) return

    await supabase.from('profiles').update({ title }).eq('id', user.id)
    revalidatePath('/mypage')
  }

  return (
    <main className="w-full lg:w-1/2 mx-auto p-3 min-h-screen">
      <div className="mb-4 flex justify-between items-center">
        <Link href="/" className="text-sm text-blue-500 hover:underline">
          ← ホームに戻る
        </Link>
        <LogoutButton />
      </div>

      <h1 className="text-lg font-bold text-gray-800 mb-4">マイページ</h1>

      {payment === 'success' && (
        <div className="mb-4 text-sm text-green-700 bg-green-50 p-2 rounded border border-green-200">
          決済が完了しました。有料会員登録ありがとうございます！
        </div>
      )}
      {payment === 'cancelled' && (
        <div className="mb-4 text-sm text-gray-600 bg-gray-50 p-2 rounded border border-gray-200">
          決済がキャンセルされました。有料登録はいつでもこちらから行えます。
        </div>
      )}

      <section className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
        <div className="text-sm text-gray-500 mb-1">会員種別</div>
        {profile?.plan === 'paid' ? (
          <div className="text-lg font-bold text-amber-600">有料会員</div>
        ) : (
          <div>
            <div className="text-lg font-bold text-gray-700 mb-2">無料会員</div>
            <form action={createCheckoutSession}>
              <SubmitButton
                label={`有料会員に登録する（¥${LIFETIME_PLAN_PRICE_JPY} 買い切り）`}
                loadingLabel="決済ページに移動中..."
                className="px-4 py-2 text-sm bg-amber-500 text-white font-semibold rounded hover:bg-amber-600 transition"
              />
            </form>
          </div>
        )}
      </section>

      <section className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
        <div className="text-sm text-gray-500 mb-1">現在のレベル</div>
        <div className="text-3xl font-bold text-blue-600">Lv.{level}</div>
        <div className="text-xs text-gray-500 mt-1">
          投稿数: {totalPosts}件
          {nextThreshold !== null && ` ・ 次のレベルまであと${nextThreshold - totalPosts}件`}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="text-sm font-bold text-gray-700 mb-2">ユーザーネーム</h2>
        <p className="text-xs text-gray-500 mb-2">
          設定すると、書き込み時に匿名IDの代わりにこの名前が表示されます。
        </p>
        <form action={updateUsername} className="flex gap-2">
          <input
            name="username"
            defaultValue={profile?.username ?? ''}
            required
            maxLength={20}
            placeholder="表示名を入力"
            className="flex-1 p-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <SubmitButton
            label="保存"
            loadingLabel="保存中..."
            className="px-4 py-2 text-sm bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 transition"
          />
        </form>
      </section>

      <section>
        <h2 className="text-sm font-bold text-gray-700 mb-2">肩書</h2>
        <p className="text-xs text-gray-500 mb-2">
          書き込み時に名前の横に表示されます。レベルが上がるほど選べる肩書が増えます（現在
          {availableTitles.length}個から選択可能）。
        </p>
        <TitlePicker
          currentTitle={profile?.title ?? null}
          availableTitles={availableTitles}
          updateTitle={updateTitle}
        />
      </section>
    </main>
  )
}
