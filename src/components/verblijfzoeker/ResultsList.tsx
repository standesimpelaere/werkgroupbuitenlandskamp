import type { Accommodation } from '../../types/accommodation'
import AccommodationCard from './AccommodationCard'
import GeminiConsole from './GeminiConsole'

interface ResultsListProps {
  accommodations: Accommodation[]
  grouped?: {
    hostel: Accommodation[]
    camping: Accommodation[]
    youth_movement: Accommodation[]
  }
  activeFilter?: 'all' | 'hostel' | 'camping' | 'youth_movement'
  geminiQueries?: Array<{
    query: string
    response: string
    timestamp: Date
  }>
  isGeminiActive?: boolean
}

export default function ResultsList({ accommodations, grouped, activeFilter = 'all', geminiQueries = [], isGeminiActive = false }: ResultsListProps) {
  // Filter accommodations based on active filter
  const getFilteredAccommodations = () => {
    if (activeFilter === 'all') {
      return accommodations
    }
    return accommodations.filter(acc => acc.type === activeFilter)
  }

  const filteredAccommodations = getFilteredAccommodations()

  if (filteredAccommodations.length === 0 && accommodations.length > 0) {
    return (
      <div className="rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-background-dark p-12">
        <p className="text-center text-[#617589] dark:text-gray-400">
          Geen accommodaties gevonden in deze categorie.
        </p>
      </div>
    )
  }

  if (accommodations.length === 0) {
    return (
      <div className="rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-background-dark p-12">
        <p className="text-center text-[#617589] dark:text-gray-400">
          Geen accommodaties gevonden. Probeer een andere locatie of vergroot de zoekstraal.
        </p>
      </div>
    )
  }

  // If grouped data is available and filter is 'all', display by category
  if (grouped && activeFilter === 'all') {
    const sections = [
      {
        title: 'Jeugdherbergen',
        type: 'hostel' as const,
        items: grouped.hostel,
        icon: 'hotel',
      },
      {
        title: 'Campings',
        type: 'camping' as const,
        items: grouped.camping,
        icon: 'camping',
      },
      {
        title: 'Jeugdbewegingen',
        type: 'youth_movement' as const,
        items: grouped.youth_movement,
        icon: 'groups',
      },
    ].filter(section => section.items.length > 0)

    return (
      <div className="space-y-8">
        {sections.map((section) => (
          <div key={section.type} className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-xl text-primary">
                {section.icon}
              </span>
              <h3 className="text-lg font-bold text-[#111418] dark:text-white">
                {section.title} ({section.items.length})
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {section.items.map((accommodation) => (
                <AccommodationCard key={accommodation.id} accommodation={accommodation} />
              ))}
            </div>
            {/* Show Gemini Console only for youth movements section */}
            {section.type === 'youth_movement' && (geminiQueries.length > 0 || isGeminiActive) && (
              <div className="mt-6">
                <GeminiConsole queries={geminiQueries} isActive={isGeminiActive} />
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  // Fallback to simple list if no grouped data or filter is active
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {filteredAccommodations.map((accommodation) => (
        <AccommodationCard key={accommodation.id} accommodation={accommodation} />
      ))}
    </div>
  )
}

