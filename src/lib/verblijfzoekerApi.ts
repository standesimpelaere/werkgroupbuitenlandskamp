import type { Accommodation } from '../types/accommodation'

// Helper function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Earth's radius in km
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

// Geocode location using Nominatim
export async function geocodeLocation(location: string): Promise<{
  lat: number
  lon: number
} | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`,
      {
        headers: {
          'User-Agent': 'Verblijfzoeker/1.0',
        },
      }
    )

    if (!response.ok) {
      return null
    }

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

// Check if accommodation is suitable for groups
function isGroupSuitable(tags: Record<string, string>): boolean {
  if (tags['group_accommodation'] === 'yes' || tags['tourism'] === 'group_accommodation') {
    return true
  }

  const capacity = tags.capacity ? parseInt(tags.capacity) : 0
  if (capacity >= 10) {
    return true
  }

  if (tags['tourism'] === 'camp_site') {
    if (tags['group_only'] === 'yes' || tags['group'] === 'yes') {
      return true
    }
    if (capacity >= 10 || !tags['group_only'] || tags['group_only'] === 'no') {
      return true
    }
  }

  if (tags['tourism'] === 'hostel' || tags['hostel'] === 'yes') {
    if (capacity >= 10 || !tags['group_only'] || tags['group_only'] === 'no') {
      return true
    }
  }

  if (tags['leisure'] === 'scout' || tags['amenity'] === 'community_centre') {
    if (tags['scout'] || tags['youth_centre'] === 'yes' || tags['community_centre'] === 'scout') {
      return true
    }
  }

  if (tags['tourism'] === 'group_accommodation') {
    return true
  }

  if (capacity > 0 && capacity < 5) {
    return false
  }

  return false
}

// Search for youth movements using Nominatim (address-based search)
async function searchYouthMovementsByAddress(
  lat: number,
  lon: number,
  radius: number
): Promise<Accommodation[]> {
  const results: Accommodation[] = []
  
  // Search terms for youth movements in Belgium
  const searchTerms = [
    'KSA', 'Chiro', 'Scouts', 'FOS', 'Patro', 'KLJ', 'JNM',
    'jeugdbeweging', 'jeugdvereniging', 'scout', 'guide'
  ]
  
  // Get city name from coordinates
  let city = ''
  try {
    const reverseResponse = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'Verblijfzoeker/1.0',
        },
      }
    )
    
    if (reverseResponse.ok) {
      const reverseData = await reverseResponse.json()
      city = reverseData.address?.city || reverseData.address?.town || reverseData.address?.village || ''
    }
  } catch (error) {
    console.error('Error getting city name:', error)
  }
  
  // Search for specific address patterns
  if (city) {
    const specificSearches = [
      `KSA ${city}`,
      `Chiro ${city}`,
      `Scouts ${city}`,
    ]
    
    for (const searchQuery of specificSearches) {
      try {
        const searchResponse = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=15&addressdetails=1`,
          {
            headers: {
              'User-Agent': 'Verblijfzoeker/1.0',
            },
          }
        )
        
        if (searchResponse.ok) {
          const searchData = await searchResponse.json()
          
          for (const item of searchData) {
            const itemLat = parseFloat(item.lat)
            const itemLon = parseFloat(item.lon)
            const distance = calculateDistance(lat, lon, itemLat, itemLon)
            
            // Only include if within radius
            if (distance > radius) continue
            
            // Check if it's a youth movement by name or address
            const name = item.display_name || item.name || ''
            const nameLower = name.toLowerCase()
            const address = item.address || {}
            const addressText = JSON.stringify(address).toLowerCase()
            
            const isYouthMovement = 
              searchTerms.some(t => nameLower.includes(t.toLowerCase())) ||
              searchTerms.some(t => addressText.includes(t.toLowerCase()))
            
            if (!isYouthMovement) continue
            
            // Build address
            const addressParts: string[] = []
            if (address.road && address.house_number) {
              addressParts.push(`${address.road} ${address.house_number}`)
            } else if (address.road) {
              addressParts.push(address.road)
            }
            if (address.postcode && address.city) {
              addressParts.push(`${address.postcode} ${address.city}`)
            } else if (address.city || address.town || address.village) {
              addressParts.push(address.city || address.town || address.village)
            }
            
            // Extract name from display_name
            let extractedName = name.split(',')[0].trim()
            for (const term of searchTerms) {
              if (nameLower.includes(term.toLowerCase())) {
                const parts = name.split(',')
                for (const part of parts) {
                  if (part.toLowerCase().includes(term.toLowerCase())) {
                    extractedName = part.trim()
                    break
                  }
                }
                break
              }
            }
            
            // Check if we already have this result
            const existingId = `nominatim-${item.place_id}`
            if (results.some(r => r.id === existingId)) continue
            
            const accommodation: Accommodation = {
              id: existingId,
              name: extractedName,
              type: 'youth_movement',
              address: addressParts.length > 0 ? addressParts.join(', ') : undefined,
              city: address.city || address.town || address.village,
              country: address.country,
              latitude: itemLat,
              longitude: itemLon,
              distance,
              phone: item.extratags?.phone,
              website: item.extratags?.website || (item.extratags?.url && item.extratags.url.startsWith('http') ? item.extratags.url : undefined),
              email: item.extratags?.email,
            }
            
            results.push(accommodation)
          }
        }
        
        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (error) {
        console.error(`Error searching for ${searchQuery}:`, error)
      }
    }
  }
  
  return results
}

// Search OpenStreetMap using Overpass API
async function searchOSM(
  lat: number,
  lon: number,
  radius: number
): Promise<Accommodation[]> {
  const results: Accommodation[] = []
  const radiusMeters = radius * 1000

  const overpassQuery = `
    [out:json][timeout:30];
    (
      node["tourism"="camp_site"](around:${radiusMeters},${lat},${lon});
      way["tourism"="camp_site"](around:${radiusMeters},${lat},${lon});
      relation["tourism"="camp_site"](around:${radiusMeters},${lat},${lon});
      
      node["tourism"="hostel"](around:${radiusMeters},${lat},${lon});
      way["tourism"="hostel"](around:${radiusMeters},${lat},${lon});
      relation["tourism"="hostel"](around:${radiusMeters},${lat},${lon});
      
      node["hostel"="yes"](around:${radiusMeters},${lat},${lon});
      way["hostel"="yes"](around:${radiusMeters},${lat},${lon});
      relation["hostel"="yes"](around:${radiusMeters},${lat},${lon});
      
      node["tourism"="group_accommodation"](around:${radiusMeters},${lat},${lon});
      way["tourism"="group_accommodation"](around:${radiusMeters},${lat},${lon});
      relation["tourism"="group_accommodation"](around:${radiusMeters},${lat},${lon});
      
      node["group_accommodation"="yes"](around:${radiusMeters},${lat},${lon});
      way["group_accommodation"="yes"](around:${radiusMeters},${lat},${lon});
      relation["group_accommodation"="yes"](around:${radiusMeters},${lat},${lon});
      
      node["leisure"="scout"](around:${radiusMeters},${lat},${lon});
      way["leisure"="scout"](around:${radiusMeters},${lat},${lon});
      relation["leisure"="scout"](around:${radiusMeters},${lat},${lon});
      
      node["amenity"="community_centre"]["scout"](around:${radiusMeters},${lat},${lon});
      way["amenity"="community_centre"]["scout"](around:${radiusMeters},${lat},${lon});
      relation["amenity"="community_centre"]["scout"](around:${radiusMeters},${lat},${lon});
      
      node["amenity"="community_centre"]["youth_centre"="yes"](around:${radiusMeters},${lat},${lon});
      way["amenity"="community_centre"]["youth_centre"="yes"](around:${radiusMeters},${lat},${lon});
      relation["amenity"="community_centre"]["youth_centre"="yes"](around:${radiusMeters},${lat},${lon});
      
      node["amenity"="community_centre"](around:${radiusMeters},${lat},${lon});
      way["amenity"="community_centre"](around:${radiusMeters},${lat},${lon});
      relation["amenity"="community_centre"](around:${radiusMeters},${lat},${lon});
      
      node["leisure"="club"](around:${radiusMeters},${lat},${lon});
      way["leisure"="club"](around:${radiusMeters},${lat},${lon});
      relation["leisure"="club"](around:${radiusMeters},${lat},${lon});
    );
    out center meta;
  `

  try {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodeURIComponent(overpassQuery)}`,
    })

    if (!response.ok) {
      console.error('Overpass API error:', response.statusText)
      return results
    }

    const data = await response.json()
    const elements = data.elements || []

    for (const element of elements) {
      const tags = element.tags || {}
      const name = tags.name || tags['name:nl'] || tags['name:en'] || ''
      
      if (!name || name.trim() === '' || name.toLowerCase() === 'naamloos' || name.toLowerCase() === 'unnamed') {
        continue
      }
      
      if (!isGroupSuitable(tags)) {
        continue
      }
      
      const nameLower = name.toLowerCase()
      const youthMovementKeywords = [
        'ksa', 'chiro', 'scout', 'guide', 'jeugdbeweging', 'jeugdvereniging',
        'patro', 'klj', 'jnm', 'fos', 'pfadfinder', 'éclaireur', 'padvinder',
        'verkenners', 'guías', 'exploradores', 'youth movement', 'youth centre',
        'youth center', 'jugendbewegung', 'jeugdcentrum'
      ]
      const isYouthMovementByName = youthMovementKeywords.some(keyword => 
        nameLower.includes(keyword)
      )

      let type: Accommodation['type'] = 'hostel'
      if (tags['tourism'] === 'camp_site') {
        type = 'camping'
      } else if (tags['tourism'] === 'hostel' || tags['hostel'] === 'yes') {
        type = 'hostel'
      } else if (
        tags['leisure'] === 'scout' || 
        tags['scout'] || 
        tags['youth_centre'] === 'yes' ||
        tags['leisure'] === 'club' ||
        (tags['amenity'] === 'community_centre' && (tags['scout'] || isYouthMovementByName)) ||
        isYouthMovementByName
      ) {
        type = 'youth_movement'
      } else if (tags['tourism'] === 'group_accommodation' || tags['group_accommodation'] === 'yes') {
        if (tags['hostel'] === 'yes' || tags['tourism'] === 'hostel') {
          type = 'hostel'
        } else if (tags['scout'] || tags['youth_centre'] === 'yes') {
          type = 'youth_movement'
        } else {
          type = 'hostel'
        }
      }

      let elementLat: number
      let elementLon: number
      
      if (element.type === 'node') {
        elementLat = element.lat
        elementLon = element.lon
      } else if (element.center) {
        elementLat = element.center.lat
        elementLon = element.center.lon
      } else {
        continue
      }

      const distance = calculateDistance(lat, lon, elementLat, elementLon)

      const addressParts: string[] = []
      if (tags['addr:street'] && tags['addr:housenumber']) {
        addressParts.push(`${tags['addr:street']} ${tags['addr:housenumber']}`)
      } else if (tags['addr:street']) {
        addressParts.push(tags['addr:street'])
      }
      if (tags['addr:postcode'] && tags['addr:city']) {
        addressParts.push(`${tags['addr:postcode']} ${tags['addr:city']}`)
      } else if (tags['addr:city']) {
        addressParts.push(tags['addr:city'])
      } else if (tags['addr:place']) {
        addressParts.push(tags['addr:place'])
      }
      if (tags['addr:country']) {
        addressParts.push(tags['addr:country'])
      }

      let website = tags.website || tags['contact:website'] || tags.url
      if (website) {
        website = website.trim()
        if (!website.startsWith('http://') && !website.startsWith('https://')) {
          website = 'https://' + website
        }
        if (website.includes('example.com') || website.includes('placeholder')) {
          website = undefined
        }
      }

      const hasMinimalInfo = 
        (type === 'youth_movement' && addressParts.length > 0) ||
        (type !== 'youth_movement' && (website || tags.phone || tags['contact:phone']))

      if (!hasMinimalInfo) {
        continue
      }

      const accommodation: Accommodation = {
        id: `${element.type}-${element.id}`,
        name,
        type,
        address: addressParts.length > 0 ? addressParts.join(', ') : undefined,
        city: tags['addr:city'] || tags['addr:place'],
        country: tags['addr:country'],
        latitude: elementLat,
        longitude: elementLon,
        distance,
        phone: tags.phone || tags['contact:phone'],
        email: tags.email || tags['contact:email'],
        website,
        description: tags.description || tags['description:nl'],
        capacity: tags.capacity ? parseInt(tags.capacity) : undefined,
      }

      results.push(accommodation)
    }

    results.sort((a, b) => (a.distance || 0) - (b.distance || 0))
  } catch (error) {
    console.error('OSM search error:', error)
  }

  return results
}

// Gemini API key - should be set via environment variable or config
const GEMINI_API_KEY = 'AIzaSyCy1znqubdNJ4PRno73_T3dXrnaDvlfz9o'

// Research youth movement types using Gemini
async function researchYouthMovementTypes(country: string, city?: string): Promise<string[]> {
  if (!GEMINI_API_KEY) {
    return []
  }

  try {
    const prompt = `Research which types of youth movements (jeugdbewegingen, youth organizations, scout organizations) exist in ${country}${city ? `, specifically in the region around ${city}` : ''}.

For example:
- In Belgium/Netherlands: KSA, Chiro, Scouts, FOS, Patro, KLJ, JNM
- In France: Scouts de France, Éclaireurs, Éclaireuses, Guides de France
- In Germany: Pfadfinder, Jugendbewegung
- In UK: Scouts, Girl Guides, etc.

Return a JSON array of the common youth movement organization types/names in ${country}:
["Type 1", "Type 2", "Type 3", ...]

Only return the JSON array, no additional text.`

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }]
        }),
      }
    )

    if (!response.ok) {
      console.error('Gemini API error:', response.statusText)
      return []
    }

    const data = await response.json()
    let text = ''
    
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      const parts = data.candidates[0].content.parts || []
      text = parts.map((part: any) => part.text || '').join('')
    }

    let jsonText = text.trim()
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '')
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '')
    }

    try {
      const parsed = JSON.parse(jsonText)
      if (Array.isArray(parsed)) {
        return parsed.filter(item => typeof item === 'string' && item.length > 0)
      }
    } catch (parseError) {
      const jsonMatch = jsonText.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0])
          if (Array.isArray(parsed)) {
            return parsed.filter(item => typeof item === 'string' && item.length > 0)
          }
        } catch (e) {
          console.error('Failed to parse types:', e)
        }
      }
    }

    return []
  } catch (error) {
    console.error('Error researching youth movement types:', error)
    return []
  }
}

// Find youth movements using Gemini with multiple search terms
async function findYouthMovementsWithGemini(
  city: string,
  country: string,
  youthMovementTypes: string[],
  searchLat: number,
  searchLon: number,
  radius: number,
  logs: string[],
  onQuery?: (query: string, response: string) => void
): Promise<Accommodation[]> {
  if (!GEMINI_API_KEY) {
    return []
  }

  const allResults: Accommodation[] = []
  const seenNames = new Set<string>()

  try {
    // Build search terms - combine specific types with general terms
    const specificTerms = youthMovementTypes.length > 0 
      ? youthMovementTypes.map(type => `${type} ${city}`)
      : []
    
    const generalTerms = [
      `jeugdbewegingen in ${city}`,
      `jeugdverenigingen ${city}`,
      `youth movements ${city} ${country}`,
      `scout organizations ${city}`,
      `jeugdorganisaties ${city}`
    ]

    const allSearchTerms = [...specificTerms, ...generalTerms]

    logs.push(`🔍 ${allSearchTerms.length} zoektermen voorbereid`)
    
    // Search with each term
    for (const searchTerm of allSearchTerms) {
      try {
        const prompt = `Find youth movements and youth organizations matching: "${searchTerm}" in ${city}, ${country}.

For each organization found, provide:
- Full name of the organization
- Street address if available (street name and number, postal code, city)
- Website URL ONLY if you can find the actual, verified website URL. DO NOT make up or guess website URLs. If you don't know the real website, leave it empty or omit the field.
- Type (KSA, Chiro, Scouts, etc.)

IMPORTANT: Only include website URLs if you are certain they are real and verified. Do NOT create fake URLs like "name.be" or "name.com". If you cannot find the real website, omit the website field entirely.

Return the results as a JSON array:
[
  {
    "name": "Organization name",
    "address": "Street address, postal code city",
    "website": "https://actual-verified-website.com" (ONLY if you found the real website, otherwise omit this field),
    "type": "Type name"
  }
]

Only return valid JSON, no additional text. If you don't find any, return an empty array [].`

        if (onQuery) {
          onQuery(`Zoeken: "${searchTerm}"`, 'Wachten op response...')
        }

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{
                parts: [{ text: prompt }]
              }]
            }),
          }
        )

        if (!response.ok) {
          if (onQuery) {
            onQuery(`Zoeken: "${searchTerm}"`, `❌ Fout: ${response.statusText}`)
          }
          continue
        }

        const data = await response.json()
        let text = ''
        
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
          const parts = data.candidates[0].content.parts || []
          text = parts.map((part: any) => part.text || '').join('')
        }

        if (onQuery) {
          onQuery(`Zoeken: "${searchTerm}"`, text.substring(0, 300) + (text.length > 300 ? '...' : ''))
        }

        let jsonText = text.trim()
        if (jsonText.startsWith('```json')) {
          jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '')
        } else if (jsonText.startsWith('```')) {
          jsonText = jsonText.replace(/```\n?/g, '')
        }

        let geminiResults: Array<{name: string, address?: string, website?: string, type?: string}> = []
        
        try {
          const parsed = JSON.parse(jsonText)
          if (Array.isArray(parsed)) {
            geminiResults = parsed
          }
        } catch (parseError) {
          const jsonMatch = jsonText.match(/\[[\s\S]*\]/)
          if (jsonMatch) {
            try {
              const parsed = JSON.parse(jsonMatch[0])
              if (Array.isArray(parsed)) {
                geminiResults = parsed
              }
            } catch (e) {
              // Skip this result
            }
          }
        }

        // Process results
        for (const movement of geminiResults) {
          if (!movement.name || seenNames.has(movement.name.toLowerCase())) {
            continue
          }
          seenNames.add(movement.name.toLowerCase())

          try {
            let coords: { lat: number; lon: number } | null = null
            
            if (movement.address) {
              const geocoded = await geocodeLocation(movement.address)
              if (geocoded) {
                coords = geocoded
              }
            }
            
            if (!coords) {
              const geocoded = await geocodeLocation(`${movement.name} ${city}`)
              if (geocoded) {
                coords = geocoded
              }
            }
            
            if (coords) {
              const distance = calculateDistance(searchLat, searchLon, coords.lat, coords.lon)
              
              if (distance <= radius) {
                allResults.push({
                  id: `gemini-${movement.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-${Date.now()}-${Math.random()}`,
                  name: movement.name,
                  type: 'youth_movement',
                  address: movement.address,
                  city: city,
                  country: country,
                  latitude: coords.lat,
                  longitude: coords.lon,
                  distance,
                  website: movement.website,
                })
              }
            } else if (movement.name) {
              // Fallback to search location
              allResults.push({
                id: `gemini-${movement.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-${Date.now()}-${Math.random()}`,
                name: movement.name,
                type: 'youth_movement',
                address: movement.address || city,
                city: city,
                country: country,
                latitude: searchLat,
                longitude: searchLon,
                distance: 0,
                website: movement.website,
              })
            }
          } catch (error) {
            console.error(`Error processing ${movement.name}:`, error)
          }
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1500))
      } catch (error) {
        if (onQuery) {
          onQuery(`Zoeken: "${searchTerm}"`, `❌ Error: ${error}`)
        }
      }
    }

    return allResults
  } catch (error) {
    console.error('Gemini API error:', error)
    logs.push(`⚠️  Gemini API fout: ${error}`)
    return []
  }
}

// Main search function with progressive updates
export async function searchAccommodations(
  location: string,
  radius: number,
  onGeminiQuery?: (query: string, response: string) => void,
  onProgress?: (results: Accommodation[], logs: string[]) => void
): Promise<{
  results: Accommodation[]
  grouped: {
    hostel: Accommodation[]
    camping: Accommodation[]
    youth_movement: Accommodation[]
  }
  searchCoordinates: { lat: number; lon: number } | null
  logs: string[]
}> {
  const logs: string[] = []
  const allResults: Accommodation[] = []
  const seen = new Set<string>()
  
  const updateProgress = () => {
    if (onProgress) {
      // Remove duplicates for display
      const uniqueResults: Accommodation[] = []
      const displaySeen = new Set<string>()
      
      for (const result of allResults) {
        if (!result.latitude || !result.longitude) continue
        const latKey = Math.round(result.latitude * 100) / 100
        const lonKey = Math.round(result.longitude * 100) / 100
        const coordKey = `${latKey},${lonKey}`
        
        if (!displaySeen.has(coordKey)) {
          displaySeen.add(coordKey)
          uniqueResults.push(result)
        }
      }
      
      onProgress(uniqueResults, [...logs])
    }
  }
  
  const addLog = (message: string) => {
    logs.push(message)
    updateProgress()
  }
  
  addLog(`🚀 Zoekopdracht gestart: ${location} (${radius} km)`)
  addLog(`\n📍 Stap 1: Locatie geocoderen...`)
  
  const coordinates = await geocodeLocation(location)
  
  if (!coordinates) {
    addLog('❌ Locatie niet gevonden')
    throw new Error('Locatie niet gevonden. Probeer een andere locatie.')
  }
  
  addLog(`✅ Coördinaten gevonden: ${coordinates.lat.toFixed(4)}, ${coordinates.lon.toFixed(4)}`)
  addLog(`\n🏕️  Stap 2: Zoeken naar campings en jeugdherbergen...`)

  const osmResults = await searchOSM(coordinates.lat, coordinates.lon, radius)
  
  // Add OSM results immediately
  for (const result of osmResults) {
    if (!result.latitude || !result.longitude) continue
    const latKey = Math.round(result.latitude * 100) / 100
    const lonKey = Math.round(result.longitude * 100) / 100
    const coordKey = `${latKey},${lonKey}`
    
    if (!seen.has(coordKey)) {
      seen.add(coordKey)
      allResults.push(result)
    }
  }
  
  addLog(`✅ OpenStreetMap: ${osmResults.length} resultaten gevonden`)
  updateProgress()
  
  addLog(`\n🎯 Stap 3: Zoeken naar jeugdbewegingen via adres...`)
  const youthMovementResults = await searchYouthMovementsByAddress(
    coordinates.lat,
    coordinates.lon,
    radius
  )
  
  // Add youth movement results immediately
  for (const result of youthMovementResults) {
    if (!result.latitude || !result.longitude) continue
    const latKey = Math.round(result.latitude * 100) / 100
    const lonKey = Math.round(result.longitude * 100) / 100
    const coordKey = `${latKey},${lonKey}`
    
    if (!seen.has(coordKey)) {
      seen.add(coordKey)
      allResults.push(result)
    }
  }
  
  addLog(`✅ Adreszoek: ${youthMovementResults.length} jeugdbewegingen gevonden`)
  updateProgress()
  
  addLog(`\n🤖 Stap 4: AI-ondersteunde zoekopdracht naar jeugdbewegingen...`)
  
  let geminiResults: Accommodation[] = []
  if (GEMINI_API_KEY) {
    try {
      const parts = location.split(',').map(p => p.trim())
      const city = parts[0] || location
      const country = parts[parts.length - 1] || 'België'
      
      addLog(`🔬 Onderzoeken welke soorten jeugdbewegingen bestaan in ${country}...`)
      const youthMovementTypes = await researchYouthMovementTypes(country, city)
      if (youthMovementTypes.length > 0) {
        addLog(`✅ ${youthMovementTypes.length} soorten gevonden: ${youthMovementTypes.join(', ')}`)
      }
      
      addLog(`🤖 Zoeken naar jeugdbewegingen in ${city} met Gemini AI...`)
      
      // Modified to add results progressively
      const addGeminiResult = (result: Accommodation) => {
        if (!result.latitude || !result.longitude) return false
        const latKey = Math.round(result.latitude * 100) / 100
        const lonKey = Math.round(result.longitude * 100) / 100
        const coordKey = `${latKey},${lonKey}`
        
        if (!seen.has(coordKey)) {
          seen.add(coordKey)
          allResults.push(result)
          updateProgress()
          return true
        }
        return false
      }
      
      // We need to modify findYouthMovementsWithGemini to call addGeminiResult
      // For now, let's get all results and add them
      geminiResults = await findYouthMovementsWithGemini(
        city,
        country,
        youthMovementTypes,
        coordinates.lat,
        coordinates.lon,
        radius,
        logs,
        onGeminiQuery
      )
      
      // Add Gemini results progressively
      for (const result of geminiResults) {
        addGeminiResult(result)
      }
      
      addLog(`✅ Gemini AI: ${geminiResults.length} jeugdbewegingen gevonden`)
    } catch (error) {
      addLog(`⚠️  Gemini zoekfout: ${error}`)
    }
  } else {
    addLog(`⚠️  Gemini API key niet gevonden. Deze stap wordt overgeslagen.`)
  }
  
  // Final deduplication
  addLog(`\n🔄 Stap 5: Duplicaten verwijderen...`)
  const uniqueResults: Accommodation[] = []
  const finalSeen = new Set<string>()
  
  for (const result of allResults) {
    if (!result.latitude || !result.longitude) continue
    
    const latKey = Math.round(result.latitude * 100) / 100
    const lonKey = Math.round(result.longitude * 100) / 100
    const coordKey = `${latKey},${lonKey}`
    
    if (finalSeen.has(coordKey)) {
      const existing = uniqueResults.find(r => {
        const rLat = Math.round((r.latitude || 0) * 100) / 100
        const rLon = Math.round((r.longitude || 0) * 100) / 100
        return rLat === latKey && rLon === lonKey
      })
      
      if (existing) {
        const resultScore = (result.website ? 1 : 0) + (result.phone ? 1 : 0) + (result.address ? 1 : 0)
        const existingScore = (existing.website ? 1 : 0) + (existing.phone ? 1 : 0) + (existing.address ? 1 : 0)
        
        if (resultScore > existingScore) {
          const index = uniqueResults.indexOf(existing)
          uniqueResults[index] = result
        }
      }
      continue
    }
    
    finalSeen.add(coordKey)
    uniqueResults.push(result)
  }
  
  addLog(`✅ ${uniqueResults.length} unieke resultaten na deduplicatie`)
  
  const groupedResults = {
    hostel: uniqueResults.filter(r => r.type === 'hostel'),
    camping: uniqueResults.filter(r => r.type === 'camping'),
    youth_movement: uniqueResults.filter(r => r.type === 'youth_movement'),
  }
  
  addLog(`\n📊 Totaal: ${uniqueResults.length} accommodaties (${groupedResults.hostel.length} jeugdherbergen, ${groupedResults.camping.length} campings, ${groupedResults.youth_movement.length} jeugdbewegingen)`)

  return {
    results: uniqueResults,
    grouped: groupedResults,
    searchCoordinates: coordinates,
    logs,
  }
}

