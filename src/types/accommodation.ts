export type AccommodationType = 'hostel' | 'camping' | 'youth_movement'

export interface Accommodation {
  id: string
  name: string
  type: AccommodationType
  address?: string
  city?: string
  country?: string
  latitude?: number
  longitude?: number
  distance?: number // Distance in km from search location
  phone?: string
  email?: string
  website?: string
  description?: string
  capacity?: number
  priceRange?: string
  amenities?: string[]
  images?: string[]
}

