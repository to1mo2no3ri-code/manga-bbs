import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

// Server Action内から呼ぶ用。ページgarrdを経由しないリクエスト（フォーム直叩き等）にも
// 管理者権限が無ければ弾けるようにするための多重チェック
export async function isCurrentUserAdmin(supabase: SupabaseClient): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  return profile?.is_admin === true
}

// ページ（Server Component）用。未ログインならログイン画面へ、ログイン済みだが管理者でなければホームへ
export async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    redirect('/')
  }

  return { supabase, user }
}
