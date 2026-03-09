import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export interface ReceiptItem {
  name: string
  price: number
  quantity?: number
}

export interface ExtractedTransaction {
  merchant: string
  amount: number
  date: string // YYYY-MM-DD
  category: 'Food' | 'Shopping' | 'Subscriptions' | 'Travel' | 'Utilities' | 'Entertainment' | 'Health' | 'Other'
  is_recurring: boolean
  items?: ReceiptItem[] // line items (receipt uploads only — emails won't have these)
}

/** Safely parse the items array Claude returns, filtering out malformed entries. */
function parseItems(raw: unknown): ReceiptItem[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined
  const items: ReceiptItem[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue
    const obj = entry as Record<string, unknown>
    if (!obj.name || obj.price === undefined) continue
    items.push({
      name: String(obj.name),
      price: Number(obj.price),
      ...(obj.quantity !== undefined ? { quantity: Number(obj.quantity) } : {}),
    })
  }
  return items.length > 0 ? items : undefined
}

export async function extractFromEmail(emailText: string, fallbackDate?: string): Promise<ExtractedTransaction | null> {
  const results = await extractFromEmailBatch([{ text: emailText, fallbackDate }])
  return results[0] ?? null
}

/**
 * Batch extract transactions from multiple emails in a single Claude Haiku call.
 * ~73% cheaper than Sonnet per token; system-prompt overhead paid once per batch.
 */
export async function extractFromEmailBatch(
  emails: Array<{ text: string; fallbackDate?: string }>
): Promise<Array<ExtractedTransaction | null>> {
  if (emails.length === 0) return []

  const today = new Date().toISOString().split('T')[0]

  const emailBlocks = emails
    .map((e, i) => {
      const dateHint = e.fallbackDate ?? today
      return `=== EMAIL ${i + 1} (fallback date: ${dateHint}) ===\n${e.text.slice(0, 3000)}`
    })
    .join('\n\n')

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `You are a financial data extraction assistant. Extract transaction details from each email below.

Return ONLY a valid JSON array with one object per email (no markdown, no explanation):
[
  {
    "merchant": "Company name",
    "amount": 12.99,
    "date": "YYYY-MM-DD",
    "category": one of ["Food","Shopping","Subscriptions","Travel","Utilities","Entertainment","Health","Other"],
    "is_recurring": true or false
  }
]

Rules:
- One array element per email, in order
- amount must be a number (no currency symbols)
- date in YYYY-MM-DD format; use the date in the email body if present, otherwise use the fallback date shown above each email
- is_recurring = true if this looks like a subscription or repeating charge
- If an email does NOT contain a financial transaction, use {"error":"not_a_transaction"} for that element

${emailBlocks}`,
        },
      ],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : '[]'
    const parsed: unknown[] = JSON.parse(text.trim())

    return parsed.map((item) => {
      if (!item || typeof item !== 'object') return null
      const obj = item as Record<string, unknown>
      if (obj.error) return null
      if (!obj.merchant || obj.amount === undefined) return null
      return {
        merchant: String(obj.merchant),
        amount: Number(obj.amount),
        date: String(obj.date),
        category: (obj.category as ExtractedTransaction['category']) ?? 'Other',
        is_recurring: Boolean(obj.is_recurring),
      }
    })
  } catch {
    return emails.map(() => null)
  }
}

/**
 * Extract a single transaction from multiple receipt photos in one Claude call.
 * All images are treated as different sections of the same receipt.
 */
export async function extractFromFiles(
  images: Array<{ base64Data: string; mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf' }>
): Promise<ExtractedTransaction | null> {
  if (images.length === 0) return null
  if (images.length === 1) return extractFromFile(images[0].base64Data, images[0].mediaType)

  try {
    const imageBlocks = images.map(({ base64Data, mediaType }) => ({
      type: 'image' as const,
      source: {
        type: 'base64' as const,
        media_type: (mediaType === 'application/pdf' ? 'image/jpeg' : mediaType) as
          'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
        data: base64Data,
      },
    }))

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: [
            ...imageBlocks,
            {
              type: 'text',
              text: `These ${images.length} images are photos of the same receipt — each photo covers a different part of a long receipt. Combine all sections to extract the transaction details.

Return ONLY a valid JSON object with these exact fields (no markdown, no explanation):
{
  "merchant": "Store or company name",
  "amount": 12.99,
  "date": "YYYY-MM-DD",
  "category": one of ["Food", "Shopping", "Subscriptions", "Travel", "Utilities", "Entertainment", "Health", "Other"],
  "is_recurring": true or false,
  "items": [
    { "name": "Item name", "price": 9.99, "quantity": 1 }
  ]
}

Rules:
- amount is the GRAND TOTAL paid (look for "Total", "Grand Total", "Amount Due" — usually on the last section/photo)
- date in YYYY-MM-DD format; if not visible use today: ${new Date().toISOString().split('T')[0]}
- is_recurring = true only if this is clearly a subscription or recurring charge
- items: list every individual line item with its name, unit price, and quantity (default quantity to 1 if not shown). Omit tax, tip, discount, and subtotal lines — only include actual purchased items/services.
- If no transaction is visible across any photo, return: {"error": "not_a_transaction"}`,
            },
          ],
        },
      ],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const parsed = JSON.parse(text.trim())

    if (parsed.error) return null
    if (!parsed.merchant || parsed.amount === undefined) return null

    return {
      merchant: String(parsed.merchant),
      amount: Number(parsed.amount),
      date: String(parsed.date),
      category: parsed.category ?? 'Other',
      is_recurring: Boolean(parsed.is_recurring),
      items: parseItems(parsed.items),
    }
  } catch {
    return null
  }
}

export async function extractFromFile(
  base64Data: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf'
): Promise<ExtractedTransaction | null> {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: (mediaType === 'application/pdf' ? 'image/jpeg' : mediaType) as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
                data: base64Data,
              },
            },
            {
              type: 'text',
              text: `Extract transaction details from this receipt/invoice image.

Return ONLY a valid JSON object with these exact fields (no markdown, no explanation):
{
  "merchant": "Store or company name",
  "amount": 12.99,
  "date": "YYYY-MM-DD",
  "category": one of ["Food", "Shopping", "Subscriptions", "Travel", "Utilities", "Entertainment", "Health", "Other"],
  "is_recurring": true or false,
  "items": [
    { "name": "Item name", "price": 9.99, "quantity": 1 }
  ]
}

Rules:
- amount should be the total amount paid (a number, no currency symbols)
- date in YYYY-MM-DD format; if not found use today: ${new Date().toISOString().split('T')[0]}
- is_recurring = true only if this is clearly a subscription
- items: list every individual line item with its name, unit price, and quantity (default quantity to 1 if not shown). Omit tax, tip, discounts, and subtotal rows — only actual purchased items/services.
- If no transaction is visible, return: {"error": "not_a_transaction"}`,
            },
          ],
        },
      ],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const parsed = JSON.parse(text.trim())

    if (parsed.error) return null
    if (!parsed.merchant || parsed.amount === undefined) return null

    return {
      merchant: String(parsed.merchant),
      amount: Number(parsed.amount),
      date: String(parsed.date),
      category: parsed.category ?? 'Other',
      is_recurring: Boolean(parsed.is_recurring),
      items: parseItems(parsed.items),
    }
  } catch {
    return null
  }
}
