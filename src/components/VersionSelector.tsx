import { useVersion, VERSIONS } from '../context/VersionContext'
import { VersionId } from '../types'

export default function VersionSelector() {
  // This component is now just a wrapper that uses the context
  // The actual selector is rendered in VersionContext
  return null

  // Unreachable code - kept for reference
  const { currentVersion, setVersion, openVersionSelector } = useVersion()
  
  const handleSelect = (id: VersionId) => {
    setVersion(id)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#111418] w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
        
        {/* LEFT: RECOMMENDED */}
        <div className="md:w-1/2 p-8 bg-[#f0fdf4] dark:bg-[#1a2c1a] border-r border-green-100 dark:border-[#304030] flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
             <span className="material-symbols-outlined text-9xl text-green-600">construction</span>
          </div>
          
          <div className="relative z-10">
            <span className="inline-block px-3 py-1 bg-green-100 text-green-700 text-xs font-bold uppercase tracking-wider rounded-full mb-4">
              Aangeraden
            </span>
            <h2 className="text-3xl font-black text-[#111418] dark:text-white mb-2">
              {VERSIONS.SANDBOX.name}
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-8 text-lg leading-relaxed">
              {VERSIONS.SANDBOX.description}
            </p>
            <button 
              onClick={() => handleSelect(VERSIONS.SANDBOX.id)}
              className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 flex items-center justify-center gap-3"
            >
              <span className="material-symbols-outlined">build</span>
              Werk in Sleutelversie
            </button>
          </div>
        </div>

        {/* RIGHT: OTHER OPTIONS */}
        <div className="md:w-1/2 p-8 bg-white dark:bg-[#111418] flex flex-col overflow-y-auto">
          <h3 className="text-xl font-bold mb-6 text-[#111418] dark:text-white">Andere opties</h3>
          
          <div className="space-y-6">
            {/* Concrete */}
            <div 
              onClick={() => handleSelect(VERSIONS.CONCRETE.id)}
              className="group cursor-pointer p-4 rounded-xl border-2 border-gray-100 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all"
            >
              <div className="flex items-center gap-3 mb-1">
                <span className="material-symbols-outlined text-blue-500 group-hover:scale-110 transition-transform">verified</span>
                <h4 className="font-bold text-[#111418] dark:text-white">{VERSIONS.CONCRETE.name}</h4>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 ml-9">{VERSIONS.CONCRETE.description}</p>
            </div>

            {/* Sandbox 2 */}
            <div 
              onClick={() => handleSelect(VERSIONS.SANDBOX2.id)}
              className="group cursor-pointer p-4 rounded-xl border-2 border-gray-100 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-500 transition-all"
            >
              <div className="flex items-center gap-3 mb-1">
                <span className="material-symbols-outlined text-purple-500 group-hover:scale-110 transition-transform">science</span>
                <h4 className="font-bold text-[#111418] dark:text-white">{VERSIONS.SANDBOX2.name}</h4>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 ml-9">{VERSIONS.SANDBOX2.description}</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
