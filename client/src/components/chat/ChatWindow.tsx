import { useEffect, useRef } from 'react'
import { Bot, Compass, PenLine, Share2, BarChart3 } from 'lucide-react'
import { useChatStore } from '../../store/globalState'
import { useChat } from '../../hooks/useChat'
import { MessageBubble } from './MessageBubble'
import { InputBar } from './InputBar'

const QUICK_STARTS = [
  {
    icon: Compass,
    title: '找赛道',
    desc: '从 0 定位账号方向',
    color: 'from-violet-50 to-indigo-50 border-indigo-100 hover:border-indigo-300',
    iconColor: 'text-indigo-500 bg-indigo-100',
    prompt: '帮我找到适合我的内容赛道，从了解我的背景和兴趣开始',
  },
  {
    icon: PenLine,
    title: '写内容',
    desc: '选题 → 脚本 → 分镜',
    color: 'from-emerald-50 to-teal-50 border-emerald-100 hover:border-emerald-300',
    iconColor: 'text-emerald-600 bg-emerald-100',
    prompt: '我想创作一条新内容，帮我规划选题和完整脚本',
  },
  {
    icon: Share2,
    title: '多平台发布',
    desc: '一键适配各平台风格',
    color: 'from-orange-50 to-amber-50 border-orange-100 hover:border-orange-300',
    iconColor: 'text-orange-500 bg-orange-100',
    prompt: '我有内容想发布到多个平台，帮我做多平台适配和发布策略',
  },
  {
    icon: BarChart3,
    title: '数据复盘',
    desc: '归因分析 × 下次更好',
    color: 'from-rose-50 to-pink-50 border-rose-100 hover:border-rose-300',
    iconColor: 'text-rose-500 bg-rose-100',
    prompt: '帮我复盘最近发布的内容数据，分析增长原因并给出改进建议',
  },
]

export function ChatWindow() {
  const { messages, isStreaming, pendingMessage, setPendingMessage } = useChatStore()
  const { sendMessage, stopGenerate } = useChat()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (pendingMessage && !isStreaming) {
      const msg = pendingMessage
      setPendingMessage(null)
      sendMessage(msg)
    }
  }, [pendingMessage])

  const showLanding = messages.length === 0 && !isStreaming

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto flex flex-col">
        {showLanding ? (
          // 空状态：Agent 卡片 + 快捷入口
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
            {/* Agent 卡片 */}
            <div className="flex flex-col items-center mb-10">
              <div className="relative mb-4">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-indigo-700
                  flex items-center justify-center shadow-lg shadow-indigo-200">
                  <Bot size={40} className="text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-400
                  border-2 border-white shadow-sm" />
              </div>
              <h1 className="text-xl font-bold text-text-primary mb-1">GrowthOS</h1>
              <p className="text-sm text-text-secondary text-center max-w-xs leading-relaxed">
                KOC 专属 AI 增长教练·帮你定赛道、写内容、跨平台增长
              </p>
            </div>

            {/* 4 快捷入口 */}
            <div className="grid grid-cols-2 gap-3 w-full max-w-md">
              {QUICK_STARTS.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.title}
                    onClick={() => sendMessage(item.prompt)}
                    className={`flex flex-col items-start gap-2 p-4 rounded-2xl border bg-gradient-to-br
                      transition-all duration-150 text-left group
                      ${item.color}`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center
                      ${item.iconColor} transition-transform group-hover:scale-110`}>
                      <Icon size={18} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-text-primary">{item.title}</div>
                      <div className="text-xs text-text-secondary mt-0.5 leading-snug">{item.desc}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          // 对话消息列表
          <div className="px-4 py-6">
            {messages.map((msg, i) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isLatest={i === messages.length - 1}
              />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
      <InputBar onSend={sendMessage} onStop={stopGenerate} disabled={isStreaming} />
    </div>
  )
}

