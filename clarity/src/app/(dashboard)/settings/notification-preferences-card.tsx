'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Bell, Loader2, Mail, Smartphone } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

interface NotifPrefs {
  email_enabled: boolean
  inapp_enabled: boolean
  weekly_digest: boolean
  new_subscription_alert: boolean
  large_transaction_alert: boolean
  large_transaction_threshold: number
}

const DEFAULT_PREFS: NotifPrefs = {
  email_enabled: true,
  inapp_enabled: true,
  weekly_digest: true,
  new_subscription_alert: true,
  large_transaction_alert: true,
  large_transaction_threshold: 100,
}

export function NotificationPreferencesCard() {
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/notifications/preferences')
      .then(r => r.json())
      .then(data => {
        setPrefs({
          email_enabled: data.email_enabled ?? true,
          inapp_enabled: data.inapp_enabled ?? true,
          weekly_digest: data.weekly_digest ?? true,
          new_subscription_alert: data.new_subscription_alert ?? true,
          large_transaction_alert: data.large_transaction_alert ?? true,
          large_transaction_threshold: data.large_transaction_threshold ?? 100,
        })
      })
      .catch(() => { /* use defaults */ })
      .finally(() => setLoading(false))
  }, [])

  function update(key: keyof NotifPrefs, value: boolean | number) {
    setPrefs(prev => ({ ...prev, [key]: value }))
  }

  async function save() {
    setSaving(true)
    try {
      const res = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      })
      if (res.ok) toast.success('Notification preferences saved')
      else toast.error('Failed to save preferences')
    } catch {
      toast.error('Failed to save preferences')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-4 w-4" /> Notification Preferences
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Delivery channels */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Delivery</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label className="text-sm font-medium">In-app notifications</Label>
                <p className="text-xs text-muted-foreground">Bell icon in the sidebar</p>
              </div>
            </div>
            <Switch
              checked={prefs.inapp_enabled}
              onCheckedChange={(v) => update('inapp_enabled', v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label className="text-sm font-medium">Email notifications</Label>
                <p className="text-xs text-muted-foreground">Sent to your account email</p>
              </div>
            </div>
            <Switch
              checked={prefs.email_enabled}
              onCheckedChange={(v) => update('email_enabled', v)}
            />
          </div>
        </div>

        <Separator />

        {/* Notification types */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Alert Types</p>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Weekly digest</Label>
              <p className="text-xs text-muted-foreground">Summary every Monday</p>
            </div>
            <Switch
              checked={prefs.weekly_digest}
              onCheckedChange={(v) => update('weekly_digest', v)}
              disabled={!prefs.email_enabled && !prefs.inapp_enabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">New subscription detected</Label>
              <p className="text-xs text-muted-foreground">When Claude finds a new recurring charge</p>
            </div>
            <Switch
              checked={prefs.new_subscription_alert}
              onCheckedChange={(v) => update('new_subscription_alert', v)}
              disabled={!prefs.email_enabled && !prefs.inapp_enabled}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Large transaction alert</Label>
                <p className="text-xs text-muted-foreground">When a single charge exceeds your threshold</p>
              </div>
              <Switch
                checked={prefs.large_transaction_alert}
                onCheckedChange={(v) => update('large_transaction_alert', v)}
                disabled={!prefs.email_enabled && !prefs.inapp_enabled}
              />
            </div>
            {prefs.large_transaction_alert && (
              <div className="flex items-center gap-2 pl-0">
                <span className="text-sm text-muted-foreground">Alert threshold:</span>
                <div className="relative w-28">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <Input
                    type="number"
                    min={1}
                    className="pl-6 h-8 text-sm"
                    value={prefs.large_transaction_threshold}
                    onChange={(e) => update('large_transaction_threshold', Number(e.target.value))}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <Button onClick={save} disabled={saving} size="sm">
          {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
          Save Preferences
        </Button>
      </CardContent>
    </Card>
  )
}
