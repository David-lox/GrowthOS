import { useState } from 'react'
import { Copy, Check, Camera, Image } from 'lucide-react'
import { EditableText } from '../shared/EditableText'
import { useChatStore } from '../../store/globalState'

interface ShootingBrief {
  shot?: string
  prop?: string
  angle?: string
  lighting?: string
  background?: string
}

interface GraphicCardData {
  topic: string
  title?: string
  body?: string
  tags?: string[]
  ending?: string
  cover_prompt?: string
  shooting_brief?: ShootingBrief
  content_id?: string
}

interface Props {
  data: GraphicCardData
  logId?: string
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 1800)
      }}
      className="flex items-center gap-1 text-xs text-text-secondary hover:text-primary transition-colors"
    >
      {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
      {copied ? '已复制' : '复制'}
    </button>
  )
}

export function GraphicCard({ data, logId: _logId }: Props) {
  const [tab, setTab] = useState<'content' | 'shoot'>('content')
  const [localTitle, setLocalTitle] = useState(data.title ?? '')
  const [localBody, setLocalBody] = useState(data.body ?? '')
  const { setPendingMessage } = useChatStore()

  const handleAskAgent = (field: string, current: string) => {
    setPendingMessage(`请帮我修改图文的「${field}」部分，当前内容是：\n\n${current}\n\n我希望它更…（请补充你的要求）`)
  }

  const tags = data.tags ?? []

  const saveField = async (field: string, value: string) => {
    if (!data.content_id) return
    await fetch(`/api/content/${data.content_id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    }).catch(() => {})
  }

  return (
    <div className="rounded-2xl border border-border bg-white overflow-hidden animate-fadeInUp">
      {/* 标签栏 */}
      <div className="flex border-b border-border">
        {['content', 'shoot'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t as typeof tab)}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors
              ${tab === t ? 'text-primary border-b-2 border-primary' : 'text-text-secondary hover:text-text-primary'}`}
          >
            {t === 'content' ? '图文内容' : '拍摄说明'}
          </button>
        ))}
      </div>

      <div className="p-4">
        {tab === 'content' ? (
          <div className="space-y-3">
            {/* 标题 */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-text-secondary font-medium">标题</span>
                <CopyBtn text={localTitle} />
              </div>
              <EditableText
                value={localTitle}
                onConfirm={(v) => { setLocalTitle(v); saveField('title', v) }}
                onAskAgent={(_, c) => handleAskAgent('标题', c)}
                fieldName="标题"
                className="text-sm font-semibold text-text-primary"
              />
            </div>

            {/* 正文 */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-text-secondary font-medium">正文</span>
                <CopyBtn text={localBody} />
              </div>
              <EditableText
                value={localBody}
                onConfirm={(v) => { setLocalBody(v); saveField('body', v) }}
                onAskAgent={(_, c) => handleAskAgent('正文', c)}
                fieldName="正文"
                multiline
                className="text-sm text-text-primary leading-relaxed"
              />
            </div>

            {/* 结尾 */}
            {data.ending && (
              <div>
                <div className="text-xs text-text-secondary font-medium mb-1">结尾引导</div>
                <p className="text-sm text-text-primary">{data.ending}</p>
              </div>
            )}

            {/* 标签 */}
            {tags.length > 0 && (
              <div>
                <div className="text-xs text-text-secondary font-medium mb-1.5">标签</div>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((t) => (
                    <span key={t} className="text-xs bg-primary-light text-primary px-2 py-0.5 rounded-full">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {/* 封面生成提示词 */}
            {data.cover_prompt && (
              <div className="rounded-xl bg-surface p-3">
                <div className="flex items-center gap-1.5 text-xs text-text-secondary font-medium mb-1.5">
                  <Image size={13} />
                  封面 AI 生成提示词
                </div>
                <p className="text-xs text-text-primary leading-relaxed">{data.cover_prompt}</p>
                <button
                  onClick={() => setPendingMessage(`请根据提示词生成封面图：${data.cover_prompt}`)}
                  className="mt-2 w-full py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary-hover transition-colors"
                >
                  生成封面图
                </button>
              </div>
            )}

            {/* 拍摄说明 */}
            {data.shooting_brief && (
              <div className="rounded-xl bg-surface p-3">
                <div className="flex items-center gap-1.5 text-xs text-text-secondary font-medium mb-2">
                  <Camera size={13} />
                  拍摄 Brief
                </div>
                <div className="space-y-1.5 text-xs text-text-primary">
                  {Object.entries(data.shooting_brief).map(([k, v]) => v && (
                    <div key={k} className="flex gap-2">
                      <span className="text-text-secondary flex-shrink-0 w-10">
                        {k === 'shot' ? '镜头' : k === 'prop' ? '道具' : k === 'angle' ? '角度' : k === 'lighting' ? '光线' : '背景'}
                      </span>
                      <span>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
