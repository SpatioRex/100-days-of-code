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
  const label = connection.email ?? 'Gmail account'
  try {
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
  } catch (err: any) {
    // OAuth token revoked / expired / network error — don't propagate; log and return 0
    const isAuth = err?.message?.includes('invalid_grant') || err?.code === 401 || err?.status === 401
    console.error(`[Gmail sync ${label}] ${isAuth ? 'Auth error (needs reconnect)' : 'Error'}: ${err?.message ?? err}`)
    return { synced: 0, skipped: 0, needsReauth: isAuth }
  }
}

/** Races a promise against a hard ms timeout so Yahoo IMAP never hangs the function. */
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`IMAP timeout: ${label} (${ms}ms)`)), ms)
    ),
  ])
}

// --- Yahoo IMAP sync ---
async function syncYahooConnection(connection: any, supabase: any, userId: string) {
  // Auth method:
  // refresh_token present → OAuth; try refresh first
  // refresh_token null   → app password stored in access_token
  let imapAuth: { user: string; pass?: string; accessToken?: string }

  if (connection.refresh_token) {
    let accessToken = connection.access_token
    try {
      accessToken = await refreshYahooToken(connection.refresh_token)
      await supabase.from('gmail_connections').update({ access_token: accessToken }).eq('id', connection.id)
    } catch { /* use existing token */ }
    imapAuth = { user: connection.email ?? '', accessToken }
  } else {
    // App password — access_token IS the app password
    imapAuth = { user: connection.email ?? '', pass: connection.access_token }
  }

  const client = new ImapFlow({
    host: YAHOO_IMAP_HOST,
    port: YAHOO_IMAP_PORT,
    secure: true,
    auth: imapAuth,
    logger: false,
    socketTimeout: 15000,
  })

  // INBOX only — "Bulk Mail" (Yahoo's spam folder) hangs indefinitely on IMAP SELECT
  // and would eat the entire Vercel function timeout before processing any emails.
  const YAHOO_FOLDERS = ['INBOX']

  // Focused keyword list — covers receipts, invoices, orders, billing, subscriptions.
  // "shipped" / "confirmation" / "charged" / "purchase" removed — lower signal, slower.
  const searchKeywords = [
    'receipt', 'invoice', 'order', 'payment',
    'subscription', 'billing', 'renewal',
  ]

  await withTimeout(client.connect(), 10000, 'connect')
  let synced = 0
  let skipped = 0

  try {
    const since = new Date()
    since.setDate(since.getDate() - 90)

    const { data: existingRaw } = await supabase
      .from('transactions').select('raw_text').eq('user_id', userId).eq('source', 'email')
    const existingIds = new Set((existingRaw ?? []).map((r: any) => r.raw_text).filter(Boolean))

    type YahooPayload = { key: string; text: string; date: string | undefined }
    const toExtract: YahooPayload[] = []
    const seenKeys = new Set<string>()

    for (const folder of YAHOO_FOLDERS) {
      try {
        await withTimeout(client.mailboxOpen(folder), 8000, `mailboxOpen ${folder}`)
      } catch (e) {
        console.log(`[Yahoo sync ${connection.email}] Skipping folder "${folder}": ${e instanceof Error ? e.message : e}`)
        continue
      }

      // Run each keyword search with its own timeout.
      // Collect sequence numbers and deduplicate across keywords.
      const seqSet = new Set<number>()
      for (const keyword of searchKeywords) {
        try {
          const results = await withTimeout(
            client.search({ since, subject: keyword }),
            8000, `search ${keyword}`
          )
          ;((results || []) as number[]).forEach(seq => seqSet.add(seq))
        } catch (e) {
          console.log(`[Yahoo sync ${connection.email}] Search "${keyword}" skipped: ${e instanceof Error ? e.message : e}`)
        }
      }

      // Take 20 most recent (highest seq = newest)
      const seqNums = Array.from(seqSet).sort((a, b) => a - b).slice(-20)
      console.log(`[Yahoo sync ${connection.email}] ${seqNums.length} unique matches in ${folder}`)
      if (seqNums.length === 0) continue

      const seqRange = seqNums.join(',')
      try {
        // Fetch parts 1, 2, 1.1, 1.2 in one command — covers all common MIME structures:
        //   multipart/alternative: part 1 = text/plain, part 2 = text/html
        //   multipart/mixed:       part 1.1 = text/plain, part 1.2 = text/html
        // source:true (full BODY[]) hangs on Yahoo — never use it.
        const fetchLoop = async () => {
          for await (const msg of client.fetch(seqRange, { bodyParts: ['1', '2', '1.1', '1.2'], envelope: true })) {
            const messageId: string | undefined = (msg as any).envelope?.messageId
            const msgKey = messageId
              ? `yahoo:mid:${messageId}`
              : `yahoo:${connection.id}:${folder}:${(msg as any).seq}`

            if (seenKeys.has(msgKey) || existingIds.has(msgKey)) { skipped++; continue }
            seenKeys.add(msgKey)

            // Pick the largest available part — more bytes = richer content for Claude.
            // HTML receipts (Apple, Netflix, etc.) put all details in part 2 or 1.2,
            // leaving part 1 nearly empty ("View this email in your browser...").
            const bp = (msg as any).bodyParts as Map<string, Buffer> | undefined
            const bodyBuf = ['1.2', '1.1', '2', '1']
              .map(k => bp?.get(k))
              .filter((b): b is Buffer => Buffer.isBuffer(b) && b.byteLength > 0)
              .reduce<Buffer | undefined>(
                (best, buf) => !best || buf.byteLength > best.byteLength ? buf : best,
                undefined
              )
            if (!bodyBuf) { skipped++; continue }

            const rawBody = bodyBuf.toString('utf-8')

            // Decode quoted-printable, strip style/script blocks, HTML tags, entities
            const emailText = rawBody
              .replace(/=\r?\n/g, '')
              .replace(/=([0-9A-Fa-f]{2})/g, (_: string, h: string) => String.fromCharCode(parseInt(h, 16)))
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
              .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
              .replace(/<[^>]+>/g, ' ')
              .replace(/&[a-zA-Z0-9#]+;/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
              .slice(0, 4000)

            if (!emailText) { skipped++; continue }

            const envelopeDate = (msg as any).envelope?.date
            const date = envelopeDate instanceof Date ? envelopeDate.toISOString().split('T')[0] : undefined
            toExtract.push({ key: msgKey, text: emailText, date })
          }
        }
        await withTimeout(fetchLoop(), 20000, 'fetch messages')
      } catch (e) {
        console.error(`[Yahoo sync ${connection.email}] Fetch error (${folder}): ${e instanceof Error ? e.message : e}`)
      }
    }

    console.log(`[Yahoo sync ${connection.email}] Sending ${toExtract.length} emails to Claude`)

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
        if (error) {
          console.error(`[Yahoo sync ${connection.email}] DB insert error:`, error.message)
          skipped++
          continue
        }
        synced++
      }
    }

    console.log(`[Yahoo sync ${connection.email}] Done — synced=${synced} skipped=${skipped}`)
  } finally {
    try { await client.logout() } catch { /* ignore */ }
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
  const needsReauth: string[] = []

  for (const conn of connections) {
    try {
      const result = conn.provider === 'yahoo'
        ? await syncYahooConnection(conn, supabase, user.id)
        : await syncGmailConnection(conn, supabase, user.id)
      totalSynced += result.synced
      totalSkipped += result.skipped
      if ((result as any).needsReauth) {
        needsReauth.push(conn.email ?? (conn.provider === 'yahoo' ? 'Yahoo Mail' : 'Gmail'))
      }
    } catch (err: any) {
      const label = conn.email ?? (conn.provider === 'yahoo' ? 'Yahoo Mail' : 'Gmail')
      console.error(`Sync error for ${label}:`, err)
      errors.push(label)
    }
  }

  if (errors.length > 0 && errors.length === connections.length) {
    return NextResponse.json({ error: `Sync failed for: ${errors.join(', ')}` }, { status: 500 })
  }
  return NextResponse.json({
    synced: totalSynced,
    skipped: totalSkipped,
    ...(needsReauth.length > 0 ? { needsReauth } : {}),
    ...(errors.length > 0 ? { warnings: errors } : {}),
  })
}
