import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import SubmitButton from '@/components/SubmitButton' // ← インポートを追加

export default async function CreateThreadPage() {
  const supabase = await createClient()

  // ログインチェック（未ログインならログイン画面へ飛ばす）
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/admin/login')
  }

  // スレッド作成処理 (Server Action)
  async function createThread(formData: FormData) {
    'use server'
    const title = formData.get('title') as string
    const body = formData.get('body') as string

    if (!title || !body) return

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('threads')
      .insert({ title: title.trim(), body: body.trim() })
      .select()
      .single()

    if (!error && data) {
      redirect(`/thread/${data.id}`)
    }
  }

  return (
    <main className="max-w-2xl mx-auto p-4 min-h-screen">
      {/* 運営ダッシュボードに戻るボタン */}
      <div className="mb-4">
        <Link
          href="/admin/dashboard"
          className="text-sm text-blue-500 hover:underline"
        >
          ← 運営ダッシュボードに戻る
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-6 text-gray-800">新規スレッド作成（運営専用）</h1>
      <form action={createThread} className="space-y-4 bg-white p-6 border rounded-lg shadow-sm">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">スレッドタイトル</label>
          <input
            type="text"
            name="title"
            required
            placeholder="例: 『ONE PIECE』最新話の考察・感想スレ"
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">本文（最初の投稿）</label>
          <textarea
            name="body"
            rows={6}
            required
            placeholder="議論の起点となる本文を入力してください..."
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        {/* <button> から SubmitButton へ置き換え */}
        <SubmitButton
          label="スレッドを公開する"
          loadingLabel="公開処理中..."
        />
      </form>
    </main>
  )
}