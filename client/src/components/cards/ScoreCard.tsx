import { reportReaction } from '../../lib/api'
import { useChat } from '../../hooks/useChat'

interface ScoreCardProps {
  topic: string
  score: number
  strengths: string[]
  weaknesses: string[]
  suggestion?: string
  logId?: string
}

export function ScoreCard({ topic, score, strengths, weaknesses, suggestion, logId }: ScoreCardProps) {
  const { sendMessage } = useChat()
  const isPass = score >= 75

  const handleProceed = async () => {
    if (logId) await reportReaction({ logId, reaction: 'good' })
    sendMessage('[选择] 继续这个选题')
  }

  const handleChange = async () => {
    if (logId) await reportReaction({ logId, reaction: 'bad' })
    sendMessage('[选择] 换个选题')
  }

  const circumference = 2 * Math.PI * 28
  const dashOffset = circumference * (1 - score / 100)
  const scoreColor = isPass ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444'

  return (
    <div className="rounded-xl border border-border bg-white shadow-sm p-4 max-w-sm">
      <h3 className="text-sm font-semibold text-gray-800 mb-3">📊 选题评分</h3>
      <p className="text-xs text-gray-500 mb-3 line-clamp-2">「{topic}」</p>

      <div className="flex items-center gap-4 mb-4">
        {/* 圆形进度 */}
        <div className="relative flex-shrink-0">
          <svg width="72" height="72" viewBox="0 0 72 72">
            <circle cx="36" cy="36" r="28" fill="none" stroke="#e5e7eb" strokeWidth="6" />
            <circle
              cx="36" cy="36" r="28"
              fill="none"
              stroke={scoreColor}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 36 36)"
              style={{ transition: 'stroke-dashoffset 0.6s ease-out' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold" style={{ color: scoreColor }}>{score}</span>
            <span className="text-xs text-gray-400">/ 100</span>
          </div>
        </div>

        <div className="flex-1 space-y-1">
          {strengths.map((s, i) => (
            <div key={i} className="flex items-start gap-1 text-xs text-green-700">
              <span>✓</span><span>{s}</span>
            </div>
          ))}
          {weaknesses.map((w, i) => (
            <div key={i} className="flex items-start gap-1 text-xs text-red-600">
              <span>✗</span><span>{w}</span>
            </div>
          ))}
        </div>
      </div>

      {suggestion && (
        <p className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2 mb-3">
          💡 {suggestion}
        </p>
      )}

      <div className="flex gap-2">
        {isPass ? (
          <button
            onClick={handleProceed}
            className="flex-1 py-2 rounded-lg bg-primary text-white text-xs font-medium
              hover:bg-primary-hover transition-colors"
          >
            用这个选题 ✓
          </button>
        ) : (
          <button
            onClick={handleProceed}
            className="flex-1 py-2 rounded-lg border border-border text-xs text-gray-600
              hover:bg-gray-50 transition-colors"
          >
            仍要使用
          </button>
        )}
        <button
          onClick={handleChange}
          className="flex-1 py-2 rounded-lg border border-border text-xs text-gray-600
            hover:bg-gray-50 transition-colors"
        >
          换个选题
        </button>
      </div>
    </div>
  )
}
