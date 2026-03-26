import { useState, useEffect, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import ChatWindow from './components/ChatWindow'
import WelcomeScreen from './components/WelcomeScreen'

const STORAGE_KEY = 'gyanix_chats'
const THEME_KEY = 'gyanix_theme'

function generateId() {
  return Math.random().toString(36).slice(2, 10)
}

function getInitialTheme() {
  const saved = localStorage.getItem(THEME_KEY)
  if (saved) return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default function App() {
  const [theme, setTheme] = useState(getInitialTheme)
  const [chats, setChats] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const [activeChatId, setActiveChatId] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)

  // Supabase config from .env.local
  const SUPABASE_FUN_URL = import.meta.env.VITE_SUPABASE_FUN_URL
  const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (mobile) setSidebarOpen(false)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats))
  }, [chats])

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')
  const activeChat = chats.find(c => c.id === activeChatId) || null

  const createNewChat = useCallback(() => {
    setActiveChatId(null)
    if (isMobile) setSidebarOpen(false)
  }, [isMobile])

  const selectChat = useCallback((id) => {
    setActiveChatId(id)
    if (isMobile) setSidebarOpen(false)
  }, [isMobile])

  const deleteChat = useCallback((id) => {
    setChats(prev => prev.filter(c => c.id !== id))
    if (activeChatId === id) setActiveChatId(null)
  }, [activeChatId])

  const renameChat = useCallback((id, newTitle) => {
    setChats(prev => prev.map(c => c.id === id ? { ...c, title: newTitle } : c))
  }, [])

  const buildApiMessages = (chatMessages) => {
    return chatMessages
      .filter(m => !m.thinking && m.content && m.content.trim())
      .map(m => ({ role: m.role, content: m.content }))
  }

  const handleSendMessage = useCallback(async (text) => {
    if (!text.trim() || isStreaming) return

    const userMsg = {
      id: generateId(),
      role: 'user',
      content: text.trim(),
      timestamp: Date.now(),
    }

    let chatId = activeChatId
    let existingMessages = []

    if (!chatId) {
      chatId = generateId()
      const newChat = {
        id: chatId,
        title: text.slice(0, 42) + (text.length > 42 ? '…' : ''),
        messages: [userMsg],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      setChats(prev => [newChat, ...prev])
      setActiveChatId(chatId)
      existingMessages = [userMsg]
    } else {
      setChats(prev => prev.map(c =>
        c.id === chatId
          ? { ...c, messages: [...c.messages, userMsg], updatedAt: Date.now() }
          : c
      ))
      const currentChat = chats.find(c => c.id === chatId)
      existingMessages = currentChat ? [...currentChat.messages, userMsg] : [userMsg]
    }

    // Add thinking placeholder
    const assistantMsgId = generateId()
    setChats(prev => prev.map(c =>
      c.id === chatId
        ? {
            ...c,
            messages: [...c.messages, {
              id: assistantMsgId,
              role: 'assistant',
              content: '',
              thinking: true,
              timestamp: Date.now(),
            }]
          }
        : c
    ))

    setIsStreaming(true)

    try {
      // Check env variables
      if (!SUPABASE_FUN_URL) throw new Error('VITE_SUPABASE_FUN_URL missing in .env.local')
      if (!SUPABASE_ANON_KEY) throw new Error('VITE_SUPABASE_ANON_KEY missing in .env.local')

      const systemMessage = {
        role: 'system',
        content: `You are Gyanix, an intelligent and friendly AI assistant built for Indian users. You speak fluently in both Hindi and English — respond in the same language the user writes in. You understand Indian culture and context very well. Always be helpful, accurate, and friendly. Use markdown formatting — code blocks for code, bullet points for lists, bold for important terms.`,
      }

      const apiMessages = [systemMessage, ...buildApiMessages(existingMessages)]

      // Call Supabase Edge Function directly
      const response = await fetch(SUPABASE_FUN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          messages: apiMessages,
          stream: true,
        }),
      })

      if (!response.ok) {
        let errMsg = `Supabase Error: ${response.status}`
        try {
          const errText = await response.text()
          errMsg = errText || errMsg
        } catch {}
        throw new Error(errMsg)
      }

      // Switch from thinking → streaming mode
      setChats(prev => prev.map(c =>
        c.id === chatId
          ? {
              ...c,
              messages: c.messages.map(m =>
                m.id === assistantMsgId ? { ...m, thinking: false, content: '' } : m
              ),
            }
          : c
      ))

      // Read SSE stream
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() // keep incomplete line in buffer

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue

          const data = line.slice(6).trim()
          if (data === '[DONE]') continue

          try {
            const parsed = JSON.parse(data)
            const delta = parsed.choices?.[0]?.delta

            if (!delta) continue

            // ✅ Only use 'content' field — skip 'reasoning_content' (thinking steps)
            const chunk = delta.content
            if (chunk && typeof chunk === 'string') {
              fullContent += chunk
              setChats(prev => prev.map(c =>
                c.id === chatId
                  ? {
                      ...c,
                      messages: c.messages.map(m =>
                        m.id === assistantMsgId
                          ? { ...m, content: fullContent }
                          : m
                      ),
                      updatedAt: Date.now(),
                    }
                  : c
              ))
            }
          } catch {
            // Skip malformed chunks silently
          }
        }
      }

      // Handle empty response
      if (!fullContent.trim()) {
        setChats(prev => prev.map(c =>
          c.id === chatId
            ? {
                ...c,
                messages: c.messages.map(m =>
                  m.id === assistantMsgId
                    ? { ...m, content: '_(Koi response nahi mila. Dobara try karein.)_' }
                    : m
                ),
              }
            : c
        ))
      }

    } catch (error) {
      const errorContent = `❌ **Error:** ${error.message}\n\nKripya check karein:\n- \`.env.local\` mein \`VITE_SUPABASE_FUN_URL\` sahi hai?\n- \`VITE_SUPABASE_ANON_KEY\` set hai?\n- Supabase Edge Function deploy hui hai?`
      setChats(prev => prev.map(c =>
        c.id === chatId
          ? {
              ...c,
              messages: c.messages.map(m =>
                m.id === assistantMsgId
                  ? { ...m, thinking: false, content: errorContent }
                  : m
              ),
            }
          : c
      ))
    } finally {
      setIsStreaming(false)
    }
  }, [activeChatId, chats, isStreaming, SUPABASE_FUN_URL, SUPABASE_ANON_KEY])

  return (
    <div className={`flex h-screen w-screen overflow-hidden ${theme === 'dark' ? 'bg-[#0f0f11] text-gray-100' : 'bg-[#f5f5f7] text-gray-900'}`}>

      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className={`
        ${isMobile ? 'fixed left-0 top-0 h-full z-30' : 'relative'}
        sidebar-transition
        ${sidebarOpen ? 'w-64 opacity-100 translate-x-0' : isMobile ? '-translate-x-full w-64 opacity-0' : 'w-0 opacity-0 overflow-hidden'}
      `}>
        <Sidebar
          chats={chats}
          activeChatId={activeChatId}
          theme={theme}
          onSelectChat={selectChat}
          onNewChat={createNewChat}
          onDeleteChat={deleteChat}
          onRenameChat={renameChat}
          onToggleTheme={toggleTheme}
          onCloseSidebar={() => setSidebarOpen(false)}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0 relative">
        {activeChat ? (
          <ChatWindow
            chat={activeChat}
            theme={theme}
            sidebarOpen={sidebarOpen}
            isStreaming={isStreaming}
            onToggleSidebar={() => setSidebarOpen(s => !s)}
            onToggleTheme={toggleTheme}
            onSendMessage={handleSendMessage}
            onNewChat={createNewChat}
          />
        ) : (
          <WelcomeScreen
            theme={theme}
            sidebarOpen={sidebarOpen}
            isStreaming={isStreaming}
            onToggleSidebar={() => setSidebarOpen(s => !s)}
            onToggleTheme={toggleTheme}
            onSendMessage={handleSendMessage}
          />
        )}
      </div>
    </div>
  )
}
