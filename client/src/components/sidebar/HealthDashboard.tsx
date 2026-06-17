import { useEffect, useState } from 'react'
import { Heart, RefreshCw } from 'lucide-react'

interface Dimension {
  score: number
  max: number
  label: string
  detail: string
}

interface HealthData {
  user_id: string
  total_score: number
  status: 'excellent' | 'good' | 'fair' | 'poor'
  status_label: string
  dimensions: Record<string, Dimension>
  gap_days: number | null
  last_published: string | null
}

interface HealthDashboardProps {
  userId: string
}

const STATUS_COLOR: Record<string, { ring: string; text: string; bg: string }> = {
  excellent: { ring: 'stroke-green-400', text: 'text-green-600', bg: 'bg-green-50' },
  good: { ring: 'stroke-primary', text: 'text-primary', bg: 'bg-primary-light' },
  fair: { ring: 'stroke-amber-400', text: 'text-amber-600', bg: 'bg-amber-50' },
  poor: { ring: 'stroke-red-400', text: 'text-red-600', bg: 'bg-red-50' },
}

const DIM_ORDER = ['activity', 'data_performance', 'rules', 'attribution', 'memory']

function ScoreRing({ score, max }: { score: number; max: number }) {
  const r = 44
  const circ = 2 * Math.PI * r
  const filled = (score / max) * circ
  return (
    <svg width={100} height={100} className="-rotate-90">
      <circle cx={50} cy={50} r={r} fill="none" stroke="#e5e7eb" strokeWidth={8} />
      <circle
        cx={50} cy={50} r={r} fill="none"
        stroke="#6366f1" strokeWidth={8}
        strokeDasharray={`${filled} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.8s ease-out' }}
      />
    </svg>
  )
}

export function HealthDashboard({ userId }: HealthDashboardProps) {
  const [data, setData] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchHealth = () => {
    if (!userId) return
    setLoading(true)
    fetch(`/api/health/${userId}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchHealth() }, [userId])

  if (loading) return <div className="p-4 text-xs text-gray-400">加载中...</div>
  if (!data) return (
    <div className="p-4 text-xs text-gray-400 text-center">
      暂无健康数据，开始使用后自动计算
    </div>
  )

  const colorSet = STATUS_COLOR[data.status] || STATUS_COLOR.fair

  return (
    <div className="p-3 space-y-4">
      {/* 总分圆环 */}
      <div className={`rounded-xl p-4 ${colorSet.bg} flex items-center gap-4`}>
        <div className="relative flex-shrink-0">
          <ScoreRing score={data.total_score} max={100} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-2xl font-bold ${colorSet.text}`}>{data.total_score}</span>
            <span className="text-xs text-gray-400">/ 100</span>
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Heart size={14} className={colorSet.text} />
            <span className={`text-sm font-bold ${colorSet.text}`}>{data.status_label}</span>
          </div>
          {data.gap_days != null && data.gap_days > 3 && (
            <p className="text-xs text-amber-600 mt-1">
              ⚠️ 已 {data.gap_days} 天未发布
            </p>
          )}
          {data.gap_days != null && data.gap_days <= 3 && (
            <p className="text-xs text-green-600 mt-1">
              ✓ 近 {data.gap_days} 天内有更新
            </p>
          )}
        </div>
      </div>

      {/* 各维度 */}
      <div className="space-y-2.5">
        {DIM_ORDER.map((key) => {
          const dim = data.dimensions[key]
          if (!dim) return null
          const pct = Math.round((dim.score / dim.max) * 100)
          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-600">{dim.label}</span>
                <span className="text-xs text-gray-500">
                  {dim.score}<span className="text-gray-300">/{dim.max}</span>
                </span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-700"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{dim.detail}</p>
            </div>
          )
        })}
      </div>

      {/* 刷新按钮 */}
      <button
        onClick={fetchHealth}
        className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-gray-400 hover:text-primary transition-colors"
      >
        <RefreshCw size={12} />
        刷新数据
      </button>
    </div>
  )
}
