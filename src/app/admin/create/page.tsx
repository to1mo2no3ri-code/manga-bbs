import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import SubmitButton from '@/components/SubmitButton'

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
    const imageFile = formData.get('image') as File | null

    // バリデーション: タイトル・本文・画像ファイルが揃っているか確認
    if (!title || !body || !imageFile || imageFile.size === 0) {
      return
    }

    const supabase = await createClient()

    // 1. 画像のファイル名をユニーク（重複しない）に生成
    const fileExt = imageFile.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`
    const filePath = `${fileName}`

    // 2. Supabase Storage へ画像をアップロード
    const { error: uploadError } = await supabase.storage
      .from('thread-images')
      .upload(filePath, imageFile)

    if (uploadError) {
      console.error('画像アップロードエラー:', uploadError)
      return
    }

    // 3. アップロードした画像の公開URLを取得
    const { data: { publicUrl } } = supabase.storage
      .from('thread-images')
      .getPublicUrl(filePath)

    // 4. threads テーブルへ画像URLを含めて保存
    const { data, error } = await supabase
      .from('threads')
      .insert({
        title: title.trim(),
        body: body.trim(),
        image_url: publicUrl, // ← 画像URLを保存
      })
      .select()
      .single()

    if (!error && data) {
      redirect(`/thread/${data.id}`)
    }
  }

  return (
    <main className="max-w-2xl mx-auto p-4 min-h-screen">
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

        {/* 必須の画像選択フォームを追加 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            メイン画像 <span className="text-red-500 text-xs">（必須）</span>
          </label>
          <input
            type="file"
            name="image"
            accept="image/*"
            required
            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
          />
        </div>

        <SubmitButton
          label="スレッドを公開する"
          loadingLabel="公開・画像送信中..."
        />
      </form>
    </main>
  )
}