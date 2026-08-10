'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import SubmitButton from '@/components/SubmitButton'

type Post = {
  id: string
  thread_id: string
  body: string
  user_hash_id: string
  display_name: string | null
  level: number
  title: string | null
  created_at: string
  reply_to: string | null
}

interface RealtimePostsProps {
  initialPosts: Post[]
  threadId: string
  submitPost: (formData: FormData) => Promise<void>
}

export default function RealtimePosts({ initialPosts, threadId, submitPost }: RealtimePostsProps) {
  // 1. 初期データ（サーバーで取得した過去のレス）を React の State に保持
  const [posts, setPosts] = useState<Post[]>(initialPosts)
  // 現在返信フォームを開いているレスの ID（1件のみ開ける）
  const [replyingTo, setReplyingTo] = useState<string | null>(null)

  useEffect(() => {
    // 2. ブラウザ用の Supabase クライアントを作成
    const supabase = createClient()

    // 3. Realtime チャンネルを作成し、posts テーブルの INSERT（新規投稿）を監視
    const channel = supabase
      .channel(`realtime-posts-${threadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',                     // 新規データ追加時のみ発火
          schema: 'public',                    // スキーマ名
          table: 'posts',                      // 監視対象のテーブル
          filter: `thread_id=eq.${threadId}`, // 現在表示中のスレッドIDに限定
        },
        (payload) => {
          // 新しい投稿が届いたときの処理
          const newPost = payload.new as Post
          setPosts((prev) => {
            // すでにリスト内に存在する ID であれば追加しない（二重追加防止）
            if (prev.some((p) => p.id === newPost.id)) return prev
            return [...prev, newPost] // 既存の配列の末尾に新しいレスを追加
          })
        }
      )
      .subscribe()

    // 4. ユーザーが別ページへ移動した際に接続を解除（メモリリーク防止）
    return () => {
      supabase.removeChannel(channel)
    }
  }, [threadId])

  // レスID → 表示番号（何番目のレスか）の対応表。返信元の ">>N" 表示に使う
  const indexById = useMemo(() => {
    const map = new Map<string, number>()
    posts.forEach((post, index) => map.set(post.id, index + 1))
    return map
  }, [posts])

  // 返信フォーム送信時：通常の投稿アクションを呼んだ後、フォームを閉じる
  async function handleReplySubmit(formData: FormData) {
    await submitPost(formData)
    setReplyingTo(null)
  }

  return (
    <div className="divide-y divide-gray-200">
      {posts && posts.length > 0 ? (
        posts.map((post, index) => (
          <div key={post.id} id={`res-${post.id}`} className="py-2">
            <div className="flex justify-between items-baseline text-xs text-gray-500">
              <span className="font-semibold text-gray-700">
                {index + 1} <span className="text-blue-600">{post.display_name ?? post.user_hash_id}</span>{' '}
                <span className="text-[10px] text-gray-400 font-normal">
                  Lv.{post.level}
                  {post.title && ` ${post.title}`}
                </span>
              </span>
              <span>
                {new Date(post.created_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
              </span>
            </div>

            {post.reply_to && indexById.has(post.reply_to) && (
              <a
                href={`#res-${post.reply_to}`}
                className="text-xs text-blue-500 hover:underline"
              >
                &gt;&gt;{indexById.get(post.reply_to)}
              </a>
            )}

            <p className="text-gray-800 whitespace-pre-wrap break-words leading-snug mt-0.5">
              {post.body}
            </p>

            <button
              type="button"
              onClick={() => setReplyingTo(replyingTo === post.id ? null : post.id)}
              className="mt-1 text-xs text-gray-400 hover:text-blue-600"
            >
              返信
            </button>

            {replyingTo === post.id && (
              <form action={handleReplySubmit} className="mt-2 space-y-2">
                <input type="hidden" name="reply_to" value={post.id} />
                <textarea
                  name="body"
                  rows={3}
                  required
                  autoFocus
                  placeholder={`>>${index + 1} に返信`}
                  className="w-full p-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                />
                <div className="flex items-center gap-2">
                  <SubmitButton
                    label="返信する"
                    loadingLabel="送信中..."
                    className="px-3 py-1 text-xs bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setReplyingTo(null)}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    キャンセル
                  </button>
                </div>
              </form>
            )}
          </div>
        ))
      ) : (
        <p className="text-gray-500 text-sm py-2">まだレスはありません。最初の書き込みをしてみましょう！</p>
      )}
    </div>
  )
}