import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'

export const revalidate = 0

export default async function AdminThreadManagePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // ログインチェック
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/admin/login')
  }

  // スレッド情報取得
  const { data: thread } = await supabase
    .from('threads')
    .select('*')
    .eq('id', id)
    .single()

  if (!thread) notFound()

  // レス一覧取得
  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .eq('thread_id', id)
    .order('created_at', { ascending: true })

  // 特定のレス削除 Action
  async function deletePost(formData: FormData) {
    'use server'
    const postId = formData.get('post_id') as string
    if (!postId) return

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('posts').delete().eq('id', postId)

    revalidatePath(`/admin/thread/${id}`)
    revalidatePath(`/thread/${id}`)
  }

  return (
    <main className="max-w-3xl mx-auto p-4 min-h-screen">
      <div className="mb-4">
        <Link href="/admin/dashboard" className="text-sm text-blue-500 hover:underline">
          ← 運営ダッシュボードに戻る
        </Link>
      </div>

      <div className="p-4 bg-gray-50 border rounded-lg mb-6">
        <span className="text-xs font-bold bg-gray-600 text-white px-2 py-0.5 rounded">対象スレッド</span>
        <h1 className="text-xl font-bold mt-2 text-gray-800">{thread.title}</h1>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-gray-700 border-b pb-2">レス一覧（削除管理）</h2>
        {posts && posts.length > 0 ? (
          posts.map((post, index) => (
            <div
              key={post.id}
              className="p-4 bg-white border border-gray-200 rounded-lg flex justify-between items-start"
            >
              <div className="pr-4">
                <div className="text-xs text-gray-500 mb-1">
                  #{index + 1} | ID: <span className="font-semibold text-blue-600">{post.user_hash_id}</span> | {new Date(post.created_at).toLocaleString('ja-JP')}
                </div>
                <p className="text-gray-800 whitespace-pre-wrap break-words text-sm">{post.body}</p>
              </div>
              <form action={deletePost}>
                <input type="hidden" name="post_id" value={post.id} />
                <button
                  type="submit"
                  className="px-3 py-1 bg-red-100 text-red-600 text-xs font-semibold rounded hover:bg-red-200 transition whitespace-nowrap"
                >
                  削除
                </button>
              </form>
            </div>
          ))
        ) : (
          <p className="text-gray-500 text-sm">レスはありません。</p>
        )}
      </section>
    </main>
  )
}