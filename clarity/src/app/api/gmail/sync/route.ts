import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOAuthClient, GMAIL_SEARCH_QUERY } from '@/lib/google'
import { refreshYahooToken, YAHOO_IMAP_HOST, YAHOO_IMAP_PORT } from '@/lib/yahoo'
import { extractFromEmailBatch } from '@/lib/claude'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { getUserPlan } from '@/lib/subscription'
import { google } from 'googleapis'
import { ImapFlow } from 'imapflow'

export const maxDuration = 60

function decodeBase64(data: string): string {
  return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8')
}

function extractEmailText(payload: any): string {
  const parts: string[] = []
  function walk(part: any) {
    if (!part) return
    if (part.mimeType === 'text/plain' && part.body?.data) {
      parts.push(decodeBase64(part.body.data))
    } else if (part.mimeType === 'text/html' && part.body?.data && parts.length === 0) {
      const html = decodeBase64(part.body.data)
      parts.push(html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
    } else if (part.parts) {
      part.parts.forEach(walk)
    }
  }
  walk(payload)
  return parts.join('\n').slice(0, 4000)
}

// --- Gmail API sync ---
async function syncGmailConnection(connection: any, supabase: any, userId: string) {
  const oauth2Client = getOAuthClient()
  oauth2Client.setCredentials({
    access_token: connection.access_token,
    refresh_token: connection.refresh_token ?? undefined,
  })
  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.access_token) {
      await supabase.from('gmail_connections').update({ access_token: tokens.access_token }).eq('id', connection.id)
    }
  })

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
  const listRes = await gmail.users.messages.list({ userId: 'me', q: GMAIL_SEARCH_QUERY, maxResults: 20 })
  const messages = listRes.data.messages ?? []
  if (messages.length === 0) return { synced: 0, skipped: 0 }

  const { data: existingRaw } = await supabase
    .from('transactions').select('raw_text').eq('user_id', userId).eq('source', 'email')
  const existingIds = new Set((existingRaw ?? []).map((r: any) => r.raw_text).filter(Boolean))
  const newMessages = messages.filter((msg: any) => msg.id && !existingIds.has(`gmail:${msg.id}`))

  let synced = 0
  let skipped = messages.length - newMessages.length

  // Fetch all message bodies first (parallel, up to 5 at a time)
  type EmailPayload = { id: string; text: string; date: string | undefined }
  const emailPayloads: EmailPayload[] = []

  for (let i = 0; i < newMessages.length; i += 5) {
    const batch = newMessages.slice(i, i + 5)
    const fetched = await Promise.all(
      batch.map(async (msg: any) => {
        if (!msg.id) return null
        try {
          const fullMsg = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'full' })
          const text = extractEmailText(fullMsg.data.payload)
          if (!text.trim()) return null
          const date = fullMsg.data.internalDate
            ? new Date(parseInt(fullMsg.data.internalDate)).toISOString().split('T')[0]
            : undefined
          return { id: msg.id as string, text, date }
        } catch { return null }
      })
    )
    emailPayloads.push(...(fetched.filter(Boolean) as EmailPayload[]))
  }

  skipped += newMessages.length - emailPayloads.length

  // Batch Claude Haiku extraction — up to 8 emails per call
  const BATCH_SIZE = 8
  for (let i = 0; i < emailPayloads.length; i += BATCH_SIZE) {
    const batch = emailPayloads.slice(i, i + BATCH_SIZE)
    const results = await extractFromEmailBatch(batch.map(e => ({ text: e.text, fallbackDate: e.date })))

    for (let j = 0; j < batch.length; j++) {
      const extracted = results[j]
      if (!extracted) { skipped++; continue }
      const { error } = await supabase.from('transactions').insert({
        user_id: userId,
        merchant: extracted.merchant,
        amount: extracted.amount,
        date: extracted.date,
        category: extracted.category,
        is_recurring: extracted.is_recurring,
        source: 'email',
        raw_text: `gmail:${batch[j].id}`,
      })
      if (error) { skipped++; continue }
      synced++
    }
  }

  await supabase.from('gmail_connections').update({ last_synced_at: new Date().toISOString() }).eq('id', connection.id)
  return { synced, skipped }
}

// --- Yahoo IMAP sync ---
async function syncYahooConnection(connection: any, supabase: any, userId: string) {
  // Refresh token if needed
  let accessToken = connection.access_token
  if (connection.refresh_token) {
    try {
      accessToken = await refreshYahooToken(connection.refresh_token)
      await supabase.from('gmail_connections').update({ access_token: accessToken }).eq('id', connection.id)
    } catch { /* use existing token */ }
  }

  const client = new ImapFlow({
    host: YAHOO_IMAP_HOST,
    port: YAHOO_IMAP_PORT,
    secure: true,
    auth: {
      user: connection.email ?? '',
      accessToken,
    },
    logger: false,
  })

  await client.connect()
  let synced = 0
  let skipped = 0

  try {
    await client.mailboxOpen('INBOX')

    // Search for receipt-like emails in last 90 days
    const since = new Date()
    since.setDate(since.getDate() - 90)

    const searchResults = await client.search({
      since,
      or: [
        { subject: 'receipt' },
        { subject: 'invoice' },
        { subject: 'order confirmation' },
        { subject: 'payment' },
        { subject: 'subscription' },
      ],
    })

    const uids = (searchResults || []).slice(-20) // last 20 matching

    const { data: existingRaw } = await supabase
      .from('transactions').select('raw_text').eq('user_id', userId).eq('source', 'email')
    const existingIds = new Set((existingRaw ?? []).map((r: any) => r.raw_text).filter(Boolean))

    // Collect email bodies first
    type YahooPayload = { key: string; text: string; date: string | undefined }
    const toExtract: YahooPayload[] = []

    for (const uid of uids) {
      const msgKey = `yahoo:${connection.id}:${uid}`
      if (existingIds.has(msgKey)) { skipped++; continue }
      try {
        const msg = await client.fetchOne(String(uid), { bodyStructure: true, envelope: true, bodyParts: ['TEXT'] })
        const bodyPart = (msg as any).bodyParts?.get('text') as Buffer | undefined
        const emailText = bodyPart ? bodyPart.toString('utf-8').slice(0, 4000) : ''
        if (!emailText.trim()) { skipped++; continue }
        const envelopeDate = (msg as any).envelope?.date
        const date = envelopeDate instanceof Date ? envelopeDate.toISOString().split('T')[0] : undefined
        toExtract.push({ key: msgKey, text: emailText, date })
      } catch { skipped++ }
    }

    // Batch Haiku extraction
    const BATCH_SIZE = 8
    for (let i = 0; i < toExtract.length; i += BATCH_SIZE) {
      const batch = toExtract.slice(i, i + BATCH_SIZE)
      const results = await extractFromEmailBatch(batch.map(e => ({ text: e.text, fallbackDate: e.date })))
      for (let j = 0; j < batch.length; j++) {
        const extracted = results[j]
        if (!extracted) { skipped++; continue }
        const { error } = await supabase.from('transactions').insert({
          user_id: userId,
          merchant: extracted.merchant,
          amount: extracted.amount,
          date: extracted.date,
          category: extracted.category,
          is_recurring: extracted.is_recurring,
          source: 'email',
          raw_text: batch[j].key,
        })
        if (error) { skipped++; continue }
        synced++
      }
    }
  } finally {
    await client.logout()
  }

  await supabase.from('gmail_connections').update({ last_synced_at: new Date().toISOString() }).eq('id', connection.id)
  return { synced, skipped }
}

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const plan = await getUserPlan(user.id, supabase)
  if (plan === 'locked') {
    return NextResponse.json({ error: 'upgrade_required', feature: 'gmail_sync', requiredPlan: 'plus' }, { status: 403 })
  }

  const rl = await checkRateLimit(user.id, RATE_LIMITS.gmailSync)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many sync requests. Please wait a few minutes.' },
      { status: 429, headers: { 'Retry-After': String(RATE_LIMITS.gmailSync.windowSeconds) } }
    )
  }

  const { data: connections } = await supabase.from('gmail_connections').select('*').eq('user_id', user.id)
  if (!connections?.length) return NextResponse.json({ error: 'No email accounts connected' }, { status: 400 })

  let totalSynced = 0
  let totalSkipped = 0
  const errors: string[] = []

  for (const conn of connections) {
    try {
      const { synced, skipped } = conn.provider === 'yahoo'
        ? await syncYahooConnection(conn, supabase, user.id)
        : await syncGmailConnection(conn, supabase, user.id)
      totalSynced += synced
      totalSkipped += skipped
    } catch (err: any) {
      console.error(`Sync error for ${conn.email} (${conn.provider}):`, err)
      errors.push(conn.email ?? conn.id)
    }
  }

  if (errors.length > 0 && totalSynced === 0) {
    return NextResponse.json({ error: `Sync failed for: ${errors.join(', ')}` }, { status: 500 })
  }
  return NextResponse.json({ synced: totalSynced, skipped: totalSkipped })
}
