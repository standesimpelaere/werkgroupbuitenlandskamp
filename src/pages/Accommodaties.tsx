import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import VerblijfzoekerContent from './Verblijfzoeker'

type Tab = 'accommodaties' | 'verblijfzoeker'

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

const TEAM_MEMBERS = [
  { id: 'louis', name: 'Louis' },
  { id: 'michiel', name: 'Michiel' },
  { id: 'tim', name: 'Tim' },
  { id: 'douwe', name: 'Douwe' },
  { id: 'victor', name: 'Victor' },
  { id: 'stan', name: 'Stan' },
]

const getContactStatusColor = (status: ContactStatus) => {
  switch (status) {
    case 'Geboekt':
      return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700'
    case 'In onderhandeling':
      return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700'
    case 'Contact gelegd - Geen antwoord':
      return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700'
    case 'Geen mogelijkheid':
      return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700'
    default:
      return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'
  }
}

export default function Accommodaties() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab') || 'accommodaties'
  const [activeTab, setActiveTab] = useState<Tab>(
    (tabParam === 'accommodaties' || tabParam === 'verblijfzoeker') 
      ? tabParam as Tab 
      : 'accommodaties'
  )
  
  const [accommodations, setAccommodations] = useState<AccommodationLocation[]>([])
  const [isAccModalOpen, setIsAccModalOpen] = useState(false)
  const [editingAccLocationId, setEditingAccLocationId] = useState<string | null>(null)
  const [editingAccOption, setEditingAccOption] = useState<AccommodationOption | null>(null)
  

  useEffect(() => {
    loadAccommodations()
  }, [])

  const loadAccommodations = async () => {
    try {
      const { data: locations, error: locError } = await supabase
        .from('werkgroep_accommodation_locations')
        .select('*')
        .order('location_name', { ascending: true })

      if (locError) throw locError

      const { data: options, error: optError } = await supabase
        .from('werkgroep_accommodation_options')
        .select('*')

      if (optError) throw optError

      const accommodationsData: AccommodationLocation[] = (locations || []).map(loc => ({
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

      setAccommodations(accommodationsData)
    } catch (error) {
      console.error('Error loading accommodations:', error)
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


  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-[#111418]">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 md:space-y-8 pt-16 md:pt-6">
        <div className="space-y-2">
          <p className="uppercase text-xs font-semibold tracking-[0.25em] text-primary">
            Accommodaties
          </p>
          <h1 className="text-[#111418] dark:text-white text-4xl font-black leading-tight tracking-[-0.033em]">
            Accommodaties
          </h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 border-b border-[#dbe0e6] dark:border-gray-700">
          {[
            { id: 'accommodaties', label: 'Accommodaties', icon: 'hotel' },
            { id: 'verblijfzoeker', label: 'Verblijfzoeker', icon: 'travel_explore' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as Tab)
                setSearchParams({ tab: tab.id })
              }}
              className={`flex items-center gap-2 pb-3 px-2 text-sm font-bold border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          {activeTab === 'accommodaties' && renderAccommodations()}
          {activeTab === 'verblijfzoeker' && (
            <div className="mt-0">
              <VerblijfzoekerContent />
            </div>
          )}
        </div>

        {/* Accommodation Option Modal */}
        {isAccModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <form onSubmit={handleSaveAccommodationOption}>
                <div className="p-6 border-b flex justify-between items-center">
                  <h3 className="text-xl font-bold">{editingAccOption ? 'Bewerken' : 'Nieuw'}</h3>
                  {editingAccOption && editingAccLocationId && (
                    <button
                      type="button"
                      onClick={() => {
                        deleteAccommodationOption(editingAccLocationId, editingAccOption.id)
                        setIsAccModalOpen(false)
                      }}
                      className="text-red-500"
                    >
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  )}
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Naam</label>
                      <input name="name" defaultValue={editingAccOption?.name} required className="w-full p-2 rounded border" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Adres</label>
                      <input name="address" defaultValue={editingAccOption?.address} className="w-full p-2 rounded border" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Website</label>
                      <input name="website" defaultValue={editingAccOption?.website} className="w-full p-2 rounded border" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Richtprijs</label>
                      <input name="price" defaultValue={editingAccOption?.price} className="w-full p-2 rounded border" />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status</label>
                      <select name="contactStatus" defaultValue={editingAccOption?.contactStatus || 'Niet gecontacteerd'} className="w-full p-2 rounded border">
                        <option value="Niet gecontacteerd">Niet gecontacteerd</option>
                        <option value="Contact gelegd - Geen antwoord">Contact gelegd - Geen antwoord</option>
                        <option value="In onderhandeling">In onderhandeling</option>
                        <option value="Geen mogelijkheid">Geen mogelijkheid</option>
                        <option value="Geboekt">Geboekt</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Verantwoordelijke</label>
                      <select name="contactPersonId" defaultValue={editingAccOption?.contactPersonId || 'null'} className="w-full p-2 rounded border">
                        <option value="null">-- Selecteer --</option>
                        {TEAM_MEMBERS.map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Notities</label>
                      <textarea name="notes" defaultValue={editingAccOption?.notes} rows={3} className="w-full p-2 rounded border" />
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <input type="checkbox" name="isPreference" id="isPreference" defaultChecked={editingAccOption?.isPreference} className="w-4 h-4" />
                      <label htmlFor="isPreference" className="text-sm font-bold cursor-pointer">Dit is onze voorkeur</label>
                    </div>
                  </div>
                </div>
                <div className="p-6 border-t flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAccModalOpen(false)
                      setEditingAccOption(null)
                      setEditingAccLocationId(null)
                    }}
                    className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    Annuleren
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90"
                  >
                    Opslaan
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

