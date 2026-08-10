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
        <div className="flex justify-end">
          <Link
            href="/admin/login"
            className="text-[10px] sm:text-xs text-gray-500 hover:text-gray-800 underline whitespace-nowrap"
          >
            運営ログイン
          </Link>
        </div>
      </header>

      <section className="divide-y divide-gray-200">
        {threads && threads.length > 0 ? (
          threads.map((thread) => (
            <Link
              key={thread.id}
              href={`/thread/${thread.id}`}
              className="block py-2 hover:bg-gray-50 transition"
            >
              <div className="flex justify-between items-baseline gap-2">
                <h3 className="text-sm sm:text-base font-bold text-blue-600 truncate">
                  {thread.title}
                </h3>
                <span className="text-[10px] sm:text-xs text-gray-400 whitespace-nowrap shrink-0">
                  {new Date(thread.created_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
                </span>
              </div>
              <p className="text-gray-500 text-xs truncate">
                {thread.body}
              </p>
            </Link>
          ))
        ) : (
          <p className="text-gray-500 py-2">現在スレッドはありません。</p>
        )}
      </section>
    </main>
  )
}