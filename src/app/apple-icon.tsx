import { ImageResponse } from 'next/og'

// TODO: 運営から実際のアイコン画像を受け取ったら、このファイルを削除して
// src/app/apple-icon.png（推奨180x180）に置き換えるだけで自動的に反映されます。
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
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
          fontSize: 110,
          fontWeight: 700,
        }}
      >
        M
      </div>
    ),
    { ...size }
  )
}
