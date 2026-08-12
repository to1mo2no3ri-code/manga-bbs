'use client'

import { useState } from 'react'
import { toggleFavorite } from '@/app/actions/favorites'

interface FavoriteButtonProps {
  threadId: string
  initialIsFavorite: boolean
  className?: string
}

export default function FavoriteButton({
  threadId,
  initialIsFavorite,
  className = '',
}: FavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite)
  const [isPending, setIsPending] = useState(false)

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (isPending) return

    setIsPending(true)
    const next = !isFavorite
    setIsFavorite(next) // 楽観的に即反映
    const actual = await toggleFavorite(threadId)
    setIsFavorite(actual)
    setIsPending(false)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={isFavorite ? 'お気に入りから外す' : 'お気に入りに追加'}
      className={`shrink-0 leading-none ${isFavorite ? 'text-amber-500' : 'text-gray-300 hover:text-amber-400'} ${className}`}
    >
      {isFavorite ? '★' : '☆'}
    </button>
  )
}
