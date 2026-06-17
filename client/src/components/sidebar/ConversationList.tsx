import { useEffect, useState, useCallback } from 'react'
import { MessageSquare, Plus } from 'lucide-react'
import { useChatStore } from '../../store/globalState'

interface Conversation {
  session_id: string
  title: string
  last_at: string
  msg_count: number
}

interface Props {
  userId: string
}

export function ConversationList({ userId }: Props) {
  const [convos, setConvos] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const { sessionId, clearMessages, loadMessages } = useChatStore()

  const fetchConvos = useCallback(() => {
    setLoading(true)
    fetch(`/api/conversations/${userId}`)
      .then((r) => r.json())
      .then((data) => setConvos(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [userId])

  useEffect(() => {
    fetchConvos()
  }, [fetchConvos])

  // 当 sessionId 变化（新对话完成首次发送后），刷新列表
  useEffect(() => {
    if (sessionId) fetchConvos()
  }, [sessionId])

  const handleNewChat = () => {
    clearMessages()
  }

  const handleSelect = async (sid: string) => {
    if (sid === sessionId) return
    try {
      const res = await fetch(`/api/conversations/session/${sid}/messages`)
      const msgs = await res.json()
      loadMessages(msgs, sid)
    } catch {
      // 加载失败则清空，让用户重新开始
      clearMessages()
    }
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffDays = Math.floor(diffMs / 86400000)
    if (diffDays === 0) return '今天'
    if (diffDays === 1) return '昨天'
    if (diffDays < 7) return `${diffDays}天前`
    return d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <button
          onClick={handleNewChat}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl
            bg-primary text-white text-sm font-medium
            hover:bg-primary-hover transition-colors"
        >
          <Plus size={16} />
          新对话
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {loading ? (
          <div className="px-3 py-8 text-center text-xs text-text-secondary">加载中…</div>
        ) : convos.length === 0 ? (
          <div className="px-3 py-8 text-center text-xs text-text-secondary">
            暂无历史对话
          </div>
        ) : (
          convos.map((c) => (
            <button
              key={c.session_id}
              onClick={() => handleSelect(c.session_id)}
              className={`w-full flex items-start gap-2 px-3 py-2.5 text-left transition-colors rounded-lg mx-1
                ${c.session_id === sessionId
                  ? 'bg-primary-light text-primary'
                  : 'text-text-primary hover:bg-bg-hover'}`}
            >
              <MessageSquare size={15} className="mt-0.5 flex-shrink-0 opacity-60" />
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate font-medium">{c.title}</div>
                <div className="text-xs opacity-50 mt-0.5">{formatDate(c.last_at)}</div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
