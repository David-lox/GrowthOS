import { useRef, useState, type KeyboardEvent } from 'react'
import { Send, Square, Paperclip, FileText, X } from 'lucide-react'

interface InputBarProps {
  onSend: (text: string) => void
  onStop?: () => void
  disabled?: boolean
}

export function InputBar({ onSend, onStop, disabled = false }: InputBarProps) {
  const [value, setValue] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const docInputRef = useRef<HTMLInputElement>(null)

  const handleSend = () => {
    const text = value.trim()
    if (!text || disabled) return
    onSend(text)
    setValue('')
    setFiles([])
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return
    setFiles(prev => [...prev, ...Array.from(incoming)])
  }

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx))
  }

  return (
    <div className="border-t border-border bg-white px-4 pt-2 pb-4">
      {/* 已选文件预览行 */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {files.map((f, i) => (
            <div
              key={i}
              className="flex items-center gap-1 bg-primary-light text-primary text-xs px-2 py-1 rounded-lg max-w-[160px]"
            >
              <span className="truncate">{f.name}</span>
              <button
                onClick={() => removeFile(i)}
                className="ml-1 flex-shrink-0 opacity-60 hover:opacity-100"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* 附件按钮 */}
        <div className="flex gap-1 pb-1">
          <button
            onClick={() => imageInputRef.current?.click()}
            disabled={disabled}
            title="上传图片"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400
              hover:text-primary hover:bg-primary-light transition-colors
              disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Paperclip size={16} />
          </button>
          <button
            onClick={() => docInputRef.current?.click()}
            disabled={disabled}
            title="上传文档"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400
              hover:text-primary hover:bg-primary-light transition-colors
              disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FileText size={16} />
          </button>
        </div>

        {/* 隐藏 input */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => addFiles(e.target.files)}
        />
        <input
          ref={docInputRef}
          type="file"
          accept=".txt,.md,.pdf,.docx,.csv"
          multiple
          className="hidden"
          onChange={e => addFiles(e.target.files)}
        />

        {/* 文本框 */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          disabled={disabled}
          placeholder="发送消息... (Enter 发送，Shift+Enter 换行)"
          rows={1}
          className="flex-1 resize-none border border-border rounded-xl px-4 py-3 text-sm
            focus:outline-none focus:border-primary max-h-[200px] overflow-y-auto
            disabled:bg-gray-50 disabled:text-gray-400 leading-relaxed"
        />

        {/* 发送 / 停止按钮 */}
        {disabled ? (
          <button
            onClick={onStop}
            title="停止生成"
            className="flex-shrink-0 w-10 h-10 rounded-xl bg-red-500 text-white
              flex items-center justify-center hover:bg-red-600 transition-colors"
          >
            <Square size={16} fill="white" />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!value.trim()}
            className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary text-white
              flex items-center justify-center
              hover:bg-primary-hover transition-colors
              disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send size={18} />
          </button>
        )}
      </div>
    </div>
  )
}
