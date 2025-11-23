import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { setCurrentUserName, getCurrentUserName } from '../lib/changeLogger'

const TEAM_MEMBERS = ['Louis', 'Michiel', 'Tim', 'Douwe', 'Victor', 'Stan']

export default function NameSelector() {
  const [selectedName, setSelectedName] = useState<string>('')
  const [showSelector, setShowSelector] = useState(false)

  useEffect(() => {
    const currentName = getCurrentUserName()
    if (currentName && currentName !== 'Unknown') {
      setSelectedName(currentName)
      setShowSelector(false)
      updateUserSession(currentName)
    } else {
      setShowSelector(true)
    }
  }, [])

  const updateUserSession = async (userName: string) => {
    try {
      // Upsert user session
      await supabase.from('user_sessions').upsert({
        user_name: userName,
        last_active: new Date().toISOString(),
      }, {
        onConflict: 'user_name',
      })
    } catch (error) {
      console.error('Error updating user session:', error)
    }
  }

  const handleSelectName = async (name: string) => {
    setCurrentUserName(name)
    setSelectedName(name)
    setShowSelector(false)
    await updateUserSession(name)
  }

  if (!showSelector && selectedName) {
    return (
      <div className="text-xs text-[#617589] dark:text-gray-400">
        Ingelogd als: <span className="font-medium text-[#111418] dark:text-white">{selectedName}</span>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#111418] rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-[#111418] dark:text-white mb-4">
          Selecteer je naam
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {TEAM_MEMBERS.map((name) => (
            <button
              key={name}
              onClick={() => handleSelectName(name)}
              className="px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-[#111418] dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-primary transition-colors"
            >
              {name}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

