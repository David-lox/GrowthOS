import { useEffect, useState } from 'react'
import { FileText, ChevronDown, ChevronUp } from 'lucide-react'

interface ContentItem {
  id: string
  topic: string
  niche?: string
  content_type?: string
  platform?: string
  status: string
  created_at: string
}

interface Props {
  userId: string
}

const STATUS_LABEL: Record<string, string> = {
  final: '已完成',
  draft: '草稿',
  published: '已发布',
}

const STATUS_COLOR: Record<string, string> = {
  final: 'bg-green-100 text-green-700',
  draft: 'bg-yellow-100 text-yellow-700',
  published: 'bg-blue-100 text-blue-700',
}

export function ContentHistory({ userId }: Props) {
  const [items, setItems] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/content/${userId}?limit=30`)
      .then((r) => r.json())
      .then((d) => setItems(Array.isArray(d) ? d : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [userId])

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
  }

  if (loading) {
    return <div className="p-4 text-center text-xs text-text-secondary">加载中…</div>
  }

  if (items.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-text-secondary">
        <FileText size={24} className="mx-auto mb-2 opacity-30" />
        暂无内容记录
      </div>
    )
  }

  return (
    <div className="divide-y divide-border">
      {items.map((item) => (
        <div key={item.id}>
          <button
            className="w-full flex items-start gap-2 px-3 py-2.5 text-left hover:bg-bg-hover transition-colors"
            onClick={() => setExpanded(expanded === item.id ? null : item.id)}
          >
            <FileText size={14} className="mt-0.5 flex-shrink-0 text-text-secondary" />
            <div className="flex-1 min-w-0">
              <div className="text-sm text-text-primary truncate">{item.topic}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLOR[item.status] ?? 'bg-gray-100 text-gray-500'}`}>
                  {STATUS_LABEL[item.status] ?? item.status}
                </span>
                {item.platform && (
                  <span className="text-xs text-text-secondary">{item.platform}</span>
                )}
                <span className="text-xs text-text-secondary ml-auto">{formatDate(item.created_at)}</span>
              </div>
            </div>
            {expanded === item.id ? <ChevronUp size={14} className="text-text-secondary flex-shrink-0 mt-1" /> : <ChevronDown size={14} className="text-text-secondary flex-shrink-0 mt-1" />}
          </button>

          {expanded === item.id && (
            <div className="px-3 pb-3 text-xs text-text-secondary space-y-1 bg-surface">
              {item.niche && <div>赛道：{item.niche}</div>}
              {item.content_type && <div>类型：{item.content_type}</div>}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
