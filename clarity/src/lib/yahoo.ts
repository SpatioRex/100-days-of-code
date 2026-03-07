export const YAHOO_AUTH_URL = 'https://api.login.yahoo.com/oauth2/request_auth'
export const YAHOO_TOKEN_URL = 'https://api.login.yahoo.com/oauth2/get_token'
export const YAHOO_IMAP_HOST = 'imap.mail.yahoo.com'
export const YAHOO_IMAP_PORT = 993

export function getYahooAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: process.env.YAHOO_CLIENT_ID!,
    redirect_uri: process.env.YAHOO_REDIRECT_URI!,
    response_type: 'code',
    scope: 'mail-r openid',
  })
  return `${YAHOO_AUTH_URL}?${params}`
}

export async function exchangeYahooCode(code: string): Promise<{
  access_token: string
  refresh_token: string | null
  email: string | null
}> {
  const credentials = Buffer.from(
    `${process.env.YAHOO_CLIENT_ID}:${process.env.YAHOO_CLIENT_SECRET}`
  ).toString('base64')

  const res = await fetch(YAHOO_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.YAHOO_REDIRECT_URI!,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Yahoo token exchange failed: ${text}`)
  }

  const data = await res.json()
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? null,
    email: data.xoauth_yahoo_guid ? null : null, // email fetched separately via userinfo
  }
}

export async function refreshYahooToken(refreshToken: string): Promise<string> {
  const credentials = Buffer.from(
    `${process.env.YAHOO_CLIENT_ID}:${process.env.YAHOO_CLIENT_SECRET}`
  ).toString('base64')

  const res = await fetch(YAHOO_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })

  if (!res.ok) throw new Error('Yahoo token refresh failed')
  const data = await res.json()
  return data.access_token
}

export async function getYahooUserEmail(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch('https://api.login.yahoo.com/openid/v1/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.email ?? null
  } catch {
    return null
  }
}
