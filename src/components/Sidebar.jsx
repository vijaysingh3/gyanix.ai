import { useState, useRef, useEffect } from 'react'
import {
  Plus, Trash2, Sun, Moon, MessageSquare,
  MoreHorizontal, Pencil, Check, X, Sparkles
} from 'lucide-react'

export default function Sidebar({
  chats, activeChatId, theme,
  onSelectChat, onNewChat, onDeleteChat,
  onRenameChat, onToggleTheme, onCloseSidebar
}) {
  const [hoveredId, setHoveredId] = useState(null)
  const [menuOpenId, setMenuOpenId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const editRef = useRef(null)
  const dark = theme === 'dark'

  useEffect(() => {
    if (editingId && editRef.current) editRef.current.focus()
  }, [editingId])

  // Close menu on outside click
  useEffect(() => {
    const handler = () => setMenuOpenId(null)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  const startEdit = (chat, e) => {
    e.stopPropagation()
    setEditingId(chat.id)
    setEditText(chat.title)
    setMenuOpenId(null)
  }

  const saveEdit = (id) => {
    if (editText.trim()) onRenameChat(id, editText.trim())
    setEditingId(null)
  }

  const groupChats = () => {
    const now = Date.now()
    const day = 86400000
    const today = [], yesterday = [], older = []
    chats.forEach(c => {
      const diff = now - c.updatedAt
      if (diff < day) today.push(c)
      else if (diff < day * 2) yesterday.push(c)
      else older.push(c)
    })
    return { today, yesterday, older }
  }

  const { today, yesterday, older } = groupChats()

  const renderGroup = (label, list) => {
    if (!list.length) return null
    return (
      <div key={label} className="mb-2">
        <p className={`text-[10px] font-semibold uppercase tracking-widest px-3 py-1.5 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
          {label}
        </p>
        {list.map(chat => renderChatItem(chat))}
      </div>
    )
  }

  const renderChatItem = (chat) => {
    const isActive = chat.id === activeChatId
    const isHovered = hoveredId === chat.id
    const isEditing = editingId === chat.id
    const menuOpen = menuOpenId === chat.id

    return (
      <div
        key={chat.id}
        className={`sidebar-item relative flex items-center gap-2 px-3 py-2 rounded-xl mx-2 mb-0.5 cursor-pointer group
          ${isActive
            ? dark ? 'bg-white/10 text-white' : 'bg-indigo-50 text-indigo-900'
            : dark ? 'text-gray-300 hover:bg-white/5 hover:text-white' : 'text-gray-700 hover:bg-gray-100'
          }`}
        onClick={() => !isEditing && onSelectChat(chat.id)}
        onMouseEnter={() => setHoveredId(chat.id)}
        onMouseLeave={() => setHoveredId(null)}
      >
        <MessageSquare size={14} className={`shrink-0 ${isActive ? 'text-indigo-400' : dark ? 'text-gray-500' : 'text-gray-400'}`} />

        {isEditing ? (
          <div className="flex-1 flex items-center gap-1" onClick={e => e.stopPropagation()}>
            <input
              ref={editRef}
              value={editText}
              onChange={e => setEditText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') saveEdit(chat.id)
                if (e.key === 'Escape') setEditingId(null)
              }}
              className={`flex-1 bg-transparent text-sm outline-none border-b ${dark ? 'border-indigo-400 text-white' : 'border-indigo-500 text-gray-900'}`}
            />
            <button onClick={() => saveEdit(chat.id)} className="text-green-400 hover:text-green-300">
              <Check size={13} />
            </button>
            <button onClick={() => setEditingId(null)} className="text-red-400 hover:text-red-300">
              <X size={13} />
            </button>
          </div>
        ) : (
          <>
            <span className="flex-1 text-sm truncate">{chat.title}</span>

            {(isHovered || isActive || menuOpen) && (
              <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setMenuOpenId(menuOpen ? null : chat.id)
                  }}
                  className={`p-1 rounded-md ${dark ? 'hover:bg-white/10 text-gray-400 hover:text-white' : 'hover:bg-gray-200 text-gray-400 hover:text-gray-700'}`}
                >
                  <MoreHorizontal size={13} />
                </button>
              </div>
            )}
          </>
        )}

        {/* Dropdown menu */}
        {menuOpen && !isEditing && (
          <div
            className={`absolute right-2 top-8 z-50 rounded-xl shadow-2xl border overflow-hidden min-w-[130px]
              ${dark ? 'bg-[#1c1c22] border-white/10' : 'bg-white border-gray-200'}`}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={(e) => startEdit(chat, e)}
              className={`flex items-center gap-2.5 w-full px-3.5 py-2.5 text-sm text-left
                ${dark ? 'hover:bg-white/5 text-gray-300' : 'hover:bg-gray-50 text-gray-700'}`}
            >
              <Pencil size={13} /> Rename
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDeleteChat(chat.id)
                setMenuOpenId(null)
              }}
              className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-sm text-left text-red-400 hover:bg-red-500/10"
            >
              <Trash2 size={13} /> Delete
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`h-full flex flex-col ${dark ? 'bg-[#111114] border-r border-white/5' : 'bg-white border-r border-gray-200'}`}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Sparkles size={13} className="text-white" />
          </div>
          <span className={`font-semibold text-base tracking-tight ${dark ? 'text-white' : 'text-gray-900'}`}>Gyanix</span>
        </div>
        <button
          onClick={onNewChat}
          className={`p-1.5 rounded-lg transition-colors ${dark ? 'hover:bg-white/8 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-800'}`}
          title="New Chat"
        >
          <Plus size={17} />
        </button>
      </div>

      {/* New Chat Button */}
      <div className="px-3 mb-3">
        <button
          onClick={onNewChat}
          className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all
            bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700
            shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30`}
        >
          <Plus size={15} />
          New Conversation
        </button>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto py-1">
        {chats.length === 0 ? (
          <div className={`text-center py-10 px-4 ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
            <MessageSquare size={28} className="mx-auto mb-2 opacity-40" />
            <p className="text-xs">No conversations yet</p>
            <p className="text-xs mt-1 opacity-70">Start chatting with Gyanix!</p>
          </div>
        ) : (
          <>
            {renderGroup('Today', today)}
            {renderGroup('Yesterday', yesterday)}
            {renderGroup('Older', older)}
          </>
        )}
      </div>

      {/* Bottom Bar */}
      <div className={`border-t px-3 py-3 ${dark ? 'border-white/5' : 'border-gray-100'}`}>
        <button
          onClick={onToggleTheme}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors
            ${dark ? 'text-gray-400 hover:bg-white/5 hover:text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
        >
          {theme === 'dark'
            ? <><Sun size={15} /><span>Light Mode</span></>
            : <><Moon size={15} /><span>Dark Mode</span></>
          }
        </button>
      </div>
    </div>
  )
}
