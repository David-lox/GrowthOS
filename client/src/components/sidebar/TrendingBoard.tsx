import { useEffect, useState } from 'react'
import { TrendingUp, RefreshCw, Flame, Zap } from 'lucide-react'

interface TrendItem {
  id: number
  platform: string
  title: string
  heat_score: number
  category?: string
  url?: string
  fetched_at: string
}

interface TrendingBoardProps {
  onSelectTrend?: (title: string) => void
}

function formatHeat(n: number): string {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}亿`
  if (n >= 10_000) return `${(n / 10_000).toFixed(0)}万`
  return String(n)
}

export function TrendingBoard({ onSelectTrend }: TrendingBoardProps) {
  const [trends, setTrends] = useState<TrendItem[]>([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)

  const loadTrends = () => {
    setLoading(true)
    fetch('/api/trends?limit=20')
      .then((r) => r.json())
      .then((data) => setTrends(Array.isArray(data) ? data : []))
      .catch(() => setTrends([]))
      .finally(() => setLoading(false))
  }

  const handleFetch = () => {
    setFetching(true)
    fetch('/api/trends/fetch', { method: 'POST' })
      .then((r) => r.json())
      .then(() => loadTrends())
      .catch(() => {})
      .finally(() => setFetching(false))
  }

  useEffect(() => { loadTrends() }, [])

  return (
    <div className="flex flex-col h-full">
      {/* 顶部操作栏 */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border flex-shrink-0">
        <button
          onClick={handleFetch}
          disabled={fetching}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium
            hover:bg-indigo-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {fetching ? <RefreshCw size={12} className="animate-spin" /> : <Zap size={12} />}
          {fetching ? '抓取中…' : '立即抓取'}
        </button>
        <button
          onClick={loadTrends}
          disabled={loading}
          className="text-gray-400 hover:text-primary transition-colors disabled:opacity-40"
          title="刷新列表"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* 热榜列表 */}
      <div className="flex-1 overflow-y-auto">
        {(loading || fetching) && trends.length === 0 && (
          <div className="p-4 text-xs text-gray-400 text-center">加载中…</div>
        )}

        {!loading && !fetching && trends.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full px-4 py-8 text-center gap-2">
            <Flame size={28} className="text-gray-300" />
            <p className="text-xs text-gray-400 leading-relaxed">
              暂无热点数据<br />点击「立即抓取」获取最新内容
            </p>
          </div>
        )}

        {trends.map((item, idx) => (
          <button
            key={item.id}
            onClick={() => onSelectTrend?.(item.title)}
            className="w-full flex items-center gap-3 px-4 py-3 border-b border-border/50 hover:bg-gray-50 transition-colors text-left"
          >
            <span className={`text-sm font-bold flex-shrink-0 w-5 ${
              idx < 3 ? 'text-red-500' : 'text-gray-400'
            }`}>
              {idx + 1}
            </span>

            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-800 leading-snug line-clamp-2">{item.title}</p>
              {item.heat_score > 0 && (
                <span className="flex items-center gap-0.5 text-xs text-orange-500 mt-0.5">
                  <Flame size={10} />
                  {formatHeat(item.heat_score)}
                </span>
              )}
            </div>

            <TrendingUp size={13} className="text-gray-300 flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  )
}
