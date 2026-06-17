import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Bot } from 'lucide-react'
import type { Message } from '../../store/globalState'
import { AskCard } from '../cards/AskCard'
import { NicheReportCard } from '../cards/NicheReportCard'
import { ScriptCard } from '../cards/ScriptCard'
import { GraphicCard } from '../cards/GraphicCard'
import { ImageResultCard } from '../cards/ImageResultCard'
import { PlatformVersionsCard } from '../cards/PlatformVersionsCard'
import { PublishScheduleCard } from '../cards/PublishScheduleCard'
import { DataAnalysisCard } from '../cards/DataAnalysisCard'
import { CalendarCard } from '../cards/CalendarCard'
import { AttributionVerifyCard } from '../cards/AttributionVerifyCard'
import { TypingIndicator } from './TypingIndicator'

interface MessageBubbleProps {
  message: Message
  isLatest: boolean
}

export function MessageBubble({ message, isLatest }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[70%] px-4 py-3 rounded-2xl rounded-tr-sm
          bg-primary text-white text-sm leading-relaxed whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    )
  }

  // assistant
  return (
    <div className="flex justify-start mb-5 gap-2.5">
      {/* 机器人头像 */}
      <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-indigo-700
        flex items-center justify-center shadow-sm mt-0.5">
        <Bot size={15} className="text-white" />
      </div>
      <div className="max-w-[80%] space-y-3">
        {/* Streaming indicator */}
        {message.isStreaming && !message.content && !message.askPayload && !message.cardType && (
          <TypingIndicator />
        )}

        {/* 文本内容 */}
        {message.content && (
          <div className="prose text-sm leading-relaxed text-gray-800">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        )}

        {/* Ask 卡片 */}
        {message.askPayload && (
          <AskCard payload={message.askPayload} disabled={!isLatest} />
        )}

        {/* 工具结果卡片 */}
        {message.cardType === 'niche_report' && !!message.cardData
          ? <NicheReportCard
              data={message.cardData as Parameters<typeof NicheReportCard>[0]['data']}
              logId={message.logId}
            />
          : null}

        {message.cardType === 'script_card' && !!message.cardData
          ? <ScriptCard
              data={message.cardData as Parameters<typeof ScriptCard>[0]['data']}
              logId={message.logId}
            />
          : null}

        {message.cardType === 'graphic_card' && !!message.cardData
          ? <GraphicCard
              data={message.cardData as Parameters<typeof GraphicCard>[0]['data']}
              logId={message.logId}
            />
          : null}

        {message.cardType === 'platform_versions' && !!message.cardData
          ? <PlatformVersionsCard
              data={message.cardData as Parameters<typeof PlatformVersionsCard>[0]['data']}
              logId={message.logId}
            />
          : null}

        {message.cardType === 'publish_schedule' && !!message.cardData
          ? <PublishScheduleCard
              data={message.cardData as Parameters<typeof PublishScheduleCard>[0]['data']}
              logId={message.logId}
            />
          : null}

        {message.cardType === 'data_analysis' && !!message.cardData
          ? <DataAnalysisCard
              data={message.cardData as Parameters<typeof DataAnalysisCard>[0]['data']}
              logId={message.logId}
            />
          : null}

        {message.cardType === 'calendar_card' && !!message.cardData
          ? <CalendarCard
              data={message.cardData as Parameters<typeof CalendarCard>[0]['data']}
              logId={message.logId}
            />
          : null}

        {message.cardType === 'attribution_verify' && !!message.cardData
          ? <AttributionVerifyCard
              data={message.cardData as Parameters<typeof AttributionVerifyCard>[0]['data']}
              logId={message.logId}
            />
          : null}

        {message.cardType === 'image_result' && !!(message.cardData as { url?: string })?.url
          ? <ImageResultCard
              url={(message.cardData as { url: string; prompt?: string }).url}
              prompt={(message.cardData as { url: string; prompt?: string }).prompt || ''}
            />
          : null}
      </div>
    </div>
  )
}
