import { redirect } from 'next/navigation'

// 運営ログインは通常のログインに統合したため、ここはブックマーク等からの
// アクセスを /login へ転送するだけにしている。管理画面への入口はマイページに表示される。
export default function AdminLoginRedirectPage() {
  redirect('/login')
}
