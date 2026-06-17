import { useState } from 'react'
import { ChevronDown, ChevronUp, Star } from 'lucide-react'
import { reportReaction } from '../../lib/api'

interface NicheRecommendation {
  niche: string
  score: number
  competition: '低' | '中' | '高'
  sustainabilityReason: string
  monetizationPath: string
  differentiator: string
  contentPillars: string[]
  topicExamples: string[]
  verdict: '强烈推荐' | '推荐' | '备选'
  reason: string
}

interface NicheReportData {
  recommendations: NicheRecommendation[]
  persona: {
    anchor: string
    tone: string
    targetAudience: string
  }
  warningIfAny?: string | null
}

interface NicheReportCardProps {
  data: NicheReportData
  logId?: string
  onSelect?: (niche: NicheRecommendation) => void
}

const COMPETITION_COLOR: Record<string, string> = {
  低: 'text-green-600 bg-green-50',
  中: 'text-yellow-600 bg-yellow-50',
  高: 'text-red-600 bg-red-50',
}

const VERDICT_COLOR: Record<string, string> = {
  强烈推荐: 'text-primary bg-primary-light',
  推荐: 'text-blue-600 bg-blue-50',
  备选: 'text-gray-500 bg-gray-100',
}

export function NicheReportCard({ data, logId, onSelect }: NicheReportCardProps) {
  const [expanded, setExpanded] = useState<number | null>(0)
  const [selected, setSelected] = useState<number | null>(null)

  const handleSelect = async (idx: number) => {
    setSelected(idx)
    const rec = data.recommendations[idx]
    if (logId) {
      await reportReaction({ logId, reaction: 'good' })
    }
    onSelect?.(rec)
  }

  return (
    <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden max-w-lg">
      <div className="px-4 py-3 border-b border-border bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-800">🎯 赛道分析报告</h3>
        {data.persona && (
          <p className="text-xs text-gray-500 mt-1">人设锚点：{data.persona.anchor}</p>
        )}
      </div>

      {data.warningIfAny && (
        <div className="px-4 py-3 bg-amber-50 border-b border-amber-100">
          <p className="text-xs text-amber-700">⚠️ {data.warningIfAny}</p>
        </div>
      )}

      <div className="divide-y divide-border">
        {data.recommendations.map((rec, idx) => (
          <div key={idx} className={selected === idx ? 'bg-primary-light' : ''}>
            {/* 标题行 */}
            <div
              className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50"
              onClick={() => setExpanded(expanded === idx ? null : idx)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-800 truncate">{rec.niche}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${VERDICT_COLOR[rec.verdict] || 'text-gray-500 bg-gray-100'}`}>
                    {rec.verdict}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${COMPETITION_COLOR[rec.competition] || ''}`}>
                    竞争{rec.competition}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-1">
                    <Star size={11} className="text-yellow-400 fill-yellow-400" />
                    <span className="text-xs font-semibold text-gray-700">{rec.score}</span>
                  </div>
                  <span className="text-xs text-gray-500 truncate">{rec.reason}</span>
                </div>
              </div>
              {expanded === idx ? <ChevronUp size={16} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />}
            </div>

            {/* 展开详情 */}
            {expanded === idx && (
              <div className="px-4 pb-4 space-y-3 text-xs text-gray-600">
                <div>
                  <span className="font-medium text-gray-700">变现路径：</span>
                  {rec.monetizationPath}
                </div>
                <div>
                  <span className="font-medium text-gray-700">竞争优势：</span>
                  {rec.differentiator}
                </div>
                <div>
                  <span className="font-medium text-gray-700 block mb-1">内容支柱：</span>
                  <div className="flex flex-wrap gap-1">
                    {rec.contentPillars?.map((p, i) => (
                      <span key={i} className="px-2 py-0.5 bg-gray-100 rounded-full">{p}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="font-medium text-gray-700 block mb-1">选题示例：</span>
                  <ul className="space-y-0.5 list-disc list-inside">
                    {rec.topicExamples?.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </div>
                <button
                  disabled={selected !== null}
                  onClick={() => handleSelect(idx)}
                  className="mt-2 w-full py-2 rounded-lg bg-primary text-white text-xs font-medium
                    hover:bg-primary-hover transition-colors
                    disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {selected === idx ? '✓ 已选择' : '选择这个赛道'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
