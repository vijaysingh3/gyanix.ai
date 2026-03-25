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

  // Detect mobile
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

  // Apply theme to html element
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  // Persist chats
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

  // Build message history for API (only role + content, skip thinking/empty)
  const buildApiMessages = (chatMessages) => {
    return chatMessages
      .filter(m => !m.thinking && m.content && m.content.trim())
      .map(m => ({ role: m.role, content: m.content }))
  }

  const handleSendMessage = useCallback(async (text) => {
    console.log('[FRONTEND DEBUG] handleSendMessage called with:', text)
    
    if (!text.trim() || isStreaming) {
      console.log('[FRONTEND DEBUG] Skipping - empty text or already streaming')
      return
    }

    const userMsg = {
      id: generateId(),
      role: 'user',
      content: text.trim(),
      timestamp: Date.now(),
    }

    let chatId = activeChatId
    let existingMessages = []

    if (!chatId) {
      // New chat
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
      console.log('[FRONTEND DEBUG] Created new chat with ID:', chatId)
    } else {
      // Existing chat
      setChats(prev => prev.map(c =>
        c.id === chatId
          ? { ...c, messages: [...c.messages, userMsg], updatedAt: Date.now() }
          : c
      ))
      const currentChat = chats.find(c => c.id === chatId)
      existingMessages = currentChat ? [...currentChat.messages, userMsg] : [userMsg]
      console.log('[FRONTEND DEBUG] Added message to existing chat:', chatId)
    }

    // Add thinking placeholder for AI
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
    console.log('[FRONTEND DEBUG] Added thinking placeholder, ID:', assistantMsgId)

    setIsStreaming(true)

    try {
      // System prompt — Gyanix personality
      const systemMessage = {
        role: 'system',
        content: `You are Gyanix, an intelligent and friendly AI assistant built for Indian users. You are helpful, knowledgeable, and conversational. You speak fluently in both Hindi and English — always respond in the same language the user writes in (if they write in Hindi, reply in Hindi; if English, reply in English; Hinglish is also fine). You understand Indian culture, context, and references very well. Always be helpful, accurate, and friendly. Use markdown formatting in your responses — code blocks for code, bullet points for lists, bold for important terms, headers for sections when needed.`,
      }

      const apiMessages = [systemMessage, ...buildApiMessages(existingMessages)]
      console.log('[FRONTEND DEBUG] API Messages being sent:', JSON.stringify(apiMessages, null, 2))

      // Call Vercel serverless function
      console.log('[FRONTEND DEBUG] Calling /api/chat...')
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      })
      
      console.log('[FRONTEND DEBUG] Response status:', response.status, response.statusText)
      console.log('[FRONTEND DEBUG] Response headers:', Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        let errMsg = `API Error: ${response.status}`
        try {
          const err = await response.json()
          console.log('[FRONTEND DEBUG] Error response from API:', err)
          errMsg = err.error || errMsg
        } catch (parseErr) {
          console.log('[FRONTEND DEBUG] Could not parse error response:', parseErr)
          const textErr = await response.text()
          console.log('[FRONTEND DEBUG] Raw error response:', textErr)
        }
        throw new Error(errMsg)
      }

      // Switch thinking → streaming
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
      console.log('[FRONTEND DEBUG] Switched from thinking to streaming mode')

      // Read SSE stream
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''
      let buffer = ''
      let chunkCount = 0

      console.log('[FRONTEND DEBUG] Starting to read SSE stream...')
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          console.log('[FRONTEND DEBUG] Stream finished (done=true)')
          break
        }

        chunkCount++
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() // keep incomplete line

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (data === '[DONE]') {
              console.log('[FRONTEND DEBUG] Received [DONE] from server')
              continue
            }

            try {
              const parsed = JSON.parse(data)
              console.log(`[FRONTEND DEBUG] Chunk #${chunkCount}:`, parsed)
              if (parsed.error) throw new Error(parsed.error)
              if (parsed.content) {
                fullContent += parsed.content
                // Real-time streaming update
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
            } catch (parseErr) {
              if (parseErr.message !== 'Unexpected end of JSON input') {
                console.log('[FRONTEND DEBUG] Parse error:', parseErr, 'Raw line:', line)
                throw parseErr
              }
            }
          }
        }
      }

      console.log('[FRONTEND DEBUG] Final content length:', fullContent.length)

      // If response was empty
      if (!fullContent.trim()) {
        console.log('[FRONTEND DEBUG] Empty response received')
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
      console.log('[FRONTEND DEBUG] Caught error:', error)
      // Show error message in chat
      const errorContent = `❌ **Error:** ${error.message}\n\nKripya check karein:\n- Internet connection theek hai?\n- Vercel mein \`x_url_api\` env variable set hai?\n- Sarvam AI API key valid hai?\n\n🔍 **Debug:** Check browser console for details.`
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
      console.log('[FRONTEND DEBUG] Streaming finished, isStreaming=false')
    }
  }, [activeChatId, chats, isStreaming])

  return (
    <div className={`flex h-screen w-screen overflow-hidden ${theme === 'dark' ? 'bg-[#0f0f11] text-gray-100' : 'bg-[#f5f5f7] text-gray-900'}`}>

      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
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

      {/* Main Content */}
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
