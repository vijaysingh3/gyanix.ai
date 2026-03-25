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

  const handleSendMessage = useCallback((text) => {
    if (!text.trim()) return

    const userMsg = {
      id: generateId(),
      role: 'user',
      content: text.trim(),
      timestamp: Date.now(),
    }

    let chatId = activeChatId

    if (!chatId) {
      // Create new chat
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
    } else {
      setChats(prev => prev.map(c =>
        c.id === chatId
          ? { ...c, messages: [...c.messages, userMsg], updatedAt: Date.now() }
          : c
      ))
    }

    // Simulate AI thinking + response
    const thinkingId = generateId()
    const thinkingMsg = {
      id: thinkingId,
      role: 'assistant',
      content: '',
      thinking: true,
      timestamp: Date.now(),
    }

    setChats(prev => prev.map(c =>
      c.id === chatId
        ? { ...c, messages: [...c.messages, thinkingMsg] }
        : c
    ))

    // Simulate response after delay
    const delay = 1200 + Math.random() * 800
    setTimeout(() => {
      const demoResponses = getDemoResponse(text)
      setChats(prev => prev.map(c =>
        c.id === chatId
          ? {
              ...c,
              messages: c.messages.map(m =>
                m.id === thinkingId
                  ? { ...m, content: demoResponses, thinking: false }
                  : m
              ),
              updatedAt: Date.now(),
            }
          : c
      ))
    }, delay)
  }, [activeChatId])

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

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {activeChat ? (
          <ChatWindow
            chat={activeChat}
            theme={theme}
            sidebarOpen={sidebarOpen}
            onToggleSidebar={() => setSidebarOpen(s => !s)}
            onToggleTheme={toggleTheme}
            onSendMessage={handleSendMessage}
            onNewChat={createNewChat}
          />
        ) : (
          <WelcomeScreen
            theme={theme}
            sidebarOpen={sidebarOpen}
            onToggleSidebar={() => setSidebarOpen(s => !s)}
            onToggleTheme={toggleTheme}
            onSendMessage={handleSendMessage}
          />
        )}
      </div>
    </div>
  )
}

function getDemoResponse(input) {
  const lower = input.toLowerCase()

  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey') || lower.includes('namaste')) {
    return `Namaste! 🙏 Main **Gyanix** hoon — aapka AI assistant.\n\nMain aapki madad karne ke liye yahaan hoon. Aap mujhse kuch bhi pooch sakte hain:\n\n- 💡 **Ideas & Brainstorming**\n- 💻 **Coding & Development**\n- 📝 **Writing & Content**\n- 🔍 **Research & Analysis**\n\nBatao, aaj kaise help kar sakta hoon?`
  }

  if (lower.includes('code') || lower.includes('kotlin') || lower.includes('android')) {
    return `Bilkul! Android development mein madad kar sakta hoon. 💻\n\nYahan ek Kotlin example hai:\n\n\`\`\`kotlin\nfun greetUser(name: String): String {\n    return "Namaste, $name! Gyanix mein aapka swagat hai 🙏"\n}\n\n// Usage\nval message = greetUser("Vijay")\nprintln(message)\n\`\`\`\n\nAur kya chahiye? Koi specific feature ya problem batao!`
  }

  if (lower.includes('gyanix') || lower.includes('who are you') || lower.includes('kaun')) {
    return `Main **Gyanix** hoon! 🌟\n\nEk intelligent AI assistant jo:\n\n- 🧠 Aapke sawalon ka jawab deta hai\n- 💬 Hindi aur English dono mein baat kar sakta hai\n- 🔧 Technical problems solve karta hai\n- ✍️ Creative content banata hai\n\n**Gyan** (ज्ञान) + **ix** = Unlimited Knowledge\n\nAapki seva mein hazir hoon! 🙏`
  }

  return `Aapka sawaal samajh aaya! 🤔\n\nMain is par kaam kar raha hoon. Abhi ye ek **UI demo** hai — jab Sarvam AI API connect hogi, tab main aapke har sawaal ka sahi jawab dunga.\n\nIs beech aap UI explore kar sakte hain:\n- Naye chats bana sakte hain\n- Dark/Light mode toggle kar sakte hain\n- Chat history dekh sakte hain\n\nAur kuch poochna hai? 😊`
}
