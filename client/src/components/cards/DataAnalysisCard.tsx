import { useState } from 'react'
import { Copy, Check, Bot, TrendingDown, TrendingUp } from 'lucide-react'

interface ActionOption {
  label: string
  content: string
}

interface DataAnalysisCardProps {
  data: {
    platform: string
    triggered_rule: string
    root_cause: string
    data_summary?: {
      highlight: string
      problem: string
      baseline_compare: string
    }
    action_options: ActionOption[]
    rule_candidate?: {
      variable: string
      winner_logic: string
      loser_logic?: string
      metric: string
      platform: string
    }
    calendar_note?: string
    next_topic_filter?: string
    raw_data?: Record<string, number | null>
    verify_feedbacks?: Array<{
      cause: string
      improvement: string
      verified: boolean
    }>
  }
  logId?: string
}

const PLATFORM_DISPLAY: Record<string, string> = {
  douyin: '抖音',
  xiaohongshu: '小红书',
  shipinhao: '视频号',
  weixin: '公众号',
  bilibili: 'B站',
}

function MetricBar({ label, value, threshold, unit = '%' }: {
  label: string
  value: number | null | undefined
  threshold: number
  unit?: string
}) {
  if (value == null) return null
  const pct = Math.min(100, (value * 100))
  const thresholdPct = Math.min(100, threshold * 100)
  const ok = value >= threshold

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-600">{label}</span>
        <div className="flex items-center gap-1">
          <span className={ok ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>
            {(value * 100).toFixed(1)}{unit}
          </span>
          <span className="text-gray-400">/ 及格 {(threshold * 100).toFixed(0)}{unit}</span>
        </div>
      </div>
      <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`absolute top-0 left-0 h-full rounded-full transition-all duration-700 ${
            ok ? 'bg-green-400' : 'bg-red-400'
          }`}
          style={{ width: `${pct}%` }}
        />
        {/* 及格线标记 */}
        <div
          className="absolute top-0 h-full w-px bg-gray-400"
          style={{ left: `${thresholdPct}%` }}
        />
      </div>
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
      className="flex items-center gap-1 text-xs text-gray-400 hover:text-primary transition-colors"
    >
      {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
      {copied ? '已复制' : '复制'}
    </button>
  )
}

export function DataAnalysisCard({ data, logId: _logId }: DataAnalysisCardProps) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const rawData = data.raw_data || {}

  const PLATFORM_THRESHOLDS: Record<string, Record<string, number>> = {
    douyin: { completion_rate: 0.3, engagement_rate: 0.03 },
    xiaohongshu: { engagement_rate: 0.05 },
    bilibili: { completion_rate: 0.4 },
    weixin: { open_rate: 0.05 },
    shipinhao: { forward_rate: 0.02 },
  }
  const thresholds = PLATFORM_THRESHOLDS[data.platform] || {}

  return (
    <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden w-full">
      {/* 头部 */}
      <div className="px-4 py-3 border-b border-border bg-gray-50 flex items-center gap-2">
        <Bot size={14} className="text-primary" />
        <span className="text-sm font-semibold text-gray-700">数据复盘</span>
        <span className="ml-auto text-xs text-gray-400">
          {PLATFORM_DISPLAY[data.platform] || data.platform}
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* 数据指标可视化 */}
        {Object.keys(thresholds).length > 0 && (
          <div className="space-y-2.5">
            {thresholds.completion_rate != null && (
              <MetricBar
                label="完播率"
                value={rawData.completion_rate as number}
                threshold={thresholds.completion_rate}
              />
            )}
            {thresholds.engagement_rate != null && (
              <MetricBar
                label="互动率"
                value={rawData.engagement_rate as number}
                threshold={thresholds.engagement_rate}
              />
            )}
            {thresholds.open_rate != null && (
              <MetricBar
                label="打开率"
                value={rawData.open_rate as number}
                threshold={thresholds.open_rate}
              />
            )}
            {thresholds.forward_rate != null && (
              <MetricBar
                label="转发率"
                value={rawData.forward_rate as number}
                threshold={thresholds.forward_rate}
              />
            )}
          </div>
        )}

        {/* 归因结论 */}
        <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
          <div className="flex items-center gap-1.5 mb-1.5">
            <TrendingDown size={13} className="text-amber-600" />
            <span className="text-xs font-medium text-amber-700">归因结论</span>
          </div>
          <p className="text-xs font-medium text-gray-700 mb-0.5">{data.triggered_rule}</p>
          <p className="text-sm text-gray-700 leading-relaxed">{data.root_cause}</p>
          {data.data_summary?.baseline_compare && (
            <p className="text-xs text-gray-400 mt-1">{data.data_summary.baseline_compare}</p>
          )}
        </div>

        {/* 行动方案 */}
        {data.action_options?.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-600">✅ 可直接使用的改写方案</p>
            {data.action_options.map((opt, i) => (
              <div
                key={i}
                onClick={() => setSelectedOption(i)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedOption === i
                    ? 'border-primary bg-primary-light'
                    : 'border-gray-200 bg-gray-50 hover:border-primary/40'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-600">{opt.label}</span>
                  <CopyButton text={opt.content} />
                </div>
                <p className="text-sm text-gray-800 leading-relaxed">{opt.content}</p>
              </div>
            ))}
          </div>
        )}

        {/* 自动写入说明 */}
        <div className="p-3 bg-gray-50 rounded-lg space-y-1.5 text-xs text-gray-500">
          <p className="font-medium text-gray-600">📌 已自动写入</p>
          {data.rule_candidate && (
            <p>· 创作规律库：{data.rule_candidate.variable}（置信度60%，待验证）</p>
          )}
          {data.calendar_note && (
            <p>· 日历备注：{data.calendar_note}</p>
          )}
          {data.next_topic_filter && (
            <p>· 选题过滤：{data.next_topic_filter}</p>
          )}
        </div>

        {/* 历史归因验证结果 */}
        {data.verify_feedbacks && data.verify_feedbacks.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-600">🔄 历史归因验证</p>
            {data.verify_feedbacks.map((fb, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 p-2.5 rounded-lg text-xs ${
                  fb.verified ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}
              >
                {fb.verified
                  ? <TrendingUp size={13} />
                  : <TrendingDown size={13} />
                }
                <span className="flex-1">{fb.cause}</span>
                <span className="font-bold">{fb.improvement}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
