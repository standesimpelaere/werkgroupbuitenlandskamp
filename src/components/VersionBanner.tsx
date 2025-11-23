import { useVersion, VERSIONS } from '../context/VersionContext'
import { useState } from 'react'
import VersionSelector from './VersionSelector'

export default function VersionBanner() {
  const { currentVersion, pushSandboxToConcrete, setVersion } = useVersion()
  const [showSelector, setShowSelector] = useState(false)

  const getVersionName = () => {
    if (currentVersion === 'concrete') return VERSIONS.CONCRETE.name
    if (currentVersion === 'sandbox') return VERSIONS.SANDBOX.name
    const member = VERSIONS.MEMBERS.find(m => m.id === currentVersion)
    return member ? `Persoonlijke versie: ${member.name}` : currentVersion
  }

  const getBannerStyle = () => {
    if (currentVersion === 'concrete') return 'bg-blue-600 text-white'
    if (currentVersion === 'sandbox') return 'bg-green-600 text-white'
    return 'bg-gray-800 text-white'
  }

  return (
    <>
      <div className={`px-4 py-2 flex flex-col sm:flex-row justify-between items-center gap-3 shadow-md z-50 relative ${getBannerStyle()}`}>
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-xl">
            {currentVersion === 'concrete' ? 'verified' : currentVersion === 'sandbox' ? 'construction' : 'person'}
          </span>
          <span className="font-bold text-sm sm:text-base">
            {getVersionName()}
          </span>
          <button 
            onClick={() => { localStorage.removeItem('app_active_version'); window.location.reload() }}
            className="text-xs opacity-80 hover:opacity-100 underline ml-2"
          >
            (Wijzig)
          </button>
        </div>

        {currentVersion === 'sandbox' && (
          <button 
            onClick={pushSandboxToConcrete}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border border-white/20"
          >
            <span className="material-symbols-outlined text-sm">publish</span>
            Push naar Concrete Versie
          </button>
        )}
      </div>
      {/* Force render selector if needed manually */}
    </>
  )
}
