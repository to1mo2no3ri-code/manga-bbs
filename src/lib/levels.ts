// 投稿数に応じたユーザーレベルの算出（序盤は上がりやすく、後半は緩やかになる曲線）
// レベルNに到達するために必要な投稿数。要素数がそのまま最大レベルになる。
export const LEVEL_THRESHOLDS = [0, 5, 15, 30, 50, 100, 200, 400, 800, 1600] as const

export function getLevel(postCount: number): number {
  let level = 1
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (postCount >= LEVEL_THRESHOLDS[i]) {
      level = i + 1
    }
  }
  return level
}

// 次のレベルに到達するために必要な投稿数の閾値。最大レベルの場合は null
export function getNextLevelThreshold(postCount: number): number | null {
  const level = getLevel(postCount)
  return LEVEL_THRESHOLDS[level] ?? null
}
