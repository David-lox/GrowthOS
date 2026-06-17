import { create } from 'zustand'

export type MessageRole = 'user' | 'assistant'

export interface AskPayload {
  question: string
  type: 'single_select' | 'multi_select' | 'text_input' | 'confirm'
  options?: string[]
  placeholder?: string
}

export type CardType =
  | 'niche_report'
  | 'topic_candidates'
  | 'score_card'
  | 'script_card'
  | 'graphic_card'
  | 'image_result'
  | 'platform_versions'
  | 'publish_schedule'
  | 'data_analysis'
  | 'calendar_card'
  | 'attribution_verify'

export interface Message {
  id: string
  role: MessageRole
  content: string          // markdown 文本内容
  askPayload?: AskPayload  // ask 工具触发时
  cardType?: CardType      // 子 agent 工具结果
  cardData?: unknown        // 卡片数据（来自 tool_result）
  logId?: string           // 关联的决策日志 ID
  isStreaming?: boolean
}

interface ChatState {
  messages: Message[]
  sessionId: string | null
  userId: string
  isStreaming: boolean
  pendingMessage: string | null   // 由外部（如热点板）注入的待发消息

  addMessage: (msg: Message) => void
  updateLastAssistantMessage: (delta: string) => void
  setAskOnLastMessage: (payload: AskPayload) => void
  setCardOnLastMessage: (cardType: CardType, cardData: unknown) => void
  setLogIdOnLastMessage: (logId: string) => void
  finalizeLastMessage: () => void
  setSessionId: (id: string | null) => void
  setIsStreaming: (v: boolean) => void
  setPendingMessage: (msg: string | null) => void
  clearMessages: () => void
  loadMessages: (msgs: Array<{ role: MessageRole; content: string }>, sid: string) => void
}

const CARD_TOOL_MAP: Record<string, CardType> = {
  niche_agent: 'niche_report',
  content_agent: 'script_card',
  graphic_agent: 'graphic_card',
  generate_image: 'image_result',
  adapt_agent: 'platform_versions',
  publish_schedule_agent: 'publish_schedule',
  data_agent: 'data_analysis',
  calendar_agent: 'calendar_card',
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  sessionId: null,
  userId: 'default_user',
  isStreaming: false,
  pendingMessage: null,

  addMessage: (msg) =>
    set((s) => ({ messages: [...s.messages, msg] })),

  updateLastAssistantMessage: (delta) =>
    set((s) => {
      const msgs = [...s.messages]
      const last = msgs[msgs.length - 1]
      if (last && last.role === 'assistant') {
        msgs[msgs.length - 1] = { ...last, content: last.content + delta }
      }
      return { messages: msgs }
    }),

  setAskOnLastMessage: (payload) =>
    set((s) => {
      const msgs = [...s.messages]
      const last = msgs[msgs.length - 1]
      if (last && last.role === 'assistant') {
        msgs[msgs.length - 1] = { ...last, askPayload: payload, isStreaming: false }
      }
      return { messages: msgs }
    }),

  setCardOnLastMessage: (cardType, cardData) =>
    set((s) => {
      const msgs = [...s.messages]
      const last = msgs[msgs.length - 1]
      if (last && last.role === 'assistant') {
        msgs[msgs.length - 1] = { ...last, cardType, cardData, isStreaming: false }
      }
      return { messages: msgs }
    }),

  setLogIdOnLastMessage: (logId) =>
    set((s) => {
      const msgs = [...s.messages]
      const last = msgs[msgs.length - 1]
      if (last && last.role === 'assistant') {
        msgs[msgs.length - 1] = { ...last, logId }
      }
      return { messages: msgs }
    }),

  finalizeLastMessage: () =>
    set((s) => {
      const msgs = [...s.messages]
      const last = msgs[msgs.length - 1]
      if (last) {
        msgs[msgs.length - 1] = { ...last, isStreaming: false }
      }
      return { messages: msgs }
    }),

  setSessionId: (id) => set({ sessionId: id }),
  setIsStreaming: (v) => set({ isStreaming: v }),
  setPendingMessage: (msg) => set({ pendingMessage: msg }),
  clearMessages: () => set({ messages: [], sessionId: null, isStreaming: false }),
  loadMessages: (msgs, sid) =>
    set({
      messages: msgs.map((m) => ({
        id: Math.random().toString(36).slice(2),
        role: m.role,
        content: m.content,
      })),
      sessionId: sid,
      isStreaming: false,
    }),
}))

export { CARD_TOOL_MAP }
