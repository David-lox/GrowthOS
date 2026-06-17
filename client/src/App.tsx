import { useState, useEffect } from 'react'
import { ChatWindow } from './components/chat/ChatWindow'
import { ConversationList } from './components/sidebar/ConversationList'
import { NicheCard } from './components/sidebar/NicheCard'
import { ContentHistory } from './components/sidebar/ContentHistory'
import { PlatformDrafts } from './components/sidebar/PlatformDrafts'
import { DataDashboard } from './components/sidebar/DataDashboard'
import { CalendarView } from './components/sidebar/CalendarView'
import { DecisionLogPanel } from './components/sidebar/DecisionLogPanel'
import { HealthDashboard } from './components/sidebar/HealthDashboard'
import { TrendingBoard } from './components/sidebar/TrendingBoard'
import { NotificationBadge } from './components/shared/NotificationBadge'
import { useChatStore } from './store/globalState'
import {
  MessageSquare,
  BarChart2,
  Calendar,
  TrendingUp,
  Heart,
  ClipboardList,
  User,
  FileText,
  Layers,
  Settings,
} from 'lucide-react'

type TabId = 'chat' | 'account' | 'content' | 'drafts' | 'data' | 'calendar' | 'trends' | 'health' | 'logs' | 'settings'

interface NavItem {
  icon: React.ElementType
  label: string
  id: TabId
}

const NAV_ITEMS: NavItem[] = [
  { icon: MessageSquare, label: '对话', id: 'chat' },
  { icon: User, label: '账号档案', id: 'account' },
  { icon: FileText, label: '内容记录', id: 'content' },
  { icon: Layers, label: '多平台草稿', id: 'drafts' },
  { icon: BarChart2, label: '数据复盘', id: 'data' },
  { icon: Calendar, label: '日历', id: 'calendar' },
  { icon: TrendingUp, label: '热点', id: 'trends' },
  { icon: Heart, label: '账号健康', id: 'health' },
  { icon: ClipboardList, label: '决策记录', id: 'logs' },
]

// 移动端底部 Tab（只保留5个）
const MOBILE_TABS: TabId[] = ['chat', 'trends', 'calendar', 'health', 'logs']

const TAB_TITLE: Record<TabId, string> = {
  chat: '对话',
  account: '账号档案',
  content: '内容记录',
  drafts: '多平台草稿',
  data: '数据复盘',
  calendar: '发布日历',
  trends: '热点追踪',
  health: '账号健康',
  logs: '决策记录',
  settings: '设置',
}

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('chat')
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const { userId, setPendingMessage } = useChatStore()

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleTrendSelect = (title: string) => {
    setPendingMessage(`我想创作关于「${title}」的内容，帮我分析一下这个热点适合做什么形式？`)
    setActiveTab('chat')
  }

  const renderSidebarContent = (tab: TabId) => {
    switch (tab) {
      case 'chat':
        return <ConversationList userId={userId} />
      case 'account':
        return <NicheCard userId={userId} />
      case 'content':
        return <ContentHistory userId={userId} />
      case 'drafts':
        return <PlatformDrafts userId={userId} />
      case 'data':
        return <DataDashboard userId={userId} />
      case 'calendar':
        return <CalendarView userId={userId} />
      case 'trends':
        return <TrendingBoard onSelectTrend={handleTrendSelect} />
      case 'health':
        return <HealthDashboard userId={userId} />
      case 'logs':
        return <DecisionLogPanel userId={userId} />
      case 'settings':
        return (
          <div className="p-4 space-y-3">
            <p className="text-xs text-text-secondary">设置功能即将上线</p>
          </div>
        )
      default:
        return null
    }
  }

  // ---------- 移动端布局 ----------
  if (isMobile) {
    return (
      <div className="flex flex-col h-screen bg-surface overflow-hidden">
        <header className="h-12 flex items-center justify-between px-4 border-b border-border bg-white flex-shrink-0">
          <h1 className="text-sm font-semibold text-text-primary">GrowthOS · KOC 专属 Agent</h1>
          <NotificationBadge userId={userId} />
        </header>

        <div className="flex-1 overflow-hidden">
          {activeTab === 'chat' ? (
            <ChatWindow />
          ) : (
            <div className="h-full overflow-y-auto bg-white">
              {renderSidebarContent(activeTab)}
            </div>
          )}
        </div>

        <nav className="flex items-center justify-around h-14 bg-white border-t border-border flex-shrink-0">
          {MOBILE_TABS.map((id) => {
            const item = NAV_ITEMS.find((n) => n.id === id)!
            const Icon = item.icon
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex flex-col items-center gap-0.5 py-1 px-3 transition-colors ${
                  activeTab === id ? 'text-primary' : 'text-gray-400'
                }`}
              >
                <Icon size={20} />
                <span className="text-xs leading-none">{item.label}</span>
              </button>
            )
          })}
        </nav>
      </div>
    )
  }

  // ---------- 桌面布局：280px 固定侧边栏 ----------
  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      {/* 280px 固定侧边栏 */}
      <aside className="w-70 flex-shrink-0 flex flex-col bg-white border-r border-border overflow-hidden"
        style={{ width: '280px' }}>
        {/* 顶部 Logo + 通知 */}
        <div className="h-12 flex items-center justify-between px-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center text-white font-bold text-xs">
              G
            </div>
            <span className="text-xs font-bold text-text-primary tracking-tight">GrowthOS·KOC専属Agent</span>
          </div>
          <NotificationBadge userId={userId} />
        </div>

        {/* 导航 tabs */}
        <nav className={`flex flex-col gap-0.5 px-2 py-2 overflow-y-auto flex-shrink-0 ${
          activeTab !== 'chat' ? 'flex-1' : 'max-h-64'
        }`}>
          {NAV_ITEMS.map(({ icon: Icon, label, id }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors
                ${activeTab === id
                  ? 'bg-primary-light text-primary font-medium'
                  : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'}`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>

        {/* 历史对话列表（仅在对话 Tab 显示） */}
        {activeTab === 'chat' && (
          <div className="flex-1 min-h-0 overflow-hidden border-t border-border">
            <ConversationList userId={userId} />
          </div>
        )}

        {/* 底部：账号档案 + 设置 */}
        <div className="border-t border-border px-2 py-2 flex-shrink-0 space-y-0.5">
          <button
            onClick={() => setActiveTab('account')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors
              ${activeTab === 'account'
                ? 'bg-primary-light text-primary font-medium'
                : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'}`}
          >
            <User size={16} />
            账号档案
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors
              ${activeTab === 'settings'
                ? 'bg-primary-light text-primary font-medium'
                : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'}`}
          >
            <Settings size={16} />
            设置
          </button>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 flex overflow-hidden">
        {/* 侧边面板内容（非对话 Tab） */}
        {activeTab !== 'chat' && (
          <div className="w-72 flex-shrink-0 border-r border-border bg-white overflow-y-auto">
            <div className="h-12 flex items-center px-4 border-b border-border">
              <span className="text-sm font-semibold text-text-primary">{TAB_TITLE[activeTab]}</span>
            </div>
            {renderSidebarContent(activeTab)}
          </div>
        )}

        {/* 聊天主区 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="h-12 flex items-center px-5 border-b border-border bg-white flex-shrink-0">
            <h2 className="text-sm font-semibold text-text-primary">
              {activeTab === 'chat' ? 'GrowthOS · KOC 专属 Agent' : '对话'}
            </h2>
          </header>
          <div className="flex-1 overflow-hidden">
            <ChatWindow />
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
