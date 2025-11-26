import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// --- TYPES & INTERFACES ---

type Tab = 'taken' | 'accommodatie' | 'dossiers' | 'roadmap'
type RoadmapViewMode = 'waves' | 'themes'
type SortOption = 'persoon' | 'status' | 'thema' | 'datum'

interface TeamMember {
  id: string
  name: string
}

// Taken
interface Task {
  id: string
  title: string
  description?: string
  assigneeId?: string | null
  category: 'Accommodatie' | 'Transport' | 'Activiteiten' | 'Algemeen' | 'Administratie' | 'Voeding' | 'Communicatie'
  priority: 'Hoog' | 'Middel' | 'Laag'
  status: 'Te doen' | 'Mee bezig' | 'Klaar' | 'Geblokkeerd' // Added Geblokkeerd for Kanban
  dueDate?: string
  order?: number
  progress?: string
}

interface Todo {
  id: string
  title: string
  completed: boolean
  order?: number
  created_at?: string
}

interface Question {
  id: string
  question: string
  askedBy: string
  recipients: string[] // 'everyone' or array of member IDs
  created_at: string
  answers?: Answer[]
}

interface Answer {
  id: string
  question_id: string
  answer: string
  answeredBy: string
  created_at: string
}

// Roadmap
interface RoadmapWave {
  id: string
  name: string
  start_date?: string
  end_date?: string
  order?: number
  created_at?: string
  updated_at?: string
}

interface RoadmapStep {
  id: string
  title: string
  completed: boolean
  order?: number
}

interface RoadmapAttachment {
  id: string
  item_id: string
  name: string
  type: 'file' | 'link'
  url: string
  size?: number
  created_at?: string
  updated_at?: string
}

interface RoadmapItem {
  id: string
  title: string
  description?: string
  wave_id: string
  theme: string
  status: 'Te doen' | 'Mee bezig' | 'Klaar'
  assignee_id?: string | null
  due_date?: string
  order?: number
  notes?: string
  steps?: RoadmapStep[]
  country?: 'Nederland' | 'België' | 'Frankrijk' | null
  is_current_wave?: boolean
  is_archived?: boolean
  created_at?: string
  updated_at?: string
}

interface ThemeNote {
  id: string
  theme: string
  country: 'Nederland' | 'België' | 'Frankrijk'
  content: string
  created_at?: string
  updated_at?: string
}

interface ThemeContribution {
  id: string
  theme: string
  country: 'Nederland' | 'België' | 'Frankrijk'
  content: string
  author_id?: string | null
  created_at?: string
}

interface ThemeAttachment {
  id: string
  theme: string
  country: 'Nederland' | 'België' | 'Frankrijk'
  name: string
  type: 'file' | 'link'
  url: string
  size?: number
  created_at?: string
}

interface RoadmapTheme {
  id: string
  name: string
  icon?: string
  color?: string
  order?: number
}

// Accommodaties
type ContactStatus = 
  | 'Niet gecontacteerd' 
  | 'Contact gelegd - Geen antwoord' 
  | 'In onderhandeling' 
  | 'Geen mogelijkheid' 
  | 'Geboekt'

interface AccommodationOption {
  id: string
  name: string
  address?: string
  website?: string
  price?: string
  contactStatus: ContactStatus
  contactPersonId?: string | null
  notes?: string
  isPreference: boolean
}

interface AccommodationLocation {
  id: string
  locationName: string
  region?: string
  options: AccommodationOption[]
}

// Persoonlijke Dossiers
interface FileLink {
  id: string
  name: string
  type: 'link' | 'file'
  url: string
  size?: number
}

interface MemberSpace {
  memberId: string
  notes: string
  files: FileLink[]
}

// --- CONSTANTS ---

const TEAM_MEMBERS: TeamMember[] = [
  { id: 'louis', name: 'Louis' },
  { id: 'michiel', name: 'Michiel' },
  { id: 'tim', name: 'Tim' },
  { id: 'douwe', name: 'Douwe' },
  { id: 'victor', name: 'Victor' },
  { id: 'stan', name: 'Stan' },
]

const INITIAL_TASKS: Task[] = [
  { id: '1', title: 'Informeren verblijfplaats Neurenberg', description: 'Onderzoek en contact opnemen met mogelijke campings in de omgeving van Neurenberg. Prijzen, beschikbaarheid en faciliteiten vergelijken.', category: 'Accommodatie', priority: 'Middel', status: 'Te doen', assigneeId: null },
  { id: '2', title: 'Informeren verblijfplaats Bratislava', description: 'Onderzoek en contact opnemen met mogelijke campings in de omgeving van Bratislava. Prijzen, beschikbaarheid en faciliteiten vergelijken.', category: 'Accommodatie', priority: 'Middel', status: 'Te doen', assigneeId: null },
  { id: '3', title: 'Informeren verblijfplaats Frymburk', description: 'Onderzoek en contact opnemen met mogelijke campings in de omgeving van Frymburk. Prijzen, beschikbaarheid en faciliteiten vergelijken. Let op: Camp Vresna heeft slechts 60 plekken beschikbaar!', category: 'Accommodatie', priority: 'Hoog', status: 'Te doen', assigneeId: null },
  { id: '4', title: 'Meerprijs dubbele bemanning checken', description: 'Voor de nachtritten (2 chauffeurs).', category: 'Transport', priority: 'Middel', status: 'Te doen', assigneeId: null },
  { id: '5', title: 'Busmaatschappij vastleggen en voorschot betalen', description: 'Offertes vergelijken en definitieve keuze maken.', category: 'Transport', priority: 'Hoog', status: 'Mee bezig', assigneeId: 'louis' },
  { id: '6', title: 'Gedetailleerde activiteitendagboeken uitwerken', description: 'Per dagdeel uitwerken wat we gaan doen.', category: 'Activiteiten', priority: 'Middel', status: 'Te doen', assigneeId: null },
  { id: '7', title: 'Menu samenstellen en boodschappenlijst maken', description: 'Rekening houden met allergieën en budget.', category: 'Voeding', priority: 'Middel', status: 'Te doen', assigneeId: 'victor' },
  { id: '8', title: 'Inschrijvingsformulier openstellen', description: 'Via de website en mail naar ouders.', category: 'Communicatie', priority: 'Hoog', status: 'Klaar', assigneeId: 'michiel' },
  { id: '9', title: 'Medische fiches verzamelen', description: 'Zorgen dat alles digitaal in orde is.', category: 'Administratie', priority: 'Laag', status: 'Te doen', assigneeId: 'tim' },
]

// Standaard Roadmap Thema's
const DEFAULT_THEMES: RoadmapTheme[] = [
  { id: 'campings', name: 'Campings', icon: 'camping', color: '#3b82f6', order: 1 },
  { id: 'vervoer', name: 'Vervoer', icon: 'directions_bus', color: '#10b981', order: 2 },
  { id: 'activiteiten', name: 'Activiteiten', icon: 'sports_soccer', color: '#f59e0b', order: 3 },
  { id: 'voeding', name: 'Voeding', icon: 'restaurant', color: '#ef4444', order: 4 },
  { id: 'administratie', name: 'Administratie', icon: 'description', color: '#8b5cf6', order: 5 },
  { id: 'communicatie', name: 'Communicatie', icon: 'chat', color: '#06b6d4', order: 6 },
  { id: 'financien', name: 'Financiën', icon: 'payments', color: '#ec4899', order: 7 },
  { id: 'algemeen', name: 'Algemeen', icon: 'folder', color: '#6b7280', order: 8 },
]

// Standaard Waves (seed data)
const DEFAULT_WAVES: Omit<RoadmapWave, 'id' | 'created_at' | 'updated_at'>[] = [
  { name: 'Wave 1', start_date: undefined, end_date: undefined, order: 1 },
  { name: 'Wave 2', start_date: undefined, end_date: undefined, order: 2 },
  { name: 'Wave 3', start_date: undefined, end_date: undefined, order: 3 },
  { name: 'Wave 4', start_date: undefined, end_date: undefined, order: 4 },
]

const INITIAL_ACCOMMODATIONS: AccommodationLocation[] = [
  { id: 'loc-1', locationName: 'Tussenstop Duitsland', region: 'Duitsland', options: [] },
  { id: 'loc-2', locationName: 'Bratislava', region: 'Slowakije', options: [
      { id: 'opt-1', name: 'Camping Zlate Piesky', address: 'Zlaté Piesky 4370/8, 82104 Bratislava', contactStatus: 'Geen mogelijkheid', contactPersonId: null, notes: 'Momenteel niet boekbaar volgens website.', isPreference: false },
      { id: 'opt-2', name: 'Huntrycamp', website: 'https://www.huntrycamp.sk/', price: '€10 kind / €19.5 volw', contactStatus: 'Niet gecontacteerd', contactPersonId: null, notes: 'Goed alternatief.', isPreference: false }
    ]
  },
  { id: 'loc-3', locationName: 'Frymburk', region: 'Tsjechië', options: [
      { id: 'opt-3', name: 'Camp Vresna', address: 'Frymburk 43, 382 79 Frymburk', website: 'https://camp-lipno.cz/cenik/', price: '~€4 p.n.', contactStatus: 'Niet gecontacteerd', contactPersonId: 'stan', notes: 'Let op: slechts 60 plekken!', isPreference: true },
      { id: 'opt-4', name: 'Camping Olšina', address: '382 23 Černá v Pošumaví', website: 'https://www.campingolsina.cz/', price: '~€11 p.n.', contactStatus: 'Contact gelegd - Geen antwoord', contactPersonId: null, notes: 'Antwoord ontvangen in verleden, nog geen definitieve prijs.', isPreference: false }
    ]
  }
]

// --- COMPONENTS ---

export default function Werkgroep() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const tabParam = searchParams.get('tab')
    return (tabParam === 'roadmap' || tabParam === 'taken' || tabParam === 'accommodatie' || tabParam === 'dossiers') 
      ? tabParam as Tab 
      : 'roadmap'
  })
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list')
  const [loading, setLoading] = useState(true)


  // Data
  const [tasks, setTasks] = useState<Task[]>([])
  const [accommodations, setAccommodations] = useState<AccommodationLocation[]>([])
  const [memberSpaces, setMemberSpaces] = useState<Record<string, MemberSpace>>({})

  // Modals
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [isAccModalOpen, setIsAccModalOpen] = useState(false)
  const [editingAccLocationId, setEditingAccLocationId] = useState<string | null>(null)
  const [editingAccOption, setEditingAccOption] = useState<AccommodationOption | null>(null)
  const [linkInputState, setLinkInputState] = useState<{ memberId: string, name: string, url: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadingForMemberId, setUploadingForMemberId] = useState<string | null>(null)
  

  // Roadmap state
  const [roadmapViewMode, setRoadmapViewMode] = useState<RoadmapViewMode>('themes')
  const [roadmapWaves, setRoadmapWaves] = useState<RoadmapWave[]>([])
  const [roadmapItems, setRoadmapItems] = useState<RoadmapItem[]>([])
  const [roadmapThemes, setRoadmapThemes] = useState<RoadmapTheme[]>([])
  const [isWaveModalOpen, setIsWaveModalOpen] = useState(false)
  const [editingWave, setEditingWave] = useState<RoadmapWave | null>(null)
  const [isRoadmapItemModalOpen, setIsRoadmapItemModalOpen] = useState(false)
  const [editingRoadmapItem, setEditingRoadmapItem] = useState<RoadmapItem | null>(null)
  const [sortOption, setSortOption] = useState<SortOption>('persoon')
  const [isThemePanelOpen, setIsThemePanelOpen] = useState(false)
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null)
  const [selectedCountry, setSelectedCountry] = useState<'Nederland' | 'België' | 'Frankrijk'>('Nederland')
  const [themeNotes, setThemeNotes] = useState<Record<string, Record<string, ThemeNote>>>({}) // theme -> country -> note
  const [themeContributions, setThemeContributions] = useState<Record<string, Record<string, ThemeContribution[]>>>({}) // theme -> country -> contributions[]
  const [themeAttachments, setThemeAttachments] = useState<Record<string, Record<string, ThemeAttachment[]>>>({}) // theme -> country -> attachments[]
  const [roadmapAttachments, setRoadmapAttachments] = useState<Record<string, RoadmapAttachment[]>>({})
  const [modalNotes, setModalNotes] = useState('')
  const [modalSteps, setModalSteps] = useState<RoadmapStep[]>([])
  const [newStepTitle, setNewStepTitle] = useState('')
  const [attachmentLinkInput, setAttachmentLinkInput] = useState<{ name: string; url: string } | null>(null)
  const roadmapAttachmentFileInputRef = useRef<HTMLInputElement>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [draggedItem, setDraggedItem] = useState<RoadmapItem | null>(null)
  const [modalIsCurrentWave, setModalIsCurrentWave] = useState(false)
  const [reorderMode, setReorderMode] = useState<Record<string, boolean>>({})
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // Load data from database
  useEffect(() => {
    loadAllData()
  }, [])

  // Handle query parameters for linking to specific items
  useEffect(() => {
    const itemId = searchParams.get('itemId')
    const tabParam = searchParams.get('tab')
    
    if (tabParam === 'roadmap') {
      setActiveTab('roadmap')
    }
    
    if (itemId && roadmapItems.length > 0) {
      const item = roadmapItems.find(i => i.id === itemId)
      if (item) {
        // Open the item modal
        setEditingRoadmapItem(item)
        setModalNotes(item.notes || '')
        setModalSteps(item.steps || [])
        setNewStepTitle('')
        setAttachmentLinkInput(null)
        setIsRoadmapItemModalOpen(true)
        // Clean up URL
        setSearchParams({})
      }
    }
  }, [searchParams, roadmapItems, setSearchParams])

  const loadAllData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        loadAccommodations(),
        loadMemberSpaces(),
        loadRoadmapData(),
      ])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }


  const loadRoadmapData = async () => {
    try {
      // Try to setup tables if they don't exist
      await setupRoadmapTables()
      
      await Promise.all([
        loadRoadmapWaves(),
        loadRoadmapItems(),
        loadRoadmapThemes(),
        loadThemeData(),
      ])
    } catch (error) {
      console.error('Error loading roadmap data:', error)
    }
  }

  const replaceOldCampingItems = async () => {
    try {
      // Check if new items already exist first
      const { data: existing } = await supabase
        .from('werkgroep_roadmap_items')
        .select('id, title')
        .in('title', [
          'Informeren verblijfplaats Neurenberg',
          'Informeren verblijfplaats Bratislava',
          'Informeren verblijfplaats Frymburk'
        ])

      const existingTitles = existing?.map(e => e.title) || []
      
      // If all three new items already exist, only clean up old items
      if (existingTitles.length >= 3) {
        // Find and delete old camping items that are not the new ones
        const { data: oldItems } = await supabase
          .from('werkgroep_roadmap_items')
          .select('id')
          .eq('theme', 'Campings')
          .or('title.ilike.%Camp Vresna%,title.ilike.%Camping Duitsland%,title.ilike.%Camping Neurenberg%,title.ilike.%Mogelijke campings vastleggen%,title.ilike.%Contact opnemen met Camp%,title.ilike.%Concreet beeld krijgen over mogelijke campings%')

        if (oldItems && oldItems.length > 0) {
          await supabase
            .from('werkgroep_roadmap_items')
            .delete()
            .in('id', oldItems.map(item => item.id))
        }
        return // Exit early if all items already exist
      }

      // Find old camping items (both old format and new format that needs updating)
      const { data: oldItems } = await supabase
        .from('werkgroep_roadmap_items')
        .select('*')
        .eq('theme', 'Campings')
        .or('title.ilike.%Camp Vresna%,title.ilike.%Camping Duitsland%,title.ilike.%Camping Neurenberg%,title.ilike.%Mogelijke campings vastleggen%,title.ilike.%Contact opnemen met Camp%,title.ilike.%Concreet beeld krijgen over mogelijke campings%')

      // Get first wave
      const { data: waves } = await supabase
        .from('werkgroep_roadmap_waves')
        .select('id')
        .order('order', { ascending: true })
        .limit(1)

      const waveId = waves && waves.length > 0 ? waves[0].id : null
      if (!waveId) return

      // Delete old items
      if (oldItems && oldItems.length > 0) {
        await supabase
          .from('werkgroep_roadmap_items')
          .delete()
          .in('id', oldItems.map(item => item.id))
      }

      // Insert new items only if they don't exist
      const itemsToInsert = []

      if (!existingTitles.includes('Informeren verblijfplaats Neurenberg')) {
        itemsToInsert.push({
          title: 'Informeren verblijfplaats Neurenberg',
          description: 'Onderzoek en contact opnemen met mogelijke campings in de omgeving van Neurenberg. Prijzen, beschikbaarheid en faciliteiten vergelijken.',
          wave_id: waveId,
          theme: 'Campings',
          status: 'Te doen',
          assignee_id: null,
          due_date: null,
          country: null,
          order: 0
        })
      }
      if (!existingTitles.includes('Informeren verblijfplaats Bratislava')) {
        itemsToInsert.push({
          title: 'Informeren verblijfplaats Bratislava',
          description: 'Onderzoek en contact opnemen met mogelijke campings in de omgeving van Bratislava. Prijzen, beschikbaarheid en faciliteiten vergelijken.',
          wave_id: waveId,
          theme: 'Campings',
          status: 'Te doen',
          assignee_id: null,
          due_date: null,
          country: null,
          order: 1
        })
      }
      if (!existingTitles.includes('Informeren verblijfplaats Frymburk')) {
        itemsToInsert.push({
          title: 'Informeren verblijfplaats Frymburk',
          description: 'Onderzoek en contact opnemen met mogelijke campings in de omgeving van Frymburk. Prijzen, beschikbaarheid en faciliteiten vergelijken. Let op: Camp Vresna heeft slechts 60 plekken beschikbaar!',
          wave_id: waveId,
          theme: 'Campings',
          status: 'Te doen',
          assignee_id: null,
          due_date: null,
          country: null,
          order: 2
        })
      }

      if (itemsToInsert.length > 0) {
        await supabase
          .from('werkgroep_roadmap_items')
          .insert(itemsToInsert)
      }
    } catch (error) {
      console.error('Error replacing old camping items:', error)
    }
  }

  const loadThemeData = async () => {
    try {
      const countries: ('Nederland' | 'België' | 'Frankrijk')[] = ['Nederland', 'België', 'Frankrijk']
      
      // Load theme notes
      const { data: notesData } = await supabase
        .from('werkgroep_theme_notes')
        .select('*')
      
      if (notesData) {
        const notesMap: Record<string, Record<string, ThemeNote>> = {}
        notesData.forEach(note => {
          if (!notesMap[note.theme]) notesMap[note.theme] = {}
          notesMap[note.theme][note.country] = {
            id: note.id,
            theme: note.theme,
            country: note.country,
            content: note.content,
            created_at: note.created_at,
            updated_at: note.updated_at,
          }
        })
        setThemeNotes(notesMap)
      }

      // Load theme contributions
      const { data: contributionsData } = await supabase
        .from('werkgroep_theme_contributions')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (contributionsData) {
        const contributionsMap: Record<string, Record<string, ThemeContribution[]>> = {}
        contributionsData.forEach(contrib => {
          if (!contributionsMap[contrib.theme]) contributionsMap[contrib.theme] = {}
          if (!contributionsMap[contrib.theme][contrib.country]) contributionsMap[contrib.theme][contrib.country] = []
          contributionsMap[contrib.theme][contrib.country].push({
            id: contrib.id,
            theme: contrib.theme,
            country: contrib.country,
            content: contrib.content,
            author_id: contrib.author_id || null,
            created_at: contrib.created_at,
          })
        })
        setThemeContributions(contributionsMap)
      }

      // Load theme attachments
      const { data: attachmentsData } = await supabase
        .from('werkgroep_theme_attachments')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (attachmentsData) {
        const attachmentsMap: Record<string, Record<string, ThemeAttachment[]>> = {}
        attachmentsData.forEach(att => {
          if (!attachmentsMap[att.theme]) attachmentsMap[att.theme] = {}
          if (!attachmentsMap[att.theme][att.country]) attachmentsMap[att.theme][att.country] = []
          attachmentsMap[att.theme][att.country].push({
            id: att.id,
            theme: att.theme,
            country: att.country,
            name: att.name,
            type: att.type as 'file' | 'link',
            url: att.url,
            size: att.size || undefined,
            created_at: att.created_at,
          })
        })
        setThemeAttachments(attachmentsMap)
      }
    } catch (error) {
      console.error('Error loading theme data:', error)
    }
  }

  const setupRoadmapTables = async () => {
    try {
      // Check if tables exist
      const { error: wavesError } = await supabase
        .from('werkgroep_roadmap_waves')
        .select('id')
        .limit(1)

      if (wavesError && wavesError.code === '42P01') {
        // Tables don't exist - we need to create them
        // Since we can't create tables via the client, we'll show a message
        // The user should run the SQL script in Supabase SQL Editor
        console.log('Roadmap tables need to be created. Please run roadmap_schema.sql in Supabase SQL Editor.')
        return false
      }

      return true
    } catch (error) {
      console.log('Error checking tables:', error)
      return false
    }
  }

  const loadRoadmapWaves = async () => {
    try {
      const { data, error } = await supabase
        .from('werkgroep_roadmap_waves')
        .select('*')
        .order('order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true })

      if (error) {
        if (error.code === '42P01') {
          // Table doesn't exist yet, use default waves
          setRoadmapWaves([])
          return
        }
        throw error
      }

      if (data && data.length > 0) {
        setRoadmapWaves(data.map(w => ({
          id: w.id,
          name: w.name,
          start_date: w.start_date || undefined,
          end_date: w.end_date || undefined,
          order: w.order || undefined,
          created_at: w.created_at,
          updated_at: w.updated_at,
        })))
      } else {
        // Seed default waves if empty
        await seedDefaultWaves()
      }
    } catch (error) {
      console.error('Error loading roadmap waves:', error)
    }
  }

  const seedDefaultWaves = async () => {
    try {
      const { data: existingData } = await supabase
        .from('werkgroep_roadmap_waves')
        .select('id')
        .limit(1)

      if (existingData && existingData.length > 0) {
        await loadRoadmapWaves()
        return
      }

      const wavesToInsert = DEFAULT_WAVES.map(w => ({
        name: w.name,
        start_date: w.start_date || null,
        end_date: w.end_date || null,
        order: w.order || 0,
      }))

      const { error } = await supabase
        .from('werkgroep_roadmap_waves')
        .insert(wavesToInsert)

      if (error) {
        if (error.code === '42P01' || error.code === '23505') {
          await loadRoadmapWaves()
          return
        }
        throw error
      }
      await loadRoadmapWaves()
    } catch (error) {
      console.error('Error seeding waves:', error)
      await loadRoadmapWaves()
    }
  }

  const ensureFirstItemsInCurrentWave = async (items: RoadmapItem[]) => {
    try {
      // Check if any items are already marked as current wave
      const hasCurrentWaveItems = items.some(item => item.is_current_wave === true && !item.is_archived)
      
      if (hasCurrentWaveItems) return // Don't auto-set if user has already set items
      
      // Group items by theme and get first non-archived item of each theme
      const themeGroups: Record<string, RoadmapItem[]> = {}
      items
        .filter(item => !item.is_archived)
        .forEach(item => {
          if (!themeGroups[item.theme]) {
            themeGroups[item.theme] = []
          }
          themeGroups[item.theme].push(item)
        })
      
      // Sort each group by order, then by created_at
      Object.keys(themeGroups).forEach(theme => {
        themeGroups[theme].sort((a, b) => {
          const orderDiff = (a.order || 999) - (b.order || 999)
          if (orderDiff !== 0) return orderDiff
          return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
        })
      })
      
      // Mark first item of each theme as current wave
      const itemsToUpdate: string[] = []
      Object.keys(themeGroups).forEach(theme => {
        const firstItem = themeGroups[theme][0]
        if (firstItem && !firstItem.is_current_wave) {
          itemsToUpdate.push(firstItem.id)
        }
      })
      
      if (itemsToUpdate.length > 0) {
        await supabase
          .from('werkgroep_roadmap_items')
          .update({ is_current_wave: true })
          .in('id', itemsToUpdate)
        
        // Reload items to reflect changes
        await loadRoadmapItems()
      }
    } catch (error) {
      console.error('Error ensuring first items in current wave:', error)
    }
  }

  const loadRoadmapItems = async () => {
    try {
      // First, replace old camping items with new location-based ones
      await replaceOldCampingItems()
      
      let query = supabase
        .from('werkgroep_roadmap_items')
        .select('*')
      
      // Filter out archived items unless showArchived is true
      if (!showArchived) {
        query = query.eq('is_archived', false)
      }
      
      const { data, error } = await query
        .order('order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })

      if (error) {
        if (error.code === '42P01') {
          setRoadmapItems([])
          return
        }
        throw error
      }

      if (data && data.length > 0) {
        const items = data.map(item => ({
          id: item.id,
          title: item.title,
          description: item.description || undefined,
          wave_id: item.wave_id,
          theme: item.theme,
          status: item.status as RoadmapItem['status'],
          assignee_id: item.assignee_id || null,
          due_date: item.due_date || undefined,
          order: item.order || undefined,
          notes: item.notes || undefined,
          steps: (item.steps ? (Array.isArray(item.steps) ? item.steps : JSON.parse(item.steps)) : []) as RoadmapStep[],
          country: item.country as RoadmapItem['country'] || null,
          is_current_wave: item.is_current_wave || false,
          is_archived: item.is_archived || false,
          created_at: item.created_at,
          updated_at: item.updated_at,
        }))
        setRoadmapItems(items)

        // Automatically set first item of each category to current wave if none are set
        await ensureFirstItemsInCurrentWave(items)

        // Load attachments for all items
        const itemIds = items.map(i => i.id)
        if (itemIds.length > 0) {
          const { data: attachmentsData } = await supabase
            .from('werkgroep_roadmap_attachments')
            .select('*')
            .in('item_id', itemIds)

          if (attachmentsData) {
            const attachmentsMap: Record<string, RoadmapAttachment[]> = {}
            attachmentsData.forEach(att => {
              if (!attachmentsMap[att.item_id]) {
                attachmentsMap[att.item_id] = []
              }
              attachmentsMap[att.item_id].push({
                id: att.id,
                item_id: att.item_id,
                name: att.name,
                type: att.type as 'file' | 'link',
                url: att.url,
                size: att.size || undefined,
                created_at: att.created_at,
                updated_at: att.updated_at,
              })
            })
            setRoadmapAttachments(attachmentsMap)
          }
        }
      } else {
        // Seed roadmap items from existing tasks if empty
        await seedRoadmapItemsFromTasks()
      }
    } catch (error) {
      console.error('Error loading roadmap items:', error)
    }
  }

  const seedRoadmapItemsFromTasks = async () => {
    try {
      // First ensure waves exist
      let { data: wavesData } = await supabase
        .from('werkgroep_roadmap_waves')
        .select('*')
        .order('order', { ascending: true })

      if (!wavesData || wavesData.length === 0) {
        await seedDefaultWaves()
        // Reload waves
        const { data: reloadedWaves } = await supabase
          .from('werkgroep_roadmap_waves')
          .select('*')
          .order('order', { ascending: true })
        if (!reloadedWaves || reloadedWaves.length === 0) return
        wavesData = reloadedWaves
      }

      // Map category to theme name
      const categoryToTheme: Record<string, string> = {
        'Accommodatie': 'Campings',
        'Transport': 'Vervoer',
        'Activiteiten': 'Activiteiten',
        'Voeding': 'Voeding',
        'Administratie': 'Administratie',
        'Communicatie': 'Communicatie',
        'Algemeen': 'Algemeen',
      }

      // Determine wave based on task priority and category
      const getWaveForTask = (task: Task): string => {
        // High priority items usually need to be done earlier
        if (task.priority === 'Hoog' && task.status !== 'Klaar') {
          return wavesData.find(w => w.order === 1)?.id || wavesData[0]?.id
        }
        // Completed items go to early waves (already done)
        if (task.status === 'Klaar') {
          return wavesData.find(w => w.order === 1)?.id || wavesData[0]?.id
        }
        // In progress items are usually in middle waves
        if (task.status === 'Mee bezig') {
          return wavesData.find(w => w.order === 2)?.id || wavesData[1]?.id || wavesData[0]?.id
        }
        // Default: spread across middle waves
        return wavesData.find(w => w.order === 2)?.id || wavesData[1]?.id || wavesData[0]?.id
      }

      // Get all tasks from database
      const { data: tasksData } = await supabase
        .from('werkgroep_tasks')
        .select('*')

      if (!tasksData || tasksData.length === 0) {
        // Use INITIAL_TASKS if no tasks in DB
        const itemsToInsert = INITIAL_TASKS.map((task, index) => {
          const waveId = getWaveForTask(task)
          const theme = categoryToTheme[task.category] || 'Algemeen'
          
          return {
            title: task.title,
            description: task.description || null,
            wave_id: waveId,
            theme: theme,
            status: task.status === 'Klaar' ? 'Klaar' : task.status === 'Mee bezig' ? 'Mee bezig' : 'Te doen',
            assignee_id: task.assigneeId || null,
            due_date: task.dueDate || null,
            order: index,
          }
        })

        const { error: insertError } = await supabase
          .from('werkgroep_roadmap_items')
          .insert(itemsToInsert)

        if (insertError && insertError.code !== '42P01') {
          console.error('Error seeding roadmap items:', insertError)
        } else {
          await loadRoadmapItems()
        }
        return
      }

      // Create roadmap items from existing tasks
      const itemsToInsert = tasksData.map((task, index) => {
        const waveId = getWaveForTask({
          id: task.id,
          title: task.title,
          category: task.category as Task['category'],
          priority: task.priority as Task['priority'],
          status: task.status as Task['status'],
          assigneeId: task.assignee_id,
        })
        const theme = categoryToTheme[task.category] || 'Algemeen'
        
        return {
          title: task.title,
          description: task.description || null,
          wave_id: waveId,
          theme: theme,
          status: task.status === 'Klaar' ? 'Klaar' : task.status === 'Mee bezig' ? 'Mee bezig' : 'Te doen',
          assignee_id: task.assignee_id || null,
          due_date: task.due_date || null,
          order: index,
        }
      })

      // Add some general roadmap items that are logical
      const generalItems = [
        {
          title: 'Offertes busmaatschappij verzamelen',
          description: 'Verschillende busmaatschappijen contacteren voor offertes',
          wave_id: wavesData.find(w => w.order === 1)?.id || wavesData[0]?.id,
          theme: 'Vervoer',
          status: 'Te doen' as const,
          assignee_id: null,
          due_date: null,
          order: itemsToInsert.length + 1,
        },
        {
          title: 'Dagplanning ruw',
          description: 'Ruwe schets maken van dagindeling en activiteiten',
          wave_id: wavesData.find(w => w.order === 2)?.id || wavesData[1]?.id || wavesData[0]?.id,
          theme: 'Activiteiten',
          status: 'Te doen' as const,
          assignee_id: null,
          due_date: null,
          order: itemsToInsert.length + 2,
        },
        {
          title: 'Budgetraming opstellen',
          description: 'Eerste schatting maken van totale kosten',
          wave_id: wavesData.find(w => w.order === 1)?.id || wavesData[0]?.id,
          theme: 'Administratie',
          status: 'Te doen' as const,
          assignee_id: null,
          due_date: null,
          order: itemsToInsert.length + 3,
        },
        {
          title: 'Inschrijvingsprocedure bepalen',
          description: 'Bepalen hoe inschrijvingen worden afgehandeld',
          wave_id: wavesData.find(w => w.order === 1)?.id || wavesData[0]?.id,
          theme: 'Communicatie',
          status: 'Te doen' as const,
          assignee_id: null,
          due_date: null,
          order: itemsToInsert.length + 4,
        },
        {
          title: 'Voedselallergieën inventariseren',
          description: 'Overzicht maken van alle allergieën en dieetwensen',
          wave_id: wavesData.find(w => w.order === 2)?.id || wavesData[1]?.id || wavesData[0]?.id,
          theme: 'Voeding',
          status: 'Te doen' as const,
          assignee_id: null,
          due_date: null,
          order: itemsToInsert.length + 5,
        },
      ]

      // Add priority items from meeting - these should be in current wave
      const priorityItems = [
        {
          title: 'Informeren per gebied alle tastbare opties: beschikbaarheid → prijs → keuze maken',
          description: 'Per gebied (Neurenberg, Bratislava, Frymburk) alle opties onderzoeken, beschikbaarheid checken, prijzen vergelijken en keuze maken',
          wave_id: wavesData.find(w => w.order === 1)?.id || wavesData[0]?.id,
          theme: 'Campings',
          status: 'Te doen' as const,
          assignee_id: null,
          due_date: null,
          is_current_wave: true,
          order: itemsToInsert.length + 6,
        },
        {
          title: 'Alternatieve verblijfplaats in de vorm van niet verblijfscommerciël gerichte locaties contacteren en zoeken',
          description: 'Jeugdbewegingen en andere niet-commerciële locaties contacteren als alternatief voor campings',
          wave_id: wavesData.find(w => w.order === 1)?.id || wavesData[0]?.id,
          theme: 'Campings',
          status: 'Te doen' as const,
          assignee_id: null,
          due_date: null,
          is_current_wave: true,
          order: itemsToInsert.length + 7,
        },
        {
          title: 'Informer prijzen en mogelijkheden',
          description: 'Vervoersopties onderzoeken en prijzen vergelijken',
          wave_id: wavesData.find(w => w.order === 1)?.id || wavesData[0]?.id,
          theme: 'Vervoer',
          status: 'Te doen' as const,
          assignee_id: null,
          due_date: null,
          is_current_wave: true,
          order: itemsToInsert.length + 8,
        },
        {
          title: 'Proberen via school',
          description: 'Vervoer regelen via school contacten',
          wave_id: wavesData.find(w => w.order === 1)?.id || wavesData[0]?.id,
          theme: 'Vervoer',
          status: 'Te doen' as const,
          assignee_id: null,
          due_date: null,
          is_current_wave: true,
          order: itemsToInsert.length + 9,
        },
        {
          title: 'Bekijken wat een acceptabele vraagprijs per gastje is',
          description: 'Beter in te schatten na concreetheid over andere prijzen',
          wave_id: wavesData.find(w => w.order === 1)?.id || wavesData[0]?.id,
          theme: 'Financiën',
          status: 'Te doen' as const,
          assignee_id: null,
          due_date: null,
          is_current_wave: true,
          order: itemsToInsert.length + 10,
        },
        {
          title: 'Beginsels van budget berekening',
          description: 'Basisstructuur voor budget berekening opzetten',
          wave_id: wavesData.find(w => w.order === 1)?.id || wavesData[0]?.id,
          theme: 'Financiën',
          status: 'Te doen' as const,
          assignee_id: null,
          due_date: null,
          is_current_wave: true,
          order: itemsToInsert.length + 11,
        },
        {
          title: 'Uitdenken betalingsplan voor ouders',
          description: 'Bepalen hoe ouders kunnen betalen (termijnen, voorschot, etc.)',
          wave_id: wavesData.find(w => w.order === 2)?.id || wavesData[1]?.id || wavesData[0]?.id,
          theme: 'Financiën',
          status: 'Te doen' as const,
          assignee_id: null,
          due_date: null,
          is_current_wave: false,
          order: itemsToInsert.length + 12,
        },
        {
          title: 'Samenstellen informatief formulier voor ouders tegen volgend semester',
          description: 'Formulier maken met alle belangrijke informatie voor ouders',
          wave_id: wavesData.find(w => w.order === 2)?.id || wavesData[1]?.id || wavesData[0]?.id,
          theme: 'Administratie',
          status: 'Te doen' as const,
          assignee_id: null,
          due_date: null,
          is_current_wave: false,
          order: itemsToInsert.length + 13,
        },
      ]

      const allItemsToInsert = [...itemsToInsert, ...generalItems, ...priorityItems]

      const { error: insertError } = await supabase
        .from('werkgroep_roadmap_items')
        .insert(allItemsToInsert)

      if (insertError) {
        if (insertError.code === '42P01') {
          // Table doesn't exist yet
          return
        }
        if (insertError.code === '23505') {
          // Duplicate key, items already exist
          await loadRoadmapItems()
          return
        }
        console.error('Error seeding roadmap items:', insertError)
      } else {
        await loadRoadmapItems()
      }
    } catch (error) {
      console.error('Error seeding roadmap items from tasks:', error)
    }
  }

  const loadRoadmapThemes = async () => {
    try {
      const { data, error } = await supabase
        .from('werkgroep_roadmap_themes')
        .select('*')
        .order('order', { ascending: true, nullsFirst: false })

      if (error) {
        if (error.code === '42P01') {
          // Use default themes if table doesn't exist
          setRoadmapThemes(DEFAULT_THEMES)
          return
        }
        throw error
      }

      if (data && data.length > 0) {
        setRoadmapThemes(data.map(t => ({
          id: t.id,
          name: t.name,
          icon: t.icon || undefined,
          color: t.color || undefined,
          order: t.order || undefined,
        })))
      } else {
        // Seed default themes if empty
        await seedDefaultThemes()
      }
    } catch (error) {
      console.error('Error loading themes:', error)
      // Fallback to default themes
      setRoadmapThemes(DEFAULT_THEMES)
    }
  }

  const seedDefaultThemes = async () => {
    try {
      const { data: existingData } = await supabase
        .from('werkgroep_roadmap_themes')
        .select('id')
        .limit(1)

      if (existingData && existingData.length > 0) {
        await loadRoadmapThemes()
        return
      }

      const themesToInsert = DEFAULT_THEMES.map(t => ({
        name: t.name,
        icon: t.icon || null,
        color: t.color || null,
        order: t.order || 0,
      }))

      const { error } = await supabase
        .from('werkgroep_roadmap_themes')
        .insert(themesToInsert)

      if (error) {
        if (error.code === '42P01' || error.code === '23505') {
          await loadRoadmapThemes()
          return
        }
        throw error
      }
      await loadRoadmapThemes()
    } catch (error) {
      console.error('Error seeding themes:', error)
      setRoadmapThemes(DEFAULT_THEMES)
    }
  }


  const loadTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('werkgroep_tasks')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      if (data && data.length > 0) {
        const convertedTasks: Task[] = data.map(item => ({
          id: item.id,
          title: item.title,
          description: item.description || undefined,
          assigneeId: item.assignee_id || null,
          category: item.category as Task['category'],
          priority: item.priority as Task['priority'],
          status: item.status as Task['status'],
          dueDate: item.due_date || undefined,
        }))
        setTasks(convertedTasks)
      } else {
        // Seed initial tasks if empty
        await seedInitialTasks()
      }
    } catch (error) {
      console.error('Error loading tasks:', error)
    }
  }

  const seedInitialTasks = async () => {
    try {
      // Double-check that table is still empty (prevent race conditions)
      const { data: existingData, error: checkError } = await supabase
        .from('werkgroep_tasks')
        .select('id')
        .limit(1)

      if (checkError) throw checkError

      // If data exists now, don't seed (another process may have seeded)
      if (existingData && existingData.length > 0) {
        await loadTasks()
        return
      }

      const tasksToInsert = INITIAL_TASKS.map(t => ({
        title: t.title,
        description: t.description || null,
        assignee_id: t.assigneeId || null,
        category: t.category,
        priority: t.priority,
        status: t.status,
        due_date: t.dueDate || null,
      }))

      const { error } = await supabase
        .from('werkgroep_tasks')
        .insert(tasksToInsert)

      if (error) {
        // If error is duplicate key or constraint violation, just reload
        if (error.code === '23505' || error.message.includes('duplicate')) {
          await loadTasks()
          return
        }
        throw error
      }
      await loadTasks()
    } catch (error) {
      console.error('Error seeding tasks:', error)
      // Try to reload in case another process seeded
      await loadTasks()
    }
  }

  const loadAccommodations = async () => {
    try {
      const { data: locations, error: locError } = await supabase
        .from('werkgroep_accommodation_locations')
        .select('*')
        .order('created_at')

      if (locError) throw locError

      if (locations && locations.length > 0) {
        const { data: options, error: optError } = await supabase
          .from('werkgroep_accommodation_options')
          .select('*')

        if (optError) throw optError

        const convertedLocations: AccommodationLocation[] = locations.map(loc => ({
          id: loc.id,
          locationName: loc.location_name,
          region: loc.region || undefined,
          options: (options || [])
            .filter(opt => opt.location_id === loc.id)
            .map(opt => ({
              id: opt.id,
              name: opt.name,
              address: opt.address || undefined,
              website: opt.website || undefined,
              price: opt.price || undefined,
              contactStatus: opt.contact_status as ContactStatus,
              contactPersonId: opt.contact_person_id || null,
              notes: opt.notes || undefined,
              isPreference: opt.is_preference || false,
            })),
        }))
        setAccommodations(convertedLocations)
      } else {
        // Seed initial accommodations if empty
        await seedInitialAccommodations()
      }
    } catch (error) {
      console.error('Error loading accommodations:', error)
    }
  }

  const seedInitialAccommodations = async () => {
    try {
      // Double-check that table is still empty (prevent race conditions)
      const { data: existingData, error: checkError } = await supabase
        .from('werkgroep_accommodation_locations')
        .select('id')
        .limit(1)

      if (checkError) throw checkError

      // If data exists now, don't seed (another process may have seeded)
      if (existingData && existingData.length > 0) {
        await loadAccommodations()
        return
      }

      for (const loc of INITIAL_ACCOMMODATIONS) {
        const { data: locationData, error: locError } = await supabase
          .from('werkgroep_accommodation_locations')
          .insert({
            location_name: loc.locationName,
            region: loc.region || null,
          })
          .select()
          .single()

        if (locError) {
          // If error is duplicate key, skip and reload
          if (locError.code === '23505' || locError.message.includes('duplicate')) {
            await loadAccommodations()
            return
          }
          throw locError
        }

        if (loc.options.length > 0) {
          const optionsToInsert = loc.options.map(opt => ({
            location_id: locationData.id,
            name: opt.name,
            address: opt.address || null,
            website: opt.website || null,
            price: opt.price || null,
            contact_status: opt.contactStatus,
            contact_person_id: opt.contactPersonId || null,
            notes: opt.notes || null,
            is_preference: opt.isPreference,
          }))

          const { error: optError } = await supabase
            .from('werkgroep_accommodation_options')
            .insert(optionsToInsert)

          if (optError) {
            // If error, continue with next location
            console.error('Error inserting options:', optError)
          }
        }
      }
      await loadAccommodations()
    } catch (error) {
      console.error('Error seeding accommodations:', error)
      // Try to reload in case another process seeded
      await loadAccommodations()
    }
  }

  const loadMemberSpaces = async () => {
    try {
      const { data: spaces, error: spacesError } = await supabase
        .from('werkgroep_member_spaces')
        .select('*')

      if (spacesError) throw spacesError

      const { data: files, error: filesError } = await supabase
        .from('werkgroep_member_files')
        .select('*')

      if (filesError) throw filesError

      const spacesMap: Record<string, MemberSpace> = {}
      
      TEAM_MEMBERS.forEach(member => {
        const space = spaces?.find(s => s.member_id === member.id)
        const memberFiles = files?.filter(f => f.member_id === member.id) || []
        
        spacesMap[member.id] = {
          memberId: member.id,
          notes: space?.notes || '',
          files: memberFiles.map(f => ({
            id: f.id,
            name: f.name,
            type: f.type as 'link' | 'file',
            url: f.url,
            size: f.size || undefined,
          })),
        }
      })

      setMemberSpaces(spacesMap)
    } catch (error) {
      console.error('Error loading member spaces:', error)
    }
  }

  // Helpers
  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'Klaar': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'Mee bezig': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      case 'Geblokkeerd': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
    }
  }

  const getPriorityColor = (prio: Task['priority']) => {
    switch (prio) {
      case 'Hoog': return 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400'
      case 'Middel': return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400'
      case 'Laag': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400'
    }
  }

  const getRoadmapStatusColor = (status: RoadmapItem['status']) => {
    switch (status) {
      case 'Klaar': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'Mee bezig': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
    }
  }

  const getThemeColor = (themeName: string) => {
    const theme = roadmapThemes.find(t => t.name === themeName) || DEFAULT_THEMES.find(t => t.name === themeName)
    return theme?.color || '#6b7280'
  }

  const getThemeIcon = (themeName: string) => {
    const theme = roadmapThemes.find(t => t.name === themeName) || DEFAULT_THEMES.find(t => t.name === themeName)
    return theme?.icon || 'folder'
  }

  const getContactStatusColor = (status: ContactStatus) => {
    switch (status) {
      case 'Geboekt': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
      case 'In onderhandeling': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800'
      case 'Contact gelegd - Geen antwoord': return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800'
      case 'Geen mogelijkheid': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
      default: return 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ''
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  // Helper: Get current wave based on date
  const getCurrentWave = (): RoadmapWave | null => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const sortedWaves = [...roadmapWaves].sort((a, b) => (a.order || 999) - (b.order || 999))
    
    for (const wave of sortedWaves) {
      const startDate = wave.start_date ? new Date(wave.start_date) : null
      const endDate = wave.end_date ? new Date(wave.end_date) : null
      
      if (startDate) startDate.setHours(0, 0, 0, 0)
      if (endDate) endDate.setHours(23, 59, 59, 999)
      
      // If wave has dates, check if today falls within range
      if (startDate && endDate) {
        if (today >= startDate && today <= endDate) {
          return wave
        }
      } else if (startDate && !endDate) {
        // Only start date: current if today >= start
        if (today >= startDate) {
          return wave
        }
      } else if (!startDate && endDate) {
        // Only end date: current if today <= end
        if (today <= endDate) {
          return wave
        }
      }
    }
    
    // If no wave matches, return first wave or null
    return sortedWaves.length > 0 ? sortedWaves[0] : null
  }

  // Helper: Calculate days until wave ends
  const getWaveTimeIndicator = (wave: RoadmapWave): string => {
    if (!wave.end_date) return ''
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const endDate = new Date(wave.end_date)
    endDate.setHours(23, 59, 59, 999)
    
    const diffTime = endDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) {
      return `Verlopen ${Math.abs(diffDays)} dagen geleden`
    } else if (diffDays === 0) {
      return 'Vandaag laatste dag'
    } else if (diffDays === 1) {
      return 'Nog 1 dag'
    } else {
      return `Nog ${diffDays} dagen`
    }
  }

  // Statistics (based on current wave items)
  const currentWave = getCurrentWave()
  const currentWaveItems = roadmapItems.filter(item => item.is_current_wave === true)
  const stats = {
    total: currentWaveItems.length,
    completed: currentWaveItems.filter(t => t.status === 'Klaar').length,
    inProgress: currentWaveItems.filter(t => t.status === 'Mee bezig').length,
    todo: currentWaveItems.filter(t => t.status === 'Te doen').length,
  }
  const progressPercentage = Math.round((stats.completed / stats.total) * 100) || 0

  // Handlers
  const handleSaveTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    try {
      const taskData = {
      title: formData.get('title') as string,
        description: (formData.get('description') as string) || null,
      category: formData.get('category') as Task['category'],
      priority: formData.get('priority') as Task['priority'],
      status: formData.get('status') as Task['status'],
        assignee_id: formData.get('assigneeId') === 'null' ? null : formData.get('assigneeId') as string,
        due_date: (formData.get('dueDate') as string) || null,
        updated_at: new Date().toISOString(),
      }

      if (editingTask) {
        const { error } = await supabase
          .from('werkgroep_tasks')
          .update(taskData)
          .eq('id', editingTask.id)

        if (error) throw error

        const updatedTask: Task = {
          id: editingTask.id,
          title: taskData.title,
          description: taskData.description || undefined,
          category: taskData.category,
          priority: taskData.priority,
          status: taskData.status,
          assigneeId: taskData.assignee_id,
          dueDate: taskData.due_date || undefined,
        }
        setTasks(tasks.map(t => t.id === editingTask.id ? updatedTask : t))
      } else {
        const { data, error } = await supabase
          .from('werkgroep_tasks')
          .insert(taskData)
          .select()
          .single()

        if (error) throw error

        const newTask: Task = {
          id: data.id,
          title: data.title,
          description: data.description || undefined,
          category: data.category as Task['category'],
          priority: data.priority as Task['priority'],
          status: data.status as Task['status'],
          assigneeId: data.assignee_id || null,
          dueDate: data.due_date || undefined,
        }
        setTasks([...tasks, newTask])
      }
    setIsTaskModalOpen(false)
    setEditingTask(null)
    } catch (error) {
      console.error('Error saving task:', error)
      alert('Fout bij opslaan van taak')
    }
  }

  const handleDeleteTask = async (id: string) => {
    if (!confirm('Ben je zeker dat je deze taak wilt verwijderen?')) return

    try {
      const { error } = await supabase
        .from('werkgroep_tasks')
        .delete()
        .eq('id', id)

      if (error) throw error

      setTasks(tasks.filter(t => t.id !== id))
      setIsTaskModalOpen(false)
    } catch (error) {
      console.error('Error deleting task:', error)
      alert('Fout bij verwijderen van taak')
    }
  }

  const handleSaveAccommodationOption = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingAccLocationId) return
    const formData = new FormData(e.currentTarget)

    try {
      const optionData = {
        location_id: editingAccLocationId,
        name: formData.get('name') as string,
        address: (formData.get('address') as string) || null,
        website: (formData.get('website') as string) || null,
        price: (formData.get('price') as string) || null,
        contact_status: formData.get('contactStatus') as ContactStatus,
        contact_person_id: formData.get('contactPersonId') === 'null' ? null : formData.get('contactPersonId') as string,
        notes: (formData.get('notes') as string) || null,
        is_preference: formData.get('isPreference') === 'on',
        updated_at: new Date().toISOString(),
      }

      if (editingAccOption) {
        const { error } = await supabase
          .from('werkgroep_accommodation_options')
          .update(optionData)
          .eq('id', editingAccOption.id)

        if (error) throw error

        const updatedOption: AccommodationOption = {
          id: editingAccOption.id,
          name: optionData.name,
          address: optionData.address || undefined,
          website: optionData.website || undefined,
          price: optionData.price || undefined,
          contactStatus: optionData.contact_status,
          contactPersonId: optionData.contact_person_id,
          notes: optionData.notes || undefined,
          isPreference: optionData.is_preference,
        }
        setAccommodations(prev => prev.map(loc => {
          if (loc.id !== editingAccLocationId) return loc
          return { ...loc, options: loc.options.map(o => o.id === editingAccOption.id ? updatedOption : o) }
        }))
      } else {
        const { data, error } = await supabase
          .from('werkgroep_accommodation_options')
          .insert(optionData)
          .select()
          .single()

        if (error) throw error

    const newOption: AccommodationOption = {
          id: data.id,
          name: data.name,
          address: data.address || undefined,
          website: data.website || undefined,
          price: data.price || undefined,
          contactStatus: data.contact_status as ContactStatus,
          contactPersonId: data.contact_person_id || null,
          notes: data.notes || undefined,
          isPreference: data.is_preference || false,
    }
    setAccommodations(prev => prev.map(loc => {
      if (loc.id !== editingAccLocationId) return loc
          return { ...loc, options: [...loc.options, newOption] }
    }))
      }
    setIsAccModalOpen(false)
    setEditingAccOption(null)
    setEditingAccLocationId(null)
    } catch (error) {
      console.error('Error saving accommodation option:', error)
      alert('Fout bij opslaan van accommodatie optie')
    }
  }

  const deleteAccommodationOption = async (locationId: string, optionId: string) => {
    if (!confirm('Ben je zeker dat je deze optie wilt verwijderen?')) return

    try {
      const { error } = await supabase
        .from('werkgroep_accommodation_options')
        .delete()
        .eq('id', optionId)

      if (error) throw error

    setAccommodations(prev => prev.map(loc => {
      if (loc.id !== locationId) return loc
      return { ...loc, options: loc.options.filter(o => o.id !== optionId) }
    }))
    } catch (error) {
      console.error('Error deleting accommodation option:', error)
      alert('Fout bij verwijderen van accommodatie optie')
    }
  }

  const handleUpdateNotes = async (memberId: string, notes: string) => {
    try {
      const { error } = await supabase
        .from('werkgroep_member_spaces')
        .upsert({
          member_id: memberId,
          notes: notes,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'member_id',
        })

      if (error) throw error

      setMemberSpaces(prev => ({ ...prev, [memberId]: { ...prev[memberId], memberId, notes, files: prev[memberId]?.files || [] } }))
    } catch (error) {
      console.error('Error updating notes:', error)
    }
  }
  
  const handleAddLink = async (memberId: string) => {
    if (!linkInputState?.name || !linkInputState?.url) return

    try {
      const { data, error } = await supabase
        .from('werkgroep_member_files')
        .insert({
          member_id: memberId,
          name: linkInputState.name,
          type: 'link',
          url: linkInputState.url,
        })
        .select()
        .single()

      if (error) throw error

      const newFile: FileLink = {
        id: data.id,
        name: data.name,
        type: data.type as 'link' | 'file',
        url: data.url,
        size: data.size || undefined,
      }

    setMemberSpaces(prev => ({
      ...prev,
        [memberId]: { ...prev[memberId], memberId, notes: prev[memberId]?.notes || '', files: [...(prev[memberId]?.files || []), newFile] }
    }))
    setLinkInputState(null)
    } catch (error) {
      console.error('Error adding link:', error)
      alert('Fout bij toevoegen van link')
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const memberId = uploadingForMemberId
    if (!file || !memberId) return
    if (file.size > 3 * 1024 * 1024) { alert('Bestand is te groot (max 3MB).'); e.target.value = ''; return }
    
    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const { data, error } = await supabase
          .from('werkgroep_member_files')
          .insert({
            member_id: memberId,
            name: file.name,
            type: 'file',
            url: event.target?.result as string,
            size: file.size,
          })
          .select()
          .single()

        if (error) throw error

        const newFile: FileLink = {
          id: data.id,
          name: data.name,
          type: data.type as 'link' | 'file',
          url: data.url,
          size: data.size || undefined,
        }

      setMemberSpaces(prev => ({
        ...prev,
          [memberId]: { ...prev[memberId], memberId, notes: prev[memberId]?.notes || '', files: [...(prev[memberId]?.files || []), newFile] }
      }))
      setUploadingForMemberId(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      } catch (error) {
        console.error('Error uploading file:', error)
        alert('Fout bij uploaden van bestand')
      }
    }
    reader.readAsDataURL(file)
  }

  const removeFile = async (memberId: string, fileId: string) => {
    if (!confirm('Ben je zeker?')) return

    try {
      const { error } = await supabase
        .from('werkgroep_member_files')
        .delete()
        .eq('id', fileId)

      if (error) throw error

    setMemberSpaces(prev => ({ ...prev, [memberId]: { ...prev[memberId], files: prev[memberId].files.filter(f => f.id !== fileId) } }))
    } catch (error) {
      console.error('Error removing file:', error)
      alert('Fout bij verwijderen van bestand')
    }
  }

  const triggerFileUpload = (memberId: string) => { setUploadingForMemberId(memberId); fileInputRef.current?.click() }


  // Roadmap handlers
  const handleSaveWave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    try {
      const startDate = (formData.get('startDate') as string) || null
      const endDate = (formData.get('endDate') as string) || null

      // Validate dates
      if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
        alert('Start datum moet voor eind datum liggen')
        return
      }

      const sortedWaves = [...roadmapWaves].sort((a, b) => (a.order || 999) - (b.order || 999))
      const currentIndex = editingWave ? sortedWaves.findIndex(w => w.id === editingWave.id) : -1
      const previousWave = currentIndex > 0 ? sortedWaves[currentIndex - 1] : null
      const nextWave = currentIndex >= 0 && currentIndex < sortedWaves.length - 1 ? sortedWaves[currentIndex + 1] : null

      // Auto-adjust previous wave's end date if start date changed
      if (editingWave && startDate && previousWave) {
        const newStart = new Date(startDate)
        if (previousWave.end_date) {
          const prevEnd = new Date(previousWave.end_date)
          // If new start is before previous end, adjust previous end to day before new start
          if (newStart <= prevEnd) {
            const dayBefore = new Date(newStart)
            dayBefore.setDate(dayBefore.getDate() - 1)
            await supabase
              .from('werkgroep_roadmap_waves')
              .update({ end_date: dayBefore.toISOString().split('T')[0], updated_at: new Date().toISOString() })
              .eq('id', previousWave.id)
          }
        } else if (previousWave.start_date) {
          // If previous wave has start but no end, set end to day before new start
          const dayBefore = new Date(newStart)
          dayBefore.setDate(dayBefore.getDate() - 1)
          await supabase
            .from('werkgroep_roadmap_waves')
            .update({ end_date: dayBefore.toISOString().split('T')[0], updated_at: new Date().toISOString() })
            .eq('id', previousWave.id)
        }
      }

      // Auto-adjust next wave's start date if end date changed
      if (editingWave && endDate && nextWave) {
        const newEnd = new Date(endDate)
        if (nextWave.start_date) {
          const nextStart = new Date(nextWave.start_date)
          // If new end is after next start, adjust next start to day after new end
          if (newEnd >= nextStart) {
            const dayAfter = new Date(newEnd)
            dayAfter.setDate(dayAfter.getDate() + 1)
            await supabase
              .from('werkgroep_roadmap_waves')
              .update({ start_date: dayAfter.toISOString().split('T')[0], updated_at: new Date().toISOString() })
              .eq('id', nextWave.id)
          }
        } else if (nextWave.end_date) {
          // If next wave has end but no start, set start to day after new end
          const dayAfter = new Date(newEnd)
          dayAfter.setDate(dayAfter.getDate() + 1)
          await supabase
            .from('werkgroep_roadmap_waves')
            .update({ start_date: dayAfter.toISOString().split('T')[0], updated_at: new Date().toISOString() })
            .eq('id', nextWave.id)
        }
      }

      const waveData = {
        name: formData.get('name') as string,
        start_date: startDate,
        end_date: endDate,
        order: editingWave?.order || roadmapWaves.length,
        updated_at: new Date().toISOString(),
      }

      if (editingWave) {
        const { error } = await supabase
          .from('werkgroep_roadmap_waves')
          .update(waveData)
          .eq('id', editingWave.id)

        if (error) throw error

        // Reload waves to get updated previous/next waves
        await loadRoadmapWaves()
      } else {
        const { data, error } = await supabase
          .from('werkgroep_roadmap_waves')
          .insert(waveData)
          .select()
          .single()

        if (error) throw error

        setRoadmapWaves([...roadmapWaves, {
          id: data.id,
          ...waveData,
          created_at: data.created_at,
          updated_at: data.updated_at,
        }])
      }

      setIsWaveModalOpen(false)
      setEditingWave(null)
    } catch (error) {
      console.error('Error saving wave:', error)
      alert('Fout bij opslaan van wave')
    }
  }

  const handleDeleteWave = async (waveId: string) => {
    if (!confirm('Ben je zeker? Alle items in deze wave worden ook verwijderd.')) return

    try {
      // Delete all items in this wave first
      await supabase
        .from('werkgroep_roadmap_items')
        .delete()
        .eq('wave_id', waveId)

      const { error } = await supabase
        .from('werkgroep_roadmap_waves')
        .delete()
        .eq('id', waveId)

      if (error) throw error

      setRoadmapWaves(roadmapWaves.filter(w => w.id !== waveId))
      setRoadmapItems(roadmapItems.filter(item => item.wave_id !== waveId))
      setIsWaveModalOpen(false)
    } catch (error) {
      console.error('Error deleting wave:', error)
      alert('Fout bij verwijderen van wave')
    }
  }

  const handleSaveRoadmapItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    try {
      // Get first wave as default if no wave_id exists
      const defaultWaveId = roadmapWaves.length > 0 
        ? roadmapWaves.sort((a, b) => (a.order || 999) - (b.order || 999))[0].id
        : editingRoadmapItem?.wave_id || ''

      const itemData = {
        title: formData.get('title') as string,
        description: (formData.get('description') as string) || null,
        wave_id: editingRoadmapItem?.wave_id || defaultWaveId,
        theme: formData.get('theme') as string,
        status: formData.get('status') as RoadmapItem['status'],
        assignee_id: formData.get('assigneeId') === 'null' ? null : (formData.get('assigneeId') as string),
        due_date: (formData.get('dueDate') as string) || null,
        notes: modalNotes || null,
        steps: modalSteps.length > 0 ? JSON.stringify(modalSteps) : null,
        order: editingRoadmapItem?.order || 0,
        is_current_wave: modalIsCurrentWave,
        updated_at: new Date().toISOString(),
      }

      if (editingRoadmapItem) {
        const { error } = await supabase
          .from('werkgroep_roadmap_items')
          .update(itemData)
          .eq('id', editingRoadmapItem.id)

        if (error) throw error

        setRoadmapItems(roadmapItems.map(item => 
          item.id === editingRoadmapItem.id 
            ? { ...item, ...itemData, notes: modalNotes || undefined, steps: modalSteps, id: editingRoadmapItem.id }
            : item
        ))
      } else {
        const { data, error } = await supabase
          .from('werkgroep_roadmap_items')
          .insert(itemData)
          .select()
          .single()

        if (error) throw error

        setRoadmapItems([...roadmapItems, {
          id: data.id,
          ...itemData,
          notes: modalNotes || undefined,
          steps: modalSteps,
          created_at: data.created_at,
          updated_at: data.updated_at,
        }])
      }

      setIsRoadmapItemModalOpen(false)
      setEditingRoadmapItem(null)
      setModalNotes('')
      setModalSteps([])
      setNewStepTitle('')
      setAttachmentLinkInput(null)
      setModalIsCurrentWave(false)
    } catch (error) {
      console.error('Error saving roadmap item:', error)
      alert('Fout bij opslaan van roadmap item')
    }
  }

  const handleDeleteRoadmapItem = async (itemId: string) => {
    if (!confirm('Ben je zeker?')) return

    try {
      const { error } = await supabase
        .from('werkgroep_roadmap_items')
        .delete()
        .eq('id', itemId)

      if (error) throw error

      setRoadmapItems(roadmapItems.filter(item => item.id !== itemId))
      setIsRoadmapItemModalOpen(false)
      setModalIsCurrentWave(false)
    } catch (error) {
      console.error('Error deleting roadmap item:', error)
      alert('Fout bij verwijderen van roadmap item')
    }
  }

  const handleUpdateRoadmapItemStatus = async (itemId: string, newStatus: RoadmapItem['status']) => {
    try {
      const { error } = await supabase
        .from('werkgroep_roadmap_items')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', itemId)

      if (error) throw error

      setRoadmapItems(roadmapItems.map(item => 
        item.id === itemId ? { ...item, status: newStatus } : item
      ))
    } catch (error) {
      console.error('Error updating roadmap item status:', error)
    }
  }

  const handleReorderItems = async (draggedItemId: string, targetIndex: number, theme: string) => {
    try {
      const themeItems = roadmapItems
        .filter(item => item.theme === theme && !item.is_archived)
        .sort((a, b) => {
          const orderDiff = (a.order || 999) - (b.order || 999)
          if (orderDiff !== 0) return orderDiff
          return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
        })

      const draggedIndex = themeItems.findIndex(item => item.id === draggedItemId)

      if (draggedIndex === -1 || targetIndex < 0 || targetIndex >= themeItems.length) return

      // Reorder items
      const newItems = [...themeItems]
      const [removed] = newItems.splice(draggedIndex, 1)
      newItems.splice(targetIndex, 0, removed)

      // Update orders
      const updates = newItems.map((item, index) => ({
        id: item.id,
        order: index
      }))

      // Update all items in parallel
      await Promise.all(
        updates.map(update =>
          supabase
            .from('werkgroep_roadmap_items')
            .update({ order: update.order, updated_at: new Date().toISOString() })
            .eq('id', update.id)
        )
      )

      await loadRoadmapItems()
      setDragOverIndex(null)
    } catch (error) {
      console.error('Error reordering items:', error)
    }
  }

  const handleArchiveItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('werkgroep_roadmap_items')
        .update({ is_archived: true, is_current_wave: false, updated_at: new Date().toISOString() })
        .eq('id', itemId)

      if (error) throw error

      // After archiving, ensure next item in category is in current wave
      const archivedItem = roadmapItems.find(item => item.id === itemId)
      if (archivedItem) {
        const themeItems = roadmapItems
          .filter(item => item.theme === archivedItem.theme && !item.is_archived && item.id !== itemId)
          .sort((a, b) => {
            const orderDiff = (a.order || 999) - (b.order || 999)
            if (orderDiff !== 0) return orderDiff
            return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
          })
        
        if (themeItems.length > 0 && !themeItems[0].is_current_wave) {
          await supabase
            .from('werkgroep_roadmap_items')
            .update({ is_current_wave: true })
            .eq('id', themeItems[0].id)
        }
      }

      await loadRoadmapItems()
    } catch (error) {
      console.error('Error archiving item:', error)
      alert('Fout bij archiveren van item')
    }
  }


  // --- RENDER ---

  const renderTasks = () => {
    // Filter items by current wave (include completed items), filter by selected member, exclude archived
    let filtered = currentWaveItems
      .filter(item => !item.is_archived)
      .filter(item => 
        selectedMemberId ? item.assignee_id === selectedMemberId : true
      )

    // Group by theme and sort items within each theme by order
    const groupedByTheme = filtered.reduce((acc, item) => {
      if (!acc[item.theme]) {
        acc[item.theme] = []
      }
      acc[item.theme].push(item)
      return acc
    }, {} as Record<string, typeof filtered>)

    // Sort items within each theme by order, then by created_at
    Object.keys(groupedByTheme).forEach(theme => {
      groupedByTheme[theme].sort((a, b) => {
        const orderDiff = (a.order || 999) - (b.order || 999)
        if (orderDiff !== 0) return orderDiff
        return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
      })
    })

    // Get next items for each theme (items not in current wave, sorted by order)
    const getNextItemForTheme = (theme: string): RoadmapItem | null => {
      const themeItems = roadmapItems
        .filter(item => item.theme === theme && !item.is_archived && !item.is_current_wave)
        .sort((a, b) => {
          const orderDiff = (a.order || 999) - (b.order || 999)
          if (orderDiff !== 0) return orderDiff
          return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
        })
      return themeItems.length > 0 ? themeItems[0] : null
    }

    return (
      <div className="space-y-6">
        {/* Controls - Simplified, no view mode or sort */}
        <div className="flex justify-end">
          <button onClick={() => { 
            setEditingRoadmapItem(null)
            setModalNotes('')
            setModalSteps([])
            setNewStepTitle('')
            setAttachmentLinkInput(null)
            setModalIsCurrentWave(false)
            setIsRoadmapItemModalOpen(true)
          }} className="btn-primary flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 font-bold shadow-sm">
            <span className="material-symbols-outlined text-[20px]">add</span> Nieuw Item
          </button>
            </div>

        {/* List View - Grouped by Theme */}
        <div className="space-y-4">
          {Object.keys(groupedByTheme).length === 0 ? (
            <p className="text-center text-gray-400 py-8">
              Geen items in huidige wave. Markeer items in Roadmap als "Huidige Wave".
            </p>
          ) : (
            Object.entries(groupedByTheme).map(([themeName, items]) => {
              const theme = roadmapThemes.find(t => t.name === themeName) || DEFAULT_THEMES.find(t => t.name === themeName)
              const nextItem = getNextItemForTheme(themeName)
              
              // Separate completed and active items
              const completedItems = items.filter(item => item.status === 'Klaar')
              const activeItems = items.filter(item => item.status !== 'Klaar')
              
              return (
                <div key={themeName} className="bg-white dark:bg-background-dark rounded-xl border border-[#dbe0e6] dark:border-gray-700 overflow-hidden">
                  <div className="flex items-stretch">
                    {/* Main Content Section */}
                    <div className="flex-1 flex flex-col">
                      {/* Active items first */}
                      {activeItems.map((item, index) => {
                        const assignee = item.assignee_id ? TEAM_MEMBERS.find(m => m.id === item.assignee_id) : null
                        return (
                          <div
                            key={item.id}
                            onClick={() => { 
                              setEditingRoadmapItem(item)
                              setModalNotes(item.notes || '')
                              setModalSteps(item.steps || [])
                              setNewStepTitle('')
                              setAttachmentLinkInput(null)
                              setIsRoadmapItemModalOpen(true)
                            }}
                            className={`group flex items-center gap-3 flex-1 min-w-0 px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all cursor-pointer ${
                              index !== activeItems.length - 1 || completedItems.length > 0 ? 'border-b border-gray-200 dark:border-gray-700' : ''
                            }`}
                          >
                            <select
                              value={item.status}
                              onChange={async (e) => {
                                e.stopPropagation()
                                await handleUpdateRoadmapItemStatus(item.id, e.target.value as RoadmapItem['status'])
                                await loadRoadmapItems()
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs px-2 py-1 rounded border bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-pointer flex-shrink-0"
                            >
                              <option value="Te doen">Te doen</option>
                              <option value="Mee bezig">Mee bezig</option>
                              <option value="Klaar">Klaar</option>
                            </select>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3">
                                <span className={`font-semibold text-[#111418] dark:text-white truncate`}>{item.title}</span>
                                {assignee && (
                                  <div className="flex items-center gap-1.5 text-xs text-gray-500 flex-shrink-0">
                                    <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-[10px] font-bold text-blue-700 dark:text-blue-300">
                                      {assignee.name.substring(0, 2)}
            </div>
                                    <span>{assignee.name}</span>
          </div>
                                )}
                                {item.due_date && (
                                  <span className="text-xs text-gray-500 flex items-center gap-1 flex-shrink-0">
                                    <span className="material-symbols-outlined text-[14px]">event</span>
                                    {new Date(item.due_date).toLocaleDateString('nl-NL')}
                                  </span>
                                )}
          </div>
          </div>
                            <div className={`px-3 py-1 rounded-full text-xs font-bold flex-shrink-0 ${getRoadmapStatusColor(item.status)}`}>{item.status}</div>
          </div>
                        )
                      })}
                      
                      {/* Completed items (grayed out) */}
                      {completedItems.map((item, index) => {
                        const assignee = item.assignee_id ? TEAM_MEMBERS.find(m => m.id === item.assignee_id) : null
              return (
                          <div
                            key={item.id}
                            className={`group flex items-center gap-3 flex-1 min-w-0 px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all cursor-pointer opacity-60 ${
                              index !== completedItems.length - 1 || nextItem ? 'border-b border-gray-200 dark:border-gray-700' : ''
                            }`}
                            onClick={() => { 
                              setEditingRoadmapItem(item)
                              setModalNotes(item.notes || '')
                              setModalSteps(item.steps || [])
                              setNewStepTitle('')
                              setAttachmentLinkInput(null)
                              setIsRoadmapItemModalOpen(true)
                            }}
                          >
                            <select
                              value={item.status}
                              onChange={async (e) => {
                                e.stopPropagation()
                                await handleUpdateRoadmapItemStatus(item.id, e.target.value as RoadmapItem['status'])
                                await loadRoadmapItems()
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs px-2 py-1 rounded border bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-pointer flex-shrink-0 opacity-60"
                            >
                              <option value="Te doen">Te doen</option>
                              <option value="Mee bezig">Mee bezig</option>
                              <option value="Klaar">Klaar</option>
                            </select>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3">
                                <span className="font-semibold text-gray-400 dark:text-gray-500 truncate line-through">{item.title}</span>
                                {assignee && (
                                  <div className="flex items-center gap-1.5 text-xs text-gray-400 flex-shrink-0">
                                    <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-500">
                                      {assignee.name.substring(0, 2)}
                            </div>
                                    <span>{assignee.name}</span>
                        </div>
                    )}
                  </div>
                            </div>
                            <button
                              onClick={async (e) => {
                                e.stopPropagation()
                                await handleArchiveItem(item.id)
                              }}
                              className="px-3 py-1 rounded text-xs font-bold bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 flex-shrink-0"
                            >
                              Verplaats naar archief
                            </button>
                </div>
              )
            })}
                      
                      {/* Placeholder if no items */}
                      {activeItems.length === 0 && completedItems.length === 0 && (
                        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
                          <p className="text-sm text-gray-400 italic">Geen items meer in deze categorie</p>
          </div>
        )}
                    </div>
                    
                    {/* Category Icon - Right Side */}
                    <div className="flex items-center justify-center px-4 bg-gray-50 dark:bg-gray-800/50 border-l border-gray-200 dark:border-gray-700 flex-shrink-0">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${theme?.color || '#6b7280'}20`, color: theme?.color || '#6b7280' }}
                      >
                        <span className="material-symbols-outlined text-[20px]">{theme?.icon || 'folder'}</span>
                  </div>
                    </div>
                    </div>
                  </div>
              )
            })
            )}
          </div>
      </div>
    )
  }

  const renderAccommodations = () => (
    <div className="space-y-8">
      <div className="flex justify-end">
        <button onClick={async () => { 
          const name = prompt('Naam van nieuwe locatie:')
          if (!name) return
          try {
            const { data, error } = await supabase
              .from('werkgroep_accommodation_locations')
              .insert({ location_name: name })
              .select()
              .single()
            if (error) throw error
            setAccommodations([...accommodations, { id: data.id, locationName: data.location_name, region: data.region || undefined, options: [] }])
          } catch (error) {
            console.error('Error adding location:', error)
            alert('Fout bij toevoegen van locatie')
          }
        }} className="text-primary font-bold hover:underline flex items-center gap-1">
           <span className="material-symbols-outlined">add_location</span> Locatie Toevoegen
        </button>
      </div>
      {accommodations.map(loc => (
        <div key={loc.id} className="bg-white dark:bg-background-dark rounded-xl border border-[#dbe0e6] dark:border-gray-700 overflow-hidden shadow-sm">
           <div className="bg-gray-50 dark:bg-gray-800/50 p-4 border-b border-[#dbe0e6] dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-bold text-[#111418] dark:text-white flex items-center gap-2"><span className="material-symbols-outlined text-primary">location_on</span> {loc.locationName}</h3>
              <button onClick={() => { setEditingAccLocationId(loc.id); setEditingAccOption(null); setIsAccModalOpen(true); }} className="text-xs font-bold bg-white dark:bg-gray-700 border px-3 py-1.5 rounded-lg hover:bg-gray-50 shadow-sm">+ Optie</button>
           </div>
           <div className="p-4 grid gap-4 sm:grid-cols-2">
              {loc.options.map(opt => (
                 <div key={opt.id} className={`relative rounded-lg border p-4 transition-all hover:shadow-md ${opt.isPreference ? 'border-primary/50 bg-primary/5' : 'border-gray-200 dark:border-gray-700'}`}>
                    {opt.isPreference && <div className="absolute -top-2 -right-2 bg-primary text-white p-1 rounded-full shadow-sm"><span className="material-symbols-outlined text-[14px] block">star</span></div>}
                    <div className="flex justify-between items-start mb-2">
                       <h4 className="font-bold text-[#111418] dark:text-white">{opt.name}</h4>
                       <button onClick={() => { setEditingAccLocationId(loc.id); setEditingAccOption(opt); setIsAccModalOpen(true); }} className="text-gray-400 hover:text-primary"><span className="material-symbols-outlined text-[18px]">edit</span></button>
                    </div>
                    <div className="space-y-1 text-sm">
                       <div className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border mb-2 ${getContactStatusColor(opt.contactStatus)}`}>{opt.contactStatus}</div>
                       {opt.price && <p className="text-gray-600 dark:text-gray-400 flex gap-2"><span className="material-symbols-outlined text-[14px]">payments</span> {opt.price}</p>}
                       {opt.website && <a href={opt.website} target="_blank" className="text-primary hover:underline flex gap-2"><span className="material-symbols-outlined text-[14px]">language</span> Website</a>}
                    </div>
                 </div>
              ))}
           </div>
        </div>
      ))}
    </div>
  )


  const renderRoadmap = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold">Roadmap</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border font-bold shadow-sm ${
              showArchived 
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600' 
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{showArchived ? 'visibility_off' : 'archive'}</span>
            {showArchived ? 'Verberg gearchiveerde' : 'Bekijk gearchiveerde punten'}
          </button>
          <button
            onClick={() => { 
              setEditingRoadmapItem(null)
              setModalNotes('')
              setModalSteps([])
              setNewStepTitle('')
              setAttachmentLinkInput(null)
              setModalIsCurrentWave(false)
              setIsRoadmapItemModalOpen(true)
            }}
            className="btn-primary flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 font-bold shadow-sm"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            Nieuw Item
          </button>
        </div>
      </div>

      {renderThemesView()}
    </div>
  )

  const renderThemesView = () => {
    const themes = roadmapThemes.length > 0 ? roadmapThemes : DEFAULT_THEMES
    const sortedThemes = [...themes].sort((a, b) => (a.order || 999) - (b.order || 999))

    return (
      <div className="space-y-6">
        {sortedThemes.map(theme => {
          const themeItems = roadmapItems.filter(item => 
            item.theme === theme.name && 
            (showArchived ? true : !item.is_archived)
          )
          const completedCount = themeItems.filter(item => item.status === 'Klaar').length
          const progressPercentage = themeItems.length > 0
            ? Math.round((completedCount / themeItems.length) * 100)
            : 0

          return (
            <div
              key={theme.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${theme.color}20`, color: theme.color }}
                    >
                      <span className="material-symbols-outlined">{theme.icon || 'folder'}</span>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-[#111418] dark:text-white">{theme.name}</h4>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-xs text-gray-500">{themeItems.length} items</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">Voortgang:</span>
                          <span className="text-sm font-bold">{completedCount}/{themeItems.length}</span>
                          <div className="w-24 bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ 
                                width: `${progressPercentage}%`,
                                backgroundColor: theme.color || '#6b7280'
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setReorderMode(prev => ({ ...prev, [theme.name]: !prev[theme.name] }))}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      reorderMode[theme.name]
                        ? 'bg-primary text-white hover:bg-primary/90'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">swap_vert</span>
                    {reorderMode[theme.name] ? 'Verplaatsen uit' : 'Werkpunten verplaatsen'}
                  </button>
                </div>
              </div>
              <div className="p-4 space-y-2">
                {themeItems.length === 0 ? (
                  <p className="text-center text-gray-400 py-4 text-sm">Geen items voor dit thema</p>
                ) : (
                  (() => {
                    const sortedItems = themeItems
                      .sort((a, b) => {
                        const statusOrder = { 'Te doen': 0, 'Mee bezig': 1, 'Klaar': 2 }
                        const statusDiff = statusOrder[a.status] - statusOrder[b.status]
                        if (statusDiff !== 0) return statusDiff
                        return (a.order || 999) - (b.order || 999)
                      })
                    
                    return (
                      <>
                        {sortedItems.map((item, index) => {
                          const isDragOver = dragOverIndex === index && draggedItem?.id !== item.id && draggedItem?.theme === theme.name
                          const draggedIndex = draggedItem ? sortedItems.findIndex(i => i.id === draggedItem.id) : -1
                          
                          return (
                            <div key={item.id} className="relative">
                              {/* Drop zone before item */}
                              {reorderMode[theme.name] && draggedItem && draggedItem.theme === theme.name && (
                                <div
                                  onDragOver={(e) => {
                                    if (draggedItem.id !== item.id) {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      setDragOverIndex(index)
                                    }
                                  }}
                                  onDragLeave={(e) => {
                                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                                      setDragOverIndex(null)
                                    }
                                  }}
                                  onDrop={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    if (draggedItem.id !== item.id) {
                                      const targetIndex = draggedIndex < index ? index - 1 : index
                                      handleReorderItems(draggedItem.id, Math.max(0, targetIndex), theme.name)
                                    }
                                    setDragOverIndex(null)
                                    setDraggedItem(null)
                                  }}
                                  className={`h-3 -mt-1 -mb-1 transition-all ${isDragOver ? 'bg-primary/30 border-t-2 border-primary border-dashed' : 'hover:bg-gray-100 dark:hover:bg-gray-700 opacity-0 hover:opacity-100'}`}
                                />
                              )}
                              {renderRoadmapItem(item, theme.name, reorderMode[theme.name] || false)}
                            </div>
                          )
                        })}
                        {/* Drop zone at the end */}
                        {reorderMode[theme.name] && draggedItem && draggedItem.theme === theme.name && (
                          <div
                            onDragOver={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              setDragOverIndex(sortedItems.length)
                            }}
                            onDragLeave={(e) => {
                              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                                setDragOverIndex(null)
                              }
                            }}
                            onDrop={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              handleReorderItems(draggedItem.id, sortedItems.length - 1, theme.name)
                              setDragOverIndex(null)
                              setDraggedItem(null)
                            }}
                            className={`h-3 -mt-1 transition-all ${dragOverIndex === sortedItems.length ? 'bg-primary/30 border-t-2 border-primary border-dashed' : 'hover:bg-gray-100 dark:hover:bg-gray-700 opacity-0 hover:opacity-100'}`}
                          />
                        )}
                      </>
                    )
                  })()
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderRoadmapItem = (item: RoadmapItem, themeName?: string, isReorderMode: boolean = false) => {
    const theme = roadmapThemes.find(t => t.name === item.theme) || DEFAULT_THEMES.find(t => t.name === item.theme)
    const assignee = item.assignee_id ? TEAM_MEMBERS.find(m => m.id === item.assignee_id) : null

    return (
      <div
        key={item.id}
        data-item-id={item.id}
        draggable={isReorderMode && !item.is_archived && themeName === item.theme}
        onDragStart={(e) => {
          if (!isReorderMode) {
            e.preventDefault()
            return
          }
          setDraggedItem(item)
          e.dataTransfer.effectAllowed = 'move'
          e.dataTransfer.setData('text/plain', '') // Required for Firefox
          if (e.currentTarget) {
            e.currentTarget.style.opacity = '0.5'
          }
        }}
        onDragEnd={(e) => {
          if (e.currentTarget) {
            e.currentTarget.style.opacity = '1'
          }
          setDraggedItem(null)
          setDragOverIndex(null)
        }}
        onClick={() => {
          if (isReorderMode) return // Don't open modal in reorder mode 
          // Load item data for editing
          setEditingRoadmapItem(item)
          setModalNotes(item.notes || '')
          setModalSteps(item.steps || [])
          setNewStepTitle('')
          setAttachmentLinkInput(null)
          // Load attachments for this item
          if (roadmapAttachments[item.id]) {
            // Already loaded
          } else {
            // Load attachments
            supabase
              .from('werkgroep_roadmap_attachments')
              .select('*')
              .eq('item_id', item.id)
              .then(({ data }) => {
                if (data) {
                  setRoadmapAttachments(prev => ({
                    ...prev,
                    [item.id]: data.map(att => ({
                      id: att.id,
                      item_id: att.item_id,
                      name: att.name,
                      type: att.type as 'file' | 'link',
                      url: att.url,
                      size: att.size || undefined,
                      created_at: att.created_at,
                      updated_at: att.updated_at,
                    }))
                  }))
                }
              })
          }
          setIsRoadmapItemModalOpen(true)
        }}
        className={`bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-all ${isReorderMode && !item.is_archived ? 'cursor-move' : 'cursor-pointer'} ${item.is_archived ? 'opacity-50' : ''} ${draggedItem?.id === item.id ? 'opacity-50' : ''}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {isReorderMode && !item.is_archived && themeName === item.theme && (
                <span 
                  className="material-symbols-outlined text-gray-400 cursor-move text-[18px]"
                  draggable={false}
                  onClick={(e) => e.stopPropagation()}
                >
                  drag_indicator
                </span>
              )}
              <h5 className="font-bold text-[#111418] dark:text-white">{item.title}</h5>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getRoadmapStatusColor(item.status)}`}>
                {item.status}
              </span>
              <span
                className="px-2 py-0.5 rounded text-xs font-bold text-white"
                style={{ backgroundColor: theme?.color || '#6b7280' }}
              >
                {item.theme}
              </span>
              {item.is_archived && (
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-gray-500 text-white">
                  Gearchiveerd
                </span>
              )}
            </div>
            {item.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{item.description}</p>
            )}
            <div className="flex items-center gap-3 text-xs text-gray-500">
              {assignee && (
                <div className="flex items-center gap-1">
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                    {assignee.name.substring(0, 2)}
                  </div>
                  <span>{assignee.name}</span>
                </div>
              )}
              {item.due_date && (
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">event</span>
                  {new Date(item.due_date).toLocaleDateString('nl-NL')}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {/* Check if this is the first item in theme (always checked) */}
            {(() => {
              const themeItems = roadmapItems
                .filter(i => i.theme === item.theme && !i.is_archived)
                .sort((a, b) => {
                  const orderDiff = (a.order || 999) - (b.order || 999)
                  if (orderDiff !== 0) return orderDiff
                  return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
                })
              const isFirstItem = themeItems.length > 0 && themeItems[0].id === item.id
              const isChecked = isFirstItem || item.is_current_wave
              
              return (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={isFirstItem}
                    onChange={async (e) => {
                      if (isFirstItem) return // Can't uncheck first item
                      try {
                        const { error } = await supabase
                          .from('werkgroep_roadmap_items')
                          .update({ is_current_wave: e.target.checked })
                          .eq('id', item.id)
                        if (error) throw error
                        await loadRoadmapItems()
                      } catch (error) {
                        console.error('Error updating is_current_wave:', error)
                      }
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer disabled:opacity-50"
                  />
                  <label className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer">in huidige wave</label>
                </div>
              )
            })()}
            <select
              value={item.status}
              onChange={async (e) => {
                await handleUpdateRoadmapItemStatus(item.id, e.target.value as RoadmapItem['status'])
              }}
              className="text-xs px-2 py-1 rounded border bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-pointer"
              title="Status"
            >
              <option value="Te doen">Te doen</option>
              <option value="Mee bezig">Mee bezig</option>
              <option value="Klaar">Klaar</option>
            </select>
          </div>
        </div>
      </div>
    )
  }

  const renderDossiers = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
      {TEAM_MEMBERS.map(member => {
         const space = memberSpaces[member.id] || { memberId: member.id, notes: '', files: [] }
         const isAddingLink = linkInputState?.memberId === member.id
         return (
            <div key={member.id} className="flex flex-col bg-white dark:bg-background-dark rounded-xl border border-[#dbe0e6] dark:border-gray-700 shadow-sm overflow-hidden h-full">
               <div className="p-4 border-b bg-gray-50 dark:bg-gray-800/50 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">{member.name.substring(0, 2)}</div>
                  <h3 className="font-bold text-[#111418] dark:text-white">{member.name}</h3>
               </div>
               <div className="p-4 flex-1 flex flex-col gap-4">
                  <textarea value={space.notes} onChange={(e) => handleUpdateNotes(member.id, e.target.value)} className="w-full h-32 p-3 text-sm rounded-lg border bg-transparent focus:ring-2 focus:ring-primary/50 outline-none resize-none" placeholder="Notities..." />
                  <div>
                     <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-bold text-gray-400 uppercase">Documenten</label>
                        <div className="flex gap-1">
                           <button onClick={() => setLinkInputState({ memberId: member.id, name: '', url: '' })} className="text-[10px] bg-gray-100 px-2 py-1 rounded hover:bg-gray-200">Link</button>
                           <button onClick={() => triggerFileUpload(member.id)} className="text-[10px] bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary/20">Bestand</button>
                        </div>
                     </div>
                     <ul className="space-y-1">
                        {space.files.map(file => (
                           <li key={file.id} className="flex items-center justify-between p-2 rounded bg-gray-50 border hover:border-primary/30 group">
                              <a href={file.url} download={file.type === 'file' ? file.name : undefined} target="_blank" className="flex items-center gap-2 text-sm truncate max-w-[180px] hover:text-primary">
                                 <span className="material-symbols-outlined text-[14px]">{file.type === 'file' ? 'description' : 'link'}</span> {file.name}
                              </a>
                              <button onClick={() => removeFile(member.id, file.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><span className="material-symbols-outlined text-[14px]">close</span></button>
                           </li>
                        ))}
                     </ul>
                     {isAddingLink && (
                        <div className="mt-2 p-2 bg-gray-50 rounded border">
                           <input autoFocus placeholder="Naam" className="w-full text-xs p-1 mb-1 rounded border" value={linkInputState.name} onChange={e => setLinkInputState({ ...linkInputState, name: e.target.value })} />
                           <input placeholder="URL" className="w-full text-xs p-1 mb-1 rounded border" value={linkInputState.url} onChange={e => setLinkInputState({ ...linkInputState, url: e.target.value })} />
                           <div className="flex gap-2 justify-end"><button onClick={() => setLinkInputState(null)} className="text-xs text-gray-500">Annuleren</button><button onClick={() => handleAddLink(member.id)} className="text-xs bg-primary text-white px-2 py-1 rounded">Opslaan</button></div>
                        </div>
                     )}
                  </div>
               </div>
            </div>
         )
      })}
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50 dark:bg-[#111418]">
        <div className="max-w-7xl mx-auto p-4 md:p-6 pt-16 md:pt-6">
          <p className="text-[#617589]">Data laden...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-[#111418]">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 md:space-y-8 pt-16 md:pt-6">
        <div className="flex justify-between items-end border-b pb-6">
           <div><h1 className="text-4xl font-black text-[#111418] dark:text-white tracking-tight">Werkgroep</h1><p className="text-[#617589] mt-1">Organisatiehub</p></div>
           <div className="flex items-center gap-2 bg-white p-1.5 rounded-full border shadow-sm">
              <span className="text-xs font-bold text-gray-400 uppercase px-2">Filter:</span>
              <div className="flex -space-x-2">{TEAM_MEMBERS.map(m => <button key={m.id} onClick={() => setSelectedMemberId(selectedMemberId === m.id ? null : m.id)} className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-transform hover:z-10 hover:scale-110 ${selectedMemberId === m.id ? 'bg-primary text-white z-20 scale-110' : 'bg-gray-200 text-gray-600'}`}>{m.name.substring(0, 2)}</button>)}</div>
           </div>
        </div>
        <div className="flex gap-6 border-b">
           {[{ id: 'roadmap', label: 'Roadmap', icon: 'route' }, { id: 'taken', label: 'Huidige Wave', icon: 'check_circle' }, { id: 'accommodatie', label: 'Accommodaties', icon: 'camping' }, { id: 'dossiers', label: 'Dossiers', icon: 'folder_shared' }].map(tab => (
              <button key={tab.id} onClick={() => { setActiveTab(tab.id as Tab); }} className={`flex items-center gap-2 pb-3 px-2 text-sm font-bold border-b-2 transition-colors ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><span className="material-symbols-outlined text-[20px]">{tab.icon}</span>{tab.label}</button>
           ))}
        </div>
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
           {activeTab === 'roadmap' && renderRoadmap()}
           {activeTab === 'taken' && renderTasks()}
           {activeTab === 'accommodatie' && renderAccommodations()}
           {activeTab === 'dossiers' && renderDossiers()}
        </div>
      </div>
      {isAccModalOpen && (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
               <form onSubmit={handleSaveAccommodationOption}>
                  <div className="p-6 border-b flex justify-between items-center"><h3 className="text-xl font-bold">{editingAccOption ? 'Bewerken' : 'Nieuw'}</h3>{editingAccOption && editingAccLocationId && <button type="button" onClick={() => { deleteAccommodationOption(editingAccLocationId, editingAccOption.id); setIsAccModalOpen(false); }} className="text-red-500"><span className="material-symbols-outlined">delete</span></button>}</div>
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="space-y-4">
                        <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Naam</label><input name="name" defaultValue={editingAccOption?.name} required className="w-full p-2 rounded border" /></div>
                        <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Adres</label><input name="address" defaultValue={editingAccOption?.address} className="w-full p-2 rounded border" /></div>
                        <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Website</label><input name="website" defaultValue={editingAccOption?.website} className="w-full p-2 rounded border" /></div>
                        <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Richtprijs</label><input name="price" defaultValue={editingAccOption?.price} className="w-full p-2 rounded border" /></div>
                     </div>
                     <div className="space-y-4">
                        <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status</label><select name="contactStatus" defaultValue={editingAccOption?.contactStatus || 'Niet gecontacteerd'} className="w-full p-2 rounded border"><option value="Niet gecontacteerd">Niet gecontacteerd</option><option value="Contact gelegd - Geen antwoord">Contact gelegd - Geen antwoord</option><option value="In onderhandeling">In onderhandeling</option><option value="Geen mogelijkheid">Geen mogelijkheid</option><option value="Geboekt">Geboekt</option></select></div>
                        <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Verantwoordelijke</label><select name="contactPersonId" defaultValue={editingAccOption?.contactPersonId || 'null'} className="w-full p-2 rounded border"><option value="null">-- Selecteer --</option>{TEAM_MEMBERS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
                        <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Notities</label><textarea name="notes" defaultValue={editingAccOption?.notes} rows={3} className="w-full p-2 rounded border" /></div>
                        <div className="flex items-center gap-2 pt-2"><input type="checkbox" name="isPreference" id="isPreference" defaultChecked={editingAccOption?.isPreference} className="w-4 h-4" /><label htmlFor="isPreference" className="text-sm font-bold cursor-pointer">Dit is onze voorkeur</label></div>
                     </div>
                  </div>
                  <div className="p-4 bg-gray-50 flex justify-end gap-2"><button type="button" onClick={() => setIsAccModalOpen(false)} className="px-4 py-2 text-sm text-gray-600">Annuleren</button><button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-primary rounded-lg">Opslaan</button></div>
               </form>
            </div>
         </div>
      )}


      {/* Wave Modal */}
      {isWaveModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <form onSubmit={handleSaveWave}>
              <div className="p-6 border-b">
                <h3 className="text-xl font-bold">{editingWave ? 'Wave Bewerken' : 'Nieuwe Wave'}</h3>
              </div>
              <div className="p-6 space-y-4">
                <input
                  name="name"
                  defaultValue={editingWave?.name}
                  required
                  placeholder="Naam (bijv. '6+ maanden voor kamp')"
                  className="w-full p-2 rounded-lg border bg-transparent focus:ring-2 focus:ring-primary outline-none"
                />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Start datum</label>
                    <input
                      type="date"
                      name="startDate"
                      defaultValue={editingWave?.start_date}
                      className="w-full p-2 rounded-lg border bg-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Eind datum</label>
                    <input
                      type="date"
                      name="endDate"
                      defaultValue={editingWave?.end_date}
                      className="w-full p-2 rounded-lg border bg-transparent"
                    />
                  </div>
                </div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 flex justify-between items-center">
                {editingWave ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteWave(editingWave.id)}
                    className="text-red-600 text-sm"
                  >
                    Verwijderen
                  </button>
                ) : (
                  <div></div>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsWaveModalOpen(false)}
                    className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400"
                  >
                    Annuleren
                  </button>
                  <button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-primary rounded-lg">
                    Opslaan
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Roadmap Item Modal */}
      {isRoadmapItemModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-200 my-8">
            <form onSubmit={handleSaveRoadmapItem}>
              <div className="p-6 border-b">
                <h3 className="text-xl font-bold">{editingRoadmapItem ? 'Roadmap Item Bewerken' : 'Nieuw Roadmap Item'}</h3>
              </div>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <input
                  name="title"
                  defaultValue={editingRoadmapItem?.title}
                  required
                  placeholder="Titel (bijv. 'Mogelijke campings vastleggen')"
                  className="w-full p-2 rounded-lg border bg-transparent focus:ring-2 focus:ring-primary outline-none"
                />
                <textarea
                  name="description"
                  defaultValue={editingRoadmapItem?.description}
                  placeholder="Beschrijving (optioneel)"
                  className="w-full p-2 rounded-lg border bg-transparent focus:ring-2 focus:ring-primary outline-none resize-none"
                  rows={3}
                />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Thema</label>
                    <select
                      name="theme"
                      defaultValue={editingRoadmapItem?.theme || ''}
                      required
                      className="w-full p-2 rounded-lg border bg-transparent"
                    >
                      <option value="">-- Selecteer --</option>
                      {(roadmapThemes.length > 0 ? roadmapThemes : DEFAULT_THEMES)
                        .sort((a, b) => (a.order || 999) - (b.order || 999))
                        .map(theme => (
                          <option key={theme.id} value={theme.name}>
                            {theme.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => {
                        setModalIsCurrentWave(!modalIsCurrentWave)
                      }}
                      className={`w-full px-4 py-2 rounded-lg border font-bold transition-colors ${
                        modalIsCurrentWave
                          ? 'bg-primary text-white border-primary hover:bg-primary/90'
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {modalIsCurrentWave ? '✓ In Huidige Wave' : 'Toevoegen aan Huidige Wave'}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status</label>
                    <select
                      name="status"
                      defaultValue={editingRoadmapItem?.status || 'Te doen'}
                      className="w-full p-2 rounded-lg border bg-transparent"
                    >
                      <option value="Te doen">Te doen</option>
                      <option value="Mee bezig">Mee bezig</option>
                      <option value="Klaar">Klaar</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Verantwoordelijke</label>
                    <select
                      name="assigneeId"
                      defaultValue={editingRoadmapItem?.assignee_id || 'null'}
                      className="w-full p-2 rounded-lg border bg-transparent"
                    >
                      <option value="null">Niet toegewezen</option>
                      {TEAM_MEMBERS.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Due Date</label>
                  <input
                    type="date"
                    name="dueDate"
                    defaultValue={editingRoadmapItem?.due_date}
                    className="w-full p-2 rounded-lg border bg-transparent"
                  />
                </div>

                {/* Notities Sectie */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Notities</label>
                  <textarea
                    value={modalNotes}
                    onChange={(e) => setModalNotes(e.target.value)}
                    placeholder="Uitgebreide notities..."
                    className="w-full p-2 rounded-lg border bg-transparent focus:ring-2 focus:ring-primary outline-none resize-none"
                    rows={4}
                  />
                </div>

                {/* Tussenstappen Sectie */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Tussenstappen</label>
                  <div className="space-y-2 mb-2">
                    {modalSteps.map((step, index) => (
                      <div key={step.id} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded border">
                        <button
                          type="button"
                          onClick={() => {
                            const newSteps = [...modalSteps]
                            newSteps[index].completed = !newSteps[index].completed
                            setModalSteps(newSteps)
                          }}
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            step.completed
                              ? 'bg-green-500 border-green-500 text-white'
                              : 'border-gray-300'
                          }`}
                        >
                          {step.completed && <span className="material-symbols-outlined text-sm">check</span>}
                        </button>
                        <input
                          type="text"
                          value={step.title}
                          onChange={(e) => {
                            const newSteps = [...modalSteps]
                            newSteps[index].title = e.target.value
                            setModalSteps(newSteps)
                          }}
                          className="flex-1 p-1 text-sm rounded border bg-transparent"
                        />
                        <button
                          type="button"
                          onClick={() => setModalSteps(modalSteps.filter((_, i) => i !== index))}
                          className="text-red-500 hover:text-red-700"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newStepTitle}
                      onChange={(e) => setNewStepTitle(e.target.value)}
                      placeholder="Nieuwe tussenstap..."
                      className="flex-1 p-2 text-sm rounded-lg border bg-transparent"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && newStepTitle.trim()) {
                          e.preventDefault()
                          setModalSteps([...modalSteps, {
                            id: Date.now().toString(),
                            title: newStepTitle.trim(),
                            completed: false,
                            order: modalSteps.length,
                          }])
                          setNewStepTitle('')
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newStepTitle.trim()) {
                          setModalSteps([...modalSteps, {
                            id: Date.now().toString(),
                            title: newStepTitle.trim(),
                            completed: false,
                            order: modalSteps.length,
                          }])
                          setNewStepTitle('')
                        }
                      }}
                      className="px-3 py-2 bg-primary text-white rounded-lg text-sm font-bold"
                    >
                      Toevoegen
                    </button>
                  </div>
                </div>

                {/* Bijlagen Sectie */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase">Bijlagen</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setAttachmentLinkInput({ name: '', url: '' })}
                        className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 font-bold"
                      >
                        + Link
                      </button>
                      <button
                        type="button"
                        onClick={() => roadmapAttachmentFileInputRef.current?.click()}
                        className="text-xs bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary/20 font-bold"
                      >
                        + Bestand
                      </button>
                    </div>
                  </div>
                  <input
                    type="file"
                    ref={roadmapAttachmentFileInputRef}
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file || !editingRoadmapItem) return
                      if (file.size > 3 * 1024 * 1024) {
                        alert('Bestand is te groot (max 3MB).')
                        return
                      }
                      const reader = new FileReader()
                      reader.onload = async (event) => {
                        try {
                          const { data, error } = await supabase
                            .from('werkgroep_roadmap_attachments')
                            .insert({
                              item_id: editingRoadmapItem.id,
                              name: file.name,
                              type: 'file',
                              url: event.target?.result as string,
                              size: file.size,
                            })
                            .select()
                            .single()
                          if (error) throw error
                          setRoadmapAttachments(prev => ({
                            ...prev,
                            [editingRoadmapItem.id]: [...(prev[editingRoadmapItem.id] || []), {
                              id: data.id,
                              item_id: data.item_id,
                              name: data.name,
                              type: data.type as 'file' | 'link',
                              url: data.url,
                              size: data.size || undefined,
                              created_at: data.created_at,
                              updated_at: data.updated_at,
                            }]
                          }))
                        } catch (error) {
                          console.error('Error uploading attachment:', error)
                          alert('Fout bij uploaden van bijlage')
                        }
                      }
                      reader.readAsDataURL(file)
                    }}
                  />
                  {attachmentLinkInput && (
                    <div className="mb-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded border">
                      <input
                        type="text"
                        placeholder="Naam"
                        value={attachmentLinkInput.name}
                        onChange={(e) => setAttachmentLinkInput({ ...attachmentLinkInput, name: e.target.value })}
                        className="w-full text-sm p-1 mb-1 rounded border bg-transparent"
                      />
                      <input
                        type="url"
                        placeholder="URL"
                        value={attachmentLinkInput.url}
                        onChange={(e) => setAttachmentLinkInput({ ...attachmentLinkInput, url: e.target.value })}
                        className="w-full text-sm p-1 mb-1 rounded border bg-transparent"
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => setAttachmentLinkInput(null)}
                          className="text-xs text-gray-500"
                        >
                          Annuleren
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!attachmentLinkInput.name || !attachmentLinkInput.url || !editingRoadmapItem) return
                            try {
                              const { data, error } = await supabase
                                .from('werkgroep_roadmap_attachments')
                                .insert({
                                  item_id: editingRoadmapItem.id,
                                  name: attachmentLinkInput.name,
                                  type: 'link',
                                  url: attachmentLinkInput.url,
                                })
                                .select()
                                .single()
                              if (error) throw error
                              setRoadmapAttachments(prev => ({
                                ...prev,
                                [editingRoadmapItem.id]: [...(prev[editingRoadmapItem.id] || []), {
                                  id: data.id,
                                  item_id: data.item_id,
                                  name: data.name,
                                  type: data.type as 'file' | 'link',
                                  url: data.url,
                                  size: data.size || undefined,
                                  created_at: data.created_at,
                                  updated_at: data.updated_at,
                                }]
                              }))
                              setAttachmentLinkInput(null)
                            } catch (error) {
                              console.error('Error adding attachment:', error)
                              alert('Fout bij toevoegen van bijlage')
                            }
                          }}
                          className="text-xs bg-primary text-white px-2 py-1 rounded font-bold"
                        >
                          Opslaan
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="space-y-1">
                    {editingRoadmapItem && roadmapAttachments[editingRoadmapItem.id]?.map(att => (
                      <div key={att.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded border">
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm hover:text-primary"
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            {att.type === 'file' ? 'description' : 'link'}
                          </span>
                          {att.name}
                        </a>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!confirm('Bijlage verwijderen?')) return
                            try {
                              await supabase
                                .from('werkgroep_roadmap_attachments')
                                .delete()
                                .eq('id', att.id)
                              setRoadmapAttachments(prev => ({
                                ...prev,
                                [editingRoadmapItem.id]: (prev[editingRoadmapItem.id] || []).filter(a => a.id !== att.id)
                              }))
                            } catch (error) {
                              console.error('Error deleting attachment:', error)
                            }
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    ))}
                    {(!editingRoadmapItem || !roadmapAttachments[editingRoadmapItem.id] || roadmapAttachments[editingRoadmapItem.id].length === 0) && (
                      <p className="text-xs text-gray-400 text-center py-2">Geen bijlagen</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 flex justify-between items-center">
                {editingRoadmapItem ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteRoadmapItem(editingRoadmapItem.id)}
                    className="text-red-600 text-sm"
                  >
                    Verwijderen
                  </button>
                ) : (
                  <div></div>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRoadmapItemModalOpen(false)
                      setModalNotes('')
                      setModalSteps([])
                      setNewStepTitle('')
                      setAttachmentLinkInput(null)
                      setModalIsCurrentWave(false)
                    }}
                    className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400"
                  >
                    Annuleren
                  </button>
                  <button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-primary rounded-lg">
                    Opslaan
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Theme Panel - Slide-out */}
      {isThemePanelOpen && selectedTheme && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:z-50 transition-opacity"
            onClick={() => setIsThemePanelOpen(false)}
          />
          
          {/* Panel - Desktop: right side, Mobile: bottom */}
          <div className={`
            fixed z-50 bg-white dark:bg-gray-800 shadow-2xl
            md:w-[600px] md:right-0 md:top-0 md:h-full md:rounded-l-2xl
            w-full h-[85vh] bottom-0 rounded-t-2xl
            flex flex-col
            transition-transform duration-300 ease-out
            ${isThemePanelOpen ? 'translate-x-0 translate-y-0' : 'md:translate-x-full translate-y-full'}
          `}>
            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-[#111418] dark:text-white">{selectedTheme}</h2>
                <p className="text-sm text-gray-500 mt-1">Thema overzicht</p>
              </div>
              <button
                onClick={() => setIsThemePanelOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-gray-500">close</span>
              </button>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Countries Tabs */}
              <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
                {(['Nederland', 'België', 'Frankrijk'] as const).map(country => (
                  <button
                    key={country}
                    onClick={() => setSelectedCountry(country)}
                    className={`px-4 py-2 font-bold text-sm border-b-2 transition-colors ${
                      selectedCountry === country
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    {country}
                  </button>
                ))}
              </div>

              {/* Country Content - Show only selected country */}
              <div className="space-y-6">
                {(() => {
                  const country = selectedCountry
                  return (
                  <div key={country} className="space-y-4">
                    <h3 className="text-lg font-bold text-[#111418] dark:text-white">{country}</h3>
                    
                    {/* Notities */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                      <h4 className="font-bold text-sm text-gray-500 uppercase mb-2">Notities</h4>
                      <textarea
                        value={themeNotes[selectedTheme]?.[country]?.content || ''}
                        onChange={async (e) => {
                          // Save theme note
                          const note = themeNotes[selectedTheme]?.[country]
                          if (note) {
                            const { error } = await supabase
                              .from('werkgroep_theme_notes')
                              .update({ content: e.target.value, updated_at: new Date().toISOString() })
                              .eq('id', note.id)
                            if (!error) {
                              setThemeNotes(prev => ({
                                ...prev,
                                [selectedTheme]: {
                                  ...(prev[selectedTheme] || {}),
                                  [country]: { ...note, content: e.target.value }
                                }
                              }))
                            }
                          } else {
                            const { data, error } = await supabase
                              .from('werkgroep_theme_notes')
                              .insert({ theme: selectedTheme, country, content: e.target.value })
                              .select()
                              .single()
                            if (!error && data) {
                              setThemeNotes(prev => ({
                                ...prev,
                                [selectedTheme]: {
                                  ...(prev[selectedTheme] || {}),
                                  [country]: {
                                    id: data.id,
                                    theme: data.theme,
                                    country: data.country,
                                    content: data.content,
                                    created_at: data.created_at,
                                    updated_at: data.updated_at,
                                  }
                                }
                              }))
                            }
                          }
                        }}
                        placeholder="Notities voor dit thema in dit land..."
                        className="w-full p-3 rounded-lg border bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary outline-none resize-none"
                        rows={4}
                      />
                    </div>

                    {/* Bijdragen */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-sm text-gray-500 uppercase">Bijdragen</h4>
                        <button
                          onClick={async () => {
                            const content = prompt('Wat heb je gedaan?')
                            if (content) {
                              const { data, error } = await supabase
                                .from('werkgroep_theme_contributions')
                                .insert({ theme: selectedTheme, country, content })
                                .select()
                                .single()
                              if (!error && data) {
                                setThemeContributions(prev => ({
                                  ...prev,
                                  [selectedTheme]: {
                                    ...(prev[selectedTheme] || {}),
                                    [country]: [
                                      ...(prev[selectedTheme]?.[country] || []),
                                      {
                                        id: data.id,
                                        theme: data.theme,
                                        country: data.country,
                                        content: data.content,
                                        author_id: data.author_id || null,
                                        created_at: data.created_at,
                                      }
                                    ]
                                  }
                                }))
                                await loadThemeData()
                              }
                            }
                          }}
                          className="text-sm text-primary font-bold hover:underline"
                        >
                          + Bijdrage toevoegen
                        </button>
                      </div>
                      <div className="space-y-2">
                        {(themeContributions[selectedTheme]?.[country] || []).map(contrib => (
                          <div key={contrib.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                            <p className="text-sm text-[#111418] dark:text-white">{contrib.content}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {contrib.created_at && new Date(contrib.created_at).toLocaleDateString('nl-NL')}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Bijlagen */}
                    <div className="space-y-2">
                      <h4 className="font-bold text-sm text-gray-500 uppercase">Bijlagen</h4>
                      <div className="space-y-2">
                        {(themeAttachments[selectedTheme]?.[country] || []).map(att => (
                          <div key={att.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                            <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                              {att.name}
                            </a>
                            <button
                              onClick={async () => {
                                if (confirm('Bijlage verwijderen?')) {
                                  const { error } = await supabase
                                    .from('werkgroep_theme_attachments')
                                    .delete()
                                    .eq('id', att.id)
                                  if (!error) {
                                    await loadThemeData()
                                  }
                                }
                              }}
                              className="text-red-500 hover:text-red-700"
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            id={`link-name-${country}`}
                            placeholder="Link naam"
                            className="flex-1 p-2 rounded-lg border bg-white dark:bg-gray-800 text-sm"
                          />
                          <input
                            type="url"
                            id={`link-url-${country}`}
                            placeholder="URL"
                            className="flex-1 p-2 rounded-lg border bg-white dark:bg-gray-800 text-sm"
                            onKeyDown={async (e) => {
                              if (e.key === 'Enter') {
                                const nameInput = document.getElementById(`link-name-${country}`) as HTMLInputElement
                                const urlInput = e.currentTarget
                                const name = nameInput.value.trim()
                                const url = urlInput.value.trim()
                                if (name && url) {
                                  const { error } = await supabase
                                    .from('werkgroep_theme_attachments')
                                    .insert({ theme: selectedTheme, country, name, type: 'link', url })
                                  if (!error) {
                                    nameInput.value = ''
                                    urlInput.value = ''
                                    await loadThemeData()
                                  }
                                }
                              }
                            }}
                          />
                          <button
                            onClick={async () => {
                              const nameInput = document.getElementById(`link-name-${country}`) as HTMLInputElement
                              const urlInput = document.getElementById(`link-url-${country}`) as HTMLInputElement
                              const name = nameInput.value.trim()
                              const url = urlInput.value.trim()
                              if (name && url) {
                                const { error } = await supabase
                                  .from('werkgroep_theme_attachments')
                                  .insert({ theme: selectedTheme, country, name, type: 'link', url })
                                if (!error) {
                                  nameInput.value = ''
                                  urlInput.value = ''
                                  await loadThemeData()
                                }
                              }
                            }}
                            className="px-3 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90"
                          >
                            Toevoegen
                          </button>
                        </div>
                        <input
                          type="file"
                          id={`file-upload-${country}`}
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              const fileExt = file.name.split('.').pop()
                              const fileName = `${Math.random()}.${fileExt}`
                              const filePath = `theme-attachments/${selectedTheme}/${country}/${fileName}`
                              
                              const { error: uploadError } = await supabase.storage
                                .from('werkgroep-files')
                                .upload(filePath, file)
                              
                              if (!uploadError) {
                                const { data } = supabase.storage
                                  .from('werkgroep-files')
                                  .getPublicUrl(filePath)
                                
                                const { error } = await supabase
                                  .from('werkgroep_theme_attachments')
                                  .insert({ 
                                    theme: selectedTheme, 
                                    country, 
                                    name: file.name, 
                                    type: 'file', 
                                    url: data.publicUrl,
                                    size: file.size
                                  })
                                if (!error) {
                                  await loadThemeData()
                                }
                              }
                              e.target.value = ''
                            }
                          }}
                        />
                        <button
                          onClick={() => {
                            document.getElementById(`file-upload-${country}`)?.click()
                          }}
                          className="w-full px-3 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-500 hover:border-primary hover:text-primary transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm align-middle mr-1">upload_file</span>
                          Bestand uploaden
                        </button>
                      </div>
                    </div>
                  </div>
                )
                })()}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
