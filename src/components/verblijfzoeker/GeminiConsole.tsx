import { useEffect, useRef } from 'react'

interface GeminiConsoleProps {
  queries: Array<{
    query: string
    response: string
    timestamp: Date
  }>
  isActive: boolean
}

export default function GeminiConsole({ queries, isActive }: GeminiConsoleProps) {
  const consoleRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight
    }
  }, [queries])

  if (queries.length === 0 && !isActive) {
    return null
  }

  return (
    <div className="rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-gray-900 text-green-400 font-mono text-xs overflow-hidden">
      <div className="p-3 border-b border-gray-700 bg-gray-800">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          <span className="text-gray-400 text-xs">Gemini AI Console</span>
          {isActive && (
            <span className="ml-auto text-green-400 animate-pulse">● Actief</span>
          )}
        </div>
      </div>
      <div
        ref={consoleRef}
        className="p-4 max-h-64 overflow-y-auto space-y-3"
      >
        {queries.map((item, index) => (
          <div key={index} className="space-y-2">
            <div className="text-cyan-400">
              <span className="text-gray-500">$</span> {item.query}
            </div>
            <div className="text-green-400 pl-4 whitespace-pre-wrap">
              {item.response}
            </div>
            <div className="text-gray-500 text-[10px] border-t border-gray-800 pt-2">
              {item.timestamp.toLocaleTimeString()}
            </div>
          </div>
        ))}
        {isActive && (
          <div className="text-green-400 flex items-center gap-2">
            <span className="animate-pulse">●</span>
            <span>Wachten op Gemini AI response...</span>
          </div>
        )}
      </div>
    </div>
  )
}

