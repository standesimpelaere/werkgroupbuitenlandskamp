import { useState } from 'react'
import type { Accommodation } from '../../types/accommodation'
import WebsiteLink from './WebsiteLink'

interface AccommodationCardProps {
  accommodation: Accommodation
}

export default function AccommodationCard({ accommodation: initialAccommodation }: AccommodationCardProps) {
  const [accommodation, setAccommodation] = useState<Accommodation>(initialAccommodation)
  const [showDetails, setShowDetails] = useState(false)
  const [isLoadingAI, setIsLoadingAI] = useState(false)
  const [isFindingWebsite, setIsFindingWebsite] = useState(false)
  const [aiInfo, setAiInfo] = useState<{
    description?: string
    amenities?: string[]
    priceRange?: string
    additionalInfo?: string
  } | null>(null)

  const GEMINI_API_KEY = 'AIzaSyCy1znqubdNJ4PRno73_T3dXrnaDvlfz9o'

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'hostel':
        return 'Jeugdherberg'
      case 'camping':
        return 'Camping'
      case 'youth_movement':
        return 'Jeugdbeweging'
      default:
        return type
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'hostel':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
      case 'camping':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
      case 'youth_movement':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
    }
  }

  const findWebsite = async () => {
    if (!accommodation.name) return
    
    setIsFindingWebsite(true)
    try {
      const prompt = `Zoek de officiële website van "${accommodation.name}" gelegen in ${accommodation.address || 'onbekend'}.

BELANGRIJK: 
- Geef ALLEEN de echte, geverifieerde website URL terug
- Geef GEEN verzonnen URLs zoals "naam.be" of "naam.com"
- Als je de website niet kunt vinden, geef dan alleen "NIET_GEVONDEN" terug
- Geef alleen de URL, geen extra tekst

Format: https://www.actual-website.com of NIET_GEVONDEN`

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
          text = data.candidates[0].content.parts.map((p: any) => p.text || '').join('').trim()
        }
        
        // Extract URL from response
        const urlMatch = text.match(/https?:\/\/[^\s]+/)
        if (urlMatch && !text.includes('NIET_GEVONDEN')) {
          const foundUrl = urlMatch[0]
          setAccommodation(prev => ({ ...prev, website: foundUrl }))
        } else {
          alert('Website niet gevonden. Probeer handmatig te zoeken.')
        }
      }
    } catch (error) {
      console.error('Error finding website:', error)
      alert('Fout bij het zoeken naar website. Probeer het later opnieuw.')
    } finally {
      setIsFindingWebsite(false)
    }
  }

  const verifyWebsite = async () => {
    if (!accommodation.website) return
    
    setIsFindingWebsite(true)
    try {
      const prompt = `Verifieer of deze website URL correct is voor "${accommodation.name}" gelegen in ${accommodation.address || location}:
${accommodation.website}

Als deze URL niet correct is, geef dan de echte website URL terug.
Als de URL correct is, geef dan "CORRECT" terug.
Als je de website niet kunt vinden, geef dan "NIET_GEVONDEN" terug.

Geef alleen de URL of "CORRECT" of "NIET_GEVONDEN", geen extra tekst.`

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
          text = data.candidates[0].content.parts.map((p: any) => p.text || '').join('').trim()
        }
        
        if (text.includes('CORRECT')) {
          alert('Website is correct geverifieerd!')
        } else {
          const urlMatch = text.match(/https?:\/\/[^\s]+/)
          if (urlMatch && !text.includes('NIET_GEVONDEN')) {
            const foundUrl = urlMatch[0]
            setAccommodation(prev => ({ ...prev, website: foundUrl }))
            alert('Website bijgewerkt naar de geverifieerde URL!')
          } else {
            alert('Kon de website niet verifiëren. De huidige URL kan onjuist zijn.')
          }
        }
      }
    } catch (error) {
      console.error('Error verifying website:', error)
      alert('Fout bij het verifiëren van website. Probeer het later opnieuw.')
    } finally {
      setIsFindingWebsite(false)
    }
  }

  const handleAIInfo = async () => {
    setIsLoadingAI(true)
    try {
      const typeLabel = getTypeLabel(accommodation.type)
      const prompt = `Geef gedetailleerde informatie over deze ${typeLabel}: "${accommodation.name}"${accommodation.address ? ` gelegen in ${accommodation.address}` : ''}.

Geef de informatie terug als JSON in dit format:
{
  "description": "Gedetailleerde beschrijving van de accommodatie",
  "amenities": ["faciliteit 1", "faciliteit 2", "faciliteit 3"],
  "priceRange": "Prijsindicatie (bijv. '€15-25 per persoon per nacht')",
  "additionalInfo": "Extra nuttige informatie zoals openingstijden, regels, etc."
}

Geef ALLEEN geldige JSON terug, geen extra tekst. Als je bepaalde informatie niet weet, gebruik dan lege strings of lege arrays.`

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

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`)
      }

      const data = await response.json()
      let text = ''
      if (data.candidates?.[0]?.content?.parts) {
        text = data.candidates[0].content.parts.map((p: any) => p.text || '').join('').trim()
      }

      // Parse JSON from response
      let jsonText = text.trim()
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '')
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```\n?/g, '')
      }

      try {
        const parsed = JSON.parse(jsonText)
        
        // Update accommodation with enhanced data
        setAccommodation(prev => ({
          ...prev,
          description: parsed.description || prev.description,
          amenities: parsed.amenities || prev.amenities,
          priceRange: parsed.priceRange || prev.priceRange,
        }))

        // Store AI info for display
        setAiInfo({
          description: parsed.description,
          amenities: parsed.amenities,
          priceRange: parsed.priceRange,
          additionalInfo: parsed.additionalInfo,
        })

        setShowDetails(true)
      } catch (parseError) {
        // Try to extract JSON from text
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0])
            setAccommodation(prev => ({
              ...prev,
              description: parsed.description || prev.description,
              amenities: parsed.amenities || prev.amenities,
              priceRange: parsed.priceRange || prev.priceRange,
            }))
            setAiInfo({
              description: parsed.description,
              amenities: parsed.amenities,
              priceRange: parsed.priceRange,
              additionalInfo: parsed.additionalInfo,
            })
            setShowDetails(true)
          } catch (e) {
            console.error('Parse error:', e)
            alert('Kon de AI response niet verwerken. Probeer het later opnieuw.')
          }
        } else {
          alert('Kon geen gestructureerde informatie ophalen. Probeer het later opnieuw.')
        }
      }
    } catch (error) {
      console.error('Error fetching AI info:', error)
      alert(`Kon geen extra informatie ophalen: ${error instanceof Error ? error.message : 'Onbekende fout'}. Probeer het later opnieuw.`)
    } finally {
      setIsLoadingAI(false)
    }
  }

  return (
    <>
      <div className="rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-background-dark overflow-hidden hover:shadow-md transition-shadow">
        <div className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-bold text-[#111418] dark:text-white flex-1">
              {accommodation.name}
            </h3>
            <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded ${getTypeColor(accommodation.type)}`}>
              {getTypeLabel(accommodation.type)}
            </span>
          </div>

          {/* Address */}
          {accommodation.address && (
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-base text-[#617589] dark:text-gray-400 mt-0.5">
                location_on
              </span>
              <div className="flex-1">
                <p className="text-sm text-[#617589] dark:text-gray-400">
                  {accommodation.address}
                </p>
                {accommodation.latitude && accommodation.longitude && (
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${accommodation.latitude}&mlon=${accommodation.longitude}&zoom=15`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline mt-0.5 inline-flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-xs">map</span>
                    Bekijk op kaart
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Description (if available) */}
          {accommodation.description && (
            <p className="text-sm text-[#617589] dark:text-gray-400 line-clamp-2">
              {accommodation.description}
            </p>
          )}

          {/* Distance and Capacity */}
          <div className="flex items-center gap-4 flex-wrap">
            {accommodation.distance !== undefined && (
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-[#617589] dark:text-gray-400">
                  straighten
                </span>
                <p className="text-sm text-[#617589] dark:text-gray-400">
                  {accommodation.distance.toFixed(1)} km
                </p>
              </div>
            )}
            {accommodation.capacity && (
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-[#617589] dark:text-gray-400">
                  groups
                </span>
                <p className="text-sm text-[#617589] dark:text-gray-400">
                  Tot {accommodation.capacity} personen
                </p>
              </div>
            )}
          </div>

          {/* Contact Info */}
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700 space-y-2">
            {accommodation.phone && (
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-[#617589] dark:text-gray-400">
                  phone
                </span>
                <a
                  href={`tel:${accommodation.phone}`}
                  className="text-sm text-primary hover:underline"
                >
                  {accommodation.phone}
                </a>
              </div>
            )}

            {accommodation.website ? (
              <WebsiteLink
                url={accommodation.website}
                name={accommodation.name}
                location={accommodation.address}
                onVerifyWebsite={verifyWebsite}
              />
            ) : (
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-[#617589] dark:text-gray-400">
                  language
                </span>
                <button
                  onClick={findWebsite}
                  disabled={isFindingWebsite}
                  className="text-sm text-primary hover:underline flex items-center gap-1 disabled:opacity-50"
                >
                  {isFindingWebsite ? (
                    <>
                      <span className="material-symbols-outlined text-xs animate-spin">sync</span>
                      Zoeken...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-xs">search</span>
                      Zoek website met AI
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex gap-2">
            <button
              onClick={() => setShowDetails(true)}
              className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-[#111418] dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Meer informatie
            </button>
            <button
              onClick={handleAIInfo}
              disabled={isLoadingAI}
              className="flex items-center justify-center gap-2 rounded-lg bg-primary text-white px-4 py-2 text-sm font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoadingAI ? (
                <>
                  <span className="material-symbols-outlined text-base animate-spin">sync</span>
                  <span>Zoeken...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">auto_awesome</span>
                  <span>AI Info</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {showDetails && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setShowDetails(false)}
        >
          <div
            className="bg-white dark:bg-[#111418] rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded ${getTypeColor(accommodation.type)}`}>
                      {getTypeLabel(accommodation.type)}
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-[#111418] dark:text-white">
                    {accommodation.name}
                  </h2>
                </div>
                <button
                  onClick={() => setShowDetails(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <span className="material-symbols-outlined text-[#111418] dark:text-white">close</span>
                </button>
              </div>

              {/* Address */}
              {accommodation.address && (
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-base text-[#617589] dark:text-gray-400 mt-0.5">
                    location_on
                  </span>
                  <div className="flex-1">
                    <p className="text-sm text-[#617589] dark:text-gray-400">
                      {accommodation.address}
                    </p>
                    {accommodation.latitude && accommodation.longitude && (
                      <a
                        href={`https://www.openstreetmap.org/?mlat=${accommodation.latitude}&mlon=${accommodation.longitude}&zoom=15`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline mt-1 inline-flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-xs">map</span>
                        Bekijk op OpenStreetMap
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Description */}
              {(accommodation.description || aiInfo?.description) && (
                <div>
                  <h3 className="text-sm font-semibold text-[#111418] dark:text-white mb-2">Beschrijving</h3>
                  <p className="text-sm text-[#617589] dark:text-gray-400">
                    {aiInfo?.description || accommodation.description}
                  </p>
                </div>
              )}

              {/* Amenities */}
              {(accommodation.amenities || aiInfo?.amenities) && (
                <div>
                  <h3 className="text-sm font-semibold text-[#111418] dark:text-white mb-2">Faciliteiten</h3>
                  <div className="flex flex-wrap gap-2">
                    {(aiInfo?.amenities || accommodation.amenities || []).map((amenity, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-[#617589] dark:text-gray-400 rounded"
                      >
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional Info */}
              {aiInfo?.additionalInfo && (
                <div>
                  <h3 className="text-sm font-semibold text-[#111418] dark:text-white mb-2">Extra informatie</h3>
                  <p className="text-sm text-[#617589] dark:text-gray-400">
                    {aiInfo.additionalInfo}
                  </p>
                </div>
              )}

              {/* Contact Info */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                <h3 className="text-sm font-semibold text-[#111418] dark:text-white mb-2">Contact</h3>
                {accommodation.phone && (
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-[#617589] dark:text-gray-400">
                      phone
                    </span>
                    <a
                      href={`tel:${accommodation.phone}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {accommodation.phone}
                    </a>
                  </div>
                )}
                {accommodation.email && (
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-[#617589] dark:text-gray-400">
                      email
                    </span>
                    <a
                      href={`mailto:${accommodation.email}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {accommodation.email}
                    </a>
                  </div>
                )}
                {accommodation.website ? (
                  <WebsiteLink
                    url={accommodation.website}
                    name={accommodation.name}
                    location={accommodation.address}
                    onVerifyWebsite={verifyWebsite}
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-[#617589] dark:text-gray-400">
                      language
                    </span>
                    <button
                      onClick={findWebsite}
                      disabled={isFindingWebsite}
                      className="text-sm text-primary hover:underline flex items-center gap-1 disabled:opacity-50"
                    >
                      {isFindingWebsite ? (
                        <>
                          <span className="material-symbols-outlined text-xs animate-spin">sync</span>
                          Zoeken...
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-xs">search</span>
                          Zoek website met AI
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                {accommodation.distance !== undefined && (
                  <div>
                    <p className="text-xs text-[#617589] dark:text-gray-400">Afstand</p>
                    <p className="text-lg font-semibold text-[#111418] dark:text-white">
                      {accommodation.distance.toFixed(1)} km
                    </p>
                  </div>
                )}
                {accommodation.capacity && (
                  <div>
                    <p className="text-xs text-[#617589] dark:text-gray-400">Capaciteit</p>
                    <p className="text-lg font-semibold text-[#111418] dark:text-white">
                      Tot {accommodation.capacity} personen
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
