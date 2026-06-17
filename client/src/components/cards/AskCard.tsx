import { useState } from 'react'
import { useChat } from '../../hooks/useChat'
import type { AskPayload } from '../../store/globalState'

interface AskCardProps {
  payload: AskPayload
  disabled?: boolean
}

export function AskCard({ payload, disabled = false }: AskCardProps) {
  const { sendMessage } = useChat()
  const [selectedSingle, setSelectedSingle] = useState<string | null>(null)
  const [selectedMulti, setSelectedMulti] = useState<string[]>([])
  const [textValue, setTextValue] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const isDisabled = disabled || submitted

  const submit = (value: string) => {
    if (isDisabled) return
    setSubmitted(true)
    sendMessage(`[选择] ${value}`)
  }

  if (payload.type === 'single_select') {
    return (
      <div className="rounded-xl border border-border bg-white p-4 max-w-sm shadow-sm">
        <p className="text-sm font-medium text-gray-800 mb-3">{payload.question}</p>
        <div className="flex flex-col gap-2">
          {payload.options?.map((opt) => (
            <button
              key={opt}
              disabled={isDisabled}
              onClick={() => {
                setSelectedSingle(opt)
                submit(opt)
              }}
              className={`
                text-left px-3 py-2 rounded-lg border text-sm transition-colors
                ${selectedSingle === opt
                  ? 'border-primary bg-primary text-white'
                  : 'border-border hover:border-primary hover:bg-primary-light text-gray-700'}
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (payload.type === 'multi_select') {
    const toggle = (opt: string) => {
      setSelectedMulti((prev) =>
        prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]
      )
    }
    return (
      <div className="rounded-xl border border-border bg-white p-4 max-w-sm shadow-sm">
        <p className="text-sm font-medium text-gray-800 mb-3">{payload.question}</p>
        <div className="flex flex-col gap-2 mb-3">
          {payload.options?.map((opt) => (
            <button
              key={opt}
              disabled={isDisabled}
              onClick={() => toggle(opt)}
              className={`
                text-left px-3 py-2 rounded-lg border text-sm transition-colors
                ${selectedMulti.includes(opt)
                  ? 'border-primary bg-primary-light text-primary font-medium'
                  : 'border-border hover:border-primary text-gray-700'}
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {opt}
            </button>
          ))}
        </div>
        <button
          disabled={isDisabled || selectedMulti.length === 0}
          onClick={() => submit(selectedMulti.join('、'))}
          className="w-full py-2 rounded-lg bg-primary text-white text-sm font-medium
            hover:bg-primary-hover transition-colors
            disabled:opacity-40 disabled:cursor-not-allowed"
        >
          确认
        </button>
      </div>
    )
  }

  if (payload.type === 'text_input') {
    return (
      <div className="rounded-xl border border-border bg-white p-4 max-w-sm shadow-sm">
        <p className="text-sm font-medium text-gray-800 mb-3">{payload.question}</p>
        <textarea
          disabled={isDisabled}
          value={textValue}
          onChange={(e) => setTextValue(e.target.value)}
          placeholder={payload.placeholder || '请输入...'}
          rows={3}
          className="w-full border border-border rounded-lg px-3 py-2 text-sm
            focus:outline-none focus:border-primary resize-none
            disabled:bg-gray-50 disabled:text-gray-400"
        />
        <button
          disabled={isDisabled || !textValue.trim()}
          onClick={() => submit(textValue.trim())}
          className="mt-2 w-full py-2 rounded-lg bg-primary text-white text-sm font-medium
            hover:bg-primary-hover transition-colors
            disabled:opacity-40 disabled:cursor-not-allowed"
        >
          提交
        </button>
      </div>
    )
  }

  if (payload.type === 'confirm') {
    return (
      <div className="rounded-xl border border-border bg-white p-4 max-w-sm shadow-sm">
        <p className="text-sm font-medium text-gray-800 mb-3">{payload.question}</p>
        <div className="flex gap-2">
          <button
            disabled={isDisabled}
            onClick={() => submit('确认')}
            className="flex-1 py-2 rounded-lg bg-primary text-white text-sm font-medium
              hover:bg-primary-hover transition-colors
              disabled:opacity-40 disabled:cursor-not-allowed"
          >
            确认
          </button>
          <button
            disabled={isDisabled}
            onClick={() => submit('取消')}
            className="flex-1 py-2 rounded-lg border border-border text-sm text-gray-600
              hover:bg-gray-50 transition-colors
              disabled:opacity-40 disabled:cursor-not-allowed"
          >
            取消
          </button>
        </div>
      </div>
    )
  }

  return null
}
