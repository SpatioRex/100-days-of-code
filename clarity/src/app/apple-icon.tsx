import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: '#0a0a0a',
          borderRadius: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            color: '#ffffff',
            fontSize: 100,
            fontWeight: 700,
            fontFamily: 'sans-serif',
            letterSpacing: '-4px',
            lineHeight: 1,
          }}
        >
          C
        </span>
      </div>
    ),
    { width: 180, height: 180 }
  )
}
