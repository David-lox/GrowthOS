import { useState } from 'react'

interface EditableTextProps {
  value: string
  onConfirm: (newValue: string) => void
  onAskAgent?: (field: string, request: string) => void
  fieldName?: string
  multiline?: boolean
  className?: string
}

export function EditableText({
  value,
  onConfirm,
  onAskAgent,
  fieldName = '内容',
  multiline = false,
  className = '',
}: EditableTextProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [askMode, setAskMode] = useState(false)
  const [askRequest, setAskRequest] = useState('')
  const [hovered, setHovered] = useState(false)

  const handleConfirm = () => {
    onConfirm(draft)
    setEditing(false)
  }

  const handleAskAgent = () => {
    if (onAskAgent && askRequest.trim()) {
      onAskAgent(fieldName, askRequest.trim())
      setAskMode(false)
      setEditing(false)
    }
  }

  if (editing) {
    return (
      <div className="border-2 border-primary rounded-lg p-2">
        {multiline ? (
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={4}
            className="w-full text-sm leading-relaxed focus:outline-none resize-none"
          />
        ) : (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full text-sm focus:outline-none"
          />
        )}

        {askMode ? (
          <div className="mt-2 flex gap-2">
            <input
              autoFocus
              value={askRequest}
              onChange={(e) => setAskRequest(e.target.value)}
              placeholder={`说明修改要求...`}
              className="flex-1 text-xs border border-border rounded px-2 py-1 focus:outline-none focus:border-primary"
            />
            <button
              onClick={handleAskAgent}
              className="text-xs px-2 py-1 bg-primary text-white rounded hover:bg-primary-hover"
            >
              发送
            </button>
            <button
              onClick={() => setAskMode(false)}
              className="text-xs px-2 py-1 border border-border rounded text-gray-500"
            >
              取消
            </button>
          </div>
        ) : (
          <div className="mt-2 flex gap-2">
            <button
              onClick={handleConfirm}
              className="text-xs px-3 py-1 bg-primary text-white rounded hover:bg-primary-hover"
            >
              确认
            </button>
            {onAskAgent && (
              <button
                onClick={() => setAskMode(true)}
                className="text-xs px-3 py-1 border border-border rounded text-gray-600 hover:bg-gray-50"
              >
                让 Agent 改
              </button>
            )}
            <button
              onClick={() => { setDraft(value); setEditing(false) }}
              className="text-xs px-3 py-1 text-gray-400"
            >
              取消
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={`relative group cursor-text ${className}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onDoubleClick={() => { setDraft(value); setEditing(true) }}
    >
      {value}
      {hovered && (
        <span className="ml-1 text-gray-400 text-xs">✏️</span>
      )}
    </div>
  )
}
