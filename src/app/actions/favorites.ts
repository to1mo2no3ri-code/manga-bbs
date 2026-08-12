'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// お気に入り登録・解除をトグルする。戻り値はトグル後の状態。
export async function toggleFavorite(threadId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data: existing } = await supabase
    .from('favorites')
    .select('thread_id')
    .eq('user_id', user.id)
    .eq('thread_id', threadId)
    .maybeSingle()

  if (existing) {
    await supabase.from('favorites').delete().eq('user_id', user.id).eq('thread_id', threadId)
    revalidatePath('/mypage')
    return false
  }

  await supabase.from('favorites').insert({ user_id: user.id, thread_id: threadId })
  revalidatePath('/mypage')
  return true
}
