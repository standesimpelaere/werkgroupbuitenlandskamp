import { createContext, useContext, useState, ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { VersionId, KostenItem, PlanningDag, Parameters, ScheduleItem } from '../types'

// --- TYPES ---

interface VersionContextType {
  currentVersion: VersionId
  setVersion: (version: VersionId) => void
  openVersionSelector: () => void
  // Data operations - read only, use Supabase directly for writes
  getKostenItems: () => Promise<KostenItem[]>
  getPlanningData: () => Promise<PlanningDag[]>
  getParameters: () => Promise<Parameters | null>
  getScheduleData: () => Promise<ScheduleItem[]>
  // Actions
  pushSandboxToConcrete: () => Promise<void>
  pushSandbox2ToSandbox: () => Promise<void>
}

const VersionContext = createContext<VersionContextType | undefined>(undefined)

// --- CONSTANTS ---

export const VERSIONS = {
  CONCRETE: { id: 'concrete' as VersionId, name: 'Gedeelde Concrete Versie', description: 'De officiële, definitieve planning.' },
  SANDBOX: { id: 'sandbox' as VersionId, name: 'Gedeelde Sleutel Versie', description: 'Werk in deze versie tenzij je echt dingen gaat doen die puur experimenteel zijn.' },
  SANDBOX2: { id: 'sandbox2' as VersionId, name: 'Gedeelde Sleutel Versie 2', description: 'Tweede experimentele versie voor alternatieve scenario\'s.' },
}

// --- HELPER FUNCTIONS ---

function getTableName(table: 'kosten' | 'planning' | 'parameters' | 'planning_schedule', version: VersionId): string {
  return `${table}_${version}`
}

// --- PROVIDER ---

export function VersionProvider({ children }: { children: ReactNode }) {
  const [currentVersion, setCurrentVersionState] = useState<VersionId>(() => {
    return (localStorage.getItem('app_active_version') as VersionId) || 'sandbox'
  })
  const [showVersionSelector, setShowVersionSelector] = useState(!localStorage.getItem('app_active_version'))

  const setVersion = (version: VersionId) => {
    localStorage.setItem('app_active_version', version)
    setCurrentVersionState(version)
    setShowVersionSelector(false)
    // No reload needed - React will re-render with new data
  }

  const openVersionSelector = () => {
    setShowVersionSelector(true)
  }

  // Kosten Items
  const getKostenItems = async (): Promise<KostenItem[]> => {
    const tableName = getTableName('kosten', currentVersion)
    const { data, error } = await supabase.from(tableName).select('*').order('created_at')
    if (error) {
      console.error('Error fetching kosten items:', error)
      return []
    }
    return data || []
  }

  // Planning Data
  const getPlanningData = async (): Promise<PlanningDag[]> => {
    const tableName = getTableName('planning', currentVersion)
    const { data, error } = await supabase.from(tableName).select('*').order('dag')
    if (error) {
      console.error('Error fetching planning data:', error)
      return []
    }
    return data || []
  }

  // Parameters
  const getParameters = async (): Promise<Parameters | null> => {
    const tableName = getTableName('parameters', currentVersion)
    const { data, error } = await supabase.from(tableName).select('*').limit(1).single()
    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found - return null
        return null
      }
      console.error('Error fetching parameters:', error)
      return null
    }
    return data
  }

  // Schedule Data
  const getScheduleData = async (): Promise<ScheduleItem[]> => {
    const tableName = getTableName('planning_schedule', currentVersion)
    const { data, error } = await supabase.from(tableName).select('*').order('date, time')
    if (error) {
      console.error('Error fetching schedule data:', error)
      return []
    }
    return data || []
  }

  // Helper to get data from specific version
  const getKostenItemsFromVersion = async (version: VersionId): Promise<KostenItem[]> => {
    const tableName = getTableName('kosten', version)
    const { data, error } = await supabase.from(tableName).select('*').order('created_at')
    if (error) {
      console.error('Error fetching kosten items:', error)
      return []
    }
    return data || []
  }

  const getPlanningDataFromVersion = async (version: VersionId): Promise<PlanningDag[]> => {
    const tableName = getTableName('planning', version)
    const { data, error } = await supabase.from(tableName).select('*').order('dag')
    if (error) {
      console.error('Error fetching planning data:', error)
      return []
    }
    return data || []
  }

  const getParametersFromVersion = async (version: VersionId): Promise<Parameters | null> => {
    const tableName = getTableName('parameters', version)
    const { data, error } = await supabase.from(tableName).select('*').limit(1).single()
    if (error) {
      if (error.code === 'PGRST116') return null
      console.error('Error fetching parameters:', error)
      return null
    }
    return data
  }

  const getScheduleDataFromVersion = async (version: VersionId): Promise<ScheduleItem[]> => {
    const tableName = getTableName('planning_schedule', version)
    const { data, error } = await supabase.from(tableName).select('*').order('date, time')
    if (error) {
      console.error('Error fetching schedule data:', error)
      return []
    }
    return data || []
  }

  // Push Logic
  const pushSandboxToConcrete = async (): Promise<void> => {
    // Copy all data from sandbox to concrete
    const [kostenItems, planningData, parameters, scheduleData] = await Promise.all([
      getKostenItemsFromVersion('sandbox'),
      getPlanningDataFromVersion('sandbox'),
      getParametersFromVersion('sandbox'),
      getScheduleDataFromVersion('sandbox'),
    ])

    // Save to concrete tables
    const concreteKostenTable = getTableName('kosten', 'concrete')
    const concretePlanningTable = getTableName('planning', 'concrete')
    const concreteParametersTable = getTableName('parameters', 'concrete')
    const concreteScheduleTable = getTableName('planning_schedule', 'concrete')

    // Clear concrete tables
    await Promise.all([
      supabase.from(concreteKostenTable).delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from(concretePlanningTable).delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from(concreteScheduleTable).delete().neq('id', '00000000-0000-0000-0000-000000000000'),
    ])

    // Insert data
    if (kostenItems.length > 0) {
      await supabase.from(concreteKostenTable).insert(kostenItems)
    }
    if (planningData.length > 0) {
      await supabase.from(concretePlanningTable).insert(planningData)
    }
    if (parameters) {
      const existing = await supabase.from(concreteParametersTable).select('*').limit(1).single()
      if (existing.data) {
        await supabase.from(concreteParametersTable).update(parameters).eq('id', existing.data.id)
      } else {
        await supabase.from(concreteParametersTable).insert(parameters)
      }
    }
    if (scheduleData.length > 0) {
      await supabase.from(concreteScheduleTable).insert(scheduleData.map(item => ({
        date: item.date,
        day: item.day,
        time: item.time,
        activity: item.activity,
      })))
    }
  }

  const pushSandbox2ToSandbox = async (): Promise<void> => {
    // Similar logic to pushSandboxToConcrete but from sandbox2 to sandbox
    const [kostenItems, planningData, parameters, scheduleData] = await Promise.all([
      getKostenItemsFromVersion('sandbox2'),
      getPlanningDataFromVersion('sandbox2'),
      getParametersFromVersion('sandbox2'),
      getScheduleDataFromVersion('sandbox2'),
    ])

    const sandboxKostenTable = getTableName('kosten', 'sandbox')
    const sandboxPlanningTable = getTableName('planning', 'sandbox')
    const sandboxParametersTable = getTableName('parameters', 'sandbox')
    const sandboxScheduleTable = getTableName('planning_schedule', 'sandbox')

    await Promise.all([
      supabase.from(sandboxKostenTable).delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from(sandboxPlanningTable).delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from(sandboxScheduleTable).delete().neq('id', '00000000-0000-0000-0000-000000000000'),
    ])

    if (kostenItems.length > 0) {
      await supabase.from(sandboxKostenTable).insert(kostenItems)
    }
    if (planningData.length > 0) {
      await supabase.from(sandboxPlanningTable).insert(planningData)
    }
    if (parameters) {
      const existing = await supabase.from(sandboxParametersTable).select('*').limit(1).single()
      if (existing.data) {
        await supabase.from(sandboxParametersTable).update(parameters).eq('id', existing.data.id)
      } else {
        await supabase.from(sandboxParametersTable).insert(parameters)
      }
    }
    if (scheduleData.length > 0) {
      await supabase.from(sandboxScheduleTable).insert(scheduleData.map(item => ({
        date: item.date,
        day: item.day,
        time: item.time,
        activity: item.activity,
      })))
    }
  }

  return (
    <VersionContext.Provider value={{
      currentVersion,
      setVersion,
      openVersionSelector,
      getKostenItems,
      getPlanningData,
      getParameters,
      getScheduleData,
      pushSandboxToConcrete,
      pushSandbox2ToSandbox,
    }}>
      {children}
      <VersionSelectorInternal 
        isOpen={showVersionSelector}
        onClose={() => setShowVersionSelector(false)}
        onSelect={setVersion}
        currentVersion={currentVersion}
      />
    </VersionContext.Provider>
  )
}

// Internal component for version selector
function VersionSelectorInternal({ 
  isOpen, 
  onClose, 
  onSelect,
  currentVersion 
}: { 
  isOpen: boolean
  onClose: () => void
  onSelect: (version: VersionId) => void
  currentVersion: VersionId
}) {
  if (!isOpen) return null

  const handleSelect = (id: VersionId) => {
    onSelect(id)
    onClose()
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
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-[#111418] dark:text-white">Andere opties</h3>
            <button
              onClick={onClose}
              className="text-[#617589] dark:text-gray-400 hover:text-[#111418] dark:hover:text-white"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          
          <div className="space-y-6">
            {/* Concrete */}
            <div 
              onClick={() => handleSelect(VERSIONS.CONCRETE.id)}
              className={`group cursor-pointer p-4 rounded-xl border-2 transition-all ${
                currentVersion === VERSIONS.CONCRETE.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-100 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500'
              }`}
            >
              <div className="flex items-center gap-3 mb-1">
                <span className="material-symbols-outlined text-blue-500 group-hover:scale-110 transition-transform">verified</span>
                <h4 className="font-bold text-[#111418] dark:text-white">{VERSIONS.CONCRETE.name}</h4>
                {currentVersion === VERSIONS.CONCRETE.id && (
                  <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">Huidig</span>
                )}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 ml-9">{VERSIONS.CONCRETE.description}</p>
            </div>

            {/* Sandbox 2 */}
            <div 
              onClick={() => handleSelect(VERSIONS.SANDBOX2.id)}
              className={`group cursor-pointer p-4 rounded-xl border-2 transition-all ${
                currentVersion === VERSIONS.SANDBOX2.id
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                  : 'border-gray-100 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-500'
              }`}
            >
              <div className="flex items-center gap-3 mb-1">
                <span className="material-symbols-outlined text-purple-500 group-hover:scale-110 transition-transform">science</span>
                <h4 className="font-bold text-[#111418] dark:text-white">{VERSIONS.SANDBOX2.name}</h4>
                {currentVersion === VERSIONS.SANDBOX2.id && (
                  <span className="text-xs bg-purple-500 text-white px-2 py-0.5 rounded-full">Huidig</span>
                )}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 ml-9">{VERSIONS.SANDBOX2.description}</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

export function useVersion() {
  const context = useContext(VersionContext)
  if (context === undefined) {
    throw new Error('useVersion must be used within a VersionProvider')
  }
  return context
}
