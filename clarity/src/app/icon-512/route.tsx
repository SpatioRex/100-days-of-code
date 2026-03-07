import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 512,
          height: 512,
          background: '#0a0a0a',
          borderRadius: 112,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            color: '#ffffff',
            fontSize: 290,
            fontWeight: 700,
            fontFamily: 'sans-serif',
            letterSpacing: '-10px',
            lineHeight: 1,
          }}
        >
          C
        </span>
      </div>
    ),
    { width: 512, height: 512 }
  )
}
