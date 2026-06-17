import { TrendingUp, TrendingDown, Bot, CheckCircle, XCircle } from 'lucide-react'

interface VerifyFeedback {
  cause: string
  improvement: string
  verified: boolean
}

interface AttributionVerifyCardProps {
  data: {
    feedbacks: VerifyFeedback[]
    content_id?: string
    summary?: string
  }
  logId?: string
}

export function AttributionVerifyCard({ data, logId: _logId }: AttributionVerifyCardProps) {
  const { feedbacks = [] } = data

  if (!feedbacks.length) return null

  const verifiedCount = feedbacks.filter((f) => f.verified).length
  const allVerified = verifiedCount === feedbacks.length

  return (
    <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden w-full">
      {/* 头部 */}
      <div className={`px-4 py-3 border-b border-border flex items-center gap-2 ${
        allVerified ? 'bg-green-50' : 'bg-amber-50'
      }`}>
        <Bot size={14} className="text-primary" />
        {allVerified
          ? <CheckCircle size={14} className="text-green-500" />
          : <XCircle size={14} className="text-amber-500" />
        }
        <span className="text-sm font-semibold text-gray-700">归因验证结果</span>
        <span className={`ml-auto text-xs font-medium ${
          allVerified ? 'text-green-600' : 'text-amber-600'
        }`}>
          {verifiedCount}/{feedbacks.length} 验证通过
        </span>
      </div>

      <div className="p-4 space-y-3">
        {data.summary && (
          <p className="text-sm text-gray-700 leading-relaxed">{data.summary}</p>
        )}

        {feedbacks.map((fb, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 p-3 rounded-lg ${
              fb.verified ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'
            }`}
          >
            {fb.verified
              ? <TrendingUp size={16} className="text-green-500 flex-shrink-0" />
              : <TrendingDown size={16} className="text-red-400 flex-shrink-0" />
            }
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-medium ${fb.verified ? 'text-green-700' : 'text-red-700'}`}>
                {fb.verified ? '规律验证成功 ✓' : '规律未验证 ✗'}
              </p>
              <p className="text-sm text-gray-700 mt-0.5 leading-relaxed">{fb.cause}</p>
            </div>
            <div className={`text-lg font-bold flex-shrink-0 ${
              fb.verified ? 'text-green-600' : 'text-red-500'
            }`}>
              {fb.improvement}
            </div>
          </div>
        ))}

        <p className="text-xs text-gray-400 text-center">
          {allVerified
            ? '太棒了！这些创作规律已更新置信度，将在下次内容生产时自动应用'
            : '验证失败的规律置信度已降低，继续测试以找到更准确的规律'
          }
        </p>
      </div>
    </div>
  )
}
