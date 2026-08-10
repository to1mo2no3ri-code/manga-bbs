import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import crypto from 'crypto'
import SubmitButton from '@/components/SubmitButton'
import RealtimePosts from '@/components/RealtimePosts'
import { getLevel } from '@/lib/levels'

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

  // スレッド情報とレス一覧を並行取得（表示速度改善）
  const [{ data: thread }, { data: posts }] = await Promise.all([
    supabase.from('threads').select('*').eq('id', id).single(),
    supabase.from('posts').select('*').eq('thread_id', id).order('created_at', { ascending: true }),
  ])

  if (!thread) {
    notFound()
  }

  // レス投稿用 Server Action（reply_to が指定されていれば返信として紐付ける）
  async function submitPost(formData: FormData) {
    'use server'
    const body = formData.get('body') as string
    if (!body || !body.trim()) return

    const replyTo = (formData.get('reply_to') as string) || null

    const supabase = await createClient()
    const userHashId = await getDailyUserHash()

    // ログイン中なら、匿名IDの代わりにユーザーネーム・レベル・肩書を紐付ける
    // （投稿時点のレベル・肩書をスナップショットするので、後で変わっても過去のレスは変わらない）
    const { data: { user } } = await supabase.auth.getUser()
    let displayName: string | null = null
    let level = 1
    let title: string | null = null
    if (user) {
      const [{ data: profile }, { count: postCount }] = await Promise.all([
        supabase.from('profiles').select('username, title').eq('id', user.id).single(),
        supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      ])
      displayName = profile?.username ?? null
      title = profile?.title ?? null
      level = getLevel((postCount ?? 0) + 1) // 今回の投稿を含めた件数でレベルを算出
    }

    await supabase.from('posts').insert({
      thread_id: id,
      body: body.trim(),
      user_hash_id: userHashId,
      reply_to: replyTo,
      user_id: user?.id ?? null,
      display_name: displayName,
      level,
      title,
    })

    revalidatePath(`/thread/${id}`)
  }

  return (
    <main className="w-full lg:w-1/2 mx-auto p-3 min-h-screen">
      <div className="mb-2">
        <Link href="/" className="text-sm text-blue-500 hover:underline">
          ← スレッド一覧に戻る
        </Link>
      </div>

      {/* 運営の親投稿（スレッド起点） */}
      <article className="pb-3 border-b border-gray-300 mb-3">
        <span className="inline-block px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded mb-2">
          スレッドのお題
        </span>
        {thread.category && (
          <span className="inline-block ml-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-bold rounded mb-2">
            {thread.category}
          </span>
        )}
        <h1 className="text-xl font-bold text-gray-900 mb-2">{thread.title}</h1>
        <p className="text-gray-800 whitespace-pre-wrap break-words leading-snug mb-2">
          {thread.body}
        </p>

        {/* スレッド画像表示エリア（画像が存在する場合のみ描画） */}
        {thread.image_url && (
          <div className="my-2 overflow-hidden rounded border border-gray-200 bg-black/5">
            <img
              src={thread.image_url}
              alt={thread.title}
              className="w-full max-h-[500px] object-contain mx-auto"
            />
          </div>
        )}

        <div className="mt-2 text-xs text-gray-500">
          投稿日時: {new Date(thread.created_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
        </div>
      </article>

      {/* レス一覧（Realtime自動更新コンポーネント） */}
      <section className="mb-4">
        <RealtimePosts initialPosts={posts || []} threadId={id} submitPost={submitPost} />
      </section>

      {/* レス投稿フォーム */}
      <section className="pt-2">
        <form action={submitPost} className="space-y-2">
          <textarea
            name="body"
            rows={3}
            required
            placeholder="感想や意見を書き込む..."
            className="w-full p-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
          />
          <SubmitButton
            label="書き込む"
            loadingLabel="送信中..."
            className="px-4 py-1.5 text-sm bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 transition"
          />
        </form>
      </section>
    </main>
  )
}