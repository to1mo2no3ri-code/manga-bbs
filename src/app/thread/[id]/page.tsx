import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const revalidate = 0

// 簡易的な日替わりハッシュ生成関数
function getDailyUserHash() {
  const dateStr = new Date().toISOString().slice(0, 10)
  return 'ID:' + Math.abs(
    dateStr.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) * 12345
  ).toString(36).slice(0, 6)
}

export default async function ThreadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // スレッド情報の取得
  const { data: thread } = await supabase
    .from('threads')
    .select('*')
    .eq('id', id)
    .single()

  if (!thread) {
    notFound()
  }

  // レス（投稿）一覧の取得
  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .eq('thread_id', id)
    .order('created_at', { ascending: true })

  // レス投稿用 Server Action
  async function submitPost(formData: FormData) {
    'use server'
    const body = formData.get('body') as string
    if (!body || !body.trim()) return

    const supabase = await createClient()
    const userHashId = getDailyUserHash()

    await supabase.from('posts').insert({
      thread_id: id,
      body: body.trim(),
      user_hash_id: userHashId,
    })

    revalidatePath(`/thread/${id}`)
  }

  return (
    <main className="max-w-3xl mx-auto p-4 min-h-screen">
      <div className="mb-4">
        <Link href="/" className="text-sm text-blue-500 hover:underline">
          ← スレッド一覧に戻る
        </Link>
      </div>

      {/* 運営の親投稿（スレッド起点） */}
      <article className="p-5 bg-blue-50 border border-blue-200 rounded-lg mb-6 shadow-sm">
        <span className="inline-block px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded mb-2">
          運営のお題
        </span>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">{thread.title}</h1>
        <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
          {thread.body}
        </p>
        <div className="mt-3 text-xs text-gray-500">
          投稿日時: {new Date(thread.created_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
        </div>
      </article>

      {/* レス一覧 */}
      <section className="space-y-4 mb-8">
        <h2 className="text-lg font-bold text-gray-700 border-b pb-2">レス一覧</h2>
        {posts && posts.length > 0 ? (
          posts.map((post, index) => (
            <div
              key={post.id}
              className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm"
            >
              <div className="flex justify-between items-center text-xs text-gray-500 mb-2 border-b pb-1">
                <span className="font-semibold text-gray-700">
                  {index + 1}. <span className="text-blue-600">{post.user_hash_id}</span>
                </span>
                <span>{new Date(thread.created_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}</span>
              </div>
              <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                {post.body}
              </p>
            </div>
          ))
        ) : (
          <p className="text-gray-500 text-sm">まだレスはありません。最初の書き込みをしてみましょう！</p>
        )}
      </section>

      {/* レス投稿フォーム */}
      <section className="bg-gray-50 p-4 border rounded-lg shadow-sm">
        <h3 className="text-md font-bold text-gray-800 mb-3">議論に参加する（匿名投稿）</h3>
        <form action={submitPost} className="space-y-3">
          <textarea
            name="body"
            rows={4}
            required
            placeholder="感想や意見を書き込む..."
            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
          <button
            type="submit"
            className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition"
          >
            書き込む
          </button>
        </form>
      </section>
    </main>
  )
}