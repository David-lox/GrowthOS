import { useEffect, useState } from 'react'
import { BarChart2 } from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface DataRecord {
  id: string
  content_id?: string
  plays?: number
  likes?: number
  comments?: number
  finish_rate?: number
  created_at: string
}

interface Props {
  userId: string
}

export function DataDashboard({ userId }: Props) {
  const [records, setRecords] = useState<DataRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/data/${userId}`)
      .then((r) => r.json())
      .then((d) => setRecords(Array.isArray(d) ? d : []))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false))
  }, [userId])

  if (loading) {
    return <div className="p-4 text-center text-xs text-text-secondary">加载中…</div>
  }

  if (records.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-text-secondary">
        <BarChart2 size={24} className="mx-auto mb-2 opacity-30" />
        暂无数据复盘记录
      </div>
    )
  }

  // 图表数据：按时间排序，最多展示最近12条
  const chartData = [...records]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .slice(-12)
    .map((r, i) => ({
      name: `#${i + 1}`,
      播放: r.plays ?? 0,
      点赞: r.likes ?? 0,
      评论: r.comments ?? 0,
    }))

  return (
    <div className="p-3">
      <div className="text-xs text-text-secondary mb-2">近期播放量趋势</div>
      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={chartData}>
          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} width={35} />
          <Tooltip
            contentStyle={{ fontSize: 11, padding: '4px 8px' }}
            itemStyle={{ margin: 0 }}
          />
          <Line
            type="monotone"
            dataKey="播放"
            stroke="#6366f1"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="点赞"
            stroke="#f97316"
            strokeWidth={1.5}
            dot={false}
            strokeDasharray="4 2"
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="mt-3 space-y-1.5">
        {records.slice(0, 5).map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between text-xs text-text-secondary py-1 border-b border-border"
          >
            <span>{new Date(r.created_at).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}</span>
            <span>播放 {r.plays ?? '-'}</span>
            <span>点赞 {r.likes ?? '-'}</span>
            <span>完播 {r.finish_rate != null ? `${r.finish_rate}%` : '-'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
