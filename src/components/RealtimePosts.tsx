'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Post = {
  id: string
  thread_id: string
  body: string
  user_hash_id: string
  created_at: string
}

interface RealtimePostsProps {
  initialPosts: Post[]
  threadId: string
}

export default function RealtimePosts({ initialPosts, threadId }: RealtimePostsProps) {
  // 1. 初期データ（サーバーで取得した過去のレス）を React の State に保持
  const [posts, setPosts] = useState<Post[]>(initialPosts)

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

  return (
    <div className="space-y-4">
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
              <span>
                {new Date(post.created_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
              </span>
            </div>
            <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
              {post.body}
            </p>
          </div>
        ))
      ) : (
        <p className="text-gray-500 text-sm">まだレスはありません。最初の書き込みをしてみましょう！</p>
      )}
    </div>
  )
}