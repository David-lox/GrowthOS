import { useState } from 'react'
import { Clock, TrendingUp, CalendarPlus, Check } from 'lucide-react'
import { useChatStore } from '../../store/globalState'

interface PublishWindow {
  platform: string
  date: string          // 如 "周三"、"2024-03-13"
  time: string          // 如 "19:00-21:00"
  reason: string
}

interface GrowthTip {
  tip: string
  priority: 'high' | 'medium' | 'low'
}

interface PublishScheduleData {
  topic: string
  gold_times: PublishWindow[]
  growth_tips: GrowthTip[]
  content_id?: string
}

interface Props {
  data: PublishScheduleData
  logId?: string
}

const PRIORITY_COLOR: Record<string, string> = {
  high: 'bg-red-50 text-red-600 border-red-100',
  medium: 'bg-yellow-50 text-yellow-700 border-yellow-100',
  low: 'bg-gray-50 text-gray-600 border-gray-100',
}

const PRIORITY_LABEL: Record<string, string> = {
  high: '高优',
  medium: '中',
  low: '低',
}

export function PublishScheduleCard({ data, logId: _logId }: Props) {
  const [addedToCal, setAddedToCal] = useState(false)
  const { setPendingMessage } = useChatStore()

  const handleAddToCalendar = () => {
    setPendingMessage(`请把「${data.topic}」的发布计划写入日历：\n${data.gold_times.map((t) => `${t.platform} ${t.date} ${t.time}`).join('、')}`)
    setAddedToCal(true)
  }

  return (
    <div className="rounded-2xl border border-border bg-white overflow-hidden animate-fadeInUp">
      {/* 头部 */}
      <div className="px-4 py-3 border-b border-border">
        <div className="text-xs text-text-secondary mb-0.5">发布策略</div>
        <div className="text-sm font-semibold text-text-primary line-clamp-1">{data.topic}</div>
      </div>

      <div className="p-4 space-y-4">
        {/* 黄金时段 */}
        {data.gold_times.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-xs text-text-secondary font-medium mb-2">
              <Clock size={13} />
              推荐发布时段
            </div>
            <div className="space-y-2">
              {data.gold_times.map((t, i) => (
                <div key={i} className="flex items-start justify-between rounded-xl bg-surface p-2.5">
                  <div>
                    <span className="text-xs font-medium text-primary mr-2">{t.platform}</span>
                    <span className="text-xs text-text-primary">{t.date} · {t.time}</span>
                    {t.reason && (
                      <div className="text-xs text-text-secondary mt-0.5">{t.reason}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 增长建议 */}
        {data.growth_tips.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-xs text-text-secondary font-medium mb-2">
              <TrendingUp size={13} />
              增长建议
            </div>
            <div className="space-y-1.5">
              {data.growth_tips.map((tip, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2 rounded-lg border p-2 ${PRIORITY_COLOR[tip.priority] ?? PRIORITY_COLOR.low}`}
                >
                  <span className="text-[10px] font-medium border rounded px-1 py-0.5 flex-shrink-0 mt-0.5">
                    {PRIORITY_LABEL[tip.priority] ?? tip.priority}
                  </span>
                  <span className="text-xs leading-relaxed">{tip.tip}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 加入日历按钮 */}
        <button
          onClick={handleAddToCalendar}
          disabled={addedToCal}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium
            transition-colors ${addedToCal
              ? 'bg-green-50 text-green-600 cursor-default'
              : 'bg-primary text-white hover:bg-primary-hover'}`}
        >
          {addedToCal ? <Check size={15} /> : <CalendarPlus size={15} />}
          {addedToCal ? '已加入日历' : '加入发布日历'}
        </button>
      </div>
    </div>
  )
}
