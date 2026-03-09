'use client'

import { useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, Camera, CheckCircle2, Loader2, X, FileText } from 'lucide-react'
import { toast } from 'sonner'

interface ExtractedTransaction {
  merchant: string
  amount: number
  date: string
  category: string
  is_recurring: boolean
  items?: { name: string; price: number; quantity?: number }[]
}

interface QueuedPhoto {
  file: File
  previewUrl: string | null // null for PDFs
}

export function ReceiptUploadCard() {
  const inputRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [lastResult, setLastResult] = useState<ExtractedTransaction | null>(null)
  const [queue, setQueue] = useState<QueuedPhoto[]>([])

  function addToQueue(files: FileList | null) {
    if (!files || files.length === 0) return
    const newPhotos: QueuedPhoto[] = Array.from(files).map((file) => ({
      file,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
    }))
    setQueue((prev) => [...prev, ...newPhotos])
  }

  function removeFromQueue(idx: number) {
    setQueue((prev) => {
      const item = prev[idx]
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
      return prev.filter((_, i) => i !== idx)
    })
  }

  function clearQueue() {
    setQueue((prev) => {
      prev.forEach((p) => p.previewUrl && URL.revokeObjectURL(p.previewUrl))
      return []
    })
  }

  async function handleUpload() {
    if (queue.length === 0) return
    setUploading(true)
    setLastResult(null)
    const label = queue.length === 1 ? queue[0].file.name : `${queue.length} photos`
    const id = toast.loading(`Reading ${label}…`)

    try {
      const body = new FormData()
      queue.forEach(({ file }) => body.append('file', file))
      const res = await fetch('/api/receipt/upload', { method: 'POST', body })
      const json = await res.json()

      toast.dismiss(id)
      if (res.status === 409 && json.duplicate) {
        // Same receipt already imported — warn but don't treat as error
        toast.warning(json.error ?? 'This receipt was already uploaded.')
        clearQueue()
      } else if (!res.ok) {
        toast.error(json.error ?? 'Upload failed')
      } else {
        setLastResult(json.extracted)
        const itemCount = json.extracted?.items?.length ?? 0
        const itemLabel = itemCount > 0 ? ` · ${itemCount} item${itemCount !== 1 ? 's' : ''}` : ''
        toast.success(`Added: ${json.extracted.merchant} — $${Number(json.extracted.amount).toFixed(2)}${itemLabel}`)
        clearQueue()
      }
    } catch {
      toast.dismiss(id)
      toast.error('Upload failed')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
      if (cameraRef.current) cameraRef.current.value = ''
    }
  }

  return (
    <Card id="receipt-upload">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Upload className="h-4 w-4" /> Receipt Upload
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Upload one or more photos of a receipt — Claude reads all photos together as one receipt. Great for long receipts that need two shots.
        </p>

        {/* Drop zone — <label> for native iOS Safari compatibility */}
        <label
          htmlFor="receipt-file-input"
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); addToQueue(e.dataTransfer.files) }}
          className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 cursor-pointer transition-colors
            ${dragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'}`}
        >
          <input
            id="receipt-file-input"
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
            multiple
            className="sr-only"
            onChange={(e) => addToQueue(e.target.files)}
          />
          <div className="flex gap-3 mb-2">
            <Camera className="h-6 w-6 text-muted-foreground" />
            <Upload className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">Drop photos here or tap to add</p>
          <p className="text-xs text-muted-foreground mt-1">JPG, PNG, HEIC, PDF — max 10 MB each · up to 6 photos</p>
          <p className="text-xs text-muted-foreground">On mobile, pick from gallery or use camera below</p>
        </label>

        {/* Photo queue */}
        {queue.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {queue.length} photo{queue.length > 1 ? 's' : ''} queued
              </p>
              <button
                onClick={clearQueue}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                Clear all
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {queue.map((item, idx) => (
                <div key={idx} className="relative aspect-square rounded-md border overflow-hidden bg-muted">
                  {item.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.previewUrl}
                      alt={item.file.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-2">
                      <FileText className="h-7 w-7 text-muted-foreground" />
                      <p className="text-[10px] text-muted-foreground text-center leading-tight truncate w-full px-1">
                        {item.file.name}
                      </p>
                    </div>
                  )}
                  <button
                    onClick={() => removeFromQueue(idx)}
                    className="absolute top-1 right-1 rounded-full bg-background/80 backdrop-blur-sm p-0.5 hover:bg-background border border-border/50"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Result preview */}
        {lastResult && (
          <div className="flex items-start gap-3 rounded-lg border p-3 bg-muted/30">
            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
            <div className="text-sm space-y-1 w-full">
              <p className="font-medium">{lastResult.merchant}</p>
              <p className="text-muted-foreground">
                ${Number(lastResult.amount).toFixed(2)} · {lastResult.date} · {lastResult.category}
                {lastResult.is_recurring && ' · Recurring'}
              </p>
              {lastResult.items && lastResult.items.length > 0 && (
                <div className="mt-1.5 divide-y rounded-md border text-xs">
                  {lastResult.items.map((item, i) => (
                    <div key={i} className="flex justify-between px-2.5 py-1.5">
                      <span>
                        {item.quantity && item.quantity > 1 && (
                          <span className="text-muted-foreground mr-1">{item.quantity}×</span>
                        )}
                        {item.name}
                      </span>
                      <span className="font-medium">${Number(item.price).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Hidden camera-only input */}
        <input
          id="receipt-camera-input"
          ref={cameraRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          capture="environment"
          className="sr-only"
          onChange={(e) => addToQueue(e.target.files)}
        />

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            disabled={uploading}
            asChild
          >
            <label htmlFor="receipt-file-input" className="cursor-pointer">
              <Upload className="h-4 w-4 mr-2" />
              {queue.length > 0 ? 'Add More' : 'Choose File'}
            </label>
          </Button>

          <Button
            variant="outline"
            className="flex-1"
            disabled={uploading}
            asChild
          >
            <label htmlFor="receipt-camera-input" className="cursor-pointer">
              <Camera className="h-4 w-4 mr-2" />Take Photo
            </label>
          </Button>
        </div>

        {/* Upload button — only shown when photos are queued */}
        {queue.length > 0 && (
          <Button
            className="w-full"
            onClick={handleUpload}
            disabled={uploading}
          >
            {uploading
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing…</>
              : <><Upload className="h-4 w-4 mr-2" />Upload {queue.length > 1 ? `${queue.length} Photos` : 'Receipt'}</>
            }
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
