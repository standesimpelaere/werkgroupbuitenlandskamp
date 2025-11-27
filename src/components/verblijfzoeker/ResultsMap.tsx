import { useEffect, useRef, useMemo } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Accommodation } from '../../types/accommodation'

interface ResultsMapProps {
  accommodations: Accommodation[]
  searchCoordinates?: { lat: number; lon: number }
  searchLocation?: string
}

// Fix for default marker icons in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// Default center (Brussels)
const defaultCenter: [number, number] = [50.8503, 4.3517]

// Get marker color based on type
const getMarkerColor = (type: Accommodation['type']): string => {
  switch (type) {
    case 'hostel':
      return '#137fec' // Primary blue
    case 'camping':
      return '#10b981' // Green
    case 'youth_movement':
      return '#8b5cf6' // Purple
    default:
      return '#6b7280' // Gray
  }
}

// Create custom icon
const createMarkerIcon = (color: string): L.DivIcon => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: ${color};
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  })
}

export default function ResultsMap({ accommodations, searchCoordinates, searchLocation }: ResultsMapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const markersRef = useRef<L.Marker[]>([])

  // Filter valid accommodations
  const validAccommodations = useMemo(() => {
    return accommodations.filter(acc => acc.latitude && acc.longitude)
  }, [accommodations])

  // Calculate map center and bounds
  const { center, bounds } = useMemo(() => {
    if (validAccommodations.length === 0) {
      return {
        center: searchCoordinates ? [searchCoordinates.lat, searchCoordinates.lon] as [number, number] : defaultCenter,
        bounds: null,
      }
    }

    // Calculate bounds to fit all markers
    const lats = validAccommodations.map(acc => acc.latitude!).filter(Boolean)
    const lngs = validAccommodations.map(acc => acc.longitude!).filter(Boolean)

    if (lats.length === 0 || lngs.length === 0) {
      return {
        center: searchCoordinates ? [searchCoordinates.lat, searchCoordinates.lon] as [number, number] : defaultCenter,
        bounds: null,
      }
    }

    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)
    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)

    const centerLat = (minLat + maxLat) / 2
    const centerLng = (minLng + maxLng) / 2

    return {
      center: [centerLat, centerLng] as [number, number],
      bounds: [[minLat, minLng], [maxLat, maxLng]] as [[number, number], [number, number]],
    }
  }, [validAccommodations, searchCoordinates])

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    // Create map
    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: true,
    })

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)

    mapRef.current = map

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  // Update map view and markers
  useEffect(() => {
    if (!mapRef.current) return

    const map = mapRef.current

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove())
    markersRef.current = []

    // Add search location marker
    if (searchCoordinates) {
      const searchMarker = L.marker([searchCoordinates.lat, searchCoordinates.lon], {
        icon: L.divIcon({
          className: 'search-marker',
          html: `<div style="
            background-color: #ef4444;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 6px rgba(0,0,0,0.4);
          "></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        }),
      })
        .addTo(map)
        .bindPopup(searchLocation || 'Zoeklocatie')
      markersRef.current.push(searchMarker)
    }

    // Add accommodation markers
    validAccommodations.forEach((accommodation) => {
      if (!accommodation.latitude || !accommodation.longitude) return

      const marker = L.marker([accommodation.latitude, accommodation.longitude], {
        icon: createMarkerIcon(getMarkerColor(accommodation.type)),
      })
        .addTo(map)
        .bindPopup(`
          <div style="min-width: 200px;">
            <strong>${accommodation.name}</strong><br>
            ${accommodation.type === 'hostel' ? 'Jeugdherberg' : accommodation.type === 'camping' ? 'Camping' : 'Jeugdbeweging'}<br>
            ${accommodation.address ? `<small>${accommodation.address}</small><br>` : ''}
            ${accommodation.distance !== undefined ? `<small>${accommodation.distance.toFixed(1)} km</small>` : ''}
          </div>
        `)
      markersRef.current.push(marker)
    })

    // Fit bounds or set center/zoom
    if (bounds && validAccommodations.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] })
    } else {
      map.setView(center, 12)
    }
  }, [validAccommodations, searchCoordinates, searchLocation, center, bounds])

  if (validAccommodations.length === 0 && !searchCoordinates) {
    return null
  }

  return (
    <div className="rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-background-dark overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-[#111418] dark:text-white">
          Kaartweergave
        </h3>
        <p className="text-xs text-[#617589] dark:text-gray-400 mt-1">
          {validAccommodations.length} locatie{validAccommodations.length !== 1 ? 's' : ''} op de kaart
        </p>
      </div>
      <div 
        ref={mapContainerRef}
        className="w-full h-[400px] z-0"
        style={{ minHeight: '400px' }}
      />
      
      {/* Legend */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap gap-4 text-xs">
          {searchCoordinates && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow-sm"></div>
              <span className="text-[#617589] dark:text-gray-400">Zoeklocatie</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-primary border-2 border-white shadow-sm"></div>
            <span className="text-[#617589] dark:text-gray-400">Jeugdherbergen</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow-sm"></div>
            <span className="text-[#617589] dark:text-gray-400">Campings</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-purple-500 border-2 border-white shadow-sm"></div>
            <span className="text-[#617589] dark:text-gray-400">Jeugdbewegingen</span>
          </div>
        </div>
      </div>
    </div>
  )
}
