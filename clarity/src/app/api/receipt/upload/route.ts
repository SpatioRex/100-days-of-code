import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractFromFile } from '@/lib/claude'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { getUserPlan, PLAN_LIMITS, isAtLimit, upgradeRequired } from '@/lib/subscription'
import { startOfMonth, endOfMonth, format } from 'date-fns'

export const maxDuration = 60

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
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
    }

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')

    // Map HEIC to jpeg for Claude
    const mediaType = file.type === 'image/heic' ? 'image/jpeg' : file.type as
      'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf'

    const extracted = await extractFromFile(base64, mediaType)
    if (!extracted) {
      return NextResponse.json({ error: 'Could not extract transaction from this file. Make sure it\'s a receipt or invoice.' }, { status: 422 })
    }

    const { data, error } = await supabase.from('transactions').insert({
      user_id: user.id,
      merchant: extracted.merchant,
      amount: extracted.amount,
      date: extracted.date,
      category: extracted.category,
      is_recurring: extracted.is_recurring,
      source: 'upload',
      raw_text: `upload:${file.name}:${Date.now()}`,
    }).select().single()

    if (error) throw error

    return NextResponse.json({ transaction: data, extracted })
  } catch (err: any) {
    console.error('Receipt upload error:', err)
    return NextResponse.json({ error: err?.message ?? 'Upload failed' }, { status: 500 })
  }
}
