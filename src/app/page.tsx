import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import HomeThreadBrowser, { type ThreadWithStats } from '@/components/HomeThreadBrowser'

export const revalidate = 0 // 常に最新データを取得

export default async function HomePage() {
  const supabase = await createClient()

  // スレッド一覧とレス（集計用）、ログイン状態を並行取得
  const [{ data: threads, error }, { data: posts }, { data: { user } }] = await Promise.all([
    supabase.from('threads').select('*').order('created_at', { ascending: false }),
    supabase.from('posts').select('thread_id, created_at'),
    supabase.auth.getUser(),
  ])

  let username: string | null = null
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single()
    username = profile?.username ?? null
  }

  if (error) {
    console.error('Error fetching threads:', error)
  }

  // スレッドごとのレス数・最新レス日時を集計
  const statsByThreadId = new Map<string, { replyCount: number; lastReplyAt: string | null }>()
  for (const post of posts ?? []) {
    const stats = statsByThreadId.get(post.thread_id) ?? { replyCount: 0, lastReplyAt: null }
    stats.replyCount += 1
    if (!stats.lastReplyAt || post.created_at > stats.lastReplyAt) {
      stats.lastReplyAt = post.created_at
    }
    statsByThreadId.set(post.thread_id, stats)
  }

  const threadsWithStats: ThreadWithStats[] = (threads ?? []).map((thread) => ({
    id: thread.id,
    title: thread.title,
    body: thread.body,
    category: thread.category ?? null,
    created_at: thread.created_at,
    replyCount: statsByThreadId.get(thread.id)?.replyCount ?? 0,
    lastReplyAt: statsByThreadId.get(thread.id)?.lastReplyAt ?? null,
  }))

  return (
    <main className="w-full lg:w-1/2 mx-auto p-3 min-h-screen">
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 mb-3 border-b pb-2">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-gray-800 tracking-tight flex flex-wrap items-baseline gap-x-2">
            <span>マンギロンDB</span>
            <span className="text-xs font-normal text-gray-500">
              - 漫画議論掲示板 -
            </span>
          </h1>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          {user ? (
            <Link
              href="/mypage"
              className="text-[10px] sm:text-xs text-gray-500 hover:text-gray-800 underline whitespace-nowrap"
            >
              マイページ（{username ?? '名前未設定'}）
            </Link>
          ) : (
            <span className="text-[10px] sm:text-xs text-gray-500 whitespace-nowrap">
              <Link href="/login" className="hover:text-gray-800 underline">
                ログイン
              </Link>
              {' / '}
              <Link href="/signup" className="hover:text-gray-800 underline">
                新規登録
              </Link>
            </span>
          )}
          <Link
            href="/admin/login"
            className="text-[10px] sm:text-xs text-gray-500 hover:text-gray-800 underline whitespace-nowrap"
          >
            運営ログイン
          </Link>
        </div>
      </header>

      <HomeThreadBrowser threads={threadsWithStats} />
    </main>
  )
}