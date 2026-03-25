import { PanelLeft, Sun, Moon, Sparkles, Zap, Code2, BookOpen, Globe } from 'lucide-react'
import InputBar from './InputBar'

const SUGGESTIONS = [
  { icon: Code2, text: 'Kotlin mein ek REST API call kaise karein?', label: 'Coding' },
  { icon: BookOpen, text: 'Mujhe machine learning simply samjhao', label: 'Learning' },
  { icon: Globe, text: 'Kal ke liye travel plan banao Jaipur ka', label: 'Planning' },
  { icon: Zap, text: 'Android app ki performance improve karne ke tips', label: 'Tips' },
]

export default function WelcomeScreen({
  theme, sidebarOpen,
  onToggleSidebar, onToggleTheme,
  onSendMessage
}) {
  const dark = theme === 'dark'

  return (
    <div className={`flex flex-col h-full ${dark ? 'bg-[#0f0f11]' : 'bg-[#f5f5f7]'}`}>

      {/* Top Bar */}
      <div className={`flex items-center justify-between px-4 py-3 border-b
        ${dark ? 'border-white/5' : 'border-gray-200'}`}>
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
        <button
          onClick={onToggleTheme}
          className={`p-2 rounded-lg transition-colors ${dark ? 'hover:bg-white/8 text-gray-400 hover:text-white' : 'hover:bg-gray-200 text-gray-500 hover:text-gray-800'}`}
        >
          {dark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>

      {/* Center Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-8">

        {/* Logo + Title */}
        <div className="flex flex-col items-center mb-10">
          <div className="relative mb-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-500/30">
              <Sparkles size={28} className="text-white" />
            </div>
            {/* Glow */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 blur-xl opacity-30 -z-10" />
          </div>

          <h1 className={`text-3xl font-bold tracking-tight mb-2 ${dark ? 'text-white' : 'text-gray-900'}`}>
            Namaste! Main hoon{' '}
            <span className="gradient-text">Gyanix</span> 🙏
          </h1>
          <p className={`text-sm text-center max-w-xs ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
            Gyaan jo samjhe, aap ki baat — Your intelligent AI companion
          </p>
        </div>

        {/* Input */}
        <div className="w-full max-w-2xl mb-8">
          <InputBar theme={theme} onSend={onSendMessage} />
        </div>

        {/* Suggestion chips */}
        <div className="w-full max-w-2xl">
          <p className={`text-xs font-medium mb-3 text-center ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
            Try asking...
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {SUGGESTIONS.map(({ icon: Icon, text, label }) => (
              <button
                key={text}
                onClick={() => onSendMessage(text)}
                className={`flex items-start gap-3 px-4 py-3.5 rounded-xl text-left text-sm transition-all group
                  ${dark
                    ? 'bg-white/4 border border-white/6 hover:bg-white/8 hover:border-white/12 text-gray-300 hover:text-white'
                    : 'bg-white border border-gray-200 hover:border-indigo-200 hover:bg-indigo-50/50 text-gray-700 hover:text-gray-900 shadow-sm'
                  }`}
              >
                <div className={`mt-0.5 p-1.5 rounded-lg ${dark ? 'bg-indigo-500/15 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
                  <Icon size={13} />
                </div>
                <div>
                  <span className={`block text-[10px] font-semibold mb-0.5 uppercase tracking-wider ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
                    {label}
                  </span>
                  <span className="leading-snug">{text}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center pb-4">
        <p className={`text-[10px] ${dark ? 'text-gray-700' : 'text-gray-400'}`}>
          Gyanix — Powered by Sarvam AI · Made with ❤️ in India
        </p>
      </div>
    </div>
  )
}
