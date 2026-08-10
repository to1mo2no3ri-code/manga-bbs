// 掲示板のスレッドを分類する少年漫画雑誌カテゴリ一覧（運営のスレ立てフォームとホームのカテゴリ選択で共通利用）
export const MANGA_MAGAZINES = [
  '週刊少年ジャンプ',
  '週刊少年マガジン',
  '週刊少年サンデー',
  '週刊少年チャンピオン',
  '月刊コロコロコミック',
  '月刊少年ガンガン',
  '月刊少年エース',
  'ジャンプSQ.',
  '別冊少年マガジン',
  'その他',
] as const

export type MangaMagazine = (typeof MANGA_MAGAZINES)[number]
