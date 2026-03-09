import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractFromFile, extractFromFiles } from '@/lib/claude'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { getUserPlan, PLAN_LIMITS, isAtLimit, upgradeRequired } from '@/lib/subscription'
import { startOfMonth, endOfMonth, format } from 'date-fns'
import { createHash } from 'crypto'

export const maxDuration = 60

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
const MAX_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_FILES = 6 // max photos per receipt

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const plan = await getUserPlan(user.id, supabase)
  const monthlyLimit = PLAN_LIMITS[plan].receiptUploadsPerMonth

  if (monthlyLimit === 0) {
    return NextResponse.json(upgradeRequired('receipt_upload', 'plus'), { status: 403 })
  }

  if (monthlyLimit !== Infinity) {
    const now = new Date()
    const { count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('source', 'upload')
      .gte('date', format(startOfMonth(now), 'yyyy-MM-dd'))
      .lte('date', format(endOfMonth(now), 'yyyy-MM-dd'))

    if (isAtLimit(count ?? 0, monthlyLimit)) {
      return NextResponse.json(upgradeRequired('receipt_upload', 'pro'), { status: 403 })
    }
  }

  const rl = await checkRateLimit(user.id, RATE_LIMITS.receiptUpload)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many uploads. Please wait a few minutes and try again.' },
      { status: 429, headers: { 'Retry-After': String(RATE_LIMITS.receiptUpload.windowSeconds) } }
    )
  }

  try {
    const formData = await request.formData()

    // Accept multiple files under the same 'file' key
    const rawFiles = formData.getAll('file')
    const files = rawFiles.filter((f): f is File => f instanceof File)

    if (files.length === 0) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (files.length > MAX_FILES) {
      return NextResponse.json({ error: `Too many photos (max ${MAX_FILES} per receipt)` }, { status: 400 })
    }

    for (const file of files) {
      if (file.size > MAX_SIZE) {
        return NextResponse.json({ error: `File "${file.name}" is too large (max 10MB)` }, { status: 400 })
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json({ error: `Unsupported file type: ${file.type}` }, { status: 400 })
      }
    }

    // Convert all files to base64 in parallel and build a SHA-256 content hash for dedup
    const imageData = await Promise.all(
      files.map(async (file) => {
        const bytes = await file.arrayBuffer()
        const base64Data = Buffer.from(bytes).toString('base64')
        // Map HEIC → jpeg for Claude (Claude treats it as jpeg)
        const mediaType = (file.type === 'image/heic' ? 'image/jpeg' : file.type) as
          'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf'
        return { base64Data, mediaType, bytes }
      })
    )

    // Build a stable content hash: SHA-256 of all file bytes concatenated in order.
    // This prevents the same receipt from being uploaded twice.
    const hasher = createHash('sha256')
    for (const { bytes } of imageData) hasher.update(Buffer.from(bytes))
    const contentHash = hasher.digest('hex')

    // Duplicate check — same content hash already exists for this user
    const { data: dupCheck } = await supabase
      .from('transactions')
      .select('id, merchant, amount, date')
      .eq('user_id', user.id)
      .eq('content_hash', contentHash)
      .maybeSingle()

    if (dupCheck) {
      return NextResponse.json(
        {
          error: `This receipt was already uploaded (${dupCheck.merchant} — $${Number(dupCheck.amount).toFixed(2)} on ${dupCheck.date}).`,
          duplicate: true,
          existingTransaction: dupCheck,
        },
        { status: 409 }
      )
    }

    // Strip bytes from imageData before passing to Claude (not needed)
    const claudeInput = imageData.map(({ base64Data, mediaType }) => ({ base64Data, mediaType }))

    // Single file → existing extractFromFile; multiple → extractFromFiles (all images in one call)
    const extracted = claudeInput.length === 1
      ? await extractFromFile(claudeInput[0].base64Data, claudeInput[0].mediaType)
      : await extractFromFiles(claudeInput)

    if (!extracted) {
      return NextResponse.json(
        { error: "Could not extract transaction from this receipt. Make sure it's a receipt or invoice." },
        { status: 422 }
      )
    }

    const fileLabel = files.length === 1 ? files[0].name : `${files.length}-photo receipt`
    const { data, error } = await supabase.from('transactions').insert({
      user_id: user.id,
      merchant: extracted.merchant,
      amount: extracted.amount,
      date: extracted.date,
      category: extracted.category,
      is_recurring: extracted.is_recurring,
      source: 'upload',
      raw_text: `upload:${fileLabel}`,
      content_hash: contentHash,
      items: extracted.items ?? null,
    }).select().single()

    if (error) throw error

    return NextResponse.json({ transaction: data, extracted })
  } catch (err: any) {
    console.error('Receipt upload error:', err)
    return NextResponse.json({ error: err?.message ?? 'Upload failed' }, { status: 500 })
  }
}
