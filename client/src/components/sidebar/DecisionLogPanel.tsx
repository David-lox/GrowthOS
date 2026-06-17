import { useEffect, useState } from 'react'
import { Clock, Bot, Pencil, ThumbsUp, ThumbsDown } from 'lucide-react'

interface LogEntry {
  log_id: string
  agent: string
  node: string
  intent: string
  tool_called?: string
  user_reaction?: string
  created_at: string
}

interface DecisionLogPanelProps {
  userId: string
}

export function DecisionLogPanel({ userId }: DecisionLogPanelProps) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    fetch(`/api/logs/${userId}?limit=20`)
      .then((r) => r.json())
      .then((data) => setLogs(Array.isArray(data) ? data : []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false))
  }, [userId])

  if (loading) return (
    <div className="p-4 text-xs text-gray-400">加载中...</div>
  )

  if (!logs.length) return (
    <div className="p-4 text-xs text-gray-400 text-center">
      <p>暂无决策记录</p>
      <p className="mt-1">开始对话后，AI 的每次决策都会记录在这里</p>
    </div>
  )

  return (
    <div className="p-3 space-y-3">
      {logs.map((log) => (
        <div key={log.log_id} className="rounded-lg border border-border bg-white p-3 space-y-1.5">
          <div className="flex items-center gap-2">
            <Bot size={12} className="text-primary" />
            <span className="text-xs font-medium text-gray-700">{log.agent}</span>
            <span className="text-xs text-gray-400">·</span>
            <span className="text-xs text-gray-400">{log.node}</span>
            <div className="ml-auto flex items-center gap-1 text-xs text-gray-400">
              <Clock size={10} />
              {new Date(log.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>

          {log.intent && (
            <p className="text-xs text-gray-600 line-clamp-1">意图：{log.intent}</p>
          )}

          {log.tool_called && (
            <div className="flex items-center gap-1">
              <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                调用 {log.tool_called}
              </span>
            </div>
          )}

          {log.user_reaction && (
            <div className="flex items-center gap-1">
              {log.user_reaction === 'good' || log.user_reaction === 'accepted' ? (
                <ThumbsUp size={11} className="text-green-500" />
              ) : log.user_reaction === 'bad' || log.user_reaction === 'rejected' ? (
                <ThumbsDown size={11} className="text-red-400" />
              ) : (
                <Pencil size={11} className="text-blue-400" />
              )}
              <span className="text-xs text-gray-500">{log.user_reaction}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
