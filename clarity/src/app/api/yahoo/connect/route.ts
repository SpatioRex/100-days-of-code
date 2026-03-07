import { NextResponse } from 'next/server'
import { getYahooAuthUrl } from '@/lib/yahoo'

export async function GET() {
  if (!process.env.YAHOO_CLIENT_ID || !process.env.YAHOO_REDIRECT_URI) {
    return NextResponse.json({ error: 'Yahoo not configured' }, { status: 503 })
  }
  return NextResponse.redirect(getYahooAuthUrl())
}
