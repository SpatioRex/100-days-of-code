'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ShieldCheck, ShieldOff, Loader2, Smartphone, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'

type MFAStep = 'idle' | 'enrolling' | 'verifying' | 'unenrolling'

interface Factor {
  id: string
  friendly_name?: string
  factor_type: string
  status: string
}

export function MFACard() {
  const supabase = createClient()
  const [factors, setFactors] = useState<Factor[]>([])
  const [step, setStep] = useState<MFAStep>('idle')
  const [loading, setLoading] = useState(true)

  // Enrollment state
  const [factorId, setFactorId] = useState('')
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
  const [verifyCode, setVerifyCode] = useState('')
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const enrolledFactor = factors.find(f => f.status === 'verified')
  const isEnabled = !!enrolledFactor

  useEffect(() => {
    loadFactors()
  }, [])

  async function loadFactors() {
    setLoading(true)
    const { data } = await supabase.auth.mfa.listFactors()
    setFactors((data?.totp ?? []) as Factor[])
    setLoading(false)
  }

  async function handleStartEnroll() {
    setStep('enrolling')
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Authenticator App',
    })
    if (error || !data) {
      toast.error(error?.message ?? 'Failed to start MFA setup')
      setStep('idle')
      return
    }
    setFactorId(data.id)
    setQrCode(data.totp.qr_code)
    setSecret(data.totp.secret)
    setStep('verifying')
  }

  async function handleVerify() {
    if (verifyCode.length !== 6) {
      toast.error('Please enter the 6-digit code from your authenticator app')
      return
    }
    setVerifyLoading(true)
    try {
      const { data: challengeData, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId })
      if (challengeErr) throw challengeErr

      const { error: verifyErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: verifyCode,
      })
      if (verifyErr) throw verifyErr

      toast.success('Authenticator app enabled successfully!')
      setStep('idle')
      setVerifyCode('')
      setQrCode('')
      setSecret('')
      await loadFactors()
    } catch (err: any) {
      toast.error(err.message ?? 'Invalid code — please try again')
    } finally {
      setVerifyLoading(false)
    }
  }

  async function handleUnenroll() {
    if (!enrolledFactor) return
    setStep('unenrolling')
    const { error } = await supabase.auth.mfa.unenroll({ factorId: enrolledFactor.id })
    if (error) {
      toast.error(error.message)
      setStep('idle')
      return
    }
    toast.success('Two-factor authentication disabled')
    setStep('idle')
    await loadFactors()
  }

  function handleCancel() {
    setStep('idle')
    setVerifyCode('')
    setQrCode('')
    setSecret('')
    setFactorId('')
  }

  async function handleCopySecret() {
    await navigator.clipboard.writeText(secret)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4" />
          Two-Factor Authentication (2FA)
          {!loading && (
            <Badge
              variant={isEnabled ? 'default' : 'secondary'}
              className="ml-auto text-xs"
            >
              {isEnabled ? 'Enabled' : 'Disabled'}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Add an extra layer of security to your account with an authenticator app.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading security settings…
          </div>
        ) : step === 'idle' ? (
          <div className="flex items-center justify-between">
            <div>
              {isEnabled ? (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Authenticator app configured</p>
                  <p className="text-xs text-muted-foreground">
                    You'll be asked for a 6-digit code each time you sign in.
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Not enabled</p>
                  <p className="text-xs text-muted-foreground">
                    Protect your account with Google Authenticator, Authy, or any TOTP app.
                  </p>
                </div>
              )}
            </div>
            {isEnabled ? (
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 text-destructive hover:text-destructive"
                onClick={handleUnenroll}
              >
                <ShieldOff className="h-4 w-4 mr-2" />
                Disable
              </Button>
            ) : (
              <Button size="sm" className="shrink-0" onClick={handleStartEnroll}>
                <Smartphone className="h-4 w-4 mr-2" />
                Enable 2FA
              </Button>
            )}
          </div>
        ) : step === 'unenrolling' ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Disabling two-factor authentication…
          </div>
        ) : (
          /* Enrollment flow */
          <div className="space-y-5">
            <div className="space-y-1">
              <p className="text-sm font-medium">Step 1 — Scan this QR code</p>
              <p className="text-xs text-muted-foreground">
                Open your authenticator app (Google Authenticator, Authy, 1Password, etc.) and scan the code below.
              </p>
            </div>

            {qrCode && (
              <div className="flex flex-col items-center gap-3">
                <div className="rounded-lg border bg-white p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrCode} alt="MFA QR Code" width={160} height={160} />
                </div>
                <div className="w-full space-y-1">
                  <p className="text-xs text-muted-foreground text-center">
                    Can't scan? Enter this secret key manually:
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded bg-muted px-3 py-1.5 text-xs font-mono break-all">
                      {secret}
                    </code>
                    <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={handleCopySecret}>
                      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <Separator />

            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">Step 2 — Enter the 6-digit code</p>
                <p className="text-xs text-muted-foreground">
                  Enter the code shown in your authenticator app to confirm setup.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="totp-code">Verification code</Label>
                <Input
                  id="totp-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="000000"
                  value={verifyCode}
                  onChange={e => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="max-w-[160px] text-center text-lg tracking-[0.4em] font-mono"
                  autoComplete="one-time-code"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleVerify}
                  disabled={verifyLoading || verifyCode.length !== 6}
                >
                  {verifyLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Confirm & Enable
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancel} disabled={verifyLoading}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
