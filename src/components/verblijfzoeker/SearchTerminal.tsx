import { useEffect, useRef, useState } from 'react'

interface SearchTerminalProps {
  logs: string[]
  isActive: boolean
  currentStep?: {
    step: number
    title: string
    description?: string
    progress?: number
    results?: number
  }
}

export default function SearchTerminal({ logs, isActive, currentStep }: SearchTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null)
  const initialSteps: Array<{title: string, status: 'pending' | 'loading' | 'success' | 'error', results?: number}> = [
    { title: 'Locatie geocoderen', status: 'pending' },
    { title: 'Zoeken naar campings en jeugdherbergen', status: 'pending' },
    { title: 'Zoeken naar jeugdbewegingen via adres', status: 'pending' },
    { title: 'Onderzoeken welke soorten jeugdbewegingen bestaan', status: 'pending' },
    { title: 'Zoeken naar jeugdbewegingen in de omgeving', status: 'pending' },
    { title: 'Duplicaten verwijderen en resultaten verzamelen', status: 'pending' },
  ]
  
  const [steps, setSteps] = useState(initialSteps)

  // Reset steps when logs are cleared (new search started)
  useEffect(() => {
    if (logs.length === 0 && !isActive) {
      setSteps(initialSteps.map(step => ({ ...step, status: 'pending' as const })))
    }
  }, [logs.length, isActive])

  // Update steps based on logs
  useEffect(() => {
    // Reset steps if logs are empty and not active
    if (logs.length === 0 && !isActive) {
      setSteps(initialSteps.map(step => ({ ...step, status: 'pending' as const })))
      return
    }
    
    const newSteps = initialSteps.map(step => ({ ...step }))
    
    // Step 0: Geocoding
    if (logs.some(l => l.includes('Coördinaten gevonden'))) {
      newSteps[0] = { ...newSteps[0], status: 'success' }
    } else if (logs.some(l => l.includes('Locatie geocoderen')) || logs.some(l => l.includes('Stap 1'))) {
      newSteps[0].status = 'loading'
    }
    
    // Step 1: OSM search
    if (logs.some(l => l.includes('OpenStreetMap:') && l.includes('resultaten'))) {
      const osmLog = logs.find(l => l.includes('OpenStreetMap:') && l.includes('resultaten'))
      const match = osmLog?.match(/(\d+)\s+resultaten/)
      newSteps[1] = { 
        ...newSteps[1], 
        status: 'success',
        results: match ? parseInt(match[1]) : undefined
      }
    } else if (logs.some(l => l.includes('Stap 2') || l.includes('campings en jeugdherbergen'))) {
      if (newSteps[0].status === 'success') {
        newSteps[1].status = 'loading'
      }
    }
    
    // Step 2: Address search
    if (logs.some(l => l.includes('Adreszoek:'))) {
      const adresLog = logs.find(l => l.includes('Adreszoek:'))
      const match = adresLog?.match(/(\d+)\s+jeugdbewegingen/)
      newSteps[2] = { 
        ...newSteps[2], 
        status: 'success',
        results: match ? parseInt(match[1]) : undefined
      }
    } else if (logs.some(l => l.includes('Stap 3') || l.includes('jeugdbewegingen via adres'))) {
      if (newSteps[1].status === 'success') {
        newSteps[2].status = 'loading'
      }
    }
    
    // Step 3: Research types
    if (logs.some(l => l.includes('soorten gevonden'))) {
      newSteps[3].status = 'success'
    } else if (logs.some(l => l.includes('Onderzoeken welke soorten') || logs.some(l => l.includes('Stap 4')))) {
      if (newSteps[2].status === 'success') {
        newSteps[3].status = 'loading'
      }
    }
    
    // Step 4: Gemini search
    if (logs.some(l => l.includes('Gemini AI:') && l.includes('jeugdbewegingen gevonden'))) {
      const geminiLog = logs.find(l => l.includes('Gemini AI:') && l.includes('jeugdbewegingen gevonden'))
      const match = geminiLog?.match(/(\d+)\s+jeugdbewegingen/)
      newSteps[4] = { 
        ...newSteps[4], 
        status: 'success',
        results: match ? parseInt(match[1]) : undefined
      }
    } else if (logs.some(l => l.includes('Zoeken naar jeugdbewegingen in') && l.includes('Gemini AI'))) {
      if (newSteps[3].status === 'success') {
        newSteps[4].status = 'loading'
      }
    }
    
    // Step 5: Deduplication
    if (logs.some(l => l.includes('unieke resultaten'))) {
      const totalLog = logs.find(l => l.includes('unieke resultaten'))
      const match = totalLog?.match(/(\d+)\s+unieke/)
      newSteps[5] = { 
        ...newSteps[5], 
        status: 'success',
        results: match ? parseInt(match[1]) : undefined
      }
    } else if (logs.some(l => l.includes('Stap 5') || l.includes('Duplicaten verwijderen'))) {
      if (newSteps[4].status === 'success') {
        newSteps[5].status = 'loading'
      }
    }
    
    setSteps(newSteps)
  }, [logs, isActive])

  // Auto-scroll to bottom
  useEffect(() => {
    if (terminalRef.current && logs.length > 0) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [logs, steps])

  if (!isActive && logs.length === 0) {
    return null
  }

  return (
    <div className="rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-background-dark overflow-hidden">
      {/* Steps Progress */}
      <div className="p-6 space-y-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-[#111418] dark:text-white">
          Zoekproces
        </h3>
        
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div key={index} className="flex items-start gap-3">
              {/* Status Icon */}
              <div className="mt-0.5">
                {step.status === 'pending' && (
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600"></div>
                )}
                {step.status === 'loading' && (
                  <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
                )}
                {step.status === 'success' && (
                  <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}
                {step.status === 'error' && (
                  <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                    <span className="text-white text-xs">✕</span>
                  </div>
                )}
              </div>
              
              {/* Step Content */}
              <div className="flex-1">
                <p className={`text-sm font-medium ${
                  step.status === 'success' 
                    ? 'text-green-600 dark:text-green-400' 
                    : step.status === 'loading'
                    ? 'text-primary'
                    : 'text-[#617589] dark:text-gray-400'
                }`}>
                  {step.title}
                  {step.results !== undefined && (
                    <span className="ml-2 text-xs">
                      ({step.results} gevonden)
                    </span>
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Logs */}
      {logs.length > 0 && (
        <div
          ref={terminalRef}
          className="p-4 bg-gray-50 dark:bg-gray-900/50 max-h-64 overflow-y-auto space-y-1"
        >
          {logs.map((log, index) => {
            // Safety check for undefined/null logs
            if (!log || typeof log !== 'string') {
              return null
            }
            
            // Clean up log message (remove $ prefix and extra whitespace)
            const cleanLog = log.trim()
            if (!cleanLog) return null
            
            // Parse log for styling
            const isError = cleanLog.includes('❌') || cleanLog.includes('Error') || cleanLog.includes('Failed')
            const isSuccess = cleanLog.includes('✅') || cleanLog.includes('gevonden')
            const isStep = cleanLog.includes('Stap') || cleanLog.match(/^\d+\./)

            return (
              <p
                key={index}
                className={`text-xs ${
                  isError
                    ? 'text-red-600 dark:text-red-400'
                    : isSuccess
                    ? 'text-green-600 dark:text-green-400'
                    : isStep
                    ? 'text-primary font-medium'
                    : 'text-[#617589] dark:text-gray-400'
                }`}
              >
                {cleanLog}
              </p>
            )
          })}
          
          {isActive && (
            <p className="text-xs text-[#617589] dark:text-gray-400 flex items-center gap-2">
              <span className="animate-pulse">●</span>
              Bezig met zoeken...
            </p>
          )}
        </div>
      )}
    </div>
  )
}

