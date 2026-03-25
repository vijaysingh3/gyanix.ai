import { useState } from 'react'
import { Copy, Check, Sparkles, User } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'

function CopyButton({ text, theme }) {
  const [copied, setCopied] = useState(false)
  const dark = theme === 'dark'

  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={copy}
      className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md transition-all
        ${dark ? 'bg-white/8 hover:bg-white/15 text-gray-400 hover:text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800'}`}
    >
      {copied ? <><Check size={11} /> Copied!</> : <><Copy size={11} /> Copy</>}
    </button>
  )
}

function CodeBlock({ children, className, theme }) {
  const dark = theme === 'dark'
  const match = /language-(\w+)/.exec(className || '')
  const language = match ? match[1] : 'text'
  const code = String(children).replace(/\n$/, '')

  return (
    <div className={`rounded-xl overflow-hidden my-3 border ${dark ? 'border-white/8' : 'border-gray-200'}`}>
      <div className={`flex items-center justify-between px-4 py-2 ${dark ? 'bg-[#1a1a22]' : 'bg-gray-100'}`}>
        <span className={`text-xs font-mono font-medium ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{language}</span>
        <CopyButton text={code} theme={theme} />
      </div>
      <SyntaxHighlighter
        style={dark ? oneDark : oneLight}
        language={language}
        PreTag="div"
        customStyle={{
          margin: 0,
          borderRadius: 0,
          background: dark ? '#13131a' : '#f8f8fc',
          fontSize: '0.82rem',
          padding: '1rem 1.25rem',
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  )
}

export default function MessageBubble({ message, theme, isLast }) {
  const dark = theme === 'dark'
  const isUser = message.role === 'user'
  const isThinking = message.thinking

  if (isUser) {
    return (
      <div className="msg-animate flex justify-end mb-5 group">
        <div className="flex items-end gap-2.5 max-w-[80%]">
          <div className={`px-4 py-3 rounded-2xl rounded-br-sm text-sm leading-relaxed
            bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20`}>
            {message.content}
          </div>
          <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold
            ${dark ? 'bg-white/10 text-white' : 'bg-gray-200 text-gray-700'}`}>
            <User size={13} />
          </div>
        </div>
      </div>
    )
  }

  // AI Message
  return (
    <div className="msg-animate flex gap-3 mb-5 group">
      {/* Avatar */}
      <div className="shrink-0 mt-0.5 w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
        <Sparkles size={13} className="text-white" />
      </div>

      <div className="flex-1 min-w-0">
        {/* Sender label */}
        <p className={`text-xs font-semibold mb-1.5 ${dark ? 'text-indigo-400' : 'text-indigo-600'}`}>Gyanix</p>

        {isThinking ? (
          <div className={`flex items-center gap-1.5 px-4 py-3 rounded-2xl rounded-tl-sm w-fit
            ${dark ? 'bg-white/5' : 'bg-white shadow-sm'}`}>
            <span className={`w-1.5 h-1.5 rounded-full dot-1 ${dark ? 'bg-gray-400' : 'bg-gray-500'}`} />
            <span className={`w-1.5 h-1.5 rounded-full dot-2 ${dark ? 'bg-gray-400' : 'bg-gray-500'}`} />
            <span className={`w-1.5 h-1.5 rounded-full dot-3 ${dark ? 'bg-gray-400' : 'bg-gray-500'}`} />
          </div>
        ) : (
          <div className={`prose-gyanix text-sm leading-relaxed rounded-2xl rounded-tl-sm px-4 py-3
            ${dark ? 'bg-white/5 text-gray-200' : 'bg-white text-gray-800 shadow-sm'}`}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ node, inline, className, children, ...props }) {
                  if (inline) {
                    return (
                      <code
                        className={`font-mono text-[0.82em] px-1.5 py-0.5 rounded ${dark ? 'bg-white/10 text-purple-300' : 'bg-gray-100 text-indigo-700'}`}
                        {...props}
                      >
                        {children}
                      </code>
                    )
                  }
                  return <CodeBlock className={className} theme={theme}>{children}</CodeBlock>
                },
                p({ children }) {
                  return <p className="mb-2 last:mb-0">{children}</p>
                },
                ul({ children }) {
                  return <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>
                },
                ol({ children }) {
                  return <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>
                },
                h1({ children }) {
                  return <h1 className={`text-lg font-bold mt-3 mb-1 ${dark ? 'text-white' : 'text-gray-900'}`}>{children}</h1>
                },
                h2({ children }) {
                  return <h2 className={`text-base font-semibold mt-3 mb-1 ${dark ? 'text-white' : 'text-gray-900'}`}>{children}</h2>
                },
                h3({ children }) {
                  return <h3 className={`text-sm font-semibold mt-2 mb-1 ${dark ? 'text-gray-200' : 'text-gray-800'}`}>{children}</h3>
                },
                strong({ children }) {
                  return <strong className={`font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>{children}</strong>
                },
                blockquote({ children }) {
                  return (
                    <blockquote className={`border-l-2 border-indigo-400 pl-3 italic my-2 ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {children}
                    </blockquote>
                  )
                },
                a({ children, href }) {
                  return <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">{children}</a>
                },
              }}
            >
              {message.content}
            </ReactMarkdown>

            {/* Copy full message */}
            <div className="mt-2.5 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
              <CopyButton text={message.content} theme={theme} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
