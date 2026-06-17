import { useState } from 'react'
import { reportReaction } from '../../lib/api'
import { useChat } from '../../hooks/useChat'

interface TopicCandidate {
  title: string
  score: number
  type: string  // 对比型/情绪型/实用型/故事型等
  reason: string
}

interface TopicCandidatesCardProps {
  topics: TopicCandidate[]
  logId?: string
}

export function TopicCandidatesCard({ topics, logId }: TopicCandidatesCardProps) {
  const [selected, setSelected] = useState<number | null>(null)
  const { sendMessage } = useChat()

  const handleSelect = async (idx: number) => {
    setSelected(idx)
    const topic = topics[idx]
    if (logId) await reportReaction({ logId, reaction: 'good' })
    sendMessage(`[选择] ${topic.title}`)
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50'
    if (score >= 70) return 'text-yellow-600 bg-yellow-50'
    return 'text-gray-500 bg-gray-100'
  }

  return (
    <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden max-w-lg">
      <div className="px-4 py-3 border-b border-border bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-800">💡 选题候选</h3>
        <p className="text-xs text-gray-500 mt-0.5">点击选择一个选题继续</p>
      </div>
      <div className="divide-y divide-border">
        {topics.map((topic, idx) => (
          <button
            key={idx}
            disabled={selected !== null}
            onClick={() => handleSelect(idx)}
            className={`
              w-full text-left px-4 py-3 transition-colors
              ${selected === idx ? 'bg-primary-light' : 'hover:bg-gray-50'}
              disabled:cursor-not-allowed
            `}
          >
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 leading-snug">{topic.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-400">{topic.type}</span>
                  {topic.reason && (
                    <span className="text-xs text-gray-400 truncate">· {topic.reason}</span>
                  )}
                </div>
              </div>
              <span className={`flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${getScoreColor(topic.score)}`}>
                {topic.score}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
