// 買い切り有料会員登録の価格（税込・日本円）
// Stripeクライアント（src/lib/stripe.ts）とは別ファイルにすることで、
// STRIPE_SECRET_KEY未設定時でも画面表示（価格の案内）自体は壊れないようにしている。
export const LIFETIME_PLAN_PRICE_JPY = 300
