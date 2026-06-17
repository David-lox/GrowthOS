import { Calendar, Clock, AlertCircle, Bot } from 'lucide-react'

interface CalendarItem {
  topic: string
  platform: string
  scheduledTime: string
  reason?: string
  trendBasis?: string
  reminder?: {
    advanceHours: number
    message: string
  }
  improvementNote?: string
}

interface CalendarCardProps {
  data: {
    weekPlan: CalendarItem[]
    publishOrder?: string
    calendarNote?: string
    nextReviewDate?: string
    generatedAt?: string
  }
  logId?: string
  onSave?: (items: CalendarItem[]) => void
}

const PLATFORM_DISPLAY: Record<string, string> = {
  douyin: '抖音',
  xiaohongshu: '小红书',
  shipinhao: '视频号',
  weixin: '公众号',
  bilibili: 'B站',
}

const PLATFORM_COLOR: Record<string, string> = {
  douyin: 'bg-gray-800 text-white',
  xiaohongshu: 'bg-red-500 text-white',
  shipinhao: 'bg-green-600 text-white',
  weixin: 'bg-green-500 text-white',
  bilibili: 'bg-blue-500 text-white',
}

function formatScheduledTime(timeStr: string): { date: string; time: string; weekday: string } {
  try {
    const dt = new Date(timeStr)
    if (isNaN(dt.getTime())) {
      return { date: timeStr, time: '', weekday: '' }
    }
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    return {
      date: `${dt.getMonth() + 1}/${dt.getDate()}`,
      time: `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`,
      weekday: weekdays[dt.getDay()],
    }
  } catch {
    return { date: timeStr, time: '', weekday: '' }
  }
}

export function CalendarCard({ data, logId: _logId, onSave }: CalendarCardProps) {
  const { weekPlan = [] } = data

  return (
    <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden w-full">
      {/* 头部 */}
      <div className="px-4 py-3 border-b border-border bg-gray-50 flex items-center gap-2">
        <Bot size={14} className="text-primary" />
        <Calendar size={14} className="text-primary" />
        <span className="text-sm font-semibold text-gray-700">内容日历</span>
        <span className="ml-auto text-xs text-gray-400">
          {weekPlan.length} 条计划
        </span>
      </div>

      {/* 计划列表 */}
      <div className="divide-y divide-border">
        {weekPlan.map((item, i) => {
          const { date, time, weekday } = formatScheduledTime(item.scheduledTime)
          return (
            <div key={i} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start gap-3">
                {/* 时间块 */}
                <div className="flex-shrink-0 w-14 text-center">
                  <div className="text-lg font-bold text-primary leading-none">{date}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{weekday}</div>
                  {time && (
                    <div className="flex items-center justify-center gap-0.5 mt-1">
                      <Clock size={9} className="text-gray-400" />
                      <span className="text-xs text-gray-500">{time}</span>
                    </div>
                  )}
                </div>

                {/* 内容 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${
                      PLATFORM_COLOR[item.platform] || 'bg-gray-200 text-gray-600'
                    }`}>
                      {PLATFORM_DISPLAY[item.platform] || item.platform}
                    </span>
                    <p className="text-sm font-medium text-gray-800 truncate">{item.topic}</p>
                  </div>

                  {item.reason && (
                    <p className="text-xs text-gray-500 leading-relaxed mt-1">{item.reason}</p>
                  )}

                  {item.trendBasis && (
                    <p className="text-xs text-blue-500 mt-1">🔥 {item.trendBasis}</p>
                  )}

                  {item.improvementNote && (
                    <div className="mt-1.5 flex items-start gap-1">
                      <AlertCircle size={11} className="text-amber-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-600">{item.improvementNote}</p>
                    </div>
                  )}

                  {item.reminder && (
                    <div className="mt-1.5 text-xs text-gray-400">
                      ⏰ 提前 {item.reminder.advanceHours}h 提醒：{item.reminder.message}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 底部备注 */}
      {(data.calendarNote || data.nextReviewDate) && (
        <div className="px-4 py-3 border-t border-border bg-gray-50 space-y-1">
          {data.calendarNote && (
            <p className="text-xs text-gray-500">{data.calendarNote}</p>
          )}
          {data.nextReviewDate && (
            <p className="text-xs text-gray-400">下次复盘：{data.nextReviewDate}</p>
          )}
        </div>
      )}

      {/* 保存按钮 */}
      {onSave && (
        <div className="px-4 py-3 border-t border-border">
          <button
            onClick={() => onSave(weekPlan)}
            className="w-full py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors"
          >
            保存到日历
          </button>
        </div>
      )}
    </div>
  )
}
