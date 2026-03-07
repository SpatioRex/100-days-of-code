import { ImageResponse } from 'next/og'

export const size = { width: 192, height: 192 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 192,
          height: 192,
          background: '#0a0a0a',
          borderRadius: 42,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            color: '#ffffff',
            fontSize: 108,
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
    { width: 192, height: 192 }
  )
}
