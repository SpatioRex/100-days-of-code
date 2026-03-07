'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell, BellDot, Check, CheckCheck, Inbox } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { format, formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  created_at: string
}

const TYPE_ICONS: Record<string, string> = {
  weekly_digest: '📊',
  new_subscription: '🔁',
  large_transaction: '⚠️',
  sync_complete: '✅',
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const unreadCount = notifications.filter(n => !n.read).length

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data)
      }
    } catch { /* silent */ }
  }, [])

  useEffect(() => {
    fetchNotifications()
    // Poll every 60 seconds
    const interval = setInterval(fetchNotifications, 60_000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  async function markAllRead() {
    setLoading(true)
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' })
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    } finally {
      setLoading(false)
    }
  }

  async function markOneRead(id: string) {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    // Optimistic — fire and forget
    fetch(`/api/notifications/read-all`, { method: 'POST' })
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Notifications"
          className="relative"
        >
          {unreadCount > 0 ? (
            <>
              <BellDot className="h-4 w-4" />
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            </>
          ) : (
            <Bell className="h-4 w-4" />
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80 p-0 flex flex-col">
        <SheetHeader className="flex flex-row items-center justify-between px-4 py-4 border-b">
          <SheetTitle className="text-base">Notifications</SheetTitle>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={markAllRead}
              disabled={loading}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </Button>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <Inbox className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    'flex gap-3 p-4 cursor-pointer hover:bg-accent/50 transition-colors',
                    !n.read && 'bg-primary/5'
                  )}
                  onClick={() => !n.read && markOneRead(n.id)}
                >
                  <span className="text-lg shrink-0 mt-0.5">
                    {TYPE_ICONS[n.type] ?? '🔔'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn('text-sm font-medium leading-tight', !n.read && 'text-foreground')}>
                        {n.title}
                      </p>
                      {!n.read && (
                        <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {n.message}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1.5">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
