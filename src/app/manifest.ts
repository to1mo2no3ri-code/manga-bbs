import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'マンギロンDB - 漫画議論掲示板',
    short_name: 'マンギロンDB',
    description: '漫画雑誌カテゴリ別に語り合える匿名掲示板',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#2563eb',
    icons: [
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
