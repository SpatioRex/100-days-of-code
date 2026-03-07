'use client'

import { useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, Camera, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface ExtractedTransaction {
  merchant: string
  amount: number
  date: string
  category: string
  is_recurring: boolean
}

export function ReceiptUploadCard() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [lastResult, setLastResult] = useState<ExtractedTransaction | null>(null)

  async function handleFile(file: File) {
    setUploading(true)
    setLastResult(null)
    const id = toast.loading(`Reading ${file.name}…`)

    try {
      const body = new FormData()
      body.append('file', file)
      const res = await fetch('/api/receipt/upload', { method: 'POST', body })
      const json = await res.json()

      toast.dismiss(id)
      if (!res.ok) {
        toast.error(json.error ?? 'Upload failed')
      } else {
        setLastResult(json.extracted)
        toast.success(`Added: ${json.extracted.merchant} — $${json.extracted.amount}`)
      }
    } catch {
      toast.dismiss(id)
      toast.error('Upload failed')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function onFiles(files: FileList | null) {
    if (files?.[0]) handleFile(files[0])
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Upload className="h-4 w-4" /> Receipt Upload
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Upload a photo or PDF of any receipt or invoice — Claude will extract the details automatically.
        </p>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); onFiles(e.dataTransfer.files) }}
          onClick={() => inputRef.current?.click()}
          className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 cursor-pointer transition-colors
            ${dragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'}`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
            capture="environment"
            className="sr-only"
            onChange={(e) => onFiles(e.target.files)}
          />
          {uploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          ) : (
            <>
              <div className="flex gap-3 mb-3">
                <Camera className="h-6 w-6 text-muted-foreground" />
                <Upload className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">Drop receipt here or tap to upload</p>
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG, HEIC, PDF — max 10MB</p>
              <p className="text-xs text-muted-foreground">On mobile, tap to use your camera</p>
            </>
          )}
        </div>

        {/* Result preview */}
        {lastResult && (
          <div className="flex items-start gap-3 rounded-lg border p-3 bg-muted/30">
            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
            <div className="text-sm space-y-0.5">
              <p className="font-medium">{lastResult.merchant}</p>
              <p className="text-muted-foreground">
                ${lastResult.amount} · {lastResult.date} · {lastResult.category}
                {lastResult.is_recurring && ' · Recurring'}
              </p>
            </div>
          </div>
        )}

        <Button
          variant="outline"
          className="w-full"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing…</> : 'Choose File'}
        </Button>
      </CardContent>
    </Card>
  )
}
