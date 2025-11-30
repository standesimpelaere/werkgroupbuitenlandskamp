import { useState } from 'react'
import SearchForm from '../components/verblijfzoeker/SearchForm'
import ResultsList from '../components/verblijfzoeker/ResultsList'
import CategoryFilter from '../components/verblijfzoeker/CategoryFilter'
import ResultsMap from '../components/verblijfzoeker/ResultsMap'
import SearchTerminal from '../components/verblijfzoeker/SearchTerminal'
import ExtraSearch from '../components/verblijfzoeker/ExtraSearch'
import type { Accommodation } from '../types/accommodation'
import { searchAccommodations } from '../lib/verblijfzoekerApi'

type FilterType = 'all' | 'hostel' | 'camping' | 'youth_movement'

export default function Verblijfzoeker() {
  const [results, setResults] = useState<Accommodation[]>([])
  const [groupedResults, setGroupedResults] = useState<{
    hostel: Accommodation[]
    camping: Accommodation[]
    youth_movement: Accommodation[]
  } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [searchCoordinates, setSearchCoordinates] = useState<{ lat: number; lon: number } | null>(null)
  const [searchLocationName, setSearchLocationName] = useState<string>('')
  const [searchLogs, setSearchLogs] = useState<string[]>([])
  const [searchResetTrigger, setSearchResetTrigger] = useState(0)
  const [geminiQueries, setGeminiQueries] = useState<Array<{query: string, response: string, timestamp: Date}>>([])
  const [isGeminiActive, setIsGeminiActive] = useState(false)
  const [searchRadius, setSearchRadius] = useState(25)

  const handleSearch = async (location: string, radius: number) => {
    setSearchRadius(radius)
    // Reset all state immediately when starting a new search
    setResults([])
    setGroupedResults(null)
    setError(null)
    setSearchLogs([])
    setSearchCoordinates(null)
    setSearchLocationName('')
    setActiveFilter('all')
    setSearchResetTrigger(prev => prev + 1) // Trigger form reset
    setGeminiQueries([])
    setIsGeminiActive(true)
    setIsLoading(true)
    setHasSearched(true)
    
    try {
      const data = await searchAccommodations(
        location, 
        radius, 
        (query, response) => {
          setGeminiQueries(prev => [...prev, { query, response, timestamp: new Date() }])
        },
        (progressResults, progressLogs) => {
          // Update results and logs progressively
          setResults(progressResults)
          setSearchLogs(progressLogs)
          
          // Update grouped results
          const grouped = {
            hostel: progressResults.filter(r => r.type === 'hostel'),
            camping: progressResults.filter(r => r.type === 'camping'),
            youth_movement: progressResults.filter(r => r.type === 'youth_movement'),
          }
          setGroupedResults(grouped)
        }
      )
      setResults(data.results || [])
      setGroupedResults(data.grouped || null)
      setActiveFilter('all') // Reset filter on new search
      setSearchCoordinates(data.searchCoordinates || null)
      setSearchLocationName(location)
      setSearchLogs(data.logs || [])
      setIsGeminiActive(false)
      
      if (data.results && data.results.length === 0) {
        setError('Geen accommodaties gevonden. Probeer een andere locatie of vergroot de zoekstraal.')
      }
    } catch (error) {
      console.error('Search error:', error)
      setError(error instanceof Error ? error.message : 'Er is een fout opgetreden bij het zoeken')
      setResults([])
      setGroupedResults(null)
      setSearchLogs([])
      setIsGeminiActive(false)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-[#111418]">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 md:space-y-8">
        {/* Page Header */}
        <div className="space-y-2">
          <p className="uppercase text-xs font-semibold tracking-[0.25em] text-primary">
            Accommodatie Zoeker
          </p>
          <h1 className="text-[#111418] dark:text-white text-4xl font-black leading-tight tracking-[-0.033em]">
            Verblijfzoeker
          </h1>
          <p className="text-[#617589] dark:text-gray-400 text-sm max-w-2xl">
            Zoek naar jeugdherbergen, campings en andere jeugdbewegingen binnen een bepaalde straal van je locatie. 
            Vind alle informatie die je nodig hebt: websites, telefoonnummers, adressen en meer.
          </p>
        </div>

        {/* Search Form */}
        <div className="rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-background-dark p-6">
          <SearchForm onSearch={handleSearch} resetTrigger={searchResetTrigger} />
        </div>

        {/* Results */}
        {hasSearched && (
          <div className="space-y-6">
            {/* Search Terminal */}
            <SearchTerminal logs={searchLogs} isActive={isLoading} />
            
            {/* Map */}
            {results.length > 0 && (
              <ResultsMap
                accommodations={results}
                searchCoordinates={searchCoordinates || undefined}
                searchLocation={searchLocationName}
              />
            )}
            
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <h2 className="text-xl font-bold text-[#111418] dark:text-white">
                  Resultaten {results.length > 0 && `(${results.length})`}
                </h2>
                {groupedResults && results.length > 0 && (
                  <CategoryFilter
                    grouped={groupedResults}
                    activeFilter={activeFilter}
                    onFilterChange={setActiveFilter}
                  />
                )}
              </div>
            {error ? (
              <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            ) : (
              <>
                {isLoading && results.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-[#617589] dark:text-gray-400">Zoeken...</p>
                  </div>
                )}
                {results.length > 0 && (
                  <ResultsList
                    accommodations={results}
                    grouped={groupedResults || undefined}
                    activeFilter={activeFilter}
                    geminiQueries={geminiQueries}
                    isGeminiActive={isGeminiActive}
                  />
                )}
              </>
            )}
            </div>

            {/* Extra Search Section */}
            {!isLoading && results.length > 0 && searchCoordinates && (
              <ExtraSearch
                accommodations={results}
                searchLocation={searchLocationName}
                searchCoordinates={searchCoordinates}
                radius={searchRadius}
                activeFilter={activeFilter}
                onNewResults={(newResults) => {
                  setResults(prev => [...prev, ...newResults])
                  if (groupedResults) {
                    const newGrouped = { ...groupedResults }
                    newResults.forEach(result => {
                      if (result.type === 'hostel') {
                        newGrouped.hostel.push(result)
                      } else if (result.type === 'camping') {
                        newGrouped.camping.push(result)
                      } else if (result.type === 'youth_movement') {
                        newGrouped.youth_movement.push(result)
                      }
                    })
                    setGroupedResults(newGrouped)
                  }
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

