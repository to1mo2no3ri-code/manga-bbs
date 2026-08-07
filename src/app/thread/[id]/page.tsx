import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import crypto from 'crypto'
import SubmitButton from '@/components/SubmitButton'
import RealtimePosts from '@/components/RealtimePosts'

export const revalidate = 0

// 日時＋IPアドレスから端末固有の匿名ID（日替わり）を生成する関数
async function getDailyUserHash() {
  const headerList = await headers()
  const ip = headerList.get('x-forwarded-for')?.split(',')[0] || headerList.get('x-real-ip') || '127.0.0.1'
  const dateStr = new Date().toISOString().slice(0, 10)

  const hash = crypto
    .createHash('sha256')
    .update(`${dateStr}-${ip}`)
    .digest('hex')

  return `ID:${hash.slice(0, 8)}`
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

  // 初期レス一覧の取得（初回表示用）
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
    const userHashId = await getDailyUserHash()

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

      {/* レス一覧（Realtime自動更新コンポーネント） */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-gray-700 border-b pb-2 mb-4">レス一覧</h2>
        <RealtimePosts initialPosts={posts || []} threadId={id} />
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
          <SubmitButton
            label="書き込む"
            loadingLabel="送信中..."
            className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition"
          />
        </form>
      </section>
    </main>
  )
}