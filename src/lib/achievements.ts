import { createClient } from '@/lib/supabase/server'
import { getLevel } from '@/lib/levels'
import { MANGA_MAGAZINES } from '@/lib/magazines'

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

export type Achievement = {
  key: string
  label: string
  description: string
}

export const ACHIEVEMENTS: Achievement[] = [
  { key: 'first_post', label: '初投稿', description: 'レスを1件書き込む' },
  { key: 'regular', label: '常連', description: 'レスを10件書き込む' },
  { key: 'walking_encyclopedia', label: '生き字引', description: 'レスを100件書き込む' },
  { key: 'night_owl', label: '夜型読民', description: '深夜0〜4時にレスを5件書き込む' },
  { key: 'magazine_master', label: '雑誌マスター', description: '全カテゴリのスレに1回以上投稿する' },
  { key: 'debater', label: '議論好き', description: '返信を10件送信する' },
  { key: 'max_level', label: 'コンプリート', description: 'レベル10に到達する' },
]

// JSTでの深夜0〜4時に投稿されたか判定する
function isLateNightPost(createdAt: string): boolean {
  const jstHour = (new Date(createdAt).getUTCHours() + 9) % 24
  return jstHour >= 0 && jstHour < 4
}

export async function getEarnedAchievementKeys(
  supabase: SupabaseClient,
  userId: string
): Promise<Set<string>> {
  const { data: posts } = await supabase
    .from('posts')
    .select('created_at, reply_to, thread_id')
    .eq('user_id', userId)

  const rows = posts ?? []
  const totalPosts = rows.length
  const replyPosts = rows.filter((p) => p.reply_to).length
  const nightPosts = rows.filter((p) => isLateNightPost(p.created_at)).length

  const threadIds = [...new Set(rows.map((p) => p.thread_id))]
  const categorySet = new Set<string>()
  if (threadIds.length > 0) {
    const { data: threads } = await supabase.from('threads').select('category').in('id', threadIds)
    for (const t of threads ?? []) {
      if (t.category) categorySet.add(t.category)
    }
  }

  const earned = new Set<string>()
  if (totalPosts >= 1) earned.add('first_post')
  if (totalPosts >= 10) earned.add('regular')
  if (totalPosts >= 100) earned.add('walking_encyclopedia')
  if (nightPosts >= 5) earned.add('night_owl')
  if (MANGA_MAGAZINES.every((magazine) => categorySet.has(magazine))) earned.add('magazine_master')
  if (replyPosts >= 10) earned.add('debater')
  if (getLevel(totalPosts) >= 10) earned.add('max_level')

  return earned
}
