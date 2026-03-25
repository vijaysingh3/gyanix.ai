import { useEffect, useRef } from 'react'
import { PanelLeft, Sun, Moon, Plus, Sparkles } from 'lucide-react'
import MessageBubble from './MessageBubble'
import InputBar from './InputBar'

export default function ChatWindow({
  chat, theme, sidebarOpen,
  onToggleSidebar, onToggleTheme,
  onSendMessage, onNewChat
}) {
  const bottomRef = useRef(null)
  const dark = theme === 'dark'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat.messages])

  return (
    <div className={`flex flex-col h-full ${dark ? 'bg-[#0f0f11]' : 'bg-[#f5f5f7]'}`}>

      {/* Top Bar */}
      <div className={`flex items-center justify-between px-4 py-3 border-b
        ${dark ? 'border-white/5 bg-[#0f0f11]' : 'border-gray-200 bg-[#f5f5f7]'}`}>
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className={`p-2 rounded-lg transition-colors ${dark ? 'hover:bg-white/8 text-gray-400 hover:text-white' : 'hover:bg-gray-200 text-gray-500 hover:text-gray-800'}`}
          >
            <PanelLeft size={17} />
          </button>
          {!sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Sparkles size={11} className="text-white" />
              </div>
              <span className={`font-semibold text-sm ${dark ? 'text-white' : 'text-gray-900'}`}>Gyanix</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onNewChat}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
              ${dark ? 'hover:bg-white/8 text-gray-400 hover:text-white' : 'hover:bg-gray-200 text-gray-600 hover:text-gray-900'}`}
          >
            <Plus size={13} /> New Chat
          </button>
          <button
            onClick={onToggleTheme}
            className={`p-2 rounded-lg transition-colors ${dark ? 'hover:bg-white/8 text-gray-400 hover:text-white' : 'hover:bg-gray-200 text-gray-500 hover:text-gray-800'}`}
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-1">
          {chat.messages.map((msg, idx) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              theme={theme}
              isLast={idx === chat.messages.length - 1}
            />
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className={`border-t ${dark ? 'border-white/5' : 'border-gray-200'}`}>
        <div className="max-w-3xl mx-auto px-4 py-4">
          <InputBar theme={theme} onSend={onSendMessage} />
          <p className={`text-center text-[10px] mt-2.5 ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
            Gyanix can make mistakes. Verify important info.
          </p>
        </div>
      </div>
    </div>
  )
}
