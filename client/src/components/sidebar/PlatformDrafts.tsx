import { useEffect, useState } from 'react'
import { Copy, Check } from 'lucide-react'

interface ContentItem {
  id: string
  topic: string
  platform?: string
  platform_versions?: string
  status: string
  created_at: string
}

interface PlatformVersion {
  platform: string
  hook?: string
  body?: string
  cta?: string
  tags?: string[]
}

interface Props {
  userId: string
}

export function PlatformDrafts({ userId }: Props) {
  const [items, setItems] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>('')
  const [copiedField, setCopiedField] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/content/${userId}?limit=20`)
      .then((r) => r.json())
      .then((d: ContentItem[]) => {
        const filtered = (Array.isArray(d) ? d : []).filter((i) => i.platform_versions)
        setItems(filtered)
        if (filtered.length > 0) {
          setSelectedId(filtered[0].id)
        }
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [userId])

  const selectedItem = items.find((i) => i.id === selectedId)

  const versions: PlatformVersion[] = (() => {
    if (!selectedItem?.platform_versions) return []
    const ALLOWED = ['抖音', '小红书', '视频号', '公众号']
    try {
      const v = JSON.parse(selectedItem.platform_versions)
      const all: PlatformVersion[] = Array.isArray(v)
        ? v
        : Object.entries(v).map(([platform, data]) => ({
            platform,
            ...(typeof data === 'object' && data !== null ? data as object : {}),
          }))
      return all.filter((pv) => ALLOWED.includes(pv.platform))
    } catch {
      return []
    }
  })()

  const currentVersion = versions.find((v) => v.platform === activeTab) ?? versions[0]

  useEffect(() => {
    if (versions.length > 0 && !activeTab) {
      setActiveTab(versions[0].platform)
    }
  }, [versions.length])

  const copyText = (field: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 1500)
    })
  }

  if (loading) {
    return <div className="p-4 text-center text-xs text-text-secondary">加载中…</div>
  }

  if (items.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-text-secondary">
        暂无多平台草稿
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* 内容选择 */}
      <div className="p-2 border-b border-border">
        <select
          value={selectedId ?? ''}
          onChange={(e) => { setSelectedId(e.target.value); setActiveTab('') }}
          className="w-full text-xs border border-border rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary"
        >
          {items.map((i) => (
            <option key={i.id} value={i.id}>{i.topic}</option>
          ))}
        </select>
      </div>

      {/* 平台 Tab */}
      {versions.length > 0 && (
        <div className="flex border-b border-border overflow-x-auto flex-shrink-0">
          {versions.map((v) => (
            <button
              key={v.platform}
              onClick={() => setActiveTab(v.platform)}
              className={`flex-shrink-0 px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap
                ${activeTab === v.platform
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'}`}
            >
              {v.platform}
            </button>
          ))}
        </div>
      )}

      {/* 内容 */}
      {currentVersion ? (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {currentVersion.hook && (
            <Field
              label="钩子开头"
              text={currentVersion.hook}
              fieldKey="hook"
              copiedField={copiedField}
              onCopy={copyText}
            />
          )}
          {currentVersion.body && (
            <Field
              label="正文"
              text={currentVersion.body}
              fieldKey="body"
              copiedField={copiedField}
              onCopy={copyText}
            />
          )}
          {currentVersion.cta && (
            <Field
              label="引导话术"
              text={currentVersion.cta}
              fieldKey="cta"
              copiedField={copiedField}
              onCopy={copyText}
            />
          )}
          {currentVersion.tags && currentVersion.tags.length > 0 && (
            <div>
              <div className="text-xs text-text-secondary mb-1">标签</div>
              <div className="flex flex-wrap gap-1">
                {currentVersion.tags.map((t) => (
                  <span key={t} className="text-xs bg-primary-light text-primary px-2 py-0.5 rounded-full">
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 text-center text-xs text-text-secondary">暂无数据</div>
      )}
    </div>
  )
}

function Field({
  label,
  text,
  fieldKey,
  copiedField,
  onCopy,
}: {
  label: string
  text: string
  fieldKey: string
  copiedField: string | null
  onCopy: (key: string, text: string) => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-text-secondary">{label}</span>
        <button
          onClick={() => onCopy(fieldKey, text)}
          className="flex items-center gap-1 text-xs text-text-secondary hover:text-primary transition-colors"
        >
          {copiedField === fieldKey ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
          {copiedField === fieldKey ? '已复制' : '复制'}
        </button>
      </div>
      <p className="text-xs text-text-primary leading-relaxed bg-surface rounded-lg p-2 whitespace-pre-wrap">
        {text}
      </p>
    </div>
  )
}
