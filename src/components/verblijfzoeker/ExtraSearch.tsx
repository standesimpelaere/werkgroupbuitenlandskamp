import { useState } from 'react'
import type { Accommodation } from '../../types/accommodation'

// Helper function to calculate distance
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Geocode location
async function geocodeLocation(location: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`,
      {
        headers: {
          'User-Agent': 'Verblijfzoeker/1.0',
        },
      }
    )
    if (!response.ok) return null
    const data = await response.json()
    if (data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
      }
    }
    return null
  } catch (error) {
    console.error('Geocoding error:', error)
    return null
  }
}

interface ExtraSearchProps {
  accommodations: Accommodation[]
  searchLocation: string
  searchCoordinates: { lat: number; lon: number }
  radius: number
  activeFilter: 'all' | 'hostel' | 'camping' | 'youth_movement'
  onNewResults: (newResults: Accommodation[]) => void
}

interface SearchQuery {
  query: string
  response: string
  timestamp: Date
}

export default function ExtraSearch({ 
  accommodations, 
  searchLocation, 
  searchCoordinates, 
  radius,
  activeFilter,
  onNewResults 
}: ExtraSearchProps) {
  const [isSearching, setIsSearching] = useState(false)
  const [searchQueries, setSearchQueries] = useState<SearchQuery[]>([])
  const [foundCount, setFoundCount] = useState(0)

  const GEMINI_API_KEY = 'AIzaSyCy1znqubdNJ4PRno73_T3dXrnaDvlfz9o'

  const addQuery = (query: string, response: string) => {
    setSearchQueries(prev => [...prev, {
      query,
      response,
      timestamp: new Date()
    }])
  }

  const parseAndProcessResults = async (
    text: string,
    type: 'hostel' | 'camping' | 'youth_movement',
    existingNames: Set<string>,
    newResults: Accommodation[]
  ): Promise<Accommodation[]> => {
    let jsonText = text.trim()
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '')
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '')
    }

    const parsed: Accommodation[] = []
    
    try {
      const data = JSON.parse(jsonText)
      if (Array.isArray(data)) {
        for (const item of data) {
          if (!item.name || existingNames.has(item.name.toLowerCase())) continue
          
          const coords = item.address 
            ? await geocodeLocation(item.address)
            : await geocodeLocation(`${item.name} ${searchLocation}`)
          
          if (coords) {
            const distance = calculateDistance(
              searchCoordinates.lat,
              searchCoordinates.lon,
              coords.lat,
              coords.lon
            )
            if (distance <= radius) {
              const result: Accommodation = {
                id: `extra-${type}-${Date.now()}-${Math.random()}`,
                name: item.name,
                type,
                address: item.address,
                city: searchLocation.split(',')[0],
                country: searchLocation.split(',')[searchLocation.split(',').length - 1]?.trim() || '',
                latitude: coords.lat,
                longitude: coords.lon,
                distance,
                website: item.website,
              }
              parsed.push(result)
              newResults.push(result)
              existingNames.add(item.name.toLowerCase())
            }
          }
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
    } catch (e) {
      console.error('Parse error:', e)
    }
    
    return parsed
  }

  const searchYouthMovementsAdvanced = async (
    existingNames: Set<string>,
    newResults: Accommodation[]
  ) => {
    const parts = searchLocation.split(',').map(p => p.trim())
    const city = parts[0] || searchLocation
    const country = parts[parts.length - 1] || 'België'
    
    const existingMovements = accommodations.filter(a => a.type === 'youth_movement')
    addQuery(
      `Zoek naar extra jeugdbewegingen in ${city}, ${country}`,
      `We hebben al ${existingMovements.length} jeugdbewegingen gevonden. Start uitgebreide AI-zoekopdracht...`
    )

    // Step 1: Research what types of youth movements exist
    addQuery('Stap 1: Onderzoeken welke soorten jeugdbewegingen bestaan...', 'Wachten op AI...')
    
    const researchPrompt = `Welke soorten jeugdbewegingen en jeugdorganisaties bestaan er in ${country}? 
Geef een lijst van alle belangrijke types (bijvoorbeeld: KSA, Chiro, Scouts, FOS, JNM, etc.).
Geef alleen de namen, gescheiden door komma's.`
    
    let movementTypes: string[] = []
    try {
      const researchResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: researchPrompt }] }]
          }),
        }
      )
      
      if (researchResponse.ok) {
        const data = await researchResponse.json()
        let text = ''
        if (data.candidates?.[0]?.content?.parts) {
          text = data.candidates[0].content.parts.map((p: any) => p.text || '').join('')
        }
        movementTypes = text.split(',').map(t => t.trim()).filter(t => t.length > 0)
        addQuery('Stap 1 resultaat', `Gevonden types: ${movementTypes.join(', ')}`)
      }
    } catch (e) {
      console.error('Research error:', e)
    }

    // Step 2: Multiple AI agents search with different strategies
    const searchStrategies = [
      {
        name: 'Zoeken per type',
        prompt: (type: string) => `Zoek naar ${type} groepen in ${city}, ${country}. 
BELANGRIJK: Website URL ALLEEN opnemen als je de echte, geverifieerde website kunt vinden. Geef GEEN verzonnen URLs.
Geef een JSON array met: [{"name": "...", "address": "...", "website": "..."}] (website alleen als gevonden)`
      },
      {
        name: 'Zoeken met algemene termen',
        prompt: () => `Zoek naar jeugdbewegingen, jeugdverenigingen, en jeugdorganisaties in ${city}, ${country}.
BELANGRIJK: Website URL ALLEEN opnemen als je de echte, geverifieerde website kunt vinden. Geef GEEN verzonnen URLs.
Geef een JSON array met: [{"name": "...", "address": "...", "website": "..."}] (website alleen als gevonden)`
      },
      {
        name: 'Zoeken via alternatieve namen',
        prompt: () => `Zoek naar youth movements, scout groups, en youth organizations in ${city}, ${country}.
BELANGRIJK: Website URL ALLEEN opnemen als je de echte, geverifieerde website kunt vinden. Geef GEEN verzonnen URLs.
Geef een JSON array met: [{"name": "...", "address": "...", "website": "..."}] (website alleen als gevonden)`
      },
      {
        name: 'Zoeken in omliggende gemeenten',
        prompt: () => `Zoek naar jeugdbewegingen in de regio rond ${city}, ${country}, inclusief nabijgelegen gemeenten.
BELANGRIJK: Website URL ALLEEN opnemen als je de echte, geverifieerde website kunt vinden. Geef GEEN verzonnen URLs.
Geef een JSON array met: [{"name": "...", "address": "...", "website": "..."}] (website alleen als gevonden)`
      }
    ]

    // Search with each type
    for (const type of movementTypes.slice(0, 5)) {
      addQuery(`Zoeken naar ${type} groepen...`, 'Wachten op AI...')
      
      const prompt = searchStrategies[0].prompt(type)
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }]
            }),
          }
        )

        if (response.ok) {
          const data = await response.json()
          let text = ''
          if (data.candidates?.[0]?.content?.parts) {
            text = data.candidates[0].content.parts.map((p: any) => p.text || '').join('')
          }
          
          addQuery(`${type} response`, `${text.substring(0, 200)}...`)
          await parseAndProcessResults(text, 'youth_movement', existingNames, newResults)
        }
        await new Promise(resolve => setTimeout(resolve, 2000))
      } catch (e) {
        console.error(`Error searching for ${type}:`, e)
      }
    }

    // Search with general strategies
    for (const strategy of searchStrategies.slice(1)) {
      addQuery(`Strategie: ${strategy.name}...`, 'Wachten op AI...')
      
      const prompt = strategy.prompt()
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }]
            }),
          }
        )

        if (response.ok) {
          const data = await response.json()
          let text = ''
          if (data.candidates?.[0]?.content?.parts) {
            text = data.candidates[0].content.parts.map((p: any) => p.text || '').join('')
          }
          
          addQuery(`${strategy.name} response`, `${text.substring(0, 200)}...`)
          await parseAndProcessResults(text, 'youth_movement', existingNames, newResults)
        }
        await new Promise(resolve => setTimeout(resolve, 2000))
      } catch (e) {
        console.error(`Error with strategy ${strategy.name}:`, e)
      }
    }

    // Step 3: Cross-reference and validate
    addQuery('Stap 3: Resultaten valideren en cross-refereren...', 'Wachten op AI...')
    
    const foundNames = newResults.map(r => r.name).join(', ')
    if (foundNames) {
      const validatePrompt = `Valideer deze jeugdbewegingen in ${city}, ${country}:
${foundNames}

Zijn er nog andere jeugdbewegingen die we gemist hebben? 

BELANGRIJK: Website URL ALLEEN opnemen als je de echte, geverifieerde website kunt vinden. Geef GEEN verzonnen URLs.

Geef een JSON array met nieuwe: [{"name": "...", "address": "...", "website": "..."}] (website alleen als gevonden)`
      
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: validatePrompt }] }]
            }),
          }
        )

        if (response.ok) {
          const data = await response.json()
          let text = ''
          if (data.candidates?.[0]?.content?.parts) {
            text = data.candidates[0].content.parts.map((p: any) => p.text || '').join('')
          }
          
          addQuery('Validatie response', `${text.substring(0, 200)}...`)
          await parseAndProcessResults(text, 'youth_movement', existingNames, newResults)
        }
      } catch (e) {
        console.error('Validation error:', e)
      }
    }
  }

  const verifyAccommodations = async () => {
    if (!GEMINI_API_KEY || isSearching) return

    setIsSearching(true)
    setSearchQueries([])
    setFoundCount(0)

    try {
      const newResults: Accommodation[] = []
      const existingNames = new Set(accommodations.map(a => a.name.toLowerCase()))

      // Determine which category to search based on active filter
      const searchType = activeFilter === 'all' ? null : activeFilter
      
      if (searchType === 'hostel') {
        const hostels = accommodations.filter(a => a.type === 'hostel')
        addQuery(
          `Zoek naar extra jeugdherbergen in ${searchLocation}`,
          `We hebben al ${hostels.length} jeugdherbergen gevonden. Zoeken naar meer...`
        )
        const hostelNames = hostels.slice(0, 10).map(h => h.name).join(', ')
        const prompt = `Zoek naar jeugdherbergen (hostels, youth hostels) in ${searchLocation} die we mogelijk gemist hebben.

We hebben al deze gevonden:
${hostelNames}

Geef een JSON array terug met NIEUWE jeugdherbergen die we gemist hebben (niet de bestaande).
Voor elk: naam, adres, website (ALLEEN als je de echte, geverifieerde website URL kunt vinden).

BELANGRIJK: 
- Geef GEEN verzonnen URLs zoals "naam.be" of "naam.com"
- Als je de website niet kunt vinden, laat het website veld leeg of laat het weg
- Alleen echte, geverifieerde website URLs opnemen

Format: [{"name": "...", "address": "...", "website": "https://..."}] (website alleen als gevonden)`

        addQuery('Zoeken naar extra jeugdherbergen...', 'Wachten op Gemini...')

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }]
            }),
          }
        )

        if (response.ok) {
          const data = await response.json()
          let text = ''
          if (data.candidates?.[0]?.content?.parts) {
            text = data.candidates[0].content.parts.map((p: any) => p.text || '').join('')
          }
          
          addQuery('Gemini response jeugdherbergen', text.substring(0, 300) + '...')

          // Parse results
          let jsonText = text.trim()
          if (jsonText.startsWith('```json')) {
            jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '')
          } else if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/```\n?/g, '')
          }

          try {
            const parsed = JSON.parse(jsonText)
            if (Array.isArray(parsed)) {
              for (const item of parsed) {
                if (!item.name || existingNames.has(item.name.toLowerCase())) continue
                
                const coords = item.address 
                  ? await geocodeLocation(item.address)
                  : await geocodeLocation(`${item.name} ${searchLocation}`)
                
                if (coords) {
                  const distance = calculateDistance(
                    searchCoordinates.lat,
                    searchCoordinates.lon,
                    coords.lat,
                    coords.lon
                  )
                  if (distance <= radius) {
                    newResults.push({
                      id: `extra-hostel-${Date.now()}-${Math.random()}`,
                      name: item.name,
                      type: 'hostel',
                      address: item.address,
                      city: searchLocation.split(',')[0],
                      country: searchLocation.split(',')[searchLocation.split(',').length - 1]?.trim() || '',
                      latitude: coords.lat,
                      longitude: coords.lon,
                      distance,
                      website: item.website,
                    })
                    existingNames.add(item.name.toLowerCase())
                  }
                }
                await new Promise(resolve => setTimeout(resolve, 1000))
              }
            }
          } catch (e) {
            console.error('Parse error:', e)
          }
        }
      } else if (searchType === 'camping') {
        const campings = accommodations.filter(a => a.type === 'camping')
        addQuery(
          `Zoek naar extra campings in ${searchLocation}`,
          `We hebben al ${campings.length} campings gevonden. Zoeken naar meer...`
        )

        const campingNames = campings.slice(0, 10).map(c => c.name).join(', ')
        const prompt = `Zoek naar campings in ${searchLocation} die we mogelijk gemist hebben.

We hebben al deze gevonden:
${campingNames}

Geef een JSON array terug met NIEUWE campings die we gemist hebben.

BELANGRIJK: 
- Website URL ALLEEN opnemen als je de echte, geverifieerde website kunt vinden
- Geef GEEN verzonnen URLs zoals "naam.be" of "naam.com"
- Als je de website niet kunt vinden, laat het website veld leeg of laat het weg

Format: [{"name": "...", "address": "...", "website": "https://..."}] (website alleen als gevonden)`

        addQuery('Zoeken naar extra campings...', 'Wachten op Gemini...')

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }]
            }),
          }
        )

        if (response.ok) {
          const data = await response.json()
          let text = ''
          if (data.candidates?.[0]?.content?.parts) {
            text = data.candidates[0].content.parts.map((p: any) => p.text || '').join('')
          }
          
          addQuery('Gemini response', text.substring(0, 300) + '...')

          const parsed = await parseAndProcessResults(text, 'camping', existingNames, newResults)
          if (parsed.length > 0) {
            addQuery(`✅ ${parsed.length} nieuwe campings gevonden`, '')
          }
        }
      } else if (searchType === 'youth_movement') {
        await searchYouthMovementsAdvanced(existingNames, newResults)
      } else {
        // Search all if filter is 'all'
        addQuery('Zoek in alle categorieën', 'Niet geïmplementeerd - selecteer een specifieke categorie')
      }

      if (newResults.length > 0) {
        setFoundCount(newResults.length)
        onNewResults(newResults)
        addQuery('Zoekopdracht voltooid', `✅ ${newResults.length} nieuwe accommodaties gevonden en toegevoegd`)
      } else {
        addQuery('Zoekopdracht voltooid', `Geen nieuwe accommodaties gevonden`)
      }
    } catch (error) {
      addQuery('Fout', `Error: ${error}`)
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-background-dark p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-[#111418] dark:text-white">
            Zoek Meer
          </h3>
          <p className="text-xs text-[#617589] dark:text-gray-400 mt-1">
            {activeFilter === 'all' 
              ? 'Selecteer een categorie om meer te zoeken'
              : activeFilter === 'youth_movement'
              ? 'Uitgebreide AI-zoekopdracht voor jeugdbewegingen'
              : `Zoek naar extra ${activeFilter === 'hostel' ? 'jeugdherbergen' : 'campings'} met AI`
            }
          </p>
        </div>
        <button
          onClick={verifyAccommodations}
          disabled={isSearching || activeFilter === 'all'}
          className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSearching ? (
            <>
              <span className="material-symbols-outlined text-base animate-spin inline-block mr-2">sync</span>
              Zoeken...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-base inline-block mr-2">search</span>
              Zoek Meer
            </>
          )}
        </button>
      </div>

      {searchQueries.length > 0 && (
        <div className="mt-4 space-y-2">
          {searchQueries.map((item, index) => (
            <div key={index} className="text-xs text-[#617589] dark:text-gray-400">
              <span className="font-medium text-primary">$</span> {item.query}
              {item.response && (
                <div className="mt-1 pl-4 text-gray-500 dark:text-gray-500">
                  {item.response.substring(0, 200)}
                  {item.response.length > 200 && '...'}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {foundCount > 0 && (
        <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <p className="text-sm text-green-700 dark:text-green-400">
            ✅ {foundCount} nieuwe accommodaties gevonden
          </p>
        </div>
      )}
    </div>
  )
}

