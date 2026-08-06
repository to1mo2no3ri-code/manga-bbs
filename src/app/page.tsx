import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export const revalidate = 0 // 常に最新データを取得

export default async function HomePage() {
  const supabase = await createClient()

  // スレッド一覧を取得
  const { data: threads, error } = await supabase
    .from('threads')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching threads:', error)
  }

  return (
    <main className="max-w-3xl mx-auto p-4 min-h-screen">
      <header className="flex justify-between items-center mb-8 border-b pb-4">
        <h1 className="text-2xl font-bold text-gray-800">マンギロンDB-漫画議論掲示板-</h1>
        <Link
          href="/admin/login"
          className="text-sm text-gray-500 hover:text-gray-800 underline"
        >
          運営ログイン
        </Link>
      </header>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-700">スレッド一覧</h2>
        {threads && threads.length > 0 ? (
          threads.map((thread) => (
            <Link
              key={thread.id}
              href={`/thread/${thread.id}`}
              className="block p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition shadow-sm"
            >
              <h3 className="text-xl font-bold text-blue-600 mb-2">
                {thread.title}
              </h3>
              <p className="text-gray-600 line-clamp-2 text-sm mb-2">
                {thread.body}
              </p>
              <span className="text-xs text-gray-400">
                作成日時: {new Date(thread.created_at).toLocaleString('ja-JP')}
              </span>
            </Link>
          ))
        ) : (
          <p className="text-gray-500">現在スレッドはありません。</p>
        )}
      </section>
    </main>
  )
}