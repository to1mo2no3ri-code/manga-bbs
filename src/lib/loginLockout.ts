// ログイン試行回数の制限・スロットリング（クライアント側の簡易ロック）
// Supabase Auth自体もサーバー側でログイン試行にレート制限をかけているが、
// UI上でも失敗回数に応じて一定時間再試行をブロックし、多重の防御とする。
export const MAX_LOGIN_ATTEMPTS = 5
export const LOGIN_LOCKOUT_SECONDS = 30
