/**
 * Yahoo IMAP diagnostic — GET /api/yahoo/debug
 * Uses per-operation timeouts so a hanging Yahoo server never stalls the whole function.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ImapFlow } from 'imapflow'
import { YAHOO_IMAP_HOST, YAHOO_IMAP_PORT } from '@/lib/yahoo'

export const maxDuration = 30

/** Races a promise against a ms timeout. On timeout throws with a clear message. */
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`TIMEOUT: ${label} (${ms}ms)`)), ms)
    ),
  ])
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: connections } = await supabase
    .from('gmail_connections')
    .select('*')
    .eq('user_id', user.id)
    .eq('provider', 'yahoo')

  if (!connections?.length) {
    return NextResponse.json({ error: 'No Yahoo account connected' }, { status: 400 })
  }

  const conn = connections[0]
  const imapAuth = conn.refresh_token
    ? { user: conn.email ?? '', accessToken: conn.access_token }
    : { user: conn.email ?? '', pass: conn.access_token }

  const log: string[] = []

  const client = new ImapFlow({
    host: YAHOO_IMAP_HOST,
    port: YAHOO_IMAP_PORT,
    secure: true,
    auth: imapAuth,
    logger: false,
    socketTimeout: 10000,
  })

  try {
    await withTimeout(client.connect(), 8000, 'connect')
    log.push('✓ connect')

    // Open INBOX only — Bulk Mail / Spam folder names vary and can hang
    try {
      const info = await withTimeout(client.mailboxOpen('INBOX'), 8000, 'mailboxOpen INBOX')
      log.push(`✓ INBOX open — ${(info as any).exists ?? '?'} messages`)
    } catch (e: any) {
      log.push(`✗ INBOX open: ${e.message}`)
      return NextResponse.json({ email: conn.email, log })
    }

    const since90 = new Date()
    since90.setDate(since90.getDate() - 90)

    // Test 1: search WITH since-date + "receipt"
    let withSince: number[] = []
    try {
      withSince = ((await withTimeout(
        client.search({ since: since90, subject: 'receipt' }),
        8000, 'search since+receipt'
      )) || []) as number[]
      log.push(`✓ search(since + "receipt") → ${withSince.length} results`)
    } catch (e: any) {
      log.push(`✗ search(since + "receipt"): ${e.message}`)
    }

    // Test 2: search WITHOUT since — if this finds emails but Test 1 didn't,
    // then Yahoo is ignoring or choking on the SINCE criterion
    let noSince: number[] = []
    try {
      noSince = ((await withTimeout(
        client.search({ subject: 'receipt' }),
        8000, 'search receipt-only'
      )) || []) as number[]
      log.push(`✓ search("receipt" only) → ${noSince.length} results`)
    } catch (e: any) {
      log.push(`✗ search("receipt" only): ${e.message}`)
    }

    // Test 3: search ALL recent (no keyword filter) — how many emails exist in last 90 days?
    let allRecent: number[] = []
    try {
      allRecent = ((await withTimeout(
        client.search({ since: since90 }),
        8000, 'search all since'
      )) || []) as number[]
      log.push(`✓ search(all since 90d) → ${allRecent.length} messages`)
    } catch (e: any) {
      log.push(`✗ search(all since 90d): ${e.message}`)
    }

    // Test 4: fetch subjects of newest 3 receipt matches
    const candidates = (noSince.length >= withSince.length ? noSince : withSince).slice(-3)
    if (candidates.length > 0) {
      try {
        const subjects: string[] = []
        const fetchLoop = async () => {
          for await (const msg of client.fetch(candidates.join(','), { envelope: true })) {
            subjects.push((msg as any).envelope?.subject ?? '(no subject)')
          }
        }
        await withTimeout(fetchLoop(), 8000, 'fetch subjects')
        log.push(`✓ sample subjects: ${subjects.join(' | ')}`)
      } catch (e: any) {
        log.push(`✗ fetch subjects: ${e.message}`)
      }
    }

    // Test 5: fetch all 4 MIME parts of the newest match and show sizes + content preview.
    // This reveals which part actually has the receipt data (usually part '2' for HTML emails).
    const newestSeq = candidates[candidates.length - 1]
    if (newestSeq) {
      try {
        const partSizes: Record<string, number> = {}
        let bestText = ''
        const fetchAllParts = async () => {
          for await (const msg of client.fetch(String(newestSeq), {
            bodyParts: ['1', '2', '1.1', '1.2'],
          })) {
            const bp = (msg as any).bodyParts as Map<string, Buffer> | undefined
            for (const key of ['1', '2', '1.1', '1.2']) {
              const buf = bp?.get(key)
              if (buf && buf.byteLength > 0) partSizes[key] = buf.byteLength
            }
            // Pick the largest part as the "best" for content preview
            const best = ['1.2', '1.1', '2', '1']
              .map(k => bp?.get(k))
              .filter((b): b is Buffer => Buffer.isBuffer(b) && b.byteLength > 0)
              .reduce<Buffer | undefined>(
                (acc, b) => !acc || b.byteLength > acc.byteLength ? b : acc, undefined
              )
            if (best) {
              // Decode exactly as the sync route does, then take first 300 chars
              bestText = best.toString('utf-8')
                .replace(/=\r?\n/g, '')
                .replace(/=([0-9A-Fa-f]{2})/g, (_: string, h: string) => String.fromCharCode(parseInt(h, 16)))
                .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
                .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
                .replace(/<[^>]+>/g, ' ')
                .replace(/&[a-zA-Z0-9#]+;/g, ' ')
                .replace(/\s+/g, ' ')
                .trim()
                .slice(0, 300)
            }
            break
          }
        }
        await withTimeout(fetchAllParts(), 12000, 'fetch all parts')
        const sizeSummary = Object.entries(partSizes).map(([k, v]) => `part${k}=${v}b`).join(', ')
        log.push(sizeSummary ? `✓ part sizes: ${sizeSummary}` : `✗ all parts empty`)
        log.push(bestText ? `✓ processed preview: ${bestText}` : `✗ processed text empty after decode`)
      } catch (e: any) {
        log.push(`✗ fetch all parts: ${e.message}`)
      }
    }

    log.push('done')
  } catch (e: any) {
    log.push(`✗ fatal: ${e.message}`)
  } finally {
    try { await client.logout() } catch { /* ignore */ }
  }

  return NextResponse.json({ email: conn.email, log })
}
