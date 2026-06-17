import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Copy, Check } from 'lucide-react'
import { EditableText } from '../shared/EditableText'
import { reportReaction } from '../../lib/api'
import { useChat } from '../../hooks/useChat'

interface ScriptSegment {
  order: number
  content: string
  duration: string
  action?: string
}

interface VideoScript {
  hook: string
  segments: ScriptSegment[]
  ending: string
  totalDuration: string
}

interface Storyboard {
  shot: string
  action: string
  duration: string
  lightingNote?: string
  angleNote?: string
}

interface Cover {
  title: string
  subtitle: string
  visualPrompt: string
  shootingTips?: string
}

interface ScriptCardData {
  content_type: 'video' | 'graphic'
  topic: string
  niche: string
  // Video fields
  script?: VideoScript
  storyboard?: Storyboard[]
  shootingStyle?: string
  popularFormula?: string
  cover?: Cover
  applied_rules?: string[]
  // Graphic fields
  title?: string
  body?: string
  tags?: string[]
  ending?: string
}

interface ScriptCardProps {
  data: ScriptCardData
  logId?: string
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
      {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
    </button>
  )
}

export function ScriptCard({ data, logId }: ScriptCardProps) {
  const [tab, setTab] = useState<'script' | 'storyboard' | 'cover'>('script')
  const [confirmed, setConfirmed] = useState(false)
  const { sendMessage } = useChat()

  const handleConfirm = async () => {
    setConfirmed(true)
    if (logId) await reportReaction({ logId, reaction: 'good' })
    sendMessage('[选择] 确认内容，进入多平台适配')
  }

  const handleAskAgent = (field: string, request: string) => {
    sendMessage(`请修改【${field}】：${request}`)
  }

  if (data.content_type === 'graphic') {
    return (
      <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden max-w-lg">
        <div className="px-4 py-3 border-b border-border bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-800">📝 图文内容</h3>
          <p className="text-xs text-gray-500 mt-0.5">{data.topic}</p>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <p className="text-xs text-gray-400 mb-1">标题</p>
            <EditableText
              value={data.title || ''}
              onConfirm={(v) => console.log('title:', v)}
              onAskAgent={handleAskAgent}
              fieldName="标题"
              className="text-sm font-medium text-gray-800"
            />
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">正文</p>
            <div className="prose text-sm">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.body || ''}</ReactMarkdown>
            </div>
          </div>
          {data.tags && (
            <div className="flex flex-wrap gap-1">
              {data.tags.map((tag, i) => (
                <span key={i} className="text-xs px-2 py-0.5 bg-primary-light text-primary rounded-full">
                  #{tag}
                </span>
              ))}
            </div>
          )}
          {!confirmed && (
            <button
              onClick={handleConfirm}
              className="w-full py-2 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary-hover"
            >
              确认内容，进行多平台适配
            </button>
          )}
        </div>
      </div>
    )
  }

  // Video card
  const tabs = [
    { id: 'script', label: '脚本' },
    ...(data.storyboard?.length ? [{ id: 'storyboard', label: '分镜' }] : []),
    ...(data.cover ? [{ id: 'cover', label: '封面' }] : []),
  ] as { id: 'script' | 'storyboard' | 'cover'; label: string }[]

  return (
    <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden max-w-lg">
      <div className="px-4 py-3 border-b border-border bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">🎬 视频脚本</h3>
            <p className="text-xs text-gray-500 mt-0.5">{data.topic}</p>
          </div>
          {data.script?.totalDuration && (
            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
              {data.script.totalDuration}
            </span>
          )}
        </div>
        {data.applied_rules && data.applied_rules.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {data.applied_rules.map((r, i) => (
              <span key={i} className="text-xs px-2 py-0.5 bg-primary-light text-primary rounded-full">
                ✓ {r}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 text-xs font-medium transition-colors
              ${tab === t.id
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
        {tab === 'script' && data.script && (
          <>
            <div className="bg-primary-light rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-primary">⚡ Hook（前3秒）</span>
                <CopyButton text={data.script.hook} />
              </div>
              <EditableText
                value={data.script.hook}
                onConfirm={(v) => console.log('hook:', v)}
                onAskAgent={handleAskAgent}
                fieldName="开场钩子"
                className="text-sm text-gray-800"
              />
            </div>

            {data.script.segments?.map((seg, i) => (
              <div key={i} className="border border-border rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-400">片段 {seg.order} · {seg.duration}</span>
                  <CopyButton text={seg.content} />
                </div>
                <EditableText
                  value={seg.content}
                  onConfirm={(v) => console.log(`seg${i}:`, v)}
                  onAskAgent={handleAskAgent}
                  fieldName={`片段${seg.order}`}
                  multiline
                  className="text-sm text-gray-800"
                />
                {seg.action && (
                  <p className="text-xs text-gray-400 mt-1">📷 {seg.action}</p>
                )}
              </div>
            ))}

            <div className="border border-border rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-gray-600">🔚 结尾引导</span>
                <CopyButton text={data.script.ending} />
              </div>
              <EditableText
                value={data.script.ending}
                onConfirm={(v) => console.log('ending:', v)}
                onAskAgent={handleAskAgent}
                fieldName="结尾引导"
                className="text-sm text-gray-800"
              />
            </div>
          </>
        )}

        {tab === 'storyboard' && data.storyboard && (
          <div className="space-y-2">
            {data.storyboard.map((shot, i) => (
              <div key={i} className="border border-border rounded-lg p-3 text-xs">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-700">#{i + 1} {shot.shot}</span>
                  <span className="text-gray-400">{shot.duration}</span>
                </div>
                <p className="text-gray-600">{shot.action}</p>
                {shot.lightingNote && <p className="text-gray-400 mt-0.5">💡 {shot.lightingNote}</p>}
                {shot.angleNote && <p className="text-gray-400 mt-0.5">📐 {shot.angleNote}</p>}
              </div>
            ))}
          </div>
        )}

        {tab === 'cover' && data.cover && (
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-400 mb-1">封面标题</p>
              <p className="text-sm font-semibold text-gray-800">{data.cover.title}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">副标题</p>
              <p className="text-sm text-gray-600">{data.cover.subtitle}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">画面描述</p>
              <p className="text-xs text-gray-600 bg-gray-50 rounded p-2">{data.cover.visualPrompt}</p>
            </div>
            {data.cover.shootingTips && (
              <div>
                <p className="text-xs text-gray-400 mb-1">拍摄建议</p>
                <p className="text-xs text-gray-600">{data.cover.shootingTips}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {!confirmed && (
        <div className="px-4 py-3 border-t border-border">
          <button
            onClick={handleConfirm}
            className="w-full py-2 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary-hover"
          >
            确认内容，进行多平台适配
          </button>
        </div>
      )}
    </div>
  )
}
