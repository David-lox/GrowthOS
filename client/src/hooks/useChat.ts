import { useCallback, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useChatStore, CARD_TOOL_MAP } from '../store/globalState'

export function useChat() {
  const store = useChatStore()
  const abortRef = useRef<AbortController | null>(null)

  const stopGenerate = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const sendMessage = useCallback(async (text: string) => {
    if (store.isStreaming) return

    const userMsgId = uuidv4()
    store.addMessage({ id: userMsgId, role: 'user', content: text })

    const assistantMsgId = uuidv4()
    store.addMessage({ id: assistantMsgId, role: 'assistant', content: '', isStreaming: true })
    store.setIsStreaming(true)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          session_id: store.sessionId,
          user_id: store.userId,
        }),
        signal: controller.signal,
      })

      // 读取 session_id（第一次时从 header 获取）
      const newSessionId = res.headers.get('X-Session-Id')
      if (newSessionId && !store.sessionId) {
        store.setSessionId(newSessionId)
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      if (!reader) throw new Error('No response body')

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const jsonStr = line.slice(6).trim()
          if (!jsonStr) continue

          try {
            const chunk = JSON.parse(jsonStr)

            if (chunk.type === 'text_delta') {
              store.updateLastAssistantMessage(chunk.delta)

            } else if (chunk.type === 'ask') {
              store.setAskOnLastMessage(chunk.payload)

            } else if (chunk.type === 'tool_result') {
              // 根据 tool 名称决定渲染哪种卡片
              const cardType = CARD_TOOL_MAP[chunk.tool]
              if (cardType && chunk.result && !chunk.result.error) {
                store.setCardOnLastMessage(cardType, chunk.result)
              }

            } else if (chunk.type === 'attribution_verify') {
              // 归因验证结果：独立 SSE chunk（非 tool_result）
              if (chunk.feedbacks?.length) {
                store.setCardOnLastMessage('attribution_verify', {
                  feedbacks: chunk.feedbacks,
                  summary: chunk.summary,
                })
              }

            } else if (chunk.type === 'done') {
              store.finalizeLastMessage()

            } else if (chunk.type === 'error') {
              store.updateLastAssistantMessage(`\n\n⚠️ 服务出错：${chunk.message ?? '未知错误'}`)
            }

            // 保存 log_id（每个 chunk 都可能带）
            if (chunk.log_id) {
              store.setLogIdOnLastMessage(chunk.log_id)
            }

          } catch {
            // ignore parse errors
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        // 用户主动停止，不显示错误
      } else {
        store.updateLastAssistantMessage(`\n\n_[连接错误: ${err}]_`)
      }
    } finally {
      store.finalizeLastMessage()
      store.setIsStreaming(false)
      abortRef.current = null
    }
  }, [store])

  return { sendMessage, stopGenerate, isStreaming: store.isStreaming }
}

// ── Agent 主动开场问候 ──────────────────────────────────────────
// 发送隐藏 __greet__，不添加用户气泡，让 Agent 主动开口
export function useGreeting() {
  const store = useChatStore()

  const triggerGreeting = useCallback(async () => {
    if (store.isStreaming || store.messages.length > 0) return

    const assistantMsgId = uuidv4()
    store.addMessage({ id: assistantMsgId, role: 'assistant', content: '', isStreaming: true })
    store.setIsStreaming(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: '__greet__',
          session_id: store.sessionId,
          user_id: store.userId,
        }),
      })

      const newSessionId = res.headers.get('X-Session-Id')
      if (newSessionId && !store.sessionId) store.setSessionId(newSessionId)

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      if (!reader) throw new Error('No body')

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const jsonStr = line.slice(6).trim()
          if (!jsonStr) continue
          try {
            const chunk = JSON.parse(jsonStr)
            if (chunk.type === 'text_delta') store.updateLastAssistantMessage(chunk.delta)
            else if (chunk.type === 'ask') store.setAskOnLastMessage(chunk.payload)
            else if (chunk.type === 'done') store.finalizeLastMessage()
            if (chunk.log_id) store.setLogIdOnLastMessage(chunk.log_id)
          } catch { /* ignore */ }
        }
      }
    } catch (err) {
      store.updateLastAssistantMessage('连接失败，请刷新重试。')
    } finally {
      store.finalizeLastMessage()
      store.setIsStreaming(false)
    }
  }, [store])

  return { triggerGreeting }
}
