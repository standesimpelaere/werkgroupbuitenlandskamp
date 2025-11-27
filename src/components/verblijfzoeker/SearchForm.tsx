import { useState, useEffect, useRef } from 'react'

interface SearchFormProps {
  onSearch: (location: string, radius: number) => void
  resetTrigger?: number
}

interface Suggestion {
  display_name: string
  location_name: string
  lat: number
  lon: number
  type: string
  address: any
}

export default function SearchForm({ onSearch, resetTrigger }: SearchFormProps) {
  const [location, setLocation] = useState('')
  const [radius, setRadius] = useState(25)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Reset form when resetTrigger changes (new search started)
  useEffect(() => {
    if (resetTrigger !== undefined && resetTrigger > 0) {
      setSuggestions([])
      setShowSuggestions(false)
      setSelectedIndex(-1)
      inputRef.current?.blur()
    }
  }, [resetTrigger])

  // Debounced autocomplete
  useEffect(() => {
    if (location.length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    const timeoutId = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=5&addressdetails=1`,
          {
            headers: {
              'User-Agent': 'Verblijfzoeker/1.0',
            },
          }
        )
        
        if (!response.ok) {
          setSuggestions([])
          setShowSuggestions(false)
          return
        }

        const data = await response.json()
        
        const mappedSuggestions = data.map((item: any) => {
          const address = item.address || {}
          const displayName = item.display_name
          
          let locationName = ''
          if (address.city || address.town || address.village) {
            locationName = address.city || address.town || address.village
            if (address.state || address.country) {
              locationName += `, ${address.state || address.country}`
            }
          } else if (address.state) {
            locationName = address.state
            if (address.country) {
              locationName += `, ${address.country}`
            }
          } else {
            locationName = displayName.split(',').slice(0, 2).join(', ')
          }

          return {
            display_name: displayName,
            location_name: locationName,
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon),
            type: item.type,
            address: address,
          }
        })
        
        setSuggestions(mappedSuggestions)
        setShowSuggestions(mappedSuggestions.length > 0)
        setSelectedIndex(-1)
      } catch (error) {
        console.error('Autocomplete error:', error)
        setSuggestions([])
        setShowSuggestions(false)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [location])

  const handleSuggestionClick = (suggestion: Suggestion) => {
    setLocation(suggestion.location_name)
    setShowSuggestions(false)
    setSuggestions([])
    inputRef.current?.blur()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1))
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault()
      handleSuggestionClick(suggestions[selectedIndex])
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setShowSuggestions(false)
    setSuggestions([])
    setSelectedIndex(-1)
    if (location.trim()) {
      onSearch(location.trim(), radius)
    }
  }

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-lg font-semibold text-[#111418] dark:text-white mb-4">
        Zoek Accommodaties
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Location Input with Autocomplete */}
        <div className="relative">
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#617589] dark:text-gray-400">
            Locatie
          </label>
          <div className="relative mt-2">
            <input
              ref={inputRef}
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onFocus={() => location.length >= 2 && suggestions.length > 0 && setShowSuggestions(true)}
              onKeyDown={handleKeyDown}
              placeholder="Bijv. Torhout, België"
              className="w-full rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-background-light dark:bg-background-dark px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-[#111418] dark:text-white placeholder:text-gray-400"
              required
            />
            {showSuggestions && suggestions.length > 0 && (
              <div
                ref={suggestionsRef}
                className="absolute z-50 w-full mt-1 bg-white dark:bg-background-dark border border-[#dbe0e6] dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto"
              >
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSuggestionClick(suggestion)}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                      index === selectedIndex
                        ? 'bg-primary/10 text-primary'
                        : 'text-[#111418] dark:text-white'
                    }`}
                  >
                    <div className="font-medium">{suggestion.location_name}</div>
                    <div className="text-xs text-[#617589] dark:text-gray-400 truncate">
                      {suggestion.display_name}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Radius Input */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#617589] dark:text-gray-400">
            Straal (km)
          </label>
          <div className="mt-2 space-y-2">
            <input
              type="range"
              min="5"
              max="100"
              step="5"
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-[#617589] dark:text-gray-400">
              <span>5 km</span>
              <span className="font-semibold text-primary">{radius} km</span>
              <span>100 km</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search Button */}
      <button
        type="submit"
        className="w-full md:w-auto rounded-lg bg-primary text-white px-6 py-2.5 text-sm font-semibold shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
      >
        Zoeken
      </button>
    </form>
  )
}

