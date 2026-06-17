import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface CalendarItem {
  id: string
  platform: string
  topic: string
  scheduled_at: string
  status: string
}

interface Props {
  userId: string
}

const PLATFORM_COLOR: Record<string, string> = {
  '抖音': 'bg-black text-white',
  '小红书': 'bg-red-500 text-white',
  '视频号': 'bg-green-600 text-white',
  '公众号': 'bg-blue-600 text-white',
}

const DEFAULT_COLOR = 'bg-primary text-white'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

export function CalendarView({ userId }: Props) {
  const [items, setItems] = useState<CalendarItem[]>([])
  const [weekOffset, setWeekOffset] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/calendar/${userId}`)
      .then((r) => r.json())
      .then((d) => setItems(Array.isArray(d) ? d : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [userId])

  // 计算当前周的7天
  const getWeekDays = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dayOfWeek = today.getDay()
    const monday = new Date(today)
    monday.setDate(today.getDate() - dayOfWeek + weekOffset * 7)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      return d
    })
  }

  const weekDays = getWeekDays()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const getItemsForDay = (day: Date) => {
    const dayStr = day.toISOString().split('T')[0]
    return items.filter((item) => {
      const itemDate = new Date(item.scheduled_at).toISOString().split('T')[0]
      return itemDate === dayStr
    })
  }

  const weekLabel = () => {
    const first = weekDays[0]
    const last = weekDays[6]
    return `${first.getMonth() + 1}月${first.getDate()}日 – ${last.getDate()}日`
  }

  if (loading) {
    return <div className="p-4 text-center text-xs text-text-secondary">加载中…</div>
  }

  return (
    <div className="p-3">
      {/* 周导航 */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setWeekOffset((w) => w - 1)}
          className="p-1 rounded hover:bg-bg-hover text-text-secondary"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="text-xs font-medium text-text-primary">{weekLabel()}</span>
        <button
          onClick={() => setWeekOffset((w) => w + 1)}
          className="p-1 rounded hover:bg-bg-hover text-text-secondary"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* 周格子 */}
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((day, i) => {
          const isToday = day.getTime() === today.getTime()
          const dayItems = getItemsForDay(day)
          return (
            <div key={i} className="flex flex-col gap-1">
              {/* 日期头 */}
              <div
                className={`text-center text-xs py-1 rounded font-medium ${
                  isToday
                    ? 'bg-primary text-white'
                    : 'text-text-secondary'
                }`}
              >
                <div className="text-[10px] opacity-70">{WEEKDAYS[i]}</div>
                <div>{day.getDate()}</div>
              </div>

              {/* 当天事项 */}
              {dayItems.map((item) => (
                <div
                  key={item.id}
                  title={`${item.platform}：${item.topic}`}
                  className={`text-[10px] rounded px-1 py-0.5 truncate cursor-default leading-tight
                    ${PLATFORM_COLOR[item.platform] ?? DEFAULT_COLOR}`}
                >
                  {item.topic.slice(0, 4)}
                </div>
              ))}
            </div>
          )
        })}
      </div>

      {/* 图例 */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {Object.entries(PLATFORM_COLOR).map(([name, cls]) => (
          <span key={name} className={`text-[10px] px-1.5 py-0.5 rounded-full ${cls}`}>
            {name}
          </span>
        ))}
      </div>
    </div>
  )
}
