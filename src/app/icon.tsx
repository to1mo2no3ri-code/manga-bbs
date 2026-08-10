import { ImageResponse } from 'next/og'

// TODO: 運営から実際のアイコン画像を受け取ったら、このファイルを削除して
// src/app/icon.png（推奨512x512）に置き換えるだけで自動的に反映されます。
export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#2563eb',
          color: 'white',
          fontSize: 300,
          fontWeight: 700,
        }}
      >
        M
      </div>
    ),
    { ...size }
  )
}
