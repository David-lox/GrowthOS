import { useState } from 'react'
import { Copy, Bot, Check } from 'lucide-react'

interface PlatformVersion {
  platform: string
  title: string
  hook: string
  body: string
  cta: string
  tags: string[]
  coverSuggestion?: string
  goldTime?: string
  growthTips?: string[]
  publishSchedule?: string
  error?: string
}

interface PlatformVersionsCardProps {
  data: {
    topic: string
    versions: PlatformVersion[]
    platformCount: number
  }
  logId?: string
}

const PLATFORM_NAMES: Record<string, string> = {
  douyin: '抖音',
  xiaohongshu: '小红书',
  shipinhao: '视频号',
  weixin: '公众号',
  bilibili: 'B站',
}

const PLATFORM_COLORS: Record<string, string> = {
  douyin: 'bg-gray-900 text-white',
  xiaohongshu: 'bg-red-500 text-white',
  shipinhao: 'bg-green-600 text-white',
  weixin: 'bg-green-500 text-white',
  bilibili: 'bg-blue-500 text-white',
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      className="text-gray-400 hover:text-primary transition-colors"
      title="复制"
    >
      {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
    </button>
  )
}

function PlatformTab({ version }: { version: PlatformVersion }) {
  const [section, setSection] = useState<'content' | 'publish'>('content')

  if (version.error) {
    return (
      <div className="p-4 text-xs text-red-500">
        生成失败：{version.error}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* 标签切换 */}
      <div className="flex gap-1 text-xs">
        {(['content', 'publish'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSection(s)}
            className={`px-3 py-1 rounded-full transition-colors ${
              section === s
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s === 'content' ? '内容文案' : '发布策略'}
          </button>
        ))}
      </div>

      {section === 'content' && (
        <div className="space-y-3">
          {/* 标题 */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-500">标题</span>
              <CopyButton text={version.title} />
            </div>
            <p className="text-sm font-medium text-gray-800">{version.title}</p>
          </div>

          {/* 开场钩子 */}
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-amber-700">开场钩子</span>
              <CopyButton text={version.hook} />
            </div>
            <p className="text-sm text-gray-800 leading-relaxed">{version.hook}</p>
          </div>

          {/* 正文 */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-500">正文</span>
              <CopyButton text={version.body} />
            </div>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap line-clamp-6">
              {version.body}
            </p>
          </div>

          {/* CTA */}
          <div className="p-3 bg-green-50 rounded-lg border border-green-100">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-green-700">行动引导</span>
              <CopyButton text={version.cta} />
            </div>
            <p className="text-sm text-gray-800">{version.cta}</p>
          </div>

          {/* 标签 */}
          {version.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {version.tags.map((tag, i) => (
                <span key={i} className="px-2 py-0.5 text-xs bg-primary-light text-primary rounded-full">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* 封面建议 */}
          {version.coverSuggestion && (
            <div className="p-2 text-xs text-gray-500 bg-gray-50 rounded-lg">
              封面建议：{version.coverSuggestion}
            </div>
          )}
        </div>
      )}

      {section === 'publish' && (
        <div className="space-y-3">
          {version.goldTime && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg">
              <span className="text-lg">⏰</span>
              <div>
                <p className="text-xs text-amber-700 font-medium">黄金发布时间</p>
                <p className="text-sm text-gray-800">{version.goldTime}</p>
              </div>
            </div>
          )}

          {version.publishSchedule && (
            <div className="p-3 bg-primary-light rounded-lg">
              <p className="text-xs text-primary font-medium mb-1">具体计划</p>
              <p className="text-sm text-gray-800">{version.publishSchedule}</p>
            </div>
          )}

          {version.growthTips && version.growthTips.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-600">推流技巧</p>
              {version.growthTips.map((tip, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-primary font-bold">{i + 1}.</span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function PlatformVersionsCard({ data, logId: _logId }: PlatformVersionsCardProps) {
  const [activeTab, setActiveTab] = useState(0)
  const version = data.versions[activeTab]

  return (
    <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden w-full">
      {/* 头部 */}
      <div className="px-4 py-3 border-b border-border bg-gray-50 flex items-center gap-2">
        <Bot size={14} className="text-primary" />
        <span className="text-sm font-semibold text-gray-700">多平台适配</span>
        <span className="ml-auto text-xs text-gray-400">{data.platformCount} 个平台</span>
      </div>

      {/* 选题 */}
      <div className="px-4 py-2 border-b border-border bg-primary-light">
        <p className="text-xs text-primary">选题：{data.topic}</p>
      </div>

      {/* 平台标签栏 */}
      <div className="flex gap-1 p-3 border-b border-border overflow-x-auto">
        {data.versions.map((v, i) => (
          <button
            key={i}
            onClick={() => setActiveTab(i)}
            className={`px-3 py-1 rounded-lg text-xs font-medium flex-shrink-0 transition-all ${
              activeTab === i
                ? (PLATFORM_COLORS[v.platform] || 'bg-primary text-white')
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {PLATFORM_NAMES[v.platform] || v.platform}
          </button>
        ))}
      </div>

      {/* 内容区 */}
      <div className="p-4">
        {version && <PlatformTab version={version} />}
      </div>
    </div>
  )
}
