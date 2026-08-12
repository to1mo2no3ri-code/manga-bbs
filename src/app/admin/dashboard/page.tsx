import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { isCurrentUserAdmin, requireAdmin } from '@/lib/auth'

export const revalidate = 0

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ adminAdded?: string; adminAddError?: string }>
}) {
  // ログイン・管理者チェック
  const { supabase } = await requireAdmin()
  const { adminAdded, adminAddError } = await searchParams

  // 全スレッド取得
  const { data: threads } = await supabase
    .from('threads')
    .select('*')
    .order('created_at', { ascending: false })

  // スレッド削除 Action
  async function deleteThread(formData: FormData) {
    'use server'
    const threadId = formData.get('thread_id') as string
    if (!threadId) return

    const supabase = await createClient()
    if (!(await isCurrentUserAdmin(supabase))) return

    // 関連するレスを先に削除（外部キー制約の回避）
    await supabase.from('posts').delete().eq('thread_id', threadId)
    // スレッド本体を削除
    await supabase.from('threads').delete().eq('id', threadId)

    revalidatePath('/admin/dashboard')
    revalidatePath('/')
  }

  // 管理者追加 Action（既存ユーザーをメールアドレス指定でis_admin=trueにする）
  async function addAdminByEmail(formData: FormData) {
    'use server'
    const email = (formData.get('email') as string)?.trim().toLowerCase()
    if (!email) return

    const supabase = await createClient()
    if (!(await isCurrentUserAdmin(supabase))) return

    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (!targetProfile) {
      redirect(`/admin/dashboard?adminAddError=${encodeURIComponent(email)}`)
    }

    await supabase.from('profiles').update({ is_admin: true }).eq('id', targetProfile.id)
    redirect(`/admin/dashboard?adminAdded=${encodeURIComponent(email)}`)
  }

  return (
    <main className="max-w-4xl mx-auto p-4 min-h-screen">
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <h1 className="text-2xl font-bold text-gray-800">運営管理ダッシュボード</h1>
        <div className="space-x-4">
          <Link
            href="/admin/create"
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition"
          >
            ＋ 新規スレッド作成
          </Link>
          <Link href="/" className="text-sm text-gray-500 hover:underline">
            サイトトップへ
          </Link>
        </div>
      </div>

      {adminAdded && (
        <div className="mb-4 text-sm text-green-700 bg-green-50 p-2 rounded border border-green-200">
          {adminAdded} を管理者に追加しました。
        </div>
      )}
      {adminAddError && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">
          {adminAddError} は登録済みユーザーの中に見つかりませんでした。
        </div>
      )}

      <section className="mb-6 p-4 bg-white border rounded-lg shadow-sm">
        <h2 className="text-sm font-bold text-gray-700 mb-2">管理者を追加</h2>
        <p className="text-xs text-gray-500 mb-2">
          既に会員登録済みのユーザーのメールアドレスを指定して、管理者権限を付与します。
        </p>
        <form action={addAdminByEmail} className="flex gap-2">
          <input
            type="email"
            name="email"
            required
            placeholder="admin@example.com"
            className="flex-1 p-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-4 py-2 text-sm bg-gray-800 text-white font-semibold rounded hover:bg-gray-900 transition"
          >
            管理者に追加
          </button>
        </form>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-gray-700">スレッド管理・削除</h2>
        {threads && threads.length > 0 ? (
          threads.map((thread) => (
            <div
              key={thread.id}
              className="p-4 bg-white border rounded-lg shadow-sm flex justify-between items-center"
            >
              <div>
                <h3 className="font-bold text-lg text-gray-800">{thread.title}</h3>
                <p className="text-xs text-gray-400">
                  作成日: {new Date(thread.created_at).toLocaleString('ja-JP')}
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <Link
                  href={`/admin/thread/${thread.id}`}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 transition"
                >
                  レス管理
                </Link>
                <form action={deleteThread}>
                  <input type="hidden" name="thread_id" value={thread.id} />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition"
                  >
                    スレッド削除
                  </button>
                </form>
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-500">スレッドはありません。</p>
        )}
      </section>
    </main>
  )
}