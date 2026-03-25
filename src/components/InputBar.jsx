import { useState, useRef, useEffect } from 'react'
import { ArrowUp, Mic, Paperclip } from 'lucide-react'

export default function InputBar({ theme, onSend }) {
  const [text, setText] = useState('')
  const textareaRef = useRef(null)
  const dark = theme === 'dark'

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 180) + 'px'
  }, [text])

  const handleSend = () => {
    if (!text.trim()) return
    onSend(text)
    setText('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const canSend = text.trim().length > 0

  return (
    <div className={`input-glow flex flex-col rounded-2xl border transition-all
      ${dark
        ? 'bg-[#1a1a22] border-white/8 hover:border-white/15'
        : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm'
      }`}>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Message Gyanix..."
        rows={1}
        className={`w-full px-4 pt-3.5 pb-1 bg-transparent text-sm outline-none leading-relaxed
          placeholder:opacity-50 min-h-[50px] max-h-[180px] overflow-y-auto
          ${dark ? 'text-white placeholder:text-gray-500' : 'text-gray-900 placeholder:text-gray-400'}`}
      />

      {/* Bottom bar */}
      <div className="flex items-center justify-between px-3 pb-3 pt-1">
        <div className="flex items-center gap-1">
          <button
            className={`p-2 rounded-lg transition-colors ${dark ? 'text-gray-500 hover:text-gray-300 hover:bg-white/5' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
            title="Attach file (coming soon)"
          >
            <Paperclip size={15} />
          </button>
          <button
            className={`p-2 rounded-lg transition-colors ${dark ? 'text-gray-500 hover:text-gray-300 hover:bg-white/5' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
            title="Voice input (coming soon)"
          >
            <Mic size={15} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-mono ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
            {text.length > 0 ? `${text.length}` : 'Enter ↵ to send'}
          </span>
          <button
            onClick={handleSend}
            disabled={!canSend}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all
              ${canSend
                ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-105 active:scale-95'
                : dark ? 'bg-white/5 text-gray-600 cursor-not-allowed' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
          >
            <ArrowUp size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}
