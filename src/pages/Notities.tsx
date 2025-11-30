import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useVersion } from '../context/VersionContext'
import { getCurrentUserName } from '../lib/changeLogger'

interface TeamMember {
  id: string
  name: string
}

interface Note {
  id: string
  title: string
  content: string
  category?: string
  created_by?: string
  created_at: string
  updated_at: string
  version: string
}

const CATEGORIES = [
  'Campings',
  'Vervoer',
  'Activiteiten',
  'Voeding',
  'Administratie',
  'Communicatie',
  'Financiën',
  'Algemeen'
]

export default function Notities() {
  const { currentVersion } = useVersion()
  const [notes, setNotes] = useState<Note[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddCard, setShowAddCard] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState<string>('')
  const [selectedPerson, setSelectedPerson] = useState<string>('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterPerson, setFilterPerson] = useState<string>('all')

  useEffect(() => {
    loadNotes()
    loadTeamMembers()
  }, [currentVersion])

  const loadTeamMembers = async () => {
    try {
      // First try to load from database
      const { data, error } = await supabase
        .from('werkgroep_members')
        .select('id, name')
        .order('name', { ascending: true })

      if (error && error.code !== '42P01') {
        // Table doesn't exist or other error - use fallback
        console.warn('Could not load from database, using fallback:', error)
        // Fallback to same members as Werkgroep page uses
        setTeamMembers([
          { id: 'louis', name: 'Louis' },
          { id: 'michiel', name: 'Michiel' },
          { id: 'tim', name: 'Tim' },
          { id: 'douwe', name: 'Douwe' },
          { id: 'victor', name: 'Victor' },
          { id: 'stan', name: 'Stan' },
        ])
        return
      }

      if (data && data.length > 0) {
        setTeamMembers(data)
      } else {
        // If table exists but is empty, use fallback
        setTeamMembers([
          { id: 'louis', name: 'Louis' },
          { id: 'michiel', name: 'Michiel' },
          { id: 'tim', name: 'Tim' },
          { id: 'douwe', name: 'Douwe' },
          { id: 'victor', name: 'Victor' },
          { id: 'stan', name: 'Stan' },
        ])
      }
    } catch (error) {
      console.error('Error loading team members:', error)
      // Fallback to same members as Werkgroep page uses
      setTeamMembers([
        { id: 'louis', name: 'Louis' },
        { id: 'michiel', name: 'Michiel' },
        { id: 'tim', name: 'Tim' },
        { id: 'douwe', name: 'Douwe' },
        { id: 'victor', name: 'Victor' },
        { id: 'stan', name: 'Stan' },
      ])
    }
  }

  const loadNotes = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('notities')
        .select('*')
        .eq('version', currentVersion)
        .order('created_at', { ascending: false })

      if (error) throw error
      setNotes(data || [])
    } catch (error) {
      console.error('Error loading notes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) return

    try {
      const userName = selectedPerson || getCurrentUserName()
      
      if (editingNote) {
        // Update existing note
        const { data, error } = await supabase
          .from('notities')
          .update({
            title: title.trim(),
            content: content.trim(),
            category: category || null,
            created_by: userName || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingNote.id)
          .select()

        if (error) {
          console.error('Update error:', error)
          throw new Error(`Update fout: ${error.message} (Code: ${error.code})`)
        }
      } else {
        // Create new note
        const noteData: any = {
          title: title.trim(),
          content: content.trim(),
          version: currentVersion,
        }
        
        // Only add category if it's not empty
        if (category && category.trim()) {
          noteData.category = category.trim()
        }
        
        // Only add created_by if we have a value
        if (userName && userName.trim()) {
          noteData.created_by = userName.trim()
        }

        const { data, error } = await supabase
          .from('notities')
          .insert(noteData)
          .select()

        if (error) {
          console.error('Insert error:', error)
          console.error('Data being inserted:', noteData)
          throw new Error(`Insert fout: ${error.message} (Code: ${error.code})`)
        }
      }

      await loadNotes()
      handleCloseCard()
    } catch (error) {
      console.error('Error saving note:', error)
      const errorMessage = error instanceof Error ? error.message : 'Onbekende fout'
      alert(`Fout bij opslaan van notitie: ${errorMessage}`)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Weet je zeker dat je deze notitie wilt verwijderen?')) return

    try {
      const { error } = await supabase
        .from('notities')
        .delete()
        .eq('id', id)

      if (error) throw error
      await loadNotes()
    } catch (error) {
      console.error('Error deleting note:', error)
      alert('Fout bij verwijderen van notitie')
    }
  }

  const handleEdit = (note: Note) => {
    setEditingNote(note)
    setTitle(note.title)
    setContent(note.content)
    setCategory(note.category || '')
    setSelectedPerson(note.created_by || '')
    setShowAddCard(true)
  }

  const handleCloseCard = () => {
    setShowAddCard(false)
    setEditingNote(null)
    setTitle('')
    setContent('')
    setCategory('')
    setSelectedPerson('')
  }

  const getCategoryColor = (cat?: string) => {
    const colors: Record<string, string> = {
      'Campings': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700',
      'Vervoer': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700',
      'Activiteiten': 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700',
      'Voeding': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700',
      'Administratie': 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700',
      'Communicatie': 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-700',
      'Financiën': 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 border-pink-300 dark:border-pink-700',
    }
    return colors[cat || ''] || 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'
  }

  // Filter notes
  const filteredNotes = notes.filter(note => {
    const matchesCategory = filterCategory === 'all' || note.category === filterCategory
    const matchesPerson = filterPerson === 'all' || note.created_by === filterPerson
    return matchesCategory && matchesPerson
  })

  // Get unique categories and persons for filters
  const availableCategories = Array.from(new Set(notes.map(n => n.category).filter(Boolean)))
  const availablePersons = Array.from(new Set(notes.map(n => n.created_by).filter(Boolean)))

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-[#111418]">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 md:space-y-8 pt-16 md:pt-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="uppercase text-xs font-semibold tracking-[0.25em] text-primary">
              Notities
            </p>
            <h1 className="text-[#111418] dark:text-white text-4xl font-black leading-tight tracking-[-0.033em]">
              Notities
            </h1>
          </div>
          <button
            onClick={() => setShowAddCard(true)}
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-base">add</span>
            Nieuwe Notitie
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[#111418] dark:text-white">Filter:</span>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-background-dark text-[#111418] dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">Alle categorieën</option>
              {availableCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <select
              value={filterPerson}
              onChange={(e) => setFilterPerson(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-background-dark text-[#111418] dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">Alle personen</option>
              {availablePersons.map(person => (
                <option key={person} value={person}>{person}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Add/Edit Card */}
        {showAddCard && (
          <div className="bg-white dark:bg-background-dark rounded-xl border border-[#dbe0e6] dark:border-gray-700 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#111418] dark:text-white">
                {editingNote ? 'Notitie bewerken' : 'Nieuwe Notitie'}
              </h2>
              <button
                onClick={handleCloseCard}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <span className="material-symbols-outlined text-gray-600 dark:text-gray-400">close</span>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[#111418] dark:text-white mb-2">
                  Categorie
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-3 rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-background-dark text-[#111418] dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Geen categorie</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#111418] dark:text-white mb-2">
                  Wie ben je?
                </label>
                <select
                  value={selectedPerson}
                  onChange={(e) => setSelectedPerson(e.target.value)}
                  className="w-full p-3 rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-background-dark text-[#111418] dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Selecteer persoon</option>
                  {teamMembers.map(member => (
                    <option key={member.id} value={member.name}>{member.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#111418] dark:text-white mb-2">
                Titel
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Titel van je notitie..."
                className="w-full p-3 rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-background-dark text-[#111418] dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#111418] dark:text-white mb-2">
                Inhoud
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Schrijf je notitie hier..."
                rows={8}
                className="w-full p-3 rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-background-dark text-[#111418] dark:text-white focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCloseCard}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Annuleren
              </button>
              <button
                onClick={handleSave}
                disabled={!title.trim() || !content.trim()}
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-base">check</span>
                Klaar
              </button>
            </div>
          </div>
        )}

        {/* Notes Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <span className="material-symbols-outlined animate-spin text-gray-400">sync</span>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <span className="material-symbols-outlined text-gray-400 text-6xl mb-4">note_add</span>
            <p className="text-lg font-semibold text-[#111418] dark:text-white mb-2">
              {notes.length === 0 ? 'Nog geen notities' : 'Geen notities gevonden'}
            </p>
            <p className="text-sm text-[#617589] dark:text-gray-400 mb-4">
              {notes.length === 0 ? 'Maak je eerste notitie aan om te beginnen' : 'Probeer andere filters'}
            </p>
            {notes.length === 0 && (
              <button
                onClick={() => setShowAddCard(true)}
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90"
              >
                Nieuwe Notitie
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotes.map((note) => (
              <div
                key={note.id}
                className="bg-white dark:bg-background-dark rounded-lg border border-[#dbe0e6] dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-bold text-[#111418] dark:text-white mb-1">
                            {note.title}
                          </h3>
                          <p className="text-sm text-[#617589] dark:text-gray-400 whitespace-pre-wrap line-clamp-2">
                            {note.content}
                          </p>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={() => handleEdit(note)}
                            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
                            title="Bewerken"
                          >
                            <span className="material-symbols-outlined text-base">edit</span>
                          </button>
                          <button
                            onClick={() => handleDelete(note.id)}
                            className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
                            title="Verwijderen"
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        {note.category && (
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${getCategoryColor(note.category)}`}>
                            {note.category}
                          </span>
                        )}
                        <span className="text-xs text-[#617589] dark:text-gray-400">
                          {new Date(note.created_at).toLocaleDateString('nl-BE', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                        {note.created_by && (
                          <span className="text-xs text-[#617589] dark:text-gray-400 font-medium">
                            {note.created_by}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
