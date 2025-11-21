import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// --- TYPES ---

type Ban = 'Knapen' | 'Jonghernieuwers' | 'Hernieuwers'
type DeelnameStatus = 'Gaat niet mee' | 'Onzeker' | 'Gaat mee'

interface Member {
  id: string
  firstName: string
  lastName: string
  ban: Ban
  status: DeelnameStatus
  notes?: string
}

// --- CONSTANTS ---

const BANNEN: Ban[] = ['Knapen', 'Jonghernieuwers', 'Hernieuwers']

const INITIAL_MEMBERS: Member[] = [
  // Knapen (members 1)
  { id: 'k1', firstName: 'Alexander', lastName: 'Meyns', ban: 'Knapen', status: 'Onzeker' },
  { id: 'k2', firstName: 'Arthur', lastName: 'De Vestele', ban: 'Knapen', status: 'Onzeker' },
  { id: 'k3', firstName: 'Daniël', lastName: 'Jodts', ban: 'Knapen', status: 'Onzeker' },
  { id: 'k4', firstName: 'Douwe', lastName: 'Christiaen', ban: 'Knapen', status: 'Onzeker' },
  { id: 'k5', firstName: 'Ferre', lastName: 'Defloo', ban: 'Knapen', status: 'Onzeker' },
  { id: 'k6', firstName: 'Finnley', lastName: 'Vermeulen', ban: 'Knapen', status: 'Onzeker' },
  { id: 'k7', firstName: 'Henri', lastName: 'Vandewalle', ban: 'Knapen', status: 'Onzeker' },
  { id: 'k8', firstName: 'Jolan', lastName: 'Anseeuw', ban: 'Knapen', status: 'Onzeker' },
  { id: 'k9', firstName: 'Lem', lastName: 'Bolle', ban: 'Knapen', status: 'Onzeker' },
  { id: 'k10', firstName: 'Louis', lastName: 'Lema', ban: 'Knapen', status: 'Onzeker' },
  { id: 'k11', firstName: 'Marcel', lastName: 'Meulemeester', ban: 'Knapen', status: 'Onzeker' },
  { id: 'k12', firstName: 'Maxim', lastName: 'Puype', ban: 'Knapen', status: 'Onzeker' },
  { id: 'k13', firstName: 'Miel', lastName: 'Minne', ban: 'Knapen', status: 'Onzeker' },
  { id: 'k14', firstName: 'Oscar', lastName: 'Decloedt', ban: 'Knapen', status: 'Onzeker' },
  { id: 'k15', firstName: 'Rafael', lastName: 'Patou', ban: 'Knapen', status: 'Onzeker' },
  { id: 'k16', firstName: 'Tobe', lastName: 'Defloo', ban: 'Knapen', status: 'Onzeker' },
  { id: 'k17', firstName: 'Tuur', lastName: 'Debruyne', ban: 'Knapen', status: 'Onzeker' },
  { id: 'k18', firstName: 'Tuur', lastName: 'Veys', ban: 'Knapen', status: 'Onzeker' },
  { id: 'k19', firstName: 'Vic', lastName: 'Muylle', ban: 'Knapen', status: 'Onzeker' },
  { id: 'k20', firstName: 'Wannes', lastName: 'Vierstraete', ban: 'Knapen', status: 'Onzeker' },
  { id: 'k21', firstName: 'Warre', lastName: 'Bonny', ban: 'Knapen', status: 'Onzeker' },
  { id: 'k22', firstName: 'Warre', lastName: 'Breemersch', ban: 'Knapen', status: 'Onzeker' },
  { id: 'k23', firstName: 'Wout', lastName: 'Devloo', ban: 'Knapen', status: 'Onzeker' },
  { id: 'k24', firstName: 'Xybe', lastName: 'Tordoir', ban: 'Knapen', status: 'Onzeker' },

  // Jonghernieuwers (members 2)
  { id: 'j1', firstName: 'Baue', lastName: 'Van Eenoo', ban: 'Jonghernieuwers', status: 'Onzeker' },
  { id: 'j2', firstName: 'Emiel', lastName: 'Jacobs', ban: 'Jonghernieuwers', status: 'Onzeker' },
  { id: 'j3', firstName: 'Florian', lastName: 'Six', ban: 'Jonghernieuwers', status: 'Onzeker' },
  { id: 'j4', firstName: 'Gertjan', lastName: "D'hondt", ban: 'Jonghernieuwers', status: 'Onzeker' },
  { id: 'j5', firstName: 'Louis', lastName: 'Vandenbroucke', ban: 'Jonghernieuwers', status: 'Onzeker' },
  { id: 'j6', firstName: 'Lowie', lastName: "D'Hondt", ban: 'Jonghernieuwers', status: 'Onzeker' },
  { id: 'j7', firstName: 'Niels', lastName: 'Wostyn', ban: 'Jonghernieuwers', status: 'Onzeker' },
  { id: 'j8', firstName: 'Remi', lastName: 'Declercq', ban: 'Jonghernieuwers', status: 'Onzeker' },
  { id: 'j9', firstName: 'Sam', lastName: 'Logghe', ban: 'Jonghernieuwers', status: 'Onzeker' },
  { id: 'j10', firstName: 'Warre', lastName: 'Six', ban: 'Jonghernieuwers', status: 'Onzeker' },

  // Hernieuwers (members 3)
  { id: 'h1', firstName: 'Finn', lastName: 'Buysschaert', ban: 'Hernieuwers', status: 'Onzeker' },
  { id: 'h2', firstName: 'Lowie', lastName: 'Devos', ban: 'Hernieuwers', status: 'Onzeker' },
  { id: 'h3', firstName: 'Wannes', lastName: 'Dewulf', ban: 'Hernieuwers', status: 'Onzeker' },
  { id: 'h4', firstName: 'Wolf', lastName: 'Vanoverberghe', ban: 'Hernieuwers', status: 'Onzeker' },
]

export default function Gastjes() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Ban>('Knapen')
  const [searchTerm, setSearchTerm] = useState('')
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [importText, setImportText] = useState('')

  // Load data from database
  useEffect(() => {
    loadMembers()
  }, [])

  const loadMembers = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('gastjes')
        .select('*')
        .order('last_name, first_name')

      if (error) throw error

      if (data && data.length > 0) {
        // Convert database format to Member format
        const convertedMembers: Member[] = data.map(item => ({
          id: item.id,
          firstName: item.first_name,
          lastName: item.last_name,
          ban: item.ban as Ban,
          status: item.status as DeelnameStatus,
          notes: item.notes || undefined,
        }))
        setMembers(convertedMembers)
      } else {
        // If no data, seed initial members (only if table is truly empty)
        await seedInitialMembers()
      }
    } catch (error) {
      console.error('Error loading members:', error)
      alert('Fout bij laden van gastjes data')
    } finally {
      setLoading(false)
    }
  }

  const seedInitialMembers = async () => {
    try {
      // Double-check that table is still empty (prevent race conditions)
      const { data: existingData, error: checkError } = await supabase
        .from('gastjes')
        .select('id')
        .limit(1)

      if (checkError) throw checkError

      // If data exists now, don't seed (another process may have seeded)
      if (existingData && existingData.length > 0) {
        await loadMembers()
        return
      }

      const membersToInsert = INITIAL_MEMBERS.map(m => ({
        first_name: m.firstName,
        last_name: m.lastName,
        ban: m.ban,
        status: m.status,
        notes: m.notes || null,
      }))

      const { error } = await supabase
        .from('gastjes')
        .insert(membersToInsert)

      if (error) {
        // If error is duplicate key or constraint violation, just reload
        if (error.code === '23505' || error.message.includes('duplicate')) {
          await loadMembers()
          return
        }
        throw error
      }
      
      // Reload after seeding
      await loadMembers()
    } catch (error) {
      console.error('Error seeding initial members:', error)
      // Try to reload in case another process seeded
      await loadMembers()
    }
  }

  // --- HELPERS ---

  const handleImport = async () => {
    if (!importText.trim()) return
    const lines = importText.split(/\r?\n/).filter(l => l.trim())
    const membersToInsert: Array<{ first_name: string; last_name: string; ban: Ban; status: DeelnameStatus }> = []
    
    lines.forEach(line => {
      let parts = line.split('\t')
      if (parts.length < 2) parts = line.split(',')
      if (parts.length < 2) parts = line.split(';')
      if (parts.length >= 2) {
        const firstName = parts[0].trim()
        const lastName = parts[1].trim()
        let ban: Ban = 'Knapen' 
        if (parts.length >= 3) {
          const rawBan = parts[2].trim().toLowerCase()
          if (rawBan.includes('jong')) ban = 'Jonghernieuwers'
          else if (rawBan.includes('hernieuwer')) ban = 'Hernieuwers'
          else if (rawBan.includes('knap')) ban = 'Knapen'
        }
        if (firstName && lastName) {
          membersToInsert.push({ first_name: firstName, last_name: lastName, ban, status: 'Onzeker' })
        }
      }
    })

    if (membersToInsert.length > 0) {
      try {
        const { data, error } = await supabase
          .from('gastjes')
          .insert(membersToInsert)
          .select()

        if (error) throw error

        const newMembers: Member[] = data.map(item => ({
          id: item.id,
          firstName: item.first_name,
          lastName: item.last_name,
          ban: item.ban as Ban,
          status: item.status as DeelnameStatus,
          notes: item.notes || undefined,
        }))

        setMembers([...members, ...newMembers])
        setImportText('')
        setIsImportModalOpen(false)
        alert(`${newMembers.length} gastjes geïmporteerd!`)
      } catch (error) {
        console.error('Error importing members:', error)
        alert('Fout bij importeren van gastjes')
      }
    } else {
      alert('Kon geen geldige data vinden.')
    }
  }

  const getScoreForList = (list: Member[]) => {
    if (list.length === 0) return { score: 0, total: 0, percentage: 0 }
    let weightedScore = 0
    list.forEach(m => {
      if (m.status === 'Gaat mee') weightedScore += 1
      else if (m.status === 'Onzeker') weightedScore += 0.5
      else if (m.status === 'Gaat niet mee') weightedScore += 0
    })
    return {
      score: Math.round(weightedScore),
      total: list.length,
      percentage: Math.round((weightedScore / list.length) * 100)
    }
  }

  const updateStatus = async (id: string, newStatus: DeelnameStatus) => {
    try {
      const { error } = await supabase
        .from('gastjes')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error

      setMembers(members.map(m => m.id === id ? { ...m, status: newStatus } : m))
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Fout bij bijwerken van status')
    }
  }

  const updateNotes = async (id: string, notes: string) => {
    try {
      const { error } = await supabase
        .from('gastjes')
        .update({ notes: notes || null, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error

      setMembers(members.map(m => m.id === id ? { ...m, notes } : m))
    } catch (error) {
      console.error('Error updating notes:', error)
      alert('Fout bij bijwerken van notities')
    }
  }

  const addMember = async () => {
    const firstName = prompt('Voornaam:')
    if (!firstName) return
    const lastName = prompt('Achternaam:')
    if (!lastName) return

    try {
      const { data, error } = await supabase
        .from('gastjes')
        .insert({
          first_name: firstName,
          last_name: lastName,
          ban: activeTab,
          status: 'Onzeker',
        })
        .select()
        .single()

      if (error) throw error

      const newMember: Member = {
        id: data.id,
        firstName: data.first_name,
        lastName: data.last_name,
        ban: data.ban as Ban,
        status: data.status as DeelnameStatus,
        notes: data.notes || undefined,
      }
      setMembers([...members, newMember])
    } catch (error) {
      console.error('Error adding member:', error)
      alert('Fout bij toevoegen van gastje')
    }
  }

  // --- RENDER ---

  const totalStats = getScoreForList(members)
  const filteredMembers = members.filter(m => 
    m.ban === activeTab &&
    (m.firstName + ' ' + m.lastName).toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6f8f6] dark:bg-[#101815] text-[#111811] dark:text-[#e0f0e0] font-sans">
        <div className="max-w-7xl mx-auto p-8">
          <p className="text-[#618961] dark:text-[#89a989]">Gastjes laden...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f6f8f6] dark:bg-[#101815] text-[#111811] dark:text-[#e0f0e0] font-sans">
      <div className="max-w-7xl mx-auto p-8 space-y-8">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-4">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-[#2E7D32] dark:text-[#89a989]">Gastjes</h1>
            <p className="text-[#618961] dark:text-[#89a989] mt-1 font-medium">
              Beheer & Verwachtingen
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setIsImportModalOpen(true)} className="bg-white dark:bg-[#1a2c1a] text-[#2E7D32] border border-[#dbe6db] dark:border-[#304030] px-4 py-2 rounded-lg font-bold shadow-sm hover:bg-[#f0f5f0] dark:hover:bg-[#243424] flex items-center gap-2 transition-colors">
              <span className="material-symbols-outlined">upload_file</span> Importeer
            </button>
            <button onClick={addMember} className="bg-[#2E7D32] text-white px-4 py-2 rounded-lg font-bold shadow-sm hover:bg-[#246428] flex items-center gap-2 transition-colors">
              <span className="material-symbols-outlined">person_add</span> Toevoegen
            </button>
          </div>
        </div>

        {/* SCORES GRID (Totaal + Per Ban) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
           {/* Totaal Card */}
           <div className="bg-white dark:bg-[#1a2c1a] p-5 rounded-xl border-2 border-[#dbe6db] dark:border-[#304030] shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                 <span className="material-symbols-outlined text-6xl text-[#2E7D32]">groups</span>
              </div>
              <h3 className="font-bold text-lg text-[#111811] dark:text-white mb-1">Totaal</h3>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-4xl font-black text-[#2E7D32]">{totalStats.score}</span>
                <span className="text-sm font-medium text-[#618961] uppercase">/ {totalStats.total}</span>
              </div>
              <div className="h-2 w-full bg-[#f0f5f0] dark:bg-[#102210] rounded-full overflow-hidden">
                <div className="h-full bg-[#2E7D32]" style={{ width: `${totalStats.percentage}%` }} />
              </div>
           </div>

           {/* Ban Cards */}
           {BANNEN.map(ban => {
              const banStats = getScoreForList(members.filter(m => m.ban === ban))
              const colorClass = ban === 'Knapen' ? 'text-blue-600 bg-blue-500' : ban === 'Jonghernieuwers' ? 'text-orange-600 bg-orange-500' : 'text-purple-600 bg-purple-500'
              const barColor = ban === 'Knapen' ? 'bg-blue-500' : ban === 'Jonghernieuwers' ? 'bg-orange-500' : 'bg-purple-500'
              const isSelected = activeTab === ban

              return (
                 <div 
                    key={ban} 
                    onClick={() => setActiveTab(ban)}
                    className={`cursor-pointer p-5 rounded-xl border-2 transition-all shadow-sm hover:shadow-md relative overflow-hidden ${
                       isSelected 
                       ? 'bg-white dark:bg-[#1a2c1a] border-[#2E7D32] dark:border-[#2E7D32] ring-1 ring-[#2E7D32]' 
                       : 'bg-white dark:bg-[#1a2c1a] border-[#dbe6db] dark:border-[#304030] opacity-80 hover:opacity-100'
                    }`}
                 >
                    <h3 className={`font-bold text-lg mb-1 ${isSelected ? 'text-[#111811] dark:text-white' : 'text-[#618961]'}`}>{ban}</h3>
                    <div className="flex items-baseline gap-2 mb-3">
                       <span className={`text-3xl font-black ${isSelected ? colorClass.split(' ')[0] : 'text-[#618961]'}`}>{banStats.score}</span>
                       <span className="text-sm font-medium text-[#618961] uppercase">/ {banStats.total}</span>
                    </div>
                    <div className="h-2 w-full bg-[#f0f5f0] dark:bg-[#102210] rounded-full overflow-hidden">
                       <div className={`h-full ${isSelected ? barColor : 'bg-gray-400'}`} style={{ width: `${banStats.percentage}%` }} />
                    </div>
                 </div>
              )
           })}
        </div>

        {/* CONTENT AREA */}
        <div className="bg-white dark:bg-[#1a2c1a] rounded-xl border border-[#dbe6db] dark:border-[#304030] shadow-sm overflow-hidden min-h-[500px]">
           
           {/* TAB HEADER & SEARCH */}
           <div className="border-b border-[#dbe6db] dark:border-[#304030] p-4 flex flex-wrap justify-between items-center gap-4 bg-[#f6f8f6]/50 dark:bg-[#102210]/50">
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                 {BANNEN.map(ban => (
                    <button
                       key={ban}
                       onClick={() => setActiveTab(ban)}
                       className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                          activeTab === ban 
                          ? 'bg-[#2E7D32] text-white shadow-sm' 
                          : 'text-[#618961] hover:bg-black/5 dark:hover:bg-white/5'
                       }`}
                    >
                       {ban}
                    </button>
                 ))}
              </div>
              <div className="relative w-full md:w-64">
                 <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#618961] text-sm">search</span>
                 <input 
                   type="text" 
                   placeholder="Zoek..." 
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   className="w-full pl-9 pr-3 py-2 rounded-lg text-sm border border-[#dbe6db] dark:border-[#304030] bg-white dark:bg-[#1a2c1a] focus:ring-1 focus:ring-[#2E7D32] outline-none"
                 />
              </div>
           </div>

           {/* TABLE */}
           <table className="w-full text-left border-collapse">
             <thead className="bg-[#f6f8f6] dark:bg-[#102210] text-xs font-bold text-[#618961] uppercase border-b border-[#dbe6db] dark:border-[#304030]">
                <tr>
                   <th className="p-4 pl-6 w-[40%]">Gastje</th>
                   <th className="p-4 w-[30%] text-center">Status</th>
                   <th className="p-4 pr-6 w-[30%] text-right">Notitie</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-[#dbe6db] dark:divide-[#304030]">
                {filteredMembers.map(member => (
                   <tr key={member.id} className="hover:bg-[#f6f8f6] dark:hover:bg-[#243424] transition-colors group">
                      {/* NAAM MET AVATAR */}
                      <td className="p-4 pl-6">
                         <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black text-white shadow-sm flex-shrink-0 ${
                               member.ban === 'Knapen' ? 'bg-blue-500' : member.ban === 'Jonghernieuwers' ? 'bg-orange-500' : 'bg-purple-500'
                            }`}>
                               {member.firstName[0]}{member.lastName[0]}
                            </div>
                            <p className="font-bold text-[#111811] dark:text-white text-base">{member.firstName} {member.lastName}</p>
                         </div>
                      </td>

                      {/* STATUS BUTTONS */}
                      <td className="p-4">
                         <div className="flex justify-center gap-1 max-w-[240px] mx-auto">
                            <button onClick={() => updateStatus(member.id, 'Gaat niet mee')} className={`flex-1 py-1.5 text-[10px] font-bold rounded border transition-all ${member.status === 'Gaat niet mee' ? 'bg-red-100 text-red-700 border-red-200 shadow-inner' : 'bg-transparent text-gray-400 border-transparent hover:bg-gray-100'}`}>
                               Niet
                            </button>
                            <button onClick={() => updateStatus(member.id, 'Onzeker')} className={`flex-1 py-1.5 text-[10px] font-bold rounded border transition-all ${member.status === 'Onzeker' ? 'bg-yellow-100 text-yellow-700 border-yellow-200 shadow-inner' : 'bg-transparent text-gray-400 border-transparent hover:bg-gray-100'}`}>
                               ?
                            </button>
                            <button onClick={() => updateStatus(member.id, 'Gaat mee')} className={`flex-1 py-1.5 text-[10px] font-bold rounded border transition-all ${member.status === 'Gaat mee' ? 'bg-green-100 text-green-700 border-green-200 shadow-inner' : 'bg-transparent text-gray-400 border-transparent hover:bg-gray-100'}`}>
                               Mee
                            </button>
                         </div>
                      </td>

                      {/* NOTITIES (LINKS) */}
                      <td className="p-4 pr-6 text-right">
                         <input 
                           type="text" 
                           value={member.notes || ''}
                           onChange={(e) => updateNotes(member.id, e.target.value)}
                           placeholder="..."
                           className="w-full max-w-[200px] text-xs px-2 py-1.5 rounded border border-transparent focus:border-[#dbe6db] dark:focus:border-[#304030] hover:bg-[#f0f5f0] dark:hover:bg-[#243424] focus:bg-white dark:focus:bg-[#1a2c1a] focus:outline-none transition-colors placeholder-gray-300 text-right"
                         />
                      </td>
                   </tr>
                ))}
                {filteredMembers.length === 0 && (
                   <tr><td colSpan={3} className="p-12 text-center text-[#618961] italic">Geen gastjes gevonden in deze ban.</td></tr>
                )}
             </tbody>
           </table>
        </div>

        {/* IMPORT MODAL */}
        {isImportModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#1a2c1a] rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-[#dbe6db] dark:border-[#304030]">
                <h3 className="text-xl font-bold text-[#111811] dark:text-white">Importeer Gastjes</h3>
                <p className="text-sm text-[#618961] mt-1">Plak hieronder je lijst vanuit Excel.</p>
              </div>
              <div className="p-6">
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder={`Voornaam   Achternaam   Ban\nJan        Janssens     Knapen\n...`}
                  className="w-full h-64 p-3 text-sm font-mono rounded-lg border border-[#dbe6db] dark:border-[#304030] bg-[#f6f8f6] dark:bg-[#102210] focus:ring-2 focus:ring-[#2E7D32] outline-none resize-none"
                />
              </div>
              <div className="p-4 bg-[#f6f8f6] dark:bg-[#102210] flex justify-end gap-2">
                <button onClick={() => setIsImportModalOpen(false)} className="px-4 py-2 text-sm text-[#618961] hover:bg-[#e0e6e0] rounded-lg">Annuleren</button>
                <button onClick={handleImport} className="px-4 py-2 text-sm font-bold text-white bg-[#2E7D32] hover:bg-[#246428] rounded-lg">Importeren</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
