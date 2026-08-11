import Stripe from 'stripe'

// 遅延初期化にしているのは、このモジュールを import しただけで
// STRIPE_SECRET_KEY 未設定時にページ全体がクラッシュしないようにするため。
// 実際に決済関連の処理を呼び出した時点でのみ Stripe クライアントを生成する。
let stripeInstance: Stripe | null = null

export function getStripe(): Stripe {
  if (!stripeInstance) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY!)
  }
  return stripeInstance
}
