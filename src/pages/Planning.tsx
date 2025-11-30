import { useEffect, useState } from 'react'
import { ScheduleItem, VersionId } from '../types'
import { useVersion } from '../context/VersionContext'
import { supabase } from '../lib/supabase'

interface DaySchedule {
  date: string
  day: string
  activities: ScheduleItem[]
}

type ViewMode = 'simple' | 'overview' | 'detail'

function getTableName(version: VersionId): string {
  return `planning_schedule_${version}`
}

export default function Planning() {
  const { currentVersion, getScheduleData } = useVersion()
  const [schedule, setSchedule] = useState<DaySchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('simple')
  const [selectedDayTab, setSelectedDayTab] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<{ day: string; index: number; field?: 'time' | 'activity' } | null>(null)
  const [editValue, setEditValue] = useState('')

  useEffect(() => {
    loadSchedule()
  }, [currentVersion])

  const loadSchedule = async () => {
    try {
      setLoading(true)
      const data = await getScheduleData()
      
      if (data.length > 0) {
        // Group by day
        const groupedByDay: { [key: string]: DaySchedule } = {}
        data.forEach((item) => {
          const dayKey = `${item.date}-${item.day}`
          if (!groupedByDay[dayKey]) {
            groupedByDay[dayKey] = {
              date: item.date,
              day: item.day,
              activities: [],
            }
          }
          groupedByDay[dayKey].activities.push(item)
        })
        const scheduleArray = Object.values(groupedByDay).sort((a, b) => {
          return new Date(a.date).getTime() - new Date(b.date).getTime()
        })
        setSchedule(scheduleArray)
        if (scheduleArray.length > 0) {
          setSelectedDayTab(scheduleArray[0].day)
        }
      } else {
        loadScheduleFromCSV()
      }
    } catch (error) {
      console.error('Error loading schedule:', error)
      loadScheduleFromCSV()
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (viewMode === 'detail' && schedule.length > 0 && !selectedDayTab) {
      setSelectedDayTab(schedule[0].day)
    }
  }, [viewMode, schedule, selectedDayTab])

  const loadScheduleFromCSV = async () => {
    try {
      setLoading(true)
      const response = await fetch('/kampplanning_ai_friendly.csv')
      if (!response.ok) {
        throw new Error('CSV file not found')
      }
      const text = await response.text()
      
      const lines = text.trim().split('\n')
      const data: ScheduleItem[] = []

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue

        const values: string[] = []
        let current = ''
        let inQuotes = false

        for (let j = 0; j < line.length; j++) {
          const char = line[j]
          if (char === '"') {
            inQuotes = !inQuotes
          } else if (char === ',' && !inQuotes) {
            values.push(current.trim())
            current = ''
          } else {
            current += char
          }
        }
        values.push(current.trim())

        if (values.length >= 4) {
          data.push({
            date: values[0] || '',
            day: values[1] || '',
            time: values[2] || '',
            activity: values[3] || '',
          })
        }
      }

      const groupedByDay: { [key: string]: DaySchedule } = {}
      data.forEach((item) => {
        const dayKey = `${item.date}-${item.day}`
        if (!groupedByDay[dayKey]) {
          groupedByDay[dayKey] = {
            date: item.date,
            day: item.day,
            activities: [],
          }
        }
        groupedByDay[dayKey].activities.push(item)
      })

      const scheduleArray = Object.values(groupedByDay).sort((a, b) => {
        return new Date(a.date).getTime() - new Date(b.date).getTime()
      })

      setSchedule(scheduleArray)
      if (scheduleArray.length > 0) {
        setSelectedDayTab(scheduleArray[0].day)
      }
      
      // Save to database
      await saveScheduleToDatabase(data)
    } catch (error) {
      console.error('Error loading schedule:', error)
      setSchedule([])
    } finally {
      setLoading(false)
    }
  }

  const saveScheduleToDatabase = async (items: ScheduleItem[]) => {
    try {
      const tableName = getTableName(currentVersion)
      
      // Check if data already exists
      const { data: existingData, error: checkError } = await supabase
        .from(tableName)
        .select('id')
        .limit(1)

      if (checkError) throw checkError

      // Only save if table is empty or we're explicitly overwriting
      if (existingData && existingData.length > 0) {
        // Data already exists, don't overwrite from CSV
        return
      }

      // Clear and insert new data
      await supabase.from(tableName).delete().neq('id', '00000000-0000-0000-0000-000000000000')
      if (items.length > 0) {
        await supabase.from(tableName).insert(items.map(item => ({
          date: item.date,
          day: item.day,
          time: item.time,
          activity: item.activity,
        })))
      }
    } catch (error) {
      console.error('Error saving schedule to database:', error)
    }
  }

  const parseTime = (timeStr: string): { start: number; end: number } | null => {
    const match = timeStr.match(/(\d{2}):(\d{2})-(\d{2}):(\d{2})/)
    if (!match) return null

    const startHour = parseInt(match[1], 10)
    const startMin = parseInt(match[2], 10)
    const endHour = parseInt(match[3], 10)
    const endMin = parseInt(match[4], 10)

    return {
      start: startHour * 60 + startMin,
      end: endHour * 60 + endMin,
    }
  }

  const formatTime = (timeStr: string): string => {
    return timeStr
  }


  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('nl-BE', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  const formatDateFull = (dateStr: string): string => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('nl-BE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  const isUnscheduled = (activity: string): boolean => {
    return activity.trim() === '?' || activity.trim() === ''
  }

  const isBusrit = (activity: string): boolean => {
    const lower = activity.toLowerCase()
    return lower.includes('busrit') || lower.includes('vertrek') || lower.includes('aankomst') || lower.includes('toekomen')
  }

  const getActivityColor = (activity: string): string => {
    if (isBusrit(activity)) {
      return 'border-purple-600 bg-purple-100 dark:bg-purple-900/30'
    }
    if (isUnscheduled(activity)) {
      return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
    }
    
    const lower = activity.toLowerCase()
    if (lower.includes('eten') || lower.includes('maaltijd') || lower.includes('ontbijt') || lower.includes('avondmaal') || lower.includes('middagmaal')) {
      return 'border-green-500 bg-green-50 dark:bg-green-900/20'
    }
    if (lower.includes('slapen') || lower.includes('rust')) {
      return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
    }
    if (lower.includes('activiteit') || lower.includes('avondact')) {
      return 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
    }
    
    return 'border-gray-300 bg-white dark:bg-gray-800'
  }

  const getAllTimeSlots = (): number[] => {
    const allTimes = new Set<number>()
    schedule.forEach((day) => {
      day.activities.forEach((act) => {
        const timeInfo = parseTime(act.time)
        if (timeInfo) {
          allTimes.add(timeInfo.start)
          allTimes.add(timeInfo.end)
        }
      })
    })
    return Array.from(allTimes).sort((a, b) => a - b)
  }


  const filteredSchedule = schedule.filter((daySchedule) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      daySchedule.day.toLowerCase().includes(query) ||
      daySchedule.date.toLowerCase().includes(query) ||
      daySchedule.activities.some((act) => act.activity.toLowerCase().includes(query))
    )
  })

  const handleEditStart = (day: string, index: number, field: 'time' | 'activity', currentValue: string) => {
    setEditingItem({ day, index, field })
    setEditValue(currentValue)
  }

  const handleEditSave = async (day: string, index: number) => {
    if (!editingItem) return

    const daySchedule = schedule.find(d => d.day === day)
    if (!daySchedule) return

    const activity = daySchedule.activities[index]
    if (!activity || !activity.id) {
      // New item, create it
      const newActivity: ScheduleItem = {
        date: daySchedule.date,
        day: daySchedule.day,
        time: editingItem.field === 'time' ? editValue : activity.time,
        activity: editingItem.field === 'activity' ? editValue : activity.activity,
      }
      
      try {
        const tableName = getTableName(currentVersion)
        const { data, error } = await supabase
          .from(tableName)
          .insert(newActivity)
          .select()
          .single()

        if (error) throw error

        const updatedSchedule = schedule.map(daySched => {
          if (daySched.day === day) {
            return {
              ...daySched,
              activities: [...daySched.activities, { ...newActivity, id: data.id }],
            }
          }
          return daySched
        })
        setSchedule(updatedSchedule)
      } catch (error) {
        console.error('Error saving activity:', error)
      }
    } else {
      // Update existing
      const tableName = getTableName(currentVersion)
      const field = editingItem.field
      if (!field) return
      
      const newValue = editValue

      try {
        const updateData: any = { updated_at: new Date().toISOString() }
        updateData[field] = newValue
        
        const { error } = await supabase
          .from(tableName)
          .update(updateData)
          .eq('id', activity.id)

        if (error) throw error

        const updatedSchedule = schedule.map(daySched => {
          if (daySched.day === day) {
            return {
              ...daySched,
              activities: daySched.activities.map((act, idx) => {
                if (idx === index) {
                  const updated: any = { ...act }
                  updated[field] = newValue
                  return updated
                }
                return act
              }),
            }
          }
          return daySched
        })
        setSchedule(updatedSchedule)
      } catch (error) {
        console.error('Error updating activity:', error)
      }
    }

    setEditingItem(null)
    setEditValue('')
  }

  const handleEditCancel = () => {
    setEditingItem(null)
    setEditValue('')
  }


  if (loading) {
    return (
      <div className="p-4 md:p-8 pt-16 md:pt-8">
        <div className="text-center py-12">
          <p className="text-[#617589] dark:text-gray-400">Planning laden...</p>
        </div>
      </div>
    )
  }

  const timeSlots = getAllTimeSlots()
  const minTime = timeSlots.length > 0 ? Math.floor(timeSlots[0] / 60) * 60 : 0
  const maxTime = timeSlots.length > 0 ? Math.ceil(timeSlots[timeSlots.length - 1] / 60) * 60 : 24 * 60
  const hourHeight = 60 // pixels per hour

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6 pt-16 md:pt-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="uppercase text-xs font-semibold tracking-[0.25em] text-primary">Kamp Planning</p>
          <h1 className="text-[#111418] dark:text-white text-4xl font-black leading-tight tracking-[-0.033em]">
            Activiteiten Planning
          </h1>
          <p className="text-[#617589] dark:text-gray-400 text-sm max-w-2xl">
            10-dagen overzicht van alle geplande activiteiten tijdens het kamp.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadScheduleFromCSV}
            className="flex items-center gap-2 rounded-lg border border-[#dbe0e6] dark:border-gray-700 px-4 py-2 text-sm font-semibold text-[#111418] dark:text-white hover:bg-gray-100 dark:hover:bg-white/10"
          >
            <span className="material-symbols-outlined text-base">refresh</span>
            <span>Vernieuw</span>
          </button>
          <button className="flex items-center gap-2 rounded-lg bg-primary text-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-primary/90">
            <span className="material-symbols-outlined text-base">download</span>
            <span>Exporteer</span>
          </button>
        </div>
      </div>

      {/* View Toggle - Left Side */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setViewMode('simple')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            viewMode === 'simple'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-gray-100 dark:bg-gray-900 text-[#617589] dark:text-gray-400 hover:text-[#111418] dark:hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-base">view_week</span>
          <span>Simple Overview</span>
        </button>
        <button
          onClick={() => setViewMode('overview')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            viewMode === 'overview'
              ? 'bg-white dark:bg-gray-800 text-[#111418] dark:text-white shadow-sm'
              : 'bg-gray-100 dark:bg-gray-900 text-[#617589] dark:text-gray-400 hover:text-[#111418] dark:hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-base">calendar_view_week</span>
          <span>10-Dagen Overzicht</span>
        </button>
        <button
          onClick={() => setViewMode('detail')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            viewMode === 'detail'
              ? 'bg-white dark:bg-gray-800 text-[#111418] dark:text-white shadow-sm'
              : 'bg-gray-100 dark:bg-gray-900 text-[#617589] dark:text-gray-400 hover:text-[#111418] dark:hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-base">view_day</span>
          <span>Detail Per Dag</span>
        </button>
      </div>

      {/* Simple Overview View */}
      {viewMode === 'simple' && (
        <div className="space-y-6">
          {schedule.map((daySchedule, dayIndex) => {
            // Find all bus activities
            const busActivities = daySchedule.activities.filter(act => isBusrit(act.activity))
            
            // Extract route from bus activity
            const extractRoute = (activity: string): { from?: string; to?: string } | null => {
              const lower = activity.toLowerCase()
              // Look for arrow patterns or "naar" patterns
              if (lower.includes('→') || lower.includes('->') || lower.includes('naar')) {
                const arrowMatch = activity.match(/(.+?)[→-]+>(.+)/i) || 
                                  activity.match(/(.+?)\s+naar\s+(.+)/i)
                if (arrowMatch) {
                  return {
                    from: arrowMatch[1].trim(),
                    to: arrowMatch[2].trim()
                  }
                }
              }
              // Try to extract city names
              const cities = ['torhout', 'neurenberg', 'bratislava', 'frymburk', 'wenen']
              const foundCities: string[] = []
              cities.forEach(city => {
                if (lower.includes(city)) {
                  foundCities.push(city.charAt(0).toUpperCase() + city.slice(1))
                }
              })
              if (foundCities.length >= 2) {
                return {
                  from: foundCities[0],
                  to: foundCities[1]
                }
              }
              // If only one city found, try to get from previous day or context
              if (foundCities.length === 1) {
                // Check previous day for location
                if (dayIndex > 0) {
                  const prevDay = schedule[dayIndex - 1]
                  const prevLocation = prevDay.activities.find(act => 
                    act.activity.toLowerCase().includes('neurenberg') ||
                    act.activity.toLowerCase().includes('bratislava') ||
                    act.activity.toLowerCase().includes('frymburk')
                  )
                  if (prevLocation) {
                    const prevLower = prevLocation.activity.toLowerCase()
                    if (prevLower.includes('neurenberg')) return { from: 'Neurenberg', to: foundCities[0] }
                    if (prevLower.includes('bratislava')) return { from: 'Bratislava', to: foundCities[0] }
                    if (prevLower.includes('frymburk')) return { from: 'Frymburk', to: foundCities[0] }
                  }
                }
              }
              return null
            }

            // Combine vertrek and aankomst into one busrit
            const vertrek = busActivities.find(act => 
              act.activity.toLowerCase().includes('vertrek')
            )
            const aankomst = busActivities.find(act => 
              act.activity.toLowerCase().includes('aankomst')
            )

            // Determine route - prefer from combined info
            let busRoute: { from?: string; to?: string } | null = null
            if (vertrek) {
              busRoute = extractRoute(vertrek.activity)
            }
            if (!busRoute && aankomst) {
              busRoute = extractRoute(aankomst.activity)
            }
            // If still no route, try to combine vertrek and aankomst info
            if (!busRoute && vertrek && aankomst) {
              const vertrekLower = vertrek.activity.toLowerCase()
              const aankomstLower = aankomst.activity.toLowerCase()
              const cities = ['torhout', 'neurenberg', 'bratislava', 'frymburk', 'wenen']
              const fromCity = cities.find(city => vertrekLower.includes(city))
              const toCity = cities.find(city => aankomstLower.includes(city))
              if (fromCity && toCity) {
                busRoute = {
                  from: fromCity.charAt(0).toUpperCase() + fromCity.slice(1),
                  to: toCity.charAt(0).toUpperCase() + toCity.slice(1)
                }
              }
            }

            // Check if this is a day trip (like Wenen on day 7)
            const isDayTrip = daySchedule.activities.some(act => 
              act.activity.toLowerCase().includes('dagtrip') ||
              act.activity.toLowerCase().includes('dagtocht') ||
              (act.activity.toLowerCase().includes('wenen') && !isBusrit(act.activity))
            )

            // Determine where we sleep this night (verblijfplaats)
            // Based on user specification:
            // Day 1: Neurenberg, Day 2: Bus, Days 3-7: Bratislava, Days 8-9: Frymburk, Day 10: Bus
            let verblijfplaats: string | null = null
            
            const dayNumber = parseInt(daySchedule.day.replace(/[^0-9]/g, '')) || dayIndex + 1
            
            // Direct mapping based on day number
            if (dayNumber === 1) {
              verblijfplaats = 'Neurenberg'
            } else if (dayNumber === 2) {
              verblijfplaats = 'Bus'
            } else if (dayNumber >= 3 && dayNumber <= 7) {
              verblijfplaats = 'Bratislava'
            } else if (dayNumber === 8 || dayNumber === 9) {
              verblijfplaats = 'Frymburk'
            } else if (dayNumber === 10) {
              verblijfplaats = 'Bus'
            }
            
            // Fallback: try to detect from activities if day number parsing fails
            if (!verblijfplaats) {
              // First, check if there's a "slapen" activity that mentions a location
              const slapenActivity = daySchedule.activities.find(act => 
                act.activity.toLowerCase().includes('slapen') ||
                act.activity.toLowerCase().includes('overnachten')
              )
              
              if (slapenActivity) {
                const slapenLower = slapenActivity.activity.toLowerCase()
                if (slapenLower.includes('bus')) {
                  verblijfplaats = 'Bus'
                } else if (slapenLower.includes('neurenberg')) {
                  verblijfplaats = 'Neurenberg'
                } else if (slapenLower.includes('bratislava')) {
                  verblijfplaats = 'Bratislava'
                } else if (slapenLower.includes('frymburk')) {
                  verblijfplaats = 'Frymburk'
                }
              }
              
              // If not found, check for camping/accommodation mentions
              if (!verblijfplaats) {
                const accommodation = daySchedule.activities.find(act => 
                  act.activity.toLowerCase().includes('camping') ||
                  act.activity.toLowerCase().includes('accommodatie') ||
                  act.activity.toLowerCase().includes('verblijf')
                )
                
                if (accommodation) {
                  const actLower = accommodation.activity.toLowerCase()
                  if (actLower.includes('neurenberg')) {
                    verblijfplaats = 'Neurenberg'
                  } else if (actLower.includes('bratislava')) {
                    verblijfplaats = 'Bratislava'
                  } else if (actLower.includes('frymburk')) {
                    verblijfplaats = 'Frymburk'
                  } else if (actLower.includes('bus')) {
                    verblijfplaats = 'Bus'
                  }
                }
              }
              
              // If still not found, check if next day starts with a busrit from a location
              if (!verblijfplaats && dayIndex < schedule.length - 1) {
                const nextDay = schedule[dayIndex + 1]
                const nextDayBusrit = nextDay.activities.find(act => 
                  isBusrit(act.activity) && act.activity.toLowerCase().includes('vertrek')
                )
                
                if (nextDayBusrit) {
                  const nextDayLower = nextDayBusrit.activity.toLowerCase()
                  if (nextDayLower.includes('neurenberg')) {
                    verblijfplaats = 'Neurenberg'
                  } else if (nextDayLower.includes('bratislava')) {
                    verblijfplaats = 'Bratislava'
                  } else if (nextDayLower.includes('frymburk')) {
                    verblijfplaats = 'Frymburk'
                  }
                }
              }
              
              // If still not found, check if we arrive somewhere today (we sleep there)
              if (!verblijfplaats && aankomst) {
                const aankomstLower = aankomst.activity.toLowerCase()
                if (aankomstLower.includes('neurenberg')) {
                  verblijfplaats = 'Neurenberg'
                } else if (aankomstLower.includes('bratislava')) {
                  verblijfplaats = 'Bratislava'
                } else if (aankomstLower.includes('frymburk')) {
                  verblijfplaats = 'Frymburk'
                }
              }
              
              // If still not found, check previous day's location (if we don't leave today)
              if (!verblijfplaats && dayIndex > 0 && !vertrek) {
                const prevDay = schedule[dayIndex - 1]
                const prevDayActivities = prevDay.activities.map(a => a.activity.toLowerCase()).join(' ')
                if (prevDayActivities.includes('neurenberg')) {
                  verblijfplaats = 'Neurenberg'
                } else if (prevDayActivities.includes('bratislava')) {
                  verblijfplaats = 'Bratislava'
                } else if (prevDayActivities.includes('frymburk')) {
                  verblijfplaats = 'Frymburk'
                }
              }
            }

            // Find accommodation/location for display (exclude day trips)
            const accommodation = !isDayTrip ? daySchedule.activities.find(act => 
              act.activity.toLowerCase().includes('camping') ||
              act.activity.toLowerCase().includes('accommodatie') ||
              act.activity.toLowerCase().includes('neurenberg') ||
              act.activity.toLowerCase().includes('bratislava') ||
              act.activity.toLowerCase().includes('frymburk')
            ) : null

            // Extract location name for header badge
            let location = null
            if (accommodation) {
              const actLower = accommodation.activity.toLowerCase()
              if (actLower.includes('neurenberg')) location = 'Neurenberg (Duitsland)'
              else if (actLower.includes('bratislava')) location = 'Bratislava (Slowakije)'
              else if (actLower.includes('frymburk')) location = 'Frymburk (Tsjechië)'
              else if (actLower.includes('wenen')) location = 'Wenen (Oostenrijk)'
            } else if (isDayTrip) {
              // For day trips, show the destination
              const dayTripAct = daySchedule.activities.find(act => 
                act.activity.toLowerCase().includes('wenen')
              )
              if (dayTripAct) {
                location = 'Dagtrip: Wenen'
              }
            }

            // Get all activities for day planning (including bus activities)
            const allActivities = daySchedule.activities.filter(act => 
              act.activity.trim() !== '?' &&
              act.activity.trim() !== ''
            )

            return (
              <div key={daySchedule.day} className="bg-white dark:bg-background-dark rounded-xl border border-[#dbe0e6] dark:border-gray-700 overflow-hidden">
                {/* Day Header */}
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-b border-[#dbe0e6] dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-[#111418] dark:text-white">{daySchedule.day}</h3>
                        <p className="text-sm text-[#617589] dark:text-gray-400">{formatDate(daySchedule.date)}</p>
                      </div>
                      {verblijfplaats && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                          <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-base">hotel</span>
                          <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">Verblijf: {verblijfplaats}</span>
                        </div>
                      )}
                    </div>
                    {location && (
                      <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        isDayTrip 
                          ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                          : 'bg-primary/10 text-primary'
                      }`}>
                        {location}
                      </div>
                    )}
                  </div>
                </div>

                {/* Important Moments - Busrit with route */}
                {(vertrek || aankomst) && busRoute && (
                  <div className="p-4 border-b border-[#dbe0e6] dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-[#617589] dark:text-gray-400 mb-3">Belangrijke Momenten</h4>
                    <div className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-purple-600 dark:text-purple-400 text-lg">directions_bus</span>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-[#617589] dark:text-gray-400 uppercase mb-1">Busrit</p>
                        <p className="text-sm font-medium text-[#111418] dark:text-white mb-2">
                          {busRoute.from} → {busRoute.to}
                        </p>
                        <div className="flex flex-wrap gap-4 text-xs text-[#617589] dark:text-gray-400">
                          {vertrek && vertrek.time && (
                            <div>
                              <span className="font-semibold">Vertrek:</span> {vertrek.time}
                            </div>
                          )}
                          {aankomst && aankomst.time && (
                            <div>
                              <span className="font-semibold">Aankomst:</span> {aankomst.time}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Day Schedule - Time-based (includes bus activities) */}
                {allActivities.length > 0 && (
                  <div className="p-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-[#617589] dark:text-gray-400 mb-3">Dagplanning</h4>
                    <div className="space-y-2">
                      {allActivities.map((act, idx) => {
                        const timeInfo = parseTime(act.time)
                        const isBus = isBusrit(act.activity)
                        const actRoute = isBus ? extractRoute(act.activity) : null
                        
                        return (
                          <div key={idx} className={`flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                            isBus ? 'bg-purple-50/30 dark:bg-purple-900/10 border-l-2 border-purple-500' : ''
                          }`}>
                            {act.time && (
                              <div className="flex-shrink-0 w-16 text-right">
                                <p className="text-sm font-medium text-[#111418] dark:text-white">
                                  {timeInfo ? `${String(Math.floor(timeInfo.start / 60)).padStart(2, '0')}:${String(timeInfo.start % 60).padStart(2, '0')}` : act.time}
                                </p>
                              </div>
                            )}
                            <div className="flex-1">
                              {isBus && actRoute ? (
                                <div>
                                  <p className="text-sm font-medium text-[#111418] dark:text-white">
                                    Busrit: {actRoute.from} → {actRoute.to}
                                  </p>
                                  {act.activity !== `Busrit ${actRoute.from} → ${actRoute.to}` && (
                                    <p className="text-xs text-[#617589] dark:text-gray-400 mt-0.5">{act.activity}</p>
                                  )}
                                </div>
                              ) : (
                                <p className="text-sm text-[#111418] dark:text-white">{act.activity}</p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* 10-Dagen Overview View */}
      {viewMode === 'overview' && (
        <div className="rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-background-dark overflow-hidden flex flex-col h-[calc(100vh-200px)]">
          {/* Sticky Header */}
          <div className="flex-shrink-0 overflow-hidden border-b border-[#dbe0e6] dark:border-gray-700 bg-gray-50 dark:bg-gray-900 z-20" ref={(el) => {
            if (el) {
              const scrollContainer = el.parentElement?.querySelector('.overflow-auto')
              if (scrollContainer) {
                el.scrollLeft = scrollContainer.scrollLeft
              }
            }
          }}>
            <div className="flex">
              {/* Time Column Header */}
              <div className="flex-shrink-0 w-16 border-r border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-gray-800 sticky left-0 z-30 p-2 flex items-end justify-center">
                <span className="text-xs font-bold text-[#617589] dark:text-gray-400">Uur</span>
              </div>
              
              {/* Days Headers */}
              {filteredSchedule.map((daySchedule) => {
                const unscheduledCount = daySchedule.activities.filter((act) => isUnscheduled(act.activity)).length
                return (
                  <div
                    key={daySchedule.day}
                    className="flex-shrink-0 w-48 border-r border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-gray-800 p-2 text-center"
                  >
                    <h3 className="text-sm font-bold text-[#111418] dark:text-white truncate">{daySchedule.day}</h3>
                    <p className="text-xs text-[#617589] dark:text-gray-400 truncate">{formatDate(daySchedule.date)}</p>
                    {unscheduledCount > 0 && (
                      <span className="inline-flex items-center mt-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 px-1.5 py-0.5 text-[10px] font-semibold text-yellow-800 dark:text-yellow-300">
                        {unscheduledCount} ?
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-auto relative" onScroll={(e) => {
            const header = e.currentTarget.previousElementSibling
            if (header) {
              header.scrollLeft = e.currentTarget.scrollLeft
            }
          }}>
            <div className="flex">
              {/* Sticky Time Column */}
              <div className="flex-shrink-0 w-16 border-r border-[#dbe0e6] dark:border-gray-700 bg-gray-50 dark:bg-gray-900 sticky left-0 z-10">
                {Array.from({ length: Math.ceil((maxTime - minTime) / 60) }, (_, i) => {
                  const hour = Math.floor(minTime / 60) + i
                  if (hour >= 24) return null
                  return (
                    <div
                      key={hour}
                      className="h-16 border-b border-[#dbe0e6] dark:border-gray-700 p-1 relative"
                      style={{ height: `${hourHeight}px` }}
                    >
                      <p className="text-[10px] font-semibold text-[#617589] dark:text-gray-400 absolute -top-2 right-1 bg-gray-50 dark:bg-gray-900 px-1">
                        {String(hour).padStart(2, '0')}:00
                      </p>
                    </div>
                  )
                })}
              </div>

              {/* Days Columns */}
              {filteredSchedule.map((daySchedule) => {
                return (
                  <div
                    key={daySchedule.day}
                    className="flex-shrink-0 w-48 border-r border-[#dbe0e6] dark:border-gray-700 relative bg-white dark:bg-background-dark"
                    style={{ height: `${((maxTime - minTime) / 60) * hourHeight}px` }}
                  >
                    {/* Horizontal Hour Lines */}
                    {Array.from({ length: Math.ceil((maxTime - minTime) / 60) }, (_, i) => (
                      <div
                        key={i}
                        className="absolute w-full border-b border-gray-100 dark:border-gray-800"
                        style={{ top: `${i * hourHeight}px`, height: '1px' }}
                      />
                    ))}

                    {/* Activities */}
                     {daySchedule.activities.map((activity, index) => {
                       const timeInfo = parseTime(activity.time)
                       if (!timeInfo) return null

                       const top = ((timeInfo.start - minTime) / 60) * hourHeight
                       const height = ((timeInfo.end - timeInfo.start) / 60) * hourHeight
                       const isEditing = editingItem?.day === daySchedule.day && editingItem?.index === index
                       const isEditingActivity = editingItem?.field === 'activity'

                      // Check for overlaps
                      const overlapping = daySchedule.activities.filter((otherAct, otherIndex) => {
                        if (otherIndex === index) return false
                        const otherTime = parseTime(otherAct.time)
                        if (!otherTime) return false
                        return !(
                          timeInfo.end <= otherTime.start || timeInfo.start >= otherTime.end
                        )
                      })

                      const overlapIndex = overlapping.findIndex((otherAct) => {
                        const otherTime = parseTime(otherAct.time)
                        if (!otherTime) return false
                        return otherTime.start < timeInfo.start
                      })

                      const widthCalc = overlapping.length > 0 
                        ? `calc((100% - 8px) / ${overlapping.length + 1})` 
                        : 'calc(100% - 8px)'
                      
                      // Simple simple overlap handling for now: push to right if overlap
                      // Ideally we would calculate columns properly
                      const leftOffset = overlapIndex >= 0 ? `calc(4px + ${overlapIndex + 1} * ((100% - 8px) / ${overlapping.length + 1}))` : '4px'

                      return (
                        <div
                          key={index}
                          className={`absolute rounded border-l-4 ${getActivityColor(activity.activity)} shadow-sm p-1 overflow-hidden hover:z-20 hover:shadow-md transition-all ${
                            isBusrit(activity.activity) ? 'ring-1 ring-purple-400 dark:ring-purple-600' : ''
                          }`}
                          style={{
                            top: `${top}px`,
                            height: `${Math.max(height, 30)}px`, // Min height for readability
                            left: overlapping.length > 0 ? leftOffset : '4px',
                            width: widthCalc,
                            zIndex: isBusrit(activity.activity) ? 15 : 10,
                          }}
                          onClick={(e) => {
                            if (!isEditing) {
                              e.stopPropagation()
                              handleEditStart(daySchedule.day, index, 'activity', activity.activity)
                            }
                          }}
                          title={`${activity.time} - ${activity.activity}`}
                        >
                          {isEditing && isEditingActivity ? (
                            <textarea
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault()
                                  handleEditSave(daySchedule.day, index)
                                }
                                if (e.key === 'Escape') {
                                  handleEditCancel()
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                              className="w-full h-full p-1 rounded border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-background-dark text-[10px] focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                            />
                          ) : (
                            <>
                              <div className="flex items-center justify-between gap-1 mb-0.5">
                                <p className="text-[9px] font-bold text-[#111418] dark:text-white truncate">
                                  {activity.time}
                                </p>
                              </div>
                              <p
                                className={`text-[10px] font-medium leading-tight ${
                                  isUnscheduled(activity.activity)
                                    ? 'text-yellow-700 dark:text-yellow-400 italic'
                                    : isBusrit(activity.activity)
                                    ? 'text-purple-800 dark:text-purple-300 font-bold'
                                    : 'text-[#111418] dark:text-white'
                                }`}
                              >
                                {isUnscheduled(activity.activity) ? '?' : activity.activity}
                              </p>
                            </>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Detail View with Tabs - Compact */}
      {viewMode === 'detail' && (
        <div className="space-y-4">
          {/* Day Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#dbe0e6] dark:border-gray-700">
            {filteredSchedule.map((daySchedule) => {
              const unscheduledCount = daySchedule.activities.filter((act) => isUnscheduled(act.activity)).length
              const isActive = selectedDayTab === daySchedule.day
              return (
                <button
                  key={daySchedule.day}
                  onClick={() => setSelectedDayTab(daySchedule.day)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-white dark:bg-background-dark text-primary border-t-2 border-x-2 border-primary'
                      : 'text-[#617589] dark:text-gray-400 hover:text-[#111418] dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5'
                  }`}
                >
                  <span>{daySchedule.day}</span>
                  {unscheduledCount > 0 && (
                    <span className="inline-flex items-center rounded-full bg-yellow-100 dark:bg-yellow-900/30 px-2 py-0.5 text-[10px] font-semibold text-yellow-800 dark:text-yellow-300">
                      {unscheduledCount}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Selected Day Detail - Compact */}
          {selectedDayTab && (
            <div className="rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-background-dark p-6">
              {filteredSchedule
                .filter((day) => day.day === selectedDayTab)
                .map((daySchedule) => {
                  // Extract location from activities (e.g., "Toekomen Neurenberg" -> "Neurenberg")
                   const locations: string[] = []
                   daySchedule.activities.forEach((act) => {
                     const lower = act.activity.toLowerCase()
                     if (lower.includes('neurenberg') && !locations.includes('Neurenberg')) locations.push('Neurenberg')
                     if (lower.includes('bratislava') && !locations.includes('Bratislava')) locations.push('Bratislava')
                     if (lower.includes('wenen') && !locations.includes('Wenen')) locations.push('Wenen')
                     if (lower.includes('frymburk') && !locations.includes('Frymburk')) locations.push('Frymburk')
                     if (lower.includes('torhout') && !locations.includes('Torhout')) locations.push('Torhout')
                   })
                   const uniqueLocations = locations

                  // Group activities by type
                  const busritten = daySchedule.activities.filter((act) => isBusrit(act.activity))
                  const maaltijden = daySchedule.activities.filter((act) => {
                    const lower = act.activity.toLowerCase()
                    return lower.includes('eten') || lower.includes('maaltijd') || lower.includes('ontbijt') || lower.includes('avondmaal') || lower.includes('middagmaal') || lower.includes('picknick')
                  })
                  const activiteiten = daySchedule.activities.filter((act) => {
                    const lower = act.activity.toLowerCase()
                    return !isBusrit(act.activity) && !maaltijden.includes(act) && !lower.includes('slapen') && !lower.includes('rust')
                  })

                  return (
                    <div key={daySchedule.day} className="space-y-6">
                      {/* Header */}
                      <div className="border-b border-[#dbe0e6] dark:border-gray-700 pb-4">
                        <h2 className="text-2xl font-bold text-[#111418] dark:text-white">{daySchedule.day}</h2>
                        <p className="text-sm text-[#617589] dark:text-gray-400 mt-1">{formatDateFull(daySchedule.date)}</p>
                      </div>

                      {/* Location */}
                      {uniqueLocations.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-[#617589] dark:text-gray-400 mb-2">
                            Locatie
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {uniqueLocations.map((loc, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium"
                              >
                                <span className="material-symbols-outlined text-base mr-1">location_on</span>
                                {loc}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Compact Timeline */}
                      <div>
                        <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-[#617589] dark:text-gray-400 mb-3">
                          Tijdlijn
                        </h3>
                        <div className="space-y-1">
                          {daySchedule.activities.map((activity, index) => {
                            const isEditing = editingItem?.day === daySchedule.day && editingItem?.index === index
                            const isEditingTime = editingItem?.field === 'time'
                            const isEditingActivity = editingItem?.field === 'activity'
                            return (
                              <div
                                key={index}
                                className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-gray-50 dark:hover:bg-white/5"
                              >
                                <div className="w-20 flex-shrink-0">
                                  {isEditing && isEditingTime ? (
                                    <input
                                      type="text"
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          handleEditSave(daySchedule.day, index)
                                        }
                                        if (e.key === 'Escape') {
                                          handleEditCancel()
                                        }
                                      }}
                                      autoFocus
                                      className="w-full px-2 py-1 rounded border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-background-dark text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                  ) : (
                                    <p
                                      className="text-xs font-medium text-[#617589] dark:text-gray-400 cursor-pointer hover:text-primary"
                                      onClick={() => handleEditStart(daySchedule.day, index, 'time', activity.time)}
                                    >
                                      {formatTime(activity.time)}
                                    </p>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  {isEditing && isEditingActivity ? (
                                    <input
                                      type="text"
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          handleEditSave(daySchedule.day, index)
                                        }
                                        if (e.key === 'Escape') {
                                          handleEditCancel()
                                        }
                                      }}
                                      autoFocus
                                      className="w-full px-2 py-1 rounded border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-background-dark text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                  ) : (
                                    <p
                                      className={`text-sm font-medium ${
                                        isUnscheduled(activity.activity)
                                          ? 'text-yellow-700 dark:text-yellow-400 italic'
                                          : isBusrit(activity.activity)
                                          ? 'text-purple-800 dark:text-purple-300 font-bold'
                                          : 'text-[#111418] dark:text-white'
                                      } cursor-pointer hover:underline`}
                                      onClick={() => handleEditStart(daySchedule.day, index, 'activity', activity.activity)}
                                    >
                                      {isUnscheduled(activity.activity) ? 'Nog te bepalen' : activity.activity}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Activities List by Category */}
                      {(activiteiten.length > 0 || busritten.length > 0) && (
                        <div>
                          <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-[#617589] dark:text-gray-400 mb-3">
                            Activiteiten
                          </h3>
                          <div className="space-y-2">
                            {busritten.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-purple-700 dark:text-purple-400 mb-1">Busritten:</p>
                                <ul className="list-disc list-inside space-y-1 text-sm text-[#111418] dark:text-white">
                                  {busritten.map((act, idx) => (
                                    <li key={idx}>{act.activity}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {activiteiten.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-[#617589] dark:text-gray-400 mb-1">Overige activiteiten:</p>
                                <ul className="list-disc list-inside space-y-1 text-sm text-[#111418] dark:text-white">
                                  {activiteiten.map((act, idx) => (
                                    <li key={idx}>{act.activity}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Notities Section */}
                      <div>
                        <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-[#617589] dark:text-gray-400 mb-2">
                          Notities
                        </h3>
                        <textarea
                          placeholder="Voeg notities toe voor deze dag..."
                          className="w-full px-3 py-2 rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-background-light dark:bg-background-dark text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px]"
                        />
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </div>
      )}

      {filteredSchedule.length === 0 && (
        <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 px-4 py-12 text-center">
          <p className="text-[#617589] dark:text-gray-400">
            {searchQuery ? 'Geen activiteiten gevonden voor deze zoekopdracht.' : 'Geen planning geladen.'}
          </p>
        </div>
      )}
    </div>
  )
}
