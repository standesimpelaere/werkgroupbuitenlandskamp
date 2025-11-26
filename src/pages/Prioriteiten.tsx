import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

interface PriorityItem {
  id: string
  title: string
  description?: string
  theme: string
  status: 'Te doen' | 'Mee bezig' | 'Klaar'
  assignee_id?: string | null
  notes?: string
  is_current_wave: boolean
  created_at?: string
  updated_at?: string
}

const TEAM_MEMBERS = [
  { id: 'louis', name: 'Louis' },
  { id: 'michiel', name: 'Michiel' },
  { id: 'tim', name: 'Tim' },
  { id: 'douwe', name: 'Douwe' },
  { id: 'victor', name: 'Victor' },
  { id: 'stan', name: 'Stan' },
]

export default function Prioriteiten() {
  const [items, setItems] = useState<PriorityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'todo' | 'overview'>('todo')

  useEffect(() => {
    loadPriorityItems(true)
    
    // Refresh every 5 seconds to sync with database changes
    const interval = setInterval(() => {
      loadPriorityItems(false)
    }, 5000)
    
    return () => clearInterval(interval)
  }, [])

  const loadPriorityItems = async (showLoading: boolean = true) => {
    try {
      if (showLoading) {
        setLoading(true)
      }
      
      // Get items that are in current wave
      const { data: currentWaveData, error: currentWaveError } = await supabase
        .from('werkgroep_roadmap_items')
        .select('*')
        .eq('is_current_wave', true)
        .order('order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })

      if (currentWaveError) throw currentWaveError

      // Also get specific items that should always be included, even if not in current wave
      const { data: specificItemsData, error: specificError } = await supabase
        .from('werkgroep_roadmap_items')
        .select('*')
        .or('title.ilike.%acceptable prijs per gastje bedenken%,title.ilike.%prijs per gastje bedenken%,title.ilike.%acceptabele prijs per gastje%,title.ilike.%busmaatschappij informeren mogelijkheden en offertes%,title.ilike.%busmaatschappij informeren mogelijkheden%,title.ilike.%informeren mogelijkheden en offertes%')
        .eq('is_archived', false)

      if (specificError) console.error('Error loading specific items:', specificError)

      // Combine both datasets, removing duplicates
      const allData = [...(currentWaveData || [])]
      if (specificItemsData) {
        specificItemsData.forEach(item => {
          if (!allData.find(existing => existing.id === item.id)) {
            allData.push(item)
          }
        })
      }

      if (allData.length > 0) {
        // Filter out excluded items (but keep busmaatschappij and administratie items)
        const excludedTitles = [
          'menu samenstellen',
          'gedetailleerde activiteitendagboek',
          'medische fiches verzamelen',
          'medischefiches verzamelen'
        ]
        
        const priorityItems: PriorityItem[] = allData
          .filter(item => {
            const titleLower = item.title.toLowerCase()
            const themeLower = item.theme.toLowerCase()
            
            // Always include items with "prijs per gastje" or "acceptabele vraagprijs" (regardless of theme)
            if (titleLower.includes('prijs per gastje') ||
                titleLower.includes('acceptabele vraagprijs') ||
                titleLower.includes('acceptable prijs') ||
                titleLower.includes('vraagprijs per gastje') ||
                titleLower.includes('bedenken wat een acceptabele')) {
              return true
            }
            
            // Always include busmaatschappij/vervoer items
            if (titleLower.includes('busmaatschappij') || 
                titleLower.includes('bus') || 
                titleLower.includes('offertes') ||
                titleLower.includes('vervoer') ||
                titleLower.includes('mogelijkheden') ||
                themeLower === 'vervoer') {
              return true
            }
            
            // Always include administratie items
            if (themeLower === 'administratie') {
              return true
            }
            
            // Always include financiën items
            if (themeLower === 'financiën' || themeLower === 'financien') {
              return true
            }
            
            // Exclude other items in the excluded list
            return !excludedTitles.some(excluded => titleLower.includes(excluded.toLowerCase()))
          })
          .map(item => ({
            id: item.id,
            title: item.title,
            description: item.description || undefined,
            theme: item.theme,
            status: item.status as PriorityItem['status'],
            assignee_id: item.assignee_id || null,
            notes: item.notes || undefined,
            is_current_wave: item.is_current_wave || false,
            created_at: item.created_at,
            updated_at: item.updated_at,
          }))
        setItems(priorityItems)
      } else {
        setItems([])
      }
    } catch (error) {
      console.error('Error loading priority items:', error)
    } finally {
      if (showLoading) {
        setLoading(false)
      }
    }
  }


  // Group items by title pattern - items related to "Informeren per gebied"
  const groupRelatedItems = (items: PriorityItem[]) => {
    const grouped: { main: PriorityItem | null; related: PriorityItem[] }[] = []
    const processed = new Set<string>()
    
    // First, find all camping-related items (Neurenberg, Bratislava, Frymburk)
    const campingItems = items.filter(item => 
      !processed.has(item.id) &&
      (item.title.toLowerCase().includes('neurenberg') ||
       item.title.toLowerCase().includes('bratislava') ||
       item.title.toLowerCase().includes('frymburk') ||
       item.title.toLowerCase().includes('tussenstop') ||
       item.title.toLowerCase().includes('duitsland') ||
       (item.theme === 'Campings' && item.title.toLowerCase().includes('verblijfplaats')))
    )
    
    // Create a main item for "Informeren per gebied" if camping items exist
    if (campingItems.length > 0) {
      // Find or create main item
      let mainItem = items.find(item => 
        item.title.toLowerCase().includes('informeren per gebied') && 
        (item.title.toLowerCase().includes('tastbare opties') || item.title.toLowerCase().includes('beschikbaarheid'))
      )
      
      // If no main item exists, create a virtual one from the first camping item
      if (!mainItem && campingItems.length > 0) {
        mainItem = {
          ...campingItems[0],
          title: 'Informeren per gebied alle tastbare opties: beschikbaarheid → prijs → keuze maken',
          description: 'Per gebied (Neurenberg, Bratislava, Frymburk) alle opties onderzoeken, beschikbaarheid checken, prijzen vergelijken en keuze maken'
        }
      }
      
      if (mainItem) {
        campingItems.forEach(item => processed.add(item.id))
        if (!processed.has(mainItem.id)) {
          processed.add(mainItem.id)
        }
        grouped.push({ main: mainItem, related: campingItems })
      }
    }
    
    // Add remaining items
    items.forEach(item => {
      if (processed.has(item.id)) return
      processed.add(item.id)
      grouped.push({ main: item, related: [] })
    })
    
    return grouped
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50 dark:bg-[#111418]">
        <div className="max-w-7xl mx-auto p-6">
          <p className="text-[#617589]">Data laden...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-[#111418]">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 md:space-y-8 pt-16 md:pt-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-black text-[#111418] dark:text-white tracking-tight">
            Huidige Priority's uit Vergadering
          </h1>
          <p className="text-[#617589] dark:text-gray-400">
            Overzicht van actiepunten uit de vergadering die momenteel prioriteit hebben
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('todo')}
            className={`px-4 py-2 font-semibold text-sm transition-colors border-b-2 ${
              activeTab === 'todo'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            To-do list
          </button>
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 font-semibold text-sm transition-colors border-b-2 ${
              activeTab === 'overview'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Kamp Overzicht
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'todo' && (
          <div className="space-y-4">
          {items.length === 0 ? (
            <p className="text-center text-gray-400 py-8">Geen priority items gevonden.</p>
          ) : (
            (() => {
              // Group items by theme
              const groupedByTheme = items.reduce((acc, item) => {
                if (!acc[item.theme]) {
                  acc[item.theme] = []
                }
                acc[item.theme].push(item)
                return acc
              }, {} as Record<string, PriorityItem[]>)

              // Group related items within each theme
              return Object.entries(groupedByTheme).map(([themeName, themeItems]) => {
                const grouped = groupRelatedItems(themeItems)
                
                return (
                  <div key={themeName} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="text-base font-bold text-[#111418] dark:text-white">{themeName}</h3>
                    </div>
                    <div className="p-4 space-y-3">
                      {grouped.map((group) => {
                        if (!group.main) return null
                        const hasRelated = group.related.length > 0
                        
                        return (
                          <div key={group.main.id} className="border-b border-gray-200 dark:border-gray-700 last:border-0 pb-3 last:pb-0">
                            <div className="mb-2">
                              <h4 className="text-sm font-semibold text-[#111418] dark:text-white mb-1">{group.main.title}</h4>
                              
                              {/* Description */}
                              {group.main.description && (
                                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{group.main.description}</p>
                              )}
                              
                              {/* Related items (gebieden) */}
                              {hasRelated && (
                                <div className="mb-2 flex flex-wrap gap-1.5">
                                  {group.related.map((relatedItem) => (
                                    <Link
                                      key={relatedItem.id}
                                      to={`/werkgroep?tab=roadmap&itemId=${relatedItem.id}`}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] bg-primary/10 text-primary hover:bg-primary/20 rounded border border-primary/20 transition-colors"
                                    >
                                      <span className="material-symbols-outlined text-[12px]">link</span>
                                      {relatedItem.title.replace('Informeren verblijfplaats ', '')}
                                    </Link>
                                  ))}
                                </div>
                              )}
                            </div>
                            
                            {/* Notities */}
                            {group.main.notes && (
                              <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded text-xs">
                                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{group.main.notes}</p>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })
            })()
          )}
          </div>
        )}

        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Kamp Timeline Overzicht */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-[#111418] dark:text-white">📅 Kamp Planning Overzicht</h2>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Neurenberg */}
                <div className="border-l-4 border-orange-500 rounded-lg overflow-hidden bg-orange-50/30 dark:bg-orange-900/10">
                  <div className="p-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <span className="text-2xl">🏛️</span>
                      Neurenberg (Duitsland)
                    </h3>
                  </div>
                  
                  <div className="p-4 space-y-3">
                    <div className="flex gap-4 items-start">
                      <div className="flex-shrink-0 w-20 text-center">
                        <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">Day 1</div>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-[#111418] dark:text-white mb-1 flex items-center gap-2">
                          <span className="text-lg">🚌</span>
                          Torhout → Neurenberg
                        </h4>
                        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
                          <li>06:00 - Vertrek Torhout</li>
                          <li>12:00 - Middagmaal onderweg</li>
                          <li>14:00 - Aankomst Neurenberg</li>
                          <li>15:00 - Installeren camping</li>
                          <li>19:00 - Avondactiviteit</li>
                        </ul>
                      </div>
                    </div>
                    
                    <div className="flex gap-4 items-start pt-2 border-t border-orange-200 dark:border-orange-800">
                      <div className="flex-shrink-0 w-20 text-center">
                        <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">Day 2</div>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-[#111418] dark:text-white mb-1 flex items-center gap-2">
                          <span className="text-lg">🏛️</span>
                          Neurenberg Verkennen
                        </h4>
                        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
                          <li>Dag doorbrengen in Neurenberg</li>
                          <li>Avond: Vertrek richting Bratislava (nachtrit)</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bratislava */}
                <div className="border-l-4 border-blue-500 rounded-lg overflow-hidden bg-blue-50/30 dark:bg-blue-900/10">
                  <div className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <span className="text-2xl">🏰</span>
                      Bratislava (Slowakije)
                    </h3>
                  </div>
                  
                  <div className="p-4 space-y-3">
                    <div className="flex gap-4 items-start">
                      <div className="flex-shrink-0 w-20 text-center">
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">Day 3</div>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-[#111418] dark:text-white mb-1 flex items-center gap-2">
                          <span className="text-lg">🚌</span>
                          Neurenberg → Bratislava (Nachtrit)
                        </h4>
                        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
                          <li>Ochtend: Aankomst na nachtrit</li>
                          <li>Bratislava stad bezoeken</li>
                          <li>Installeren op camping</li>
                        </ul>
                      </div>
                    </div>
                    
                    <div className="flex gap-4 items-start pt-2 border-t border-blue-200 dark:border-blue-800">
                      <div className="flex-shrink-0 w-20 text-center">
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">Day 4</div>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-[#111418] dark:text-white mb-1 flex items-center gap-2">
                          <span className="text-lg">🥾</span>
                          Dagtocht 1
                        </h4>
                        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
                          <li>Activiteiten rond Bratislava</li>
                        </ul>
                      </div>
                    </div>
                    
                    <div className="flex gap-4 items-start pt-2 border-t border-blue-200 dark:border-blue-800">
                      <div className="flex-shrink-0 w-20 text-center">
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">Day 5</div>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-[#111418] dark:text-white mb-1 flex items-center gap-2">
                          <span className="text-lg">🥾</span>
                          Dagtocht 2
                        </h4>
                        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
                          <li>Activiteiten rond Bratislava</li>
                        </ul>
                      </div>
                    </div>
                    
                    <div className="flex gap-4 items-start pt-2 border-t border-blue-200 dark:border-blue-800">
                      <div className="flex-shrink-0 w-20 text-center">
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">Day 6</div>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-[#111418] dark:text-white mb-1 flex items-center gap-2">
                          <span className="text-lg">🥾</span>
                          Dagtocht 3
                        </h4>
                        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
                          <li>Activiteiten rond Bratislava</li>
                        </ul>
                      </div>
                    </div>
                    
                    <div className="flex gap-4 items-start pt-2 border-t border-blue-200 dark:border-blue-800">
                      <div className="flex-shrink-0 w-20 text-center">
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">Day 7</div>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-[#111418] dark:text-white mb-1 flex items-center gap-2">
                          <span className="text-lg">🎭</span>
                          Dagtrip naar Wenen
                        </h4>
                        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
                          <li>Vroeg vertrek vanuit Bratislava</li>
                          <li>Hele dag in Wenen</li>
                          <li>Laat terug naar camping Bratislava</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Frymburk */}
                <div className="border-l-4 border-green-500 rounded-lg overflow-hidden bg-green-50/30 dark:bg-green-900/10">
                  <div className="p-4 bg-gradient-to-r from-green-500 to-green-600 text-white">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <span className="text-2xl">🌊</span>
                      Frymburk (Tsjechië)
                    </h3>
                  </div>
                  
                  <div className="p-4 space-y-3">
                    <div className="flex gap-4 items-start">
                      <div className="flex-shrink-0 w-20 text-center">
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">Day 8</div>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-[#111418] dark:text-white mb-1 flex items-center gap-2">
                          <span className="text-lg">🚌</span>
                          Bratislava → Frymburk
                        </h4>
                        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
                          <li>09:30-10:00 - Vertrek</li>
                          <li>Middag: Aankomst Frymburk</li>
                          <li>Chillen aan het meer</li>
                        </ul>
                      </div>
                    </div>
                    
                    <div className="flex gap-4 items-start pt-2 border-t border-green-200 dark:border-green-800">
                      <div className="flex-shrink-0 w-20 text-center">
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">Day 9</div>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-[#111418] dark:text-white mb-1 flex items-center gap-2">
                          <span className="text-lg">🛶</span>
                          Speciale Activiteit
                        </h4>
                        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
                          <li>Kayakken</li>
                          <li>Mountainbiken</li>
                          <li>Pedalo</li>
                          <li>Watersporten</li>
                        </ul>
                      </div>
                    </div>
                    
                    <div className="flex gap-4 items-start pt-2 border-t border-green-200 dark:border-green-800">
                      <div className="flex-shrink-0 w-20 text-center">
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">Day 10</div>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-[#111418] dark:text-white mb-1 flex items-center gap-2">
                          <span className="text-lg">🚌</span>
                          Frymburk → Torhout (Nachtrit)
                        </h4>
                        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
                          <li>Laatste activiteiten</li>
                          <li>Avond: Vertrek richting België</li>
                          <li>⚠️ 2 chauffeurs nodig</li>
                        </ul>
                      </div>
                    </div>
                    
                    <div className="flex gap-4 items-start pt-2 border-t border-green-200 dark:border-green-800">
                      <div className="flex-shrink-0 w-20 text-center">
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">Day 11</div>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-[#111418] dark:text-white mb-1 flex items-center gap-2">
                          <span className="text-lg">🏠</span>
                          Aankomst Torhout
                        </h4>
                        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
                          <li>Ochtend: Aankomst thuis</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

