import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

// --- TYPES & INTERFACES ---

type Tab = 'taken' | 'accommodatie' | 'dossiers'

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
  { id: '1', title: 'Contact opnemen met Camp Vresna', description: 'Slechts 60 plekken beschikbaar! ZSM contacteren via 58iamp@seznam.cz', category: 'Accommodatie', priority: 'Hoog', status: 'Te doen', assigneeId: null },
  { id: '2', title: 'Camping Duitsland zoeken', description: 'Tussenstop voor de heenreis zoeken.', category: 'Accommodatie', priority: 'Middel', status: 'Te doen', assigneeId: 'douwe' },
  { id: '3', title: 'Meerprijs dubbele bemanning checken', description: 'Voor de nachtritten (2 chauffeurs).', category: 'Transport', priority: 'Middel', status: 'Te doen', assigneeId: null },
  { id: '4', title: 'Busmaatschappij vastleggen en voorschot betalen', description: 'Offertes vergelijken en definitieve keuze maken.', category: 'Transport', priority: 'Hoog', status: 'Mee bezig', assigneeId: 'louis' },
  { id: '5', title: 'Camping Neurenberg reserveren', description: 'Locatie voor tussenstop vastleggen.', category: 'Accommodatie', priority: 'Middel', status: 'Te doen', assigneeId: 'douwe' },
  { id: '6', title: 'Gedetailleerde activiteitendagboeken uitwerken', description: 'Per dagdeel uitwerken wat we gaan doen.', category: 'Activiteiten', priority: 'Middel', status: 'Te doen', assigneeId: null },
  { id: '7', title: 'Menu samenstellen en boodschappenlijst maken', description: 'Rekening houden met allergieën en budget.', category: 'Voeding', priority: 'Middel', status: 'Te doen', assigneeId: 'victor' },
  { id: '8', title: 'Inschrijvingsformulier openstellen', description: 'Via de website en mail naar ouders.', category: 'Communicatie', priority: 'Hoog', status: 'Klaar', assigneeId: 'michiel' },
  { id: '9', title: 'Medische fiches verzamelen', description: 'Zorgen dat alles digitaal in orde is.', category: 'Administratie', priority: 'Laag', status: 'Te doen', assigneeId: 'tim' },
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
  const [activeTab, setActiveTab] = useState<Tab>('taken')
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

  // Load data from database
  useEffect(() => {
    loadAllData()
  }, [])

  const loadAllData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        loadTasks(),
        loadAccommodations(),
        loadMemberSpaces(),
      ])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
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

  // Statistics
  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'Klaar').length,
    inProgress: tasks.filter(t => t.status === 'Mee bezig').length,
    todo: tasks.filter(t => t.status === 'Te doen').length,
    highPriority: tasks.filter(t => t.priority === 'Hoog' && t.status !== 'Klaar').length
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

  // --- RENDER ---

  const renderTasks = () => {
    const filtered = tasks.filter(t => selectedMemberId ? t.assigneeId === selectedMemberId : true)

    return (
      <div className="space-y-6">
        {/* Stats Widgets */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <p className="text-xs text-gray-500 uppercase font-bold">Voortgang</p>
            <div className="flex items-end gap-2 mt-1">
              <span className="text-2xl font-black text-primary">{progressPercentage}%</span>
              <span className="text-sm text-gray-400 mb-1">voltooid</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-700 h-1.5 rounded-full mt-2">
              <div className="bg-primary h-full rounded-full" style={{ width: `${progressPercentage}%` }}></div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <p className="text-xs text-gray-500 uppercase font-bold">Nog te doen</p>
            <p className="text-2xl font-black text-[#111418] dark:text-white mt-1">{stats.todo}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <p className="text-xs text-gray-500 uppercase font-bold">Hoog Prioriteit</p>
            <p className="text-2xl font-black text-red-500 mt-1">{stats.highPriority}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <p className="text-xs text-gray-500 uppercase font-bold">Totaal Taken</p>
            <p className="text-2xl font-black text-[#111418] dark:text-white mt-1">{stats.total}</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-between items-center">
           <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
             <button onClick={() => setViewMode('list')} className={`px-3 py-1.5 rounded-md text-sm font-bold flex items-center gap-2 ${viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm text-[#111418] dark:text-white' : 'text-gray-500'}`}>
               <span className="material-symbols-outlined text-[18px]">list</span> Lijst
             </button>
             <button onClick={() => setViewMode('kanban')} className={`px-3 py-1.5 rounded-md text-sm font-bold flex items-center gap-2 ${viewMode === 'kanban' ? 'bg-white dark:bg-gray-700 shadow-sm text-[#111418] dark:text-white' : 'text-gray-500'}`}>
               <span className="material-symbols-outlined text-[18px]">view_column</span> Bord
             </button>
           </div>
           <button onClick={() => { setEditingTask(null); setIsTaskModalOpen(true); }} className="btn-primary flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 font-bold shadow-sm">
             <span className="material-symbols-outlined text-[20px]">add</span> Nieuwe Taak
           </button>
        </div>

        {/* View: Kanban */}
        {viewMode === 'kanban' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 overflow-x-auto pb-4">
            {['Te doen', 'Mee bezig', 'Geblokkeerd', 'Klaar'].map(status => {
              const colTasks = filtered.filter(t => t.status === status)
              return (
                <div key={status} className="flex flex-col gap-3 min-w-[250px]">
                  <div className="flex justify-between items-center px-1 mb-1">
                    <h3 className="font-bold text-sm uppercase tracking-wider text-gray-500">{status}</h3>
                    <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold px-2 py-0.5 rounded-full">{colTasks.length}</span>
                  </div>
                  <div className="flex flex-col gap-3">
                    {colTasks.map(task => (
                      <div 
                        key={task.id} 
                        onClick={() => { setEditingTask(task); setIsTaskModalOpen(true); }}
                        className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all cursor-pointer"
                      >
                        <h4 className="font-bold text-sm text-[#111418] dark:text-white mb-2 line-clamp-2">{task.title}</h4>
                        <div className="flex justify-between items-center">
                          {task.assigneeId ? (
                            <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-[10px] font-bold text-blue-700 dark:text-blue-300" title={TEAM_MEMBERS.find(m => m.id === task.assigneeId)?.name}>
                              {TEAM_MEMBERS.find(m => m.id === task.assigneeId)?.name.substring(0, 2)}
                            </div>
                          ) : <span></span>}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${getPriorityColor(task.priority)}`}>{task.priority}</span>
                        </div>
                      </div>
                    ))}
                    {colTasks.length === 0 && (
                      <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center text-xs text-gray-400">Leeg</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* View: List */}
        {viewMode === 'list' && (
          <div className="space-y-2">
            {filtered.length === 0 ? (
              <p className="text-center text-gray-400 py-8">Geen taken gevonden.</p>
            ) : (
              filtered.map(task => (
                <div key={task.id} onClick={() => { setEditingTask(task); setIsTaskModalOpen(true); }} className="group flex items-center gap-4 bg-white dark:bg-background-dark p-4 rounded-xl border border-[#dbe0e6] dark:border-gray-700 hover:shadow-md transition-all cursor-pointer">
                  <div 
                     onClick={async (e) => { 
                       e.stopPropagation()
                       const newStatus = task.status === 'Klaar' ? 'Te doen' : 'Klaar'
                       try {
                         const { error } = await supabase
                           .from('werkgroep_tasks')
                           .update({ status: newStatus, updated_at: new Date().toISOString() })
                           .eq('id', task.id)
                         if (error) throw error
                         setTasks(tasks.map(t => t.id === task.id ? { ...t, status: newStatus as Task['status'] } : t))
                       } catch (error) {
                         console.error('Error updating task status:', error)
                       }
                     }}
                     className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${task.status === 'Klaar' ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-primary'}`}
                  >
                    {task.status === 'Klaar' && <span className="material-symbols-outlined text-sm font-bold">check</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold text-[#111418] dark:text-white truncate ${task.status === 'Klaar' ? 'line-through text-gray-400' : ''}`}>{task.title}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${getPriorityColor(task.priority)}`}>{task.priority}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                      <span className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">{task.category}</span>
                      {task.assigneeId && <span>{TEAM_MEMBERS.find(m => m.id === task.assigneeId)?.name}</span>}
                      {task.dueDate && <span>{new Date(task.dueDate).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(task.status)}`}>{task.status}</div>
                </div>
              ))
            )}
          </div>
        )}
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
        <div className="max-w-7xl mx-auto p-6">
          <p className="text-[#617589]">Data laden...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-[#111418]">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        <div className="flex justify-between items-end border-b pb-6">
           <div><h1 className="text-4xl font-black text-[#111418] dark:text-white tracking-tight">Werkgroep</h1><p className="text-[#617589] mt-1">Organisatiehub</p></div>
           <div className="flex items-center gap-2 bg-white p-1.5 rounded-full border shadow-sm">
              <span className="text-xs font-bold text-gray-400 uppercase px-2">Filter:</span>
              <div className="flex -space-x-2">{TEAM_MEMBERS.map(m => <button key={m.id} onClick={() => setSelectedMemberId(selectedMemberId === m.id ? null : m.id)} className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-transform hover:z-10 hover:scale-110 ${selectedMemberId === m.id ? 'bg-primary text-white z-20 scale-110' : 'bg-gray-200 text-gray-600'}`}>{m.name.substring(0, 2)}</button>)}</div>
           </div>
        </div>
        <div className="flex gap-6 border-b">
           {[{ id: 'taken', label: 'Takenlijst', icon: 'check_circle' }, { id: 'accommodatie', label: 'Accommodaties', icon: 'camping' }, { id: 'dossiers', label: 'Dossiers', icon: 'folder_shared' }].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as Tab)} className={`flex items-center gap-2 pb-3 px-2 text-sm font-bold border-b-2 transition-colors ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><span className="material-symbols-outlined text-[20px]">{tab.icon}</span>{tab.label}</button>
           ))}
        </div>
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
           {activeTab === 'taken' && renderTasks()}
           {activeTab === 'accommodatie' && renderAccommodations()}
           {activeTab === 'dossiers' && renderDossiers()}
        </div>
      </div>
      {isTaskModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
              <form onSubmit={handleSaveTask}>
                <div className="p-6 border-b"><h3 className="text-xl font-bold">{editingTask ? 'Taak Bewerken' : 'Nieuwe Taak'}</h3></div>
                <div className="p-6 space-y-4">
                   <input name="title" defaultValue={editingTask?.title} required placeholder="Titel" className="w-full p-2 rounded-lg border bg-transparent focus:ring-2 focus:ring-primary outline-none" />
                   <textarea name="description" defaultValue={editingTask?.description} placeholder="Beschrijving" className="w-full p-2 rounded-lg border bg-transparent focus:ring-2 focus:ring-primary outline-none resize-none" rows={3} />
                   <div className="grid grid-cols-2 gap-4">
                      <select name="category" defaultValue={editingTask?.category || 'Algemeen'} className="w-full p-2 rounded-lg border bg-transparent"><option value="Algemeen">Algemeen</option><option value="Accommodatie">Accommodatie</option><option value="Transport">Transport</option><option value="Activiteiten">Activiteiten</option><option value="Administratie">Administratie</option><option value="Voeding">Voeding</option><option value="Communicatie">Communicatie</option></select>
                      <select name="priority" defaultValue={editingTask?.priority || 'Middel'} className="w-full p-2 rounded-lg border bg-transparent"><option value="Laag">Laag</option><option value="Middel">Middel</option><option value="Hoog">Hoog</option></select>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <select name="assigneeId" defaultValue={editingTask?.assigneeId || 'null'} className="w-full p-2 rounded-lg border bg-transparent"><option value="null">Niet toegewezen</option>{TEAM_MEMBERS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
                      <select name="status" defaultValue={editingTask?.status || 'Te doen'} className="w-full p-2 rounded-lg border bg-transparent"><option value="Te doen">Te doen</option><option value="Mee bezig">Mee bezig</option><option value="Geblokkeerd">Geblokkeerd</option><option value="Klaar">Klaar</option></select>
                   </div>
                   <input type="date" name="dueDate" defaultValue={editingTask?.dueDate} className="w-full p-2 rounded-lg border bg-transparent" />
                </div>
                <div className="p-4 bg-gray-50 flex justify-between items-center">
                   {editingTask ? <button type="button" onClick={() => handleDeleteTask(editingTask.id)} className="text-red-600 text-sm">Verwijderen</button> : <div></div>}
                   <div className="flex gap-2"><button type="button" onClick={() => setIsTaskModalOpen(false)} className="px-4 py-2 text-sm text-gray-600">Annuleren</button><button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-primary rounded-lg">Opslaan</button></div>
                </div>
              </form>
           </div>
        </div>
      )}
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
    </div>
  )
}
