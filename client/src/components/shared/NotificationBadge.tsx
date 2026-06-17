import { useEffect, useState } from 'react'
import { Bell, X, Clock, AlertTriangle } from 'lucide-react'

interface Notification {
  id: number
  type: string
  payload: {
    content_id?: string
    title?: string
    days_since_last?: number
  }
  created_at: string
}

interface NotificationBadgeProps {
  userId: string
  onReviewClick?: (contentId: string) => void
}

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  review_reminder: { label: '复盘提醒', color: 'text-blue-500', icon: Clock },
  gap_warning_1: { label: '断更提醒', color: 'text-amber-500', icon: AlertTriangle },
  gap_warning_2: { label: '断更警告', color: 'text-orange-500', icon: AlertTriangle },
  gap_warning_3: { label: '严重断更', color: 'text-red-500', icon: AlertTriangle },
}

export function NotificationBadge({ userId, onReviewClick }: NotificationBadgeProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const [count, setCount] = useState(0)

  const fetchCount = () => {
    if (!userId) return
    fetch(`/api/notifications/count?user_id=${userId}`)
      .then((r) => r.json())
      .then((d) => setCount(d.count || 0))
      .catch(() => {})
  }

  const fetchNotifications = () => {
    if (!userId) return
    fetch(`/api/notifications/pending?user_id=${userId}&limit=10`)
      .then((r) => r.json())
      .then((data) => setNotifications(Array.isArray(data) ? data : []))
      .catch(() => setNotifications([]))
  }

  // 轮询：每 2 分钟检查一次未读数
  useEffect(() => {
    fetchCount()
    const timer = setInterval(fetchCount, 120_000)
    return () => clearInterval(timer)
  }, [userId])

  const markShown = async (id: number) => {
    await fetch(`/api/notifications/${id}/shown`, { method: 'PUT' })
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    setCount((c) => Math.max(0, c - 1))
  }

  const handleOpen = () => {
    setOpen(true)
    fetchNotifications()
  }

  if (!open) {
    return (
      <button
        onClick={handleOpen}
        className="relative text-gray-400 hover:text-primary transition-colors"
        title="通知"
      >
        <Bell size={18} />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center leading-none">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(false)}
        className="text-gray-400 hover:text-primary transition-colors"
      >
        <Bell size={18} />
      </button>

      {/* 下拉面板 */}
      <div className="absolute top-8 right-0 w-72 bg-white border border-border rounded-xl shadow-lg z-50 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm font-semibold text-gray-700">通知</span>
          <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
            <X size={14} />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 && (
            <div className="p-4 text-xs text-gray-400 text-center">暂无未读通知</div>
          )}

          {notifications.map((n) => {
            const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.review_reminder
            const Icon = cfg.icon
            return (
              <div key={n.id} className="flex items-start gap-3 px-4 py-3 border-b border-border/50 hover:bg-gray-50">
                <Icon size={14} className={`${cfg.color} flex-shrink-0 mt-0.5`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</p>
                  {n.type === 'review_reminder' && (
                    <p className="text-xs text-gray-600 mt-0.5">
                      「{n.payload.title || '内容'}」发布超过24小时了，去复盘数据？
                    </p>
                  )}
                  {n.type.startsWith('gap_warning') && (
                    <p className="text-xs text-gray-600 mt-0.5">
                      已 {n.payload.days_since_last} 天未发布内容，注意断更风险！
                    </p>
                  )}
                  {n.type === 'review_reminder' && n.payload.content_id && (
                    <button
                      onClick={() => {
                        onReviewClick?.(n.payload.content_id!)
                        markShown(n.id)
                      }}
                      className="text-xs text-primary hover:underline mt-1"
                    >
                      去复盘 →
                    </button>
                  )}
                </div>
                <button
                  onClick={() => markShown(n.id)}
                  className="text-gray-300 hover:text-gray-500 flex-shrink-0"
                >
                  <X size={12} />
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
