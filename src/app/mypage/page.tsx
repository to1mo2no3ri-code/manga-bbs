import Link from 'next/link'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getLevel, getNextLevelThreshold } from '@/lib/levels'
import { getAvailableTitles, PAID_ONLY_TITLES } from '@/lib/titles'
import { LIFETIME_PLAN_PRICE_JPY } from '@/lib/plans'
import { createCheckoutSession } from '@/app/actions/stripe'
import { ACHIEVEMENTS, getEarnedAchievementKeys } from '@/lib/achievements'
import SubmitButton from '@/components/SubmitButton'
import LogoutButton from '@/components/LogoutButton'
import TitlePicker from '@/components/TitlePicker'

export const revalidate = 0

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

// お気に入り登録したスレッドのタイトル一覧を取得
async function getFavoriteThreads(supabase: SupabaseClient, userId: string) {
  const { data: favorites } = await supabase.from('favorites').select('thread_id').eq('user_id', userId)
  const threadIds = (favorites ?? []).map((f) => f.thread_id)
  if (threadIds.length === 0) return []

  const { data: threads } = await supabase.from('threads').select('id, title').in('id', threadIds)
  return threads ?? []
}

// 自分の投稿に付いた返信を新着順に取得
async function getRepliesToUser(supabase: SupabaseClient, userId: string, limit = 20) {
  const { data: myPosts } = await supabase.from('posts').select('id').eq('user_id', userId)
  const myPostIds = (myPosts ?? []).map((p) => p.id)
  if (myPostIds.length === 0) return []

  const { data: replies } = await supabase
    .from('posts')
    .select('id, thread_id, body, created_at, display_name, user_hash_id')
    .in('reply_to', myPostIds)
    .order('created_at', { ascending: false })
    .limit(limit)

  const rows = replies ?? []
  const threadIds = [...new Set(rows.map((r) => r.thread_id))]
  let titleById = new Map<string, string>()
  if (threadIds.length > 0) {
    const { data: threads } = await supabase.from('threads').select('id, title').in('id', threadIds)
    titleById = new Map((threads ?? []).map((t) => [t.id, t.title]))
  }

  return rows.map((r) => ({ ...r, threadTitle: titleById.get(r.thread_id) ?? 'スレッド' }))
}

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

  const [{ data: profile }, { count: postCount }, earnedAchievementKeys, favoriteThreads, repliesToUser] =
    await Promise.all([
      supabase.from('profiles').select('username, title, plan, is_admin').eq('id', user.id).single(),
      supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      getEarnedAchievementKeys(supabase, user.id),
      getFavoriteThreads(supabase, user.id),
      getRepliesToUser(supabase, user.id),
    ])

  const totalPosts = postCount ?? 0
  const level = getLevel(totalPosts)
  const nextThreshold = getNextLevelThreshold(totalPosts)
  const isPaid = profile?.plan === 'paid'
  const availableTitles = getAvailableTitles(level, isPaid)

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

  // 肩書更新 Server Action（現在のレベル・会員種別で解放済みの肩書かをサーバー側でも検証する）
  async function updateTitle(title: string) {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: profile }, { count }] = await Promise.all([
      supabase.from('profiles').select('plan').eq('id', user.id).single(),
      supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    ])
    const currentLevel = getLevel(count ?? 0)

    if (!getAvailableTitles(currentLevel, profile?.plan === 'paid').includes(title)) return

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

      {profile?.is_admin && (
        <div className="mb-4">
          <Link
            href="/admin/dashboard"
            className="inline-block px-4 py-2 text-sm bg-gray-800 text-white font-semibold rounded hover:bg-gray-900 transition"
          >
            運営管理画面へ
          </Link>
        </div>
      )}

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
          {!isPaid && '有料会員限定の特別な肩書もあります。'}
        </p>
        <TitlePicker
          currentTitle={profile?.title ?? null}
          availableTitles={availableTitles}
          paidOnlyTitles={PAID_ONLY_TITLES}
          updateTitle={updateTitle}
        />
      </section>

      <section className="mb-6">
        <h2 className="text-sm font-bold text-gray-700 mb-2">実績</h2>
        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {ACHIEVEMENTS.map((achievement) => {
            const earned = earnedAchievementKeys.has(achievement.key)
            return (
              <li
                key={achievement.key}
                title={achievement.description}
                className={`p-2 rounded border text-center ${
                  earned
                    ? 'border-amber-300 bg-amber-50 text-amber-700'
                    : 'border-gray-200 bg-gray-50 text-gray-400'
                }`}
              >
                <div className="text-xs font-bold">{achievement.label}</div>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-sm font-bold text-gray-700 mb-2">お気に入りスレ</h2>
        {favoriteThreads.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {favoriteThreads.map((thread) => (
              <li key={thread.id}>
                <Link
                  href={`/thread/${thread.id}`}
                  className="block py-1.5 text-sm text-blue-600 hover:underline truncate"
                >
                  {thread.title}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-gray-500">
            スレッド一覧の☆を押すと、ここに追加されます。
          </p>
        )}
      </section>

      <section>
        <h2 className="text-sm font-bold text-gray-700 mb-2">自分への返信</h2>
        {repliesToUser.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {repliesToUser.map((reply) => (
              <li key={reply.id}>
                <Link
                  href={`/thread/${reply.thread_id}#res-${reply.id}`}
                  className="block py-1.5 hover:bg-gray-50 transition"
                >
                  <div className="text-xs text-gray-400 truncate">{reply.threadTitle}</div>
                  <div className="text-sm text-gray-800 truncate">
                    <span className="text-blue-600 font-semibold">
                      {reply.display_name ?? reply.user_hash_id}
                    </span>{' '}
                    {reply.body}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-gray-500">まだ返信はありません。</p>
        )}
      </section>
    </main>
  )
}
