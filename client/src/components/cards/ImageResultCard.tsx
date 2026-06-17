interface ImageResultCardProps {
  url: string
  prompt: string
  onUse?: () => void
  onRegenerate?: () => void
}

export function ImageResultCard({ url, prompt, onUse, onRegenerate }: ImageResultCardProps) {
  return (
    <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden max-w-sm">
      <div className="px-4 py-3 border-b border-border bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-800">🖼 AI 生成封面图</h3>
      </div>
      <div className="p-4">
        <img
          src={url}
          alt="AI 生成封面"
          className="w-full rounded-lg object-cover"
          style={{ maxHeight: 300 }}
        />
        <p className="text-xs text-gray-400 mt-2 line-clamp-2">提示词：{prompt}</p>
        <div className="flex gap-2 mt-3">
          {onUse && (
            <button
              onClick={onUse}
              className="flex-1 py-2 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary-hover"
            >
              使用这张
            </button>
          )}
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              className="flex-1 py-2 rounded-lg border border-border text-xs text-gray-600 hover:bg-gray-50"
            >
              重新生成
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
