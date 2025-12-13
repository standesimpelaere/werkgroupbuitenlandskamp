import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { KostenItem, PlanningDag, Parameters, VersionId, VervoerScenario } from '../types'
import { useVersion } from '../context/VersionContext'
import { logChange, getCurrentUserName } from '../lib/changeLogger'
import { getVervoerScenarioStorageKey, vervoerOffertes } from '../lib/vervoerOffertes'

const CATEGORY_ORDER = ['Verblijf', 'Vervoer', 'Eten', 'Speciale Activiteiten', 'Overige']

function getTableName(table: 'kosten' | 'planning' | 'parameters', version: VersionId): string {
  return `${table}_${version}`
}

export default function Kosten() {
  const { currentVersion, getKostenItems, getPlanningData, getParameters } = useVersion()
  const [kostenItems, setKostenItems] = useState<KostenItem[]>([])
  const [planningData, setPlanningData] = useState<PlanningDag[]>([])
  const [parameters, setParameters] = useState<Parameters | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('Verblijf')
  const [status, setStatus] = useState<{ message: string; tone: 'info' | 'success' | 'error' | 'warning' }>({
    message: 'Data laden...',
    tone: 'info',
  })
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingItem, setEditingItem] = useState<KostenItem | null>(null)
  const [editingField, setEditingField] = useState<{ id: string; field: string } | null>(null)
  const [addModalPrijsType, setAddModalPrijsType] = useState<'totaal' | 'per_persoon'>('per_persoon')
  const [addModalAantalType, setAddModalAantalType] = useState<'getal' | 'iedereen' | 'gastjes' | 'leiders'>('getal')
  const [editModalPrijsType, setEditModalPrijsType] = useState<'totaal' | 'per_persoon'>('per_persoon')
  const [editModalAantalType, setEditModalAantalType] = useState<'getal' | 'iedereen' | 'gastjes' | 'leiders'>('getal')
  const [inputValues, setInputValues] = useState<{ [key: string]: string }>({})
  const [editingKmValues, setEditingKmValues] = useState<{ [dagId: string]: string }>({})
  const [editingTotalKm, setEditingTotalKm] = useState<string | null>(null)
  const [selectedVervoerScenario, setSelectedVervoerScenario] = useState<VervoerScenario>('berekening')

  useEffect(() => {
    loadAllData()
  }, [currentVersion])

  useEffect(() => {
    const storageKey = getVervoerScenarioStorageKey(currentVersion)
    const stored = localStorage.getItem(storageKey) as VervoerScenario | null
    if (stored === 'berekening' || stored === 'reisvogel' || stored === 'coachpartners') {
      setSelectedVervoerScenario(stored)
    }
  }, [currentVersion])

  const restoreKmFromChangeLog = async (planningDays: PlanningDag[]) => {
    try {
      const tableName = getTableName('planning', currentVersion)
      
      // Get the latest non-zero km values from change log for each day
      const restoredDays = await Promise.all(
        planningDays.map(async (dag) => {
          // Only try to restore if current km is 0 or null
          if (dag.km && dag.km > 0) {
            return dag
          }
          
          // Find all change log entries for this day's km field, ordered by date
          const { data: changeLogs } = await supabase
            .from('change_log')
            .select('old_value, new_value, changed_at')
            .eq('version', currentVersion)
            .eq('table_name', tableName)
            .eq('record_id', dag.id)
            .eq('field_name', 'km')
            .order('changed_at', { ascending: false })
          
          if (changeLogs && changeLogs.length > 0) {
            // Look through change logs to find the last non-zero value
            for (const log of changeLogs) {
              // Try old_value first (the value before it was changed)
              if (log.old_value) {
                try {
                  const oldKm = JSON.parse(log.old_value)
                  if (typeof oldKm === 'number' && oldKm > 0) {
                    return { ...dag, km: oldKm }
                  }
                } catch (e) {
                  // Continue to next log entry
                }
              }
              
              // Try new_value if old_value wasn't valid
              if (log.new_value) {
                try {
                  const newKm = JSON.parse(log.new_value)
                  if (typeof newKm === 'number' && newKm > 0) {
                    return { ...dag, km: newKm }
                  }
                } catch (e) {
                  // Continue to next log entry
                }
              }
            }
          }
          
          return dag
        })
      )
      
      // Update any days that were restored
      const updates = restoredDays
        .filter((dag, index) => dag.km !== planningDays[index].km && dag.km > 0)
        .map(dag => ({
          id: dag.id,
          km: dag.km
        }))
      
      if (updates.length > 0) {
        const userName = getCurrentUserName()
        for (const update of updates) {
          const oldDag = planningDays.find(d => d.id === update.id)
          await supabase
            .from(tableName)
            .update({ km: update.km, updated_at: new Date().toISOString() })
            .eq('id', update.id)
          
          await logChange(currentVersion, tableName, update.id, 'km', oldDag?.km || null, update.km, userName)
        }
        
        return restoredDays
      }
      
      return planningDays
    } catch (error) {
      console.error('Error restoring km from change log:', error)
      return planningDays
    }
  }


  const loadAllData = async () => {
    try {
      setStatus({ message: 'Data laden...', tone: 'info' })

      const [loadedKosten, loadedPlanning, params] = await Promise.all([
        getKostenItems(),
        getPlanningData(),
        getParameters(),
      ])

      // Remove duplicates based on unique combination of categorie, subcategorie, beschrijving, and automatisch
      const seen = new Map<string, string>()
      const uniqueKosten: KostenItem[] = []
      const duplicatesToDelete: string[] = []

      loadedKosten.forEach((item) => {
        const key = `${item.categorie}|${item.subcategorie}|${item.beschrijving || ''}|${item.automatisch || false}`
        if (seen.has(key)) {
          // This is a duplicate - keep the first one, mark this one for deletion
          duplicatesToDelete.push(item.id)
        } else {
          seen.set(key, item.id)
          uniqueKosten.push(item)
        }
      })

      // Delete duplicates from database
      if (duplicatesToDelete.length > 0) {
        const tableName = getTableName('kosten', currentVersion)
        const userName = getCurrentUserName()
        
        for (const id of duplicatesToDelete) {
          const duplicateItem = loadedKosten.find(item => item.id === id)
          if (duplicateItem) {
            await supabase.from(tableName).delete().eq('id', id)
            await logChange(currentVersion, tableName, id, null, duplicateItem, null, userName)
          }
        }
        
        setStatus({
          message: `${duplicatesToDelete.length} duplicaat item(s) verwijderd. ${uniqueKosten.length} kostitems geladen.`,
          tone: 'success',
        })
      } else {
        setStatus({
          message: `${uniqueKosten.length} kostitems geladen.`,
          tone: 'success',
        })
      }

      setKostenItems(uniqueKosten)
      setPlanningData(loadedPlanning)
      setParameters(params)

      if (params && loadedPlanning.length > 0 && uniqueKosten.length > 0) {
        setTimeout(() => calculateAutomaticItemsWithParams(params, uniqueKosten, loadedPlanning), 300)
      }
    } catch (error) {
      console.error('Error loading data:', error)
      setStatus({
        message: `Fout bij laden: ${error instanceof Error ? error.message : 'Onbekende fout'}`,
        tone: 'error',
      })
    }
  }

  const calculateAutomaticItemsWithParams = async (
    params: Parameters,
    items: KostenItem[] = kostenItems,
    planning: PlanningDag[] = planningData
  ) => {
    if (!params || !planning.length || !items.length) return

    const totaalPersonen = (params.aantal_gastjes || 0) + (params.aantal_leiders || 0)
    // Use 10 days for calculation instead of all days
    const aantalBusdagen = Math.min(10, planning.length)
    const totaalKm = planning.reduce((sum, dag) => sum + (dag.km || 0), 0)

    const updates: { id: string; totaal: number; aantal?: number }[] = []

    // Update bus kosten
    const busItem = items.find((item) => item.subcategorie === 'Bus huur' && item.automatisch)
    if (busItem && params.bus_dagprijs && params.bus_extra_km) {
      let busKosten = params.bus_dagprijs * aantalBusdagen
      
      // If daglimiet is 0 or null, all km are extra (paid per km)
      // Otherwise, calculate extra km above the limit
      if (params.bus_daglimiet === 0 || params.bus_daglimiet === null) {
        // All kilometers are extra (paid per km)
        busKosten += totaalKm * params.bus_extra_km
      } else {
        const maxKmZonderExtra = params.bus_daglimiet * aantalBusdagen
        if (totaalKm > maxKmZonderExtra) {
          const extraKm = totaalKm - maxKmZonderExtra
          busKosten += extraKm * params.bus_extra_km
        }
      }
      updates.push({ id: busItem.id, totaal: busKosten })
    }

    // Update auto kosten
    const autoItem = items.find((item) => item.subcategorie === 'Auto koks' && item.automatisch)
    if (autoItem && params.auto_brandstof && params.auto_afstand) {
      const autoKosten = params.auto_afstand * params.auto_brandstof
      updates.push({ id: autoItem.id, totaal: autoKosten })
    }

    // Update maaltijden
    const maaltijdenItem = items.find((item) => item.subcategorie === 'Maaltijden' && item.automatisch)
    if (maaltijdenItem && params.eten_prijs_per_dag && params.aantal_dagen_eten) {
      const maaltijdenKosten = params.eten_prijs_per_dag * params.aantal_dagen_eten * totaalPersonen
      updates.push({ id: maaltijdenItem.id, totaal: maaltijdenKosten, aantal: params.aantal_dagen_eten })
    }

    // Batch update
    const tableName = getTableName('kosten', currentVersion)
    const userName = getCurrentUserName()
    
    for (const update of updates) {
      const oldItem = items.find(item => item.id === update.id)
      const updateData = update.aantal ? { totaal: update.totaal, aantal: update.aantal } : { totaal: update.totaal }
      
      const { error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', update.id)

      if (!error) {
        // Log changes
        if (oldItem) {
          if (update.aantal && oldItem.aantal !== update.aantal) {
            await logChange(currentVersion, tableName, update.id, 'aantal', oldItem.aantal, update.aantal, userName)
          }
          if (oldItem.totaal !== update.totaal) {
            await logChange(currentVersion, tableName, update.id, 'totaal', oldItem.totaal, update.totaal, userName)
          }
        }
        
        setKostenItems((prev) =>
          prev.map((item) =>
            item.id === update.id
              ? { ...item, totaal: update.totaal, ...(update.aantal && { aantal: update.aantal }) }
              : item
          )
        )
      }
    }
  }

  const updateParameter = async (field: string, value: number | null) => {
    if (!parameters) return

    try {
      const tableName = getTableName('parameters', currentVersion)
      const userName = getCurrentUserName()
      const oldValue = (parameters as any)[field]
      
      const { error } = await supabase
        .from(tableName)
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq('id', parameters.id)

      if (error) throw error

      // Clear input value from local state after successful update
      setInputValues(prev => {
        const next = { ...prev }
        delete next[field]
        return next
      })

      // Log change
      await logChange(currentVersion, tableName, parameters.id, field, oldValue, value, userName)

      const updatedParams = { ...parameters, [field]: value }
      setParameters(updatedParams)
      setTimeout(() => calculateAutomaticItemsWithParams(updatedParams, kostenItems, planningData), 100)
    } catch (error) {
      console.error('Error updating parameter:', error)
    }
  }

  const calculateItemTotal = (item: KostenItem): number => {
    // Als totaal al is ingevuld, gebruik dat
    if (item.totaal) return Number(item.totaal)

    const gastjes = parameters?.aantal_gastjes || 0
    const leiders = parameters?.aantal_leiders || 0
    const aantal = item.aantal || 1

    if (item.splitsing === 'gastjes_leiders') {
      const totaalGastjes = (Number(item.prijs_per_persoon_gastjes) || 0) * gastjes * aantal
      const totaalLeiders = (Number(item.prijs_per_persoon_leiders) || 0) * leiders * aantal
      return totaalGastjes + totaalLeiders
    } else if (item.splitsing === 'gastjes') {
      // Alleen gastjes betalen
      if (item.eenheid === 'persoon') {
        return (Number(item.prijs_per_persoon_gastjes) || 0) * gastjes
      } else {
        // eenheid === 'groep' of andere
        return (Number(item.prijs_per_persoon_gastjes) || 0) * gastjes * aantal
      }
    } else if (item.splitsing === 'leiders') {
      // Alleen leiders betalen
      if (item.eenheid === 'persoon') {
        return (Number(item.prijs_per_persoon_leiders) || 0) * leiders
      } else {
        // eenheid === 'groep' of andere
        return (Number(item.prijs_per_persoon_leiders) || 0) * leiders * aantal
      }
    } else {
      // iedereen
      const totaalPersonen = gastjes + leiders
      if (item.eenheid === 'persoon') {
        return (Number(item.prijs_per_persoon) || 0) * totaalPersonen
      } else if (item.eenheid === 'groep') {
        // Totaal bedrag (groep)
        return Number(item.totaal) || Number(item.prijs_per_persoon) || 0
      } else {
        return (Number(item.prijs_per_persoon) || 0) * totaalPersonen * aantal
      }
    }
  }

  const categoryItems = kostenItems.filter((item) => item.categorie === selectedCategory)
  const categoryTotals = categoryItems.reduce((sum, item) => sum + calculateItemTotal(item), 0)

  const formatEuro = (value: number | null | undefined, withSymbol = true): string => {
    const number = Number(value) || 0
    const formatted = Math.round(number).toLocaleString('nl-BE')
    return withSymbol ? `€${formatted}` : formatted
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Weet je zeker dat je dit item wilt verwijderen?')) return

    try {
      const tableName = getTableName('kosten', currentVersion)
      const userName = getCurrentUserName()
      const itemToDelete = kostenItems.find(item => item.id === id)
      
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id)

      if (error) throw error

      // Log deletion
      if (itemToDelete) {
        await logChange(currentVersion, tableName, id, null, itemToDelete, null, userName)
      }

      const updatedItems = kostenItems.filter((item) => item.id !== id)
      setKostenItems(updatedItems)
      
      setStatus({ message: 'Item verwijderd.', tone: 'success' })
    } catch (error) {
      console.error('Error deleting item:', error)
      setStatus({
        message: `Fout bij verwijderen: ${error instanceof Error ? error.message : 'Onbekende fout'}`,
        tone: 'error',
      })
    }
  }

  const handleUpdateField = async (id: string, field: string, value: number | string | boolean) => {
    try {
      const tableName = getTableName('kosten', currentVersion)
      const userName = getCurrentUserName()
      const oldItem = kostenItems.find(item => item.id === id)
      const oldValue = oldItem ? (oldItem as any)[field] : null
      
      // Only include kost_van_bus if it's a boolean (to avoid errors if column doesn't exist yet)
      const updateData: any = { [field]: value, updated_at: new Date().toISOString() }
      if (field === 'kost_van_bus' && typeof value !== 'boolean') {
        delete updateData.kost_van_bus
      }
      
      const { error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', id)

      if (error) {
        console.error('Supabase update error:', error)
        // If error is about missing column, provide helpful message
        if (error.message && (error.message.includes('kost_van_bus') || error.message.includes('column') || error.message.includes('does not exist'))) {
          throw new Error('Het veld "kost_van_bus" bestaat nog niet in de database. Voeg eerst de kolom toe via een migratie.')
        }
        throw error
      }

      // Log change
      await logChange(currentVersion, tableName, id, field, oldValue, value, userName)

      const updatedItems = kostenItems.map((item) => (item.id === id ? { ...item, [field]: value } : item))
      setKostenItems(updatedItems)
      
      setEditingField(null)
      setStatus({ message: 'Item bijgewerkt.', tone: 'success' })
    } catch (error) {
      console.error('Error updating field:', error)
      const errorMessage = error instanceof Error ? error.message : 'Onbekende fout'
      setStatus({
        message: `Fout bij bijwerken: ${errorMessage}`,
        tone: 'error',
      })
    }
  }

  const handleAddItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    try {
      const prijsType = addModalPrijsType
      const prijsWaarde = formData.get('prijs') ? Number(formData.get('prijs')) : null

      const newItem: any = {
        categorie: formData.get('categorie') as string,
        subcategorie: formData.get('subcategorie') as string,
        beschrijving: formData.get('beschrijving') as string || null,
        opmerkingen: formData.get('opmerkingen') as string || null,
        automatisch: formData.get('automatisch') === 'on',
      }
      
      // Only add kost_van_bus if checkbox was checked (to avoid errors if column doesn't exist yet)
      const kostVanBus = formData.get('kost_van_bus') === 'on'
      if (kostVanBus) {
        newItem.kost_van_bus = true
      }

      // Als totaal bedrag: altijd iedereen, eenheid groep, aantal 1
      if (prijsType === 'totaal') {
        newItem.eenheid = 'groep'
        newItem.aantal = 1
        newItem.splitsing = 'iedereen'
        newItem.totaal = prijsWaarde
        newItem.prijs_per_persoon = null
        newItem.prijs_per_persoon_gastjes = null
        newItem.prijs_per_persoon_leiders = null
      } else {
        // Per persoon: gebruik aantalType
        const aantalType = addModalAantalType
        const aantalWaarde = formData.get('aantal_getal') ? Number(formData.get('aantal_getal')) : 1

        newItem.eenheid = 'persoon'

        // Set aantal based on aantalType
        if (aantalType === 'getal') {
          newItem.aantal = aantalWaarde
        } else if (aantalType === 'iedereen') {
          // For "iedereen", set aantal to gastjes + leiders
          const gastjes = parameters?.aantal_gastjes || 0
          const leiders = parameters?.aantal_leiders || 0
          newItem.aantal = gastjes + leiders
        } else {
          newItem.aantal = 1
        }

        // Set splitsing and prices based on aantalType
        if (aantalType === 'iedereen') {
          newItem.splitsing = 'iedereen'
          newItem.prijs_per_persoon = prijsWaarde
          newItem.totaal = null
          newItem.prijs_per_persoon_gastjes = null
          newItem.prijs_per_persoon_leiders = null
        } else if (aantalType === 'gastjes') {
          newItem.splitsing = 'gastjes'
          newItem.prijs_per_persoon_gastjes = prijsWaarde
          newItem.totaal = null
          newItem.prijs_per_persoon = null
          newItem.prijs_per_persoon_leiders = null
        } else if (aantalType === 'leiders') {
          newItem.splitsing = 'leiders'
          newItem.prijs_per_persoon_leiders = prijsWaarde
          newItem.totaal = null
          newItem.prijs_per_persoon = null
          newItem.prijs_per_persoon_gastjes = null
        } else {
          // getal - aantal personen
          newItem.splitsing = 'iedereen'
          newItem.prijs_per_persoon = prijsWaarde
          newItem.totaal = null
          newItem.prijs_per_persoon_gastjes = null
          newItem.prijs_per_persoon_leiders = null
        }
      }

      const tableName = getTableName('kosten', currentVersion)
      const userName = getCurrentUserName()
      
      // Check for duplicates before inserting
      const duplicateKey = `${newItem.categorie}|${newItem.subcategorie}|${newItem.beschrijving || ''}|${newItem.automatisch || false}`
      const existingDuplicate = kostenItems.find(
        item => 
          item.categorie === newItem.categorie &&
          item.subcategorie === newItem.subcategorie &&
          (item.beschrijving || '') === (newItem.beschrijving || '') &&
          (item.automatisch || false) === (newItem.automatisch || false)
      )
      
      if (existingDuplicate) {
        setStatus({
          message: 'Dit item bestaat al. Duplicaten zijn niet toegestaan.',
          tone: 'error',
        })
        return
      }
      
      const { data, error } = await supabase
        .from(tableName)
        .insert(newItem)
        .select()
        .single()

      if (error) throw error

      // Log creation
      await logChange(currentVersion, tableName, data.id, null, null, data, userName)

      const updatedItems = [...kostenItems, data]
      setKostenItems(updatedItems)
      
      setShowAddModal(false)
      setAddModalPrijsType('per_persoon')
      setAddModalAantalType('getal')
      setStatus({ message: 'Nieuw kostitem toegevoegd.', tone: 'success' })
    } catch (error) {
      console.error('Error adding item:', error)
      setStatus({
        message: `Fout bij toevoegen: ${error instanceof Error ? error.message : 'Onbekende fout'}`,
        tone: 'error',
      })
    }
  }

  const handleEditItem = (item: KostenItem) => {
    setEditingItem(item)
    // Determine prijs type based on item
    if (item.totaal) {
      setEditModalPrijsType('totaal')
    } else {
      setEditModalPrijsType('per_persoon')
      // Determine aantal type
      const gastjes = parameters?.aantal_gastjes || 0
      const leiders = parameters?.aantal_leiders || 0
      const totaalPersonen = gastjes + leiders
      
      if (item.splitsing === 'iedereen' && item.aantal === totaalPersonen) {
        setEditModalAantalType('iedereen')
      } else if (item.splitsing === 'gastjes') {
        setEditModalAantalType('gastjes')
      } else if (item.splitsing === 'leiders') {
        setEditModalAantalType('leiders')
      } else {
        setEditModalAantalType('getal')
      }
    }
  }

  const handleUpdateItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingItem) return

    const formData = new FormData(e.currentTarget)

    try {
      const prijsType = editModalPrijsType
      const prijsWaarde = formData.get('prijs') ? Number(formData.get('prijs')) : null

      const updatedItem: any = {
        categorie: formData.get('categorie') as string,
        subcategorie: formData.get('subcategorie') as string,
        beschrijving: formData.get('beschrijving') as string || null,
        opmerkingen: formData.get('opmerkingen') as string || null,
        updated_at: new Date().toISOString(),
      }
      
      // Only add kost_van_bus if checkbox was checked (to avoid errors if column doesn't exist yet)
      const kostVanBus = formData.get('kost_van_bus') === 'on'
      if (kostVanBus) {
        updatedItem.kost_van_bus = true
      } else {
        // Explicitly set to false if unchecked (only if column exists)
        updatedItem.kost_van_bus = false
      }

      // Als totaal bedrag: altijd iedereen, eenheid groep, aantal 1
      if (prijsType === 'totaal') {
        updatedItem.eenheid = 'groep'
        updatedItem.aantal = 1
        updatedItem.splitsing = 'iedereen'
        updatedItem.totaal = prijsWaarde
        updatedItem.prijs_per_persoon = null
        updatedItem.prijs_per_persoon_gastjes = null
        updatedItem.prijs_per_persoon_leiders = null
      } else {
        // Per persoon: gebruik aantalType
        const aantalType = editModalAantalType
        const aantalWaarde = formData.get('aantal_getal') ? Number(formData.get('aantal_getal')) : 1

        updatedItem.eenheid = 'persoon'

        // Set aantal based on aantalType
        if (aantalType === 'getal') {
          updatedItem.aantal = aantalWaarde
        } else if (aantalType === 'iedereen') {
          // For "iedereen", set aantal to gastjes + leiders
          const gastjes = parameters?.aantal_gastjes || 0
          const leiders = parameters?.aantal_leiders || 0
          updatedItem.aantal = gastjes + leiders
        } else {
          updatedItem.aantal = 1
        }

        // Set splitsing and prices based on aantalType
        if (aantalType === 'iedereen') {
          updatedItem.splitsing = 'iedereen'
          updatedItem.prijs_per_persoon = prijsWaarde
          updatedItem.totaal = null
          updatedItem.prijs_per_persoon_gastjes = null
          updatedItem.prijs_per_persoon_leiders = null
        } else if (aantalType === 'gastjes') {
          updatedItem.splitsing = 'gastjes'
          updatedItem.prijs_per_persoon_gastjes = prijsWaarde
          updatedItem.totaal = null
          updatedItem.prijs_per_persoon = null
          updatedItem.prijs_per_persoon_leiders = null
        } else if (aantalType === 'leiders') {
          updatedItem.splitsing = 'leiders'
          updatedItem.prijs_per_persoon_leiders = prijsWaarde
          updatedItem.totaal = null
          updatedItem.prijs_per_persoon = null
          updatedItem.prijs_per_persoon_gastjes = null
        } else {
          // getal - aantal personen
          updatedItem.splitsing = 'iedereen'
          updatedItem.prijs_per_persoon = prijsWaarde
          updatedItem.totaal = null
          updatedItem.prijs_per_persoon_gastjes = null
          updatedItem.prijs_per_persoon_leiders = null
        }
      }

      const tableName = getTableName('kosten', currentVersion)
      const userName = getCurrentUserName()
      
      // Only include kost_van_bus if it's defined (to avoid errors if column doesn't exist yet)
      const updateData: any = { ...updatedItem }
      // If kost_van_bus is false, we still want to set it to false (not undefined)
      // Only skip it if it's truly undefined
      if (updateData.kost_van_bus === undefined) {
        delete updateData.kost_van_bus
      }
      
      const { error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', editingItem.id)

      if (error) {
        console.error('Supabase update error:', error)
        // If error is about missing column, provide helpful message
        if (error.message && (error.message.includes('kost_van_bus') || error.message.includes('column') || error.message.includes('does not exist'))) {
          throw new Error('Het veld "kost_van_bus" bestaat nog niet in de database. Voeg eerst de kolom toe via een migratie.')
        }
        throw error
      }

      // Log update
      await logChange(currentVersion, tableName, editingItem.id, null, editingItem, updatedItem, userName)

      const updatedItems = kostenItems.map((item) => (item.id === editingItem.id ? { ...item, ...updatedItem } : item))
      setKostenItems(updatedItems)
      
      setEditingItem(null)
      setEditModalPrijsType('per_persoon')
      setEditModalAantalType('getal')
      setStatus({ message: 'Item bijgewerkt.', tone: 'success' })
    } catch (error) {
      console.error('Error updating item:', error)
      let errorMessage = 'Onbekende fout'
      if (error instanceof Error) {
        errorMessage = error.message
        console.error('Full error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        })
      }
      setStatus({
        message: `Fout bij bijwerken: ${errorMessage}`,
        tone: 'error',
      })
    }
  }

  const handleAddVerblijfItem = async () => {
    try {
      const tableName = getTableName('kosten', currentVersion)
      const userName = getCurrentUserName()
      
      const newItem = {
        categorie: 'Verblijf',
        subcategorie: 'Nieuw verblijf',
        beschrijving: null,
        eenheid: null,
        splitsing: 'gastjes_leiders' as const,
        prijs_per_persoon: null,
        prijs_per_persoon_gastjes: 0,
        prijs_per_persoon_leiders: 0,
        aantal: 1,
        opmerkingen: null,
        automatisch: false,
      }

      const { data, error } = await supabase
        .from(tableName)
        .insert(newItem)
        .select()
        .single()

      if (error) throw error

      // Log creation
      await logChange(currentVersion, tableName, data.id, null, null, data, userName)
      const updatedItems = [...kostenItems, data]
      setKostenItems(updatedItems)
      
      setSelectedCategory('Verblijf')
      setStatus({ message: 'Nieuw verblijf item toegevoegd.', tone: 'success' })
    } catch (error) {
      console.error('Error adding verblijf item:', error)
      setStatus({
        message: `Fout bij toevoegen: ${error instanceof Error ? error.message : 'Onbekende fout'}`,
        tone: 'error',
      })
    }
  }

  const renderVerblijfTable = () => {
    const gastjes = parameters?.aantal_gastjes || 0
    const leiders = parameters?.aantal_leiders || 0

    return (
      <div className="space-y-3">
        {categoryItems.map((item) => {
          const aantalNachten = item.aantal || 1
          const prijsGastje = Number(item.prijs_per_persoon_gastjes) || 0
          const prijsLeider = Number(item.prijs_per_persoon_leiders) || 0
          const totaalGastjes = prijsGastje * gastjes * aantalNachten
          const totaalLeiders = prijsLeider * leiders * aantalNachten
          const totaal = totaalGastjes + totaalLeiders

          return (
            <div
              key={item.id}
              className="rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-background-dark p-3"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-[#111418] dark:text-white">
                    {item.subcategorie}
                  </h4>
                  {item.beschrijving && (
                    <p className="text-sm text-[#617589] dark:text-gray-400 mt-0.5">{item.beschrijving}</p>
                  )}
                </div>
                <div className="text-right ml-4">
                  <p className="text-2xl font-bold text-primary">{formatEuro(totaal)}</p>
                  <p className="text-xs text-[#617589] dark:text-gray-400 mt-0.5">Totaal</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#617589] dark:text-gray-400">
                    Prijs/nacht gastje
                  </label>
                  {editingField?.id === item.id && editingField?.field === 'prijs_per_persoon_gastjes' ? (
                    <input
                      type="number"
                      step="0.01"
                      defaultValue={prijsGastje}
                      onBlur={(e) => {
                        handleUpdateField(item.id, 'prijs_per_persoon_gastjes', Number(e.target.value))
                        setEditingField(null)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleUpdateField(item.id, 'prijs_per_persoon_gastjes', Number(e.currentTarget.value))
                          setEditingField(null)
                        }
                        if (e.key === 'Escape') setEditingField(null)
                      }}
                      autoFocus
                      className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    />
                  ) : (
                    <p
                      onClick={() => setEditingField({ id: item.id, field: 'prijs_per_persoon_gastjes' })}
                      className="mt-0.5 text-lg font-semibold text-[#111418] dark:text-white cursor-pointer hover:underline"
                    >
                      {formatEuro(prijsGastje)}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#617589] dark:text-gray-400">
                    Prijs/nacht leider
                  </label>
                  {editingField?.id === item.id && editingField?.field === 'prijs_per_persoon_leiders' ? (
                    <input
                      type="number"
                      step="0.01"
                      defaultValue={prijsLeider}
                      onBlur={(e) => {
                        handleUpdateField(item.id, 'prijs_per_persoon_leiders', Number(e.target.value))
                        setEditingField(null)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleUpdateField(item.id, 'prijs_per_persoon_leiders', Number(e.currentTarget.value))
                          setEditingField(null)
                        }
                        if (e.key === 'Escape') setEditingField(null)
                      }}
                      autoFocus
                      className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    />
                  ) : (
                    <p
                      onClick={() => setEditingField({ id: item.id, field: 'prijs_per_persoon_leiders' })}
                      className="mt-0.5 text-lg font-semibold text-[#111418] dark:text-white cursor-pointer hover:underline"
                    >
                      {formatEuro(prijsLeider)}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#617589] dark:text-gray-400">
                    Aantal nachten
                  </label>
                  {editingField?.id === item.id && editingField?.field === 'aantal' ? (
                    <input
                      type="number"
                      defaultValue={aantalNachten}
                      onBlur={(e) => {
                        handleUpdateField(item.id, 'aantal', Number(e.target.value))
                        setEditingField(null)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleUpdateField(item.id, 'aantal', Number(e.currentTarget.value))
                          setEditingField(null)
                        }
                        if (e.key === 'Escape') setEditingField(null)
                      }}
                      autoFocus
                      className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    />
                  ) : (
                    <p
                      onClick={() => setEditingField({ id: item.id, field: 'aantal' })}
                      className="mt-0.5 text-lg font-semibold text-[#111418] dark:text-white cursor-pointer hover:underline"
                    >
                      {aantalNachten}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#617589] dark:text-gray-400">
                    Subtotaal
                  </label>
                  <div className="mt-0.5 space-y-0.5">
                    <p className="text-sm text-[#617589] dark:text-gray-400">
                      Gastjes: {formatEuro(totaalGastjes)}
                    </p>
                    <p className="text-sm text-[#617589] dark:text-gray-400">
                      Leiders: {formatEuro(totaalLeiders)}
                    </p>
                  </div>
                </div>
              </div>

              {item.opmerkingen && (
                <p className="text-xs text-[#617589] dark:text-gray-400 mt-2">{item.opmerkingen}</p>
              )}

              <div className="mt-2 flex justify-end">
                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-red-500 hover:text-red-700 text-sm flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-base">delete</span>
                  <span>Verwijderen</span>
                </button>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const handleUpdateKm = async (dagId: string, newKm: number): Promise<PlanningDag[] | undefined> => {
    try {
      const tableName = getTableName('planning', currentVersion)
      const userName = getCurrentUserName()
      const oldDag = planningData.find(d => d.id === dagId)
      
      const { error } = await supabase
        .from(tableName)
        .update({ km: newKm, updated_at: new Date().toISOString() })
        .eq('id', dagId)

      if (error) throw error

      await logChange(currentVersion, tableName, dagId, 'km', oldDag?.km || null, newKm, userName)

      const updatedPlanning = planningData.map(d => d.id === dagId ? { ...d, km: newKm } : d)
      setPlanningData(updatedPlanning)
      
      // Recalculate automatic items with updated planning data
      if (parameters) {
        setTimeout(() => {
          calculateAutomaticItemsWithParams(parameters, kostenItems, updatedPlanning)
        }, 300)
      }
      
      // Return updated planning for use in handleUpdateTotalKm
      return updatedPlanning
    } catch (error) {
      console.error('Error updating km:', error)
      setStatus({
        message: `Fout bij bijwerken: ${error instanceof Error ? error.message : 'Onbekende fout'}`,
        tone: 'error',
      })
      // Reload data on error to restore correct state
      loadAllData()
      return undefined
    }
  }

  const handleUpdateTotalKm = async (newTotal: number) => {
    try {
      // Calculate current total of first 10 days
      const first10Days = planningData.slice(0, 10)
      const currentTotalFirst10 = first10Days.reduce((sum, dag) => sum + (dag.km || 0), 0)
      
      // Calculate what the extra should be to make the total match
      const newExtra = Math.max(0, newTotal - currentTotalFirst10)
      
      // Update the extra km
      const extraDays = planningData.slice(10)
      if (extraDays.length > 0) {
        // Update the first extra day (day 11) with the new value
        const extraDay = extraDays[0]
        await handleUpdateKm(extraDay.id, newExtra)
      } else if (planningData.length >= 11) {
        // Update day 11 if it exists
        const day11 = planningData[10]
        if (day11) {
          await handleUpdateKm(day11.id, newExtra)
        }
      } else {
        // If no day 11 exists, we need to create it or update the last day
        // This is a fallback - ideally day 11 should exist
        if (planningData.length > 0) {
          const lastDay = planningData[planningData.length - 1]
          await handleUpdateKm(lastDay.id, newExtra)
        }
      }
      
      // Reload planning data to ensure state is in sync with database
      // This ensures that when the page is reloaded, the values persist
      const [loadedPlanning] = await Promise.all([
        getPlanningData(),
      ])
      setPlanningData(loadedPlanning)
    } catch (error) {
      console.error('Error updating total km:', error)
      setStatus({
        message: `Fout bij bijwerken totaal: ${error instanceof Error ? error.message : 'Onbekende fout'}`,
        tone: 'error',
      })
      // Reload data on error to restore correct state
      loadAllData()
    }
  }

  const renderVervoerOfferte = (scenario: Exclude<VervoerScenario, 'berekening'>) => {
    const offerte = vervoerOffertes[scenario]
    if (!offerte) return null

    return (
      <div className="space-y-3">
        <div className="flex items-start justify-between rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-background-dark p-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#617589] dark:text-gray-400">Offerte</p>
            <h4 className="text-lg font-semibold text-[#111418] dark:text-white">{offerte.title}</h4>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">{formatEuro(offerte.totaal)}</p>
            <p className="text-xs text-[#617589] dark:text-gray-400 mt-0.5">Totaal</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {offerte.sections.map((section) => (
            <div key={section.title} className="rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-background-dark p-3">
              <h5 className="text-sm font-semibold text-[#111418] dark:text-white mb-2">{section.title}</h5>
              <ul className="space-y-1 text-sm text-[#617589] dark:text-gray-400 list-disc list-inside">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {offerte.note && <p className="text-xs text-[#617589] dark:text-gray-400">{offerte.note}</p>}
      </div>
    )
  }

  const renderVervoerTable = () => {
    const busItem = categoryItems.find((item) => item.subcategorie === 'Bus huur' && item.automatisch)
    const autoItem = categoryItems.find((item) => item.subcategorie === 'Auto koks' && item.automatisch)
    
    // Split into first 10 days and extra
    const first10Days = planningData.slice(0, 10)
    const extraDays = planningData.slice(10)
    const kmFirst10 = first10Days.reduce((sum, dag) => sum + (dag.km || 0), 0)
    const kmExtra = extraDays.reduce((sum, dag) => sum + (dag.km || 0), 0)
    const totaalKm = kmFirst10 + kmExtra
    const aantalBusdagen = 10 // Always use 10 days for calculation

    const scenarioButtons = (
      <div className="flex flex-col gap-1">
        <p className="text-xs uppercase tracking-[0.2em] text-[#617589] dark:text-gray-500">
          Kies offerte voor dashboard/kosten
        </p>
        <div className="flex flex-wrap gap-2">
        {[
            { key: 'berekening' as VervoerScenario, label: 'Mandel car' },
          { key: 'reisvogel' as VervoerScenario, label: 'Autocars "De Reisvogel"' },
          { key: 'coachpartners' as VervoerScenario, label: 'Coach Partners West-Vlaanderen NV' },
        ].map((option) => {
          const isActive = selectedVervoerScenario === option.key
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => {
                setSelectedVervoerScenario(option.key)
                const storageKey = getVervoerScenarioStorageKey(currentVersion)
                localStorage.setItem(storageKey, option.key)
              }}
              className={`rounded-full border px-3 py-1 text-sm transition ${
                isActive
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'text-[#617589] dark:text-gray-300 border-[#dbe0e6] dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-white/10'
              }`}
            >
              {option.label}
            </button>
          )
        })}
        </div>
      </div>
    )

    if (selectedVervoerScenario !== 'berekening') {
      return (
        <div className="space-y-3">
          {scenarioButtons}
          {renderVervoerOfferte(selectedVervoerScenario)}
        </div>
      )
    }

    return (
      <div className="space-y-3">
        {scenarioButtons}
        {/* Bus Item */}
        {busItem && (
          <div className="rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-background-dark p-3">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="text-lg font-semibold text-[#111418] dark:text-white">Bus huur</h4>
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                    Auto
                  </span>
                </div>
                {(() => {
                  // Bereken vaste kosten
                  const aantalBusdagen = 10
                  const vasteKosten = parameters?.bus_dagprijs ? parameters.bus_dagprijs * aantalBusdagen : 0
                  
                  // Bereken km kosten
                  const totaalKm = planningData.reduce((sum, dag) => sum + (dag.km || 0), 0)
                  let kmKosten = 0
                  if (parameters?.bus_daglimiet === 0 || parameters?.bus_daglimiet === null) {
                    // All kilometers are extra (paid per km)
                    kmKosten = parameters?.bus_extra_km ? totaalKm * parameters.bus_extra_km : 0
                  } else if (parameters?.bus_daglimiet && parameters?.bus_extra_km) {
                    const maxKmZonderExtra = parameters.bus_daglimiet * aantalBusdagen
                    if (totaalKm > maxKmZonderExtra) {
                      const extraKm = totaalKm - maxKmZonderExtra
                      kmKosten = extraKm * parameters.bus_extra_km
                    }
                  }
                  
                  // Bereken extra kosten uit de tabel (items met kost_van_bus aangevinkt)
                  const extraKostenItems = categoryItems.filter((item) => 
                    !item.automatisch && 
                    item.kost_van_bus === true
                  )
                  const extraKosten = extraKostenItems.reduce((sum, item) => {
                    return sum + calculateItemTotal(item)
                  }, 0)
                  
                  // Totaal = vaste + km + extra
                  const totaalMetExtra = (busItem.totaal || 0) + extraKosten
                  
                  return (
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-primary">
                        <span className="text-[#617589] dark:text-gray-400">vaste: </span>
                        {formatEuro(vasteKosten)}
                      </span>
                      <span className="text-primary">
                        <span className="text-[#617589] dark:text-gray-400">km kost: </span>
                        {formatEuro(kmKosten)}
                      </span>
                      {extraKosten > 0 && (
                        <span className="text-primary">
                          <span className="text-[#617589] dark:text-gray-400">extra: </span>
                          {formatEuro(extraKosten)}
                        </span>
                      )}
                    </div>
                  )
                })()}
                {busItem.beschrijving && (
                  <p className="text-sm text-[#617589] dark:text-gray-400 mt-1">{busItem.beschrijving}</p>
                )}
              </div>
              <div className="text-right ml-4">
                {(() => {
                  // Bereken extra kosten uit de tabel (items met kost_van_bus aangevinkt)
                  const extraKostenItems = categoryItems.filter((item) => 
                    !item.automatisch && 
                    item.kost_van_bus === true
                  )
                  const extraKosten = extraKostenItems.reduce((sum, item) => {
                    return sum + calculateItemTotal(item)
                  }, 0)
                  
                  // Totaal = vaste + km + extra
                  const totaalMetExtra = (busItem.totaal || 0) + extraKosten
                  
                  return (
                    <>
                      <p className="text-2xl font-bold text-primary">{formatEuro(totaalMetExtra)}</p>
                      <p className="text-xs text-[#617589] dark:text-gray-400 mt-0.5">Totaal</p>
                    </>
                  )
                })()}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#617589] dark:text-gray-400">
                  Dagprijs (€)
                </label>
                <input
                  type="number"
                  value={inputValues['bus_dagprijs'] !== undefined ? inputValues['bus_dagprijs'] : (parameters?.bus_dagprijs || '')}
                  onChange={(e) => setInputValues(prev => ({ ...prev, 'bus_dagprijs': e.target.value }))}
                  onBlur={(e) => {
                    const numValue = e.target.value ? Number(e.target.value) : null
                    const currentValue = parameters?.bus_dagprijs || null
                    if (numValue !== currentValue) {
                      updateParameter('bus_dagprijs', numValue)
                    } else {
                      setInputValues(prev => {
                        const next = { ...prev }
                        delete next['bus_dagprijs']
                        return next
                      })
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur()
                    }
                  }}
                  className="mt-0.5 w-full rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-background-light dark:bg-background-dark px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#617589] dark:text-gray-400">
                  Daglimiet (km)
                </label>
                <input
                  type="number"
                  value={inputValues['bus_daglimiet'] !== undefined ? inputValues['bus_daglimiet'] : (parameters?.bus_daglimiet || '')}
                  onChange={(e) => setInputValues(prev => ({ ...prev, 'bus_daglimiet': e.target.value }))}
                  onBlur={(e) => {
                    const numValue = e.target.value ? Number(e.target.value) : null
                    const currentValue = parameters?.bus_daglimiet || null
                    if (numValue !== currentValue) {
                      updateParameter('bus_daglimiet', numValue)
                    } else {
                      setInputValues(prev => {
                        const next = { ...prev }
                        delete next['bus_daglimiet']
                        return next
                      })
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur()
                    }
                  }}
                  className="mt-0.5 w-full rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-background-light dark:bg-background-dark px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#617589] dark:text-gray-400">
                  Extra €/km
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={inputValues['bus_extra_km'] !== undefined ? inputValues['bus_extra_km'] : (parameters?.bus_extra_km || '')}
                  onChange={(e) => setInputValues(prev => ({ ...prev, 'bus_extra_km': e.target.value }))}
                  onBlur={(e) => {
                    const numValue = e.target.value ? Number(e.target.value) : null
                    const currentValue = parameters?.bus_extra_km || null
                    if (numValue !== currentValue) {
                      updateParameter('bus_extra_km', numValue)
                    } else {
                      setInputValues(prev => {
                        const next = { ...prev }
                        delete next['bus_extra_km']
                        return next
                      })
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur()
                    }
                  }}
                  className="mt-0.5 w-full rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-background-light dark:bg-background-dark px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
            </div>

            {/* Kilometers tabel */}
            <div className="mt-3 rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-background-light dark:bg-background-dark p-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#617589] dark:text-gray-400 mb-2">
                Kilometers per dag
              </p>
              <div className="overflow-x-auto -mx-2 px-2">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr>
                      <th className="px-0.5 py-0.5 text-left border-b border-[#dbe0e6] dark:border-gray-700 text-[#617589] dark:text-gray-400 font-semibold whitespace-nowrap">
                        Dag
                      </th>
                      {first10Days.map((dag) => (
                        <th
                          key={dag.id}
                          className="px-0.5 py-0.5 text-center border-b border-[#dbe0e6] dark:border-gray-700 text-[#617589] dark:text-gray-400 font-semibold whitespace-nowrap"
                        >
                          {dag.dag}
                        </th>
                      ))}
                      {extraDays.length > 0 && (
                        <th className="px-0.5 py-0.5 text-center border-b border-[#dbe0e6] dark:border-gray-700 text-[#617589] dark:text-gray-400 font-semibold whitespace-nowrap">
                          Extra
                        </th>
                      )}
                      <th className="px-0.5 py-0.5 text-center border-b border-[#dbe0e6] dark:border-gray-700 text-[#617589] dark:text-gray-400 font-semibold whitespace-nowrap">
                        Totaal
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-0.5 py-0.5 text-left border-b border-[#dbe0e6] dark:border-gray-700 text-[#617589] dark:text-gray-400 font-semibold whitespace-nowrap">
                        Afstand
                      </td>
                    {first10Days.map((dag) => {
                      const currentKm = dag.km ?? 0
                      const editingValue = editingKmValues[dag.id]
                      const displayValue = editingValue !== undefined ? editingValue : (currentKm === 0 ? '' : String(currentKm))
                      
                      return (
                        <td
                          key={dag.id}
                          className="px-0.5 py-0.5 text-center border-b border-[#dbe0e6] dark:border-gray-700"
                        >
                          <input
                            type="text"
                            inputMode="numeric"
                            value={displayValue}
                            onChange={(e) => {
                              // Allow empty string and numbers only
                              const value = e.target.value
                              if (value === '' || /^\d+$/.test(value)) {
                                setEditingKmValues(prev => ({ ...prev, [dag.id]: value }))
                              }
                            }}
                            onBlur={(e) => {
                              const value = e.target.value.trim()
                              const newKm = value === '' ? 0 : Number(value)
                              if (!isNaN(newKm) && newKm !== currentKm) {
                                handleUpdateKm(dag.id, newKm)
                              }
                              // Clear editing state
                              setEditingKmValues(prev => {
                                const next = { ...prev }
                                delete next[dag.id]
                                return next
                              })
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.currentTarget.blur()
                              }
                            }}
                            className="w-full min-w-[50px] max-w-[60px] text-center bg-white dark:bg-background-dark border border-[#dbe0e6] dark:border-gray-700 rounded px-0.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary text-[#111418] dark:text-gray-200 font-medium text-xs"
                          />
                        </td>
                      )
                    })}
                    {extraDays.length > 0 && (
                      <td className="px-0.5 py-0.5 text-center border-b border-[#dbe0e6] dark:border-gray-700">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={editingKmValues[extraDays[0].id] !== undefined ? editingKmValues[extraDays[0].id] : (kmExtra === 0 ? '' : String(kmExtra))}
                          onChange={(e) => {
                            // Allow empty string and numbers only
                            const value = e.target.value
                            if (value === '' || /^\d+$/.test(value)) {
                              setEditingKmValues(prev => ({ ...prev, [extraDays[0].id]: value }))
                            }
                          }}
                          onBlur={(e) => {
                            const value = e.target.value.trim()
                            const newExtra = value === '' ? 0 : Number(value)
                            if (!isNaN(newExtra) && newExtra !== kmExtra) {
                              const extraDay = extraDays[0]
                              handleUpdateKm(extraDay.id, newExtra)
                            }
                            // Clear editing state
                            setEditingKmValues(prev => {
                              const next = { ...prev }
                              delete next[extraDays[0].id]
                              return next
                            })
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur()
                            }
                          }}
                          className="w-full min-w-[50px] max-w-[60px] text-center bg-white dark:bg-background-dark border border-[#dbe0e6] dark:border-gray-700 rounded px-0.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary text-[#111418] dark:text-gray-200 font-medium text-xs"
                        />
                      </td>
                    )}
                    <td className="px-0.5 py-0.5 text-center border-b border-[#dbe0e6] dark:border-gray-700">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={editingTotalKm !== null ? editingTotalKm : (totaalKm === 0 ? '' : String(totaalKm))}
                        onChange={(e) => {
                          // Allow empty string and numbers only
                          const value = e.target.value
                          if (value === '' || /^\d+$/.test(value)) {
                            setEditingTotalKm(value)
                            
                            // Calculate what the extra should be and update local state
                            if (value !== '') {
                              const newTotal = Number(value)
                              if (!isNaN(newTotal)) {
                                const first10Days = planningData.slice(0, 10)
                                const kmFirst10 = first10Days.reduce((sum, dag) => sum + (dag.km || 0), 0)
                                const newExtra = Math.max(0, newTotal - kmFirst10)
                                
                                // Update local state for extra day
                                const extraDays = planningData.slice(10)
                                if (extraDays.length > 0) {
                                  const extraDay = extraDays[0]
                                  const updatedPlanning = planningData.map(d => 
                                    d.id === extraDay.id ? { ...d, km: newExtra } : d
                                  )
                                  setPlanningData(updatedPlanning)
                                  // Also update editing state for the extra field
                                  setEditingKmValues(prev => ({ ...prev, [extraDay.id]: String(newExtra) }))
                                }
                              }
                            } else {
                              // If empty, reset extra to 0
                              const extraDays = planningData.slice(10)
                              if (extraDays.length > 0) {
                                const extraDay = extraDays[0]
                                const updatedPlanning = planningData.map(d => 
                                  d.id === extraDay.id ? { ...d, km: 0 } : d
                                )
                                setPlanningData(updatedPlanning)
                                setEditingKmValues(prev => ({ ...prev, [extraDay.id]: '' }))
                              }
                            }
                          }
                        }}
                        onBlur={(e) => {
                          const value = e.target.value.trim()
                          const newTotal = value === '' ? 0 : Number(value)
                          if (!isNaN(newTotal) && newTotal !== totaalKm) {
                            handleUpdateTotalKm(newTotal)
                          }
                          // Clear editing state
                          setEditingTotalKm(null)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.currentTarget.blur()
                          }
                        }}
                        className="w-full min-w-[55px] max-w-[65px] text-center bg-transparent border-none text-primary font-semibold cursor-text text-xs focus:outline-none focus:ring-1 focus:ring-primary rounded"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
              </div>
            </div>
          </div>
        )}

        {/* Auto Item */}
        {autoItem && (
          <div className="rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-background-dark p-3">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-lg font-semibold text-[#111418] dark:text-white">Auto koks</h4>
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                    Auto
                  </span>
                </div>
                {autoItem.beschrijving && (
                  <p className="text-sm text-[#617589] dark:text-gray-400 mt-0.5">{autoItem.beschrijving}</p>
                )}
              </div>
              <div className="text-right ml-4">
                <p className="text-2xl font-bold text-primary">{formatEuro(autoItem.totaal || 0)}</p>
                <p className="text-xs text-[#617589] dark:text-gray-400 mt-0.5">Totaal</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#617589] dark:text-gray-400">
                  Brandstof (€/km)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={inputValues['auto_brandstof'] !== undefined ? inputValues['auto_brandstof'] : (parameters?.auto_brandstof || '')}
                  onChange={(e) => setInputValues(prev => ({ ...prev, 'auto_brandstof': e.target.value }))}
                  onBlur={(e) => {
                    const numValue = e.target.value ? Number(e.target.value) : null
                    const currentValue = parameters?.auto_brandstof || null
                    if (numValue !== currentValue) {
                      updateParameter('auto_brandstof', numValue)
                    } else {
                      setInputValues(prev => {
                        const next = { ...prev }
                        delete next['auto_brandstof']
                        return next
                      })
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur()
                    }
                  }}
                  className="mt-0.5 w-full rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-background-light dark:bg-background-dark px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#617589] dark:text-gray-400">
                  Afstand (km)
                </label>
                <input
                  type="number"
                  value={inputValues['auto_afstand'] !== undefined ? inputValues['auto_afstand'] : (parameters?.auto_afstand || '')}
                  onChange={(e) => setInputValues(prev => ({ ...prev, 'auto_afstand': e.target.value }))}
                  onBlur={(e) => {
                    const numValue = e.target.value ? Number(e.target.value) : null
                    const currentValue = parameters?.auto_afstand || null
                    if (numValue !== currentValue) {
                      updateParameter('auto_afstand', numValue)
                    } else {
                      setInputValues(prev => {
                        const next = { ...prev }
                        delete next['auto_afstand']
                        return next
                      })
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur()
                    }
                  }}
                  className="mt-0.5 w-full rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-background-light dark:bg-background-dark px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#617589] dark:text-gray-400">
                  Berekening
                </label>
                <div className="mt-0.5 text-sm text-[#617589] dark:text-gray-400">
                  {parameters?.auto_afstand && parameters?.auto_brandstof && (
                    <p>
                      {parameters.auto_afstand} km × {formatEuro(parameters.auto_brandstof, false)} ={' '}
                      {formatEuro(parameters.auto_afstand * parameters.auto_brandstof)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Vervoer items tabel */}
        {categoryItems.filter((item) => !item.automatisch).length > 0 && (
          <div className="mt-4 rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-background-dark overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-background-light dark:bg-white/10 text-[#111418] dark:text-gray-200 uppercase tracking-[0.1em] text-xs">
                <tr>
                  <th className="px-4 py-2 text-left">Titel</th>
                  <th className="px-4 py-2 text-left">Beschrijving</th>
                  <th className="px-4 py-2 text-right">Totaal</th>
                  <th className="px-4 py-2 text-left">Opmerkingen</th>
                  {selectedCategory === 'Vervoer' && (
                    <th className="px-4 py-2 text-center">Kost van bus</th>
                  )}
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dbe0e6] dark:divide-gray-800">
                {categoryItems
                  .filter((item) => !item.automatisch)
                  .map((item) => {
                    const totaal = calculateItemTotal(item)
                    const isEditingBeschrijving = editingField?.id === item.id && editingField?.field === 'beschrijving'
                    const isEditingOpmerkingen = editingField?.id === item.id && editingField?.field === 'opmerkingen'
                    const isEditingTotaal = editingField?.id === item.id && editingField?.field === 'totaal'
                    
                    return (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                        <td className="px-4 py-2 font-medium text-[#111418] dark:text-gray-100">
                          {item.subcategorie}
                        </td>
                        <td className="px-4 py-2 text-[#617589] dark:text-gray-400">
                          {isEditingBeschrijving ? (
                            <input
                              type="text"
                              defaultValue={item.beschrijving || ''}
                              onBlur={(e) => {
                                const newValue = e.target.value.trim() || null
                                if (newValue !== (item.beschrijving || null)) {
                                  handleUpdateField(item.id, 'beschrijving', newValue)
                                } else {
                                  setEditingField(null)
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.currentTarget.blur()
                                } else if (e.key === 'Escape') {
                                  setEditingField(null)
                                }
                              }}
                              autoFocus
                              className="w-full px-2 py-1 rounded border border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-white dark:bg-background-dark text-[#111418] dark:text-gray-100"
                            />
                          ) : (
                            <span
                              onClick={() => setEditingField({ id: item.id, field: 'beschrijving' })}
                              className="cursor-pointer hover:text-primary transition-colors"
                              title="Klik om te bewerken"
                            >
                              {item.beschrijving || '—'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right font-medium text-[#111418] dark:text-gray-100">
                          {isEditingTotaal ? (
                            <input
                              type="number"
                              step="0.01"
                              defaultValue={item.totaal || ''}
                              onBlur={(e) => {
                                const newValue = e.target.value ? Number(e.target.value) : null
                                if (newValue !== (item.totaal || null)) {
                                  handleUpdateField(item.id, 'totaal', newValue)
                                } else {
                                  setEditingField(null)
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.currentTarget.blur()
                                } else if (e.key === 'Escape') {
                                  setEditingField(null)
                                }
                              }}
                              autoFocus
                              className="w-full px-2 py-1 rounded border border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-white dark:bg-background-dark text-[#111418] dark:text-gray-100 text-right"
                            />
                          ) : (
                            <span
                              onClick={() => setEditingField({ id: item.id, field: 'totaal' })}
                              className="cursor-pointer hover:text-primary transition-colors"
                              title="Klik om totaal te bewerken"
                            >
                              {formatEuro(totaal)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-[#617589] dark:text-gray-400">
                          {isEditingOpmerkingen ? (
                            <input
                              type="text"
                              defaultValue={item.opmerkingen || ''}
                              onBlur={(e) => {
                                const newValue = e.target.value.trim() || null
                                if (newValue !== (item.opmerkingen || null)) {
                                  handleUpdateField(item.id, 'opmerkingen', newValue)
                                } else {
                                  setEditingField(null)
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.currentTarget.blur()
                                } else if (e.key === 'Escape') {
                                  setEditingField(null)
                                }
                              }}
                              autoFocus
                              className="w-full px-2 py-1 rounded border border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-white dark:bg-background-dark text-[#111418] dark:text-gray-100"
                            />
                          ) : (
                            <span
                              onClick={() => setEditingField({ id: item.id, field: 'opmerkingen' })}
                              className="cursor-pointer hover:text-primary transition-colors"
                              title="Klik om opmerkingen te bewerken"
                            >
                              {item.opmerkingen || '—'}
                            </span>
                          )}
                        </td>
                        {selectedCategory === 'Vervoer' && (
                          <td className="px-4 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={item.kost_van_bus === true}
                              onChange={async (e) => {
                                try {
                                  await handleUpdateField(item.id, 'kost_van_bus', e.target.checked)
                                } catch (error) {
                                  console.error('Error updating kost_van_bus:', error)
                                }
                              }}
                              className="rounded border-[#dbe0e6] dark:border-gray-700 text-primary focus:ring-2 focus:ring-primary cursor-pointer"
                            />
                          </td>
                        )}
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditItem(item)}
                              className="text-primary hover:text-primary/80 text-sm"
                              title="Aanpassen"
                            >
                              <span className="material-symbols-outlined text-base">edit</span>
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="text-red-500 hover:text-red-700 text-sm"
                              title="Verwijderen"
                            >
                              <span className="material-symbols-outlined text-base">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  const renderEtenTable = () => {
    const maaltijdenItem = categoryItems.find((item) => item.subcategorie === 'Maaltijden' && item.automatisch)
    const totaalPersonen = (parameters?.aantal_gastjes || 0) + (parameters?.aantal_leiders || 0)

    return (
      <div className="space-y-3">
        {maaltijdenItem && (
          <div className="rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-background-dark p-3">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-lg font-semibold text-[#111418] dark:text-white">Maaltijden</h4>
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                    Auto
                  </span>
                </div>
                {maaltijdenItem.beschrijving && (
                  <p className="text-sm text-[#617589] dark:text-gray-400 mt-0.5">{maaltijdenItem.beschrijving}</p>
                )}
              </div>
              <div className="text-right ml-4">
                <p className="text-2xl font-bold text-primary">{formatEuro(maaltijdenItem.totaal || 0)}</p>
                <p className="text-xs text-[#617589] dark:text-gray-400 mt-0.5">Totaal</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#617589] dark:text-gray-400">
                  Prijs/dag/persoon (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={inputValues['eten_prijs_per_dag'] !== undefined ? inputValues['eten_prijs_per_dag'] : (parameters?.eten_prijs_per_dag || '')}
                  onChange={(e) => setInputValues(prev => ({ ...prev, 'eten_prijs_per_dag': e.target.value }))}
                  onBlur={(e) => {
                    const numValue = e.target.value ? Number(e.target.value) : null
                    const currentValue = parameters?.eten_prijs_per_dag || null
                    if (numValue !== currentValue) {
                      updateParameter('eten_prijs_per_dag', numValue)
                    } else {
                      setInputValues(prev => {
                        const next = { ...prev }
                        delete next['eten_prijs_per_dag']
                        return next
                      })
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur()
                    }
                  }}
                  className="mt-0.5 w-full rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-background-light dark:bg-background-dark px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#617589] dark:text-gray-400">
                  Aantal dagen
                </label>
                <input
                  type="number"
                  value={inputValues['aantal_dagen_eten'] !== undefined ? inputValues['aantal_dagen_eten'] : (parameters?.aantal_dagen_eten || '')}
                  onChange={(e) => setInputValues(prev => ({ ...prev, 'aantal_dagen_eten': e.target.value }))}
                  onBlur={(e) => {
                    const numValue = e.target.value ? Number(e.target.value) : null
                    const currentValue = parameters?.aantal_dagen_eten || null
                    if (numValue !== currentValue) {
                      updateParameter('aantal_dagen_eten', numValue)
                    } else {
                      setInputValues(prev => {
                        const next = { ...prev }
                        delete next['aantal_dagen_eten']
                        return next
                      })
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur()
                    }
                  }}
                  className="mt-0.5 w-full rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-background-light dark:bg-background-dark px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#617589] dark:text-gray-400">
                  Berekening
                </label>
                <div className="mt-0.5 text-sm text-[#617589] dark:text-gray-400">
                  {parameters?.eten_prijs_per_dag && parameters?.aantal_dagen_eten && (
                    <p>
                      {formatEuro(parameters.eten_prijs_per_dag, false)} × {parameters.aantal_dagen_eten} dagen ×{' '}
                      {totaalPersonen} personen = {formatEuro(parameters.eten_prijs_per_dag * parameters.aantal_dagen_eten * totaalPersonen)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Eten items tabel */}
        {categoryItems.filter((item) => !item.automatisch).length > 0 && (
          <div className="mt-4 rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-background-dark overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-background-light dark:bg-white/10 text-[#111418] dark:text-gray-200 uppercase tracking-[0.1em] text-xs">
                <tr>
                  <th className="px-4 py-2 text-left">Titel</th>
                  <th className="px-4 py-2 text-left">Beschrijving</th>
                  <th className="px-4 py-2 text-right">Totaal</th>
                  <th className="px-4 py-2 text-left">Opmerkingen</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dbe0e6] dark:divide-gray-800">
                {categoryItems
                  .filter((item) => !item.automatisch)
                  .map((item) => {
                    const totaal = calculateItemTotal(item)
                    const isEditingBeschrijving = editingField?.id === item.id && editingField?.field === 'beschrijving'
                    const isEditingOpmerkingen = editingField?.id === item.id && editingField?.field === 'opmerkingen'
                    const isEditingTotaal = editingField?.id === item.id && editingField?.field === 'totaal'
                    
                    return (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                        <td className="px-4 py-2 font-medium text-[#111418] dark:text-gray-100">
                          {item.subcategorie}
                        </td>
                        <td className="px-4 py-2 text-[#617589] dark:text-gray-400">
                          {isEditingBeschrijving ? (
                            <input
                              type="text"
                              defaultValue={item.beschrijving || ''}
                              onBlur={(e) => {
                                const newValue = e.target.value.trim() || null
                                if (newValue !== (item.beschrijving || null)) {
                                  handleUpdateField(item.id, 'beschrijving', newValue)
                                } else {
                                  setEditingField(null)
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.currentTarget.blur()
                                } else if (e.key === 'Escape') {
                                  setEditingField(null)
                                }
                              }}
                              autoFocus
                              className="w-full px-2 py-1 rounded border border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-white dark:bg-background-dark text-[#111418] dark:text-gray-100"
                            />
                          ) : (
                            <span
                              onClick={() => setEditingField({ id: item.id, field: 'beschrijving' })}
                              className="cursor-pointer hover:text-primary transition-colors"
                              title="Klik om te bewerken"
                            >
                              {item.beschrijving || '—'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right font-medium text-[#111418] dark:text-gray-100">
                          {isEditingTotaal ? (
                            <input
                              type="number"
                              step="0.01"
                              defaultValue={item.totaal || ''}
                              onBlur={(e) => {
                                const newValue = e.target.value ? Number(e.target.value) : null
                                if (newValue !== (item.totaal || null)) {
                                  handleUpdateField(item.id, 'totaal', newValue)
                                } else {
                                  setEditingField(null)
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.currentTarget.blur()
                                } else if (e.key === 'Escape') {
                                  setEditingField(null)
                                }
                              }}
                              autoFocus
                              className="w-full px-2 py-1 rounded border border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-white dark:bg-background-dark text-[#111418] dark:text-gray-100 text-right"
                            />
                          ) : (
                            <span
                              onClick={() => setEditingField({ id: item.id, field: 'totaal' })}
                              className="cursor-pointer hover:text-primary transition-colors"
                              title="Klik om totaal te bewerken"
                            >
                              {formatEuro(totaal)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-[#617589] dark:text-gray-400">
                          {isEditingOpmerkingen ? (
                            <input
                              type="text"
                              defaultValue={item.opmerkingen || ''}
                              onBlur={(e) => {
                                const newValue = e.target.value.trim() || null
                                if (newValue !== (item.opmerkingen || null)) {
                                  handleUpdateField(item.id, 'opmerkingen', newValue)
                                } else {
                                  setEditingField(null)
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.currentTarget.blur()
                                } else if (e.key === 'Escape') {
                                  setEditingField(null)
                                }
                              }}
                              autoFocus
                              className="w-full px-2 py-1 rounded border border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-white dark:bg-background-dark text-[#111418] dark:text-gray-100"
                            />
                          ) : (
                            <span
                              onClick={() => setEditingField({ id: item.id, field: 'opmerkingen' })}
                              className="cursor-pointer hover:text-primary transition-colors"
                              title="Klik om opmerkingen te bewerken"
                            >
                              {item.opmerkingen || '—'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditItem(item)}
                              className="text-primary hover:text-primary/80 text-sm"
                              title="Aanpassen"
                            >
                              <span className="material-symbols-outlined text-base">edit</span>
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="text-red-500 hover:text-red-700 text-sm"
                              title="Verwijderen"
                            >
                              <span className="material-symbols-outlined text-base">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  const renderSpecialeActiviteitenTable = () => {
    const gastjes = parameters?.aantal_gastjes || 0
    const leiders = parameters?.aantal_leiders || 0
    const totaalPersonen = gastjes + leiders

    return (
      <div className="rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-background-dark overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-background-light dark:bg-white/10 text-[#111418] dark:text-gray-200 uppercase tracking-[0.1em] text-xs">
            <tr>
              <th className="px-4 py-2 text-left">Subcategorie</th>
              <th className="px-4 py-2 text-left">Beschrijving</th>
              <th className="px-4 py-2 text-right">Prijs/persoon</th>
              <th className="px-4 py-2 text-right">Aantal</th>
              <th className="px-4 py-2 text-left">Opmerkingen</th>
              <th className="px-4 py-2 text-right">Totaal</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#dbe0e6] dark:divide-gray-800">
            {categoryItems.map((item) => {
              const prijsPerPersoon = Number(item.prijs_per_persoon) || 0
              const aantalPersonen = item.aantal || totaalPersonen
              const totaal = prijsPerPersoon * aantalPersonen

              return (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                  <td className="px-4 py-2 font-medium text-[#111418] dark:text-gray-100">
                    {item.subcategorie}
                  </td>
                  <td className="px-4 py-2 text-[#617589] dark:text-gray-400">
                    {item.beschrijving || '—'}
                  </td>
                  <td className="px-4 py-2 text-right text-[#111418] dark:text-gray-100">
                    {formatEuro(prijsPerPersoon)}
                  </td>
                  <td className="px-4 py-2 text-right text-[#111418] dark:text-gray-100">
                    {aantalPersonen}
                  </td>
                  <td className="px-4 py-2 text-[#617589] dark:text-gray-400">
                    {item.opmerkingen || '—'}
                  </td>
                  <td className="px-4 py-2 text-right font-medium text-[#111418] dark:text-gray-100">
                    {formatEuro(totaal)}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditItem(item)}
                        className="text-primary hover:text-primary/80 text-sm"
                        title="Aanpassen"
                      >
                        <span className="material-symbols-outlined text-base">edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-red-500 hover:text-red-700 text-sm"
                        title="Verwijderen"
                      >
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  const renderOverigeTable = () => {
    return (
      <div className="rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-background-dark overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-background-light dark:bg-white/10 text-[#111418] dark:text-gray-200 uppercase tracking-[0.1em] text-xs">
            <tr>
              <th className="px-4 py-2 text-left">Subcategorie</th>
              <th className="px-4 py-2 text-left">Beschrijving</th>
              <th className="px-4 py-2 text-right">Prijs/persoon</th>
              <th className="px-4 py-2 text-right">Aantal</th>
              <th className="px-4 py-2 text-right">Totaal</th>
              <th className="px-4 py-2 text-left">Opmerkingen</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#dbe0e6] dark:divide-gray-800">
            {categoryItems.map((item) => {
              const totaal = calculateItemTotal(item)
              return (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                  <td className="px-4 py-2 font-medium text-[#111418] dark:text-gray-100">
                    {item.subcategorie}
                  </td>
                  <td className="px-4 py-2 text-[#617589] dark:text-gray-400">
                    {item.beschrijving || '—'}
                  </td>
                  <td className="px-4 py-2 text-right text-[#111418] dark:text-gray-100">
                    {item.prijs_per_persoon ? formatEuro(item.prijs_per_persoon) : '—'}
                  </td>
                  <td className="px-4 py-2 text-right text-[#111418] dark:text-gray-100">
                    {item.aantal || '—'}
                  </td>
                  <td className="px-4 py-2 text-right font-medium text-[#111418] dark:text-gray-100">
                    {formatEuro(totaal)}
                  </td>
                  <td className="px-4 py-2 text-[#617589] dark:text-gray-400">
                    {item.opmerkingen || '—'}
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-red-500 hover:text-red-700 text-sm"
                      title="Verwijderen"
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  const renderTable = () => {
    if (categoryItems.length === 0) {
      return (
        <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 px-4 py-6 text-sm text-[#617589] dark:text-gray-400 text-center">
          Nog geen kostitems in deze categorie. Voeg een nieuw item toe om te starten.
        </div>
      )
    }

    switch (selectedCategory) {
      case 'Verblijf':
        return renderVerblijfTable()
      case 'Vervoer':
        return renderVervoerTable()
      case 'Eten':
        return renderEtenTable()
      case 'Speciale Activiteiten':
        return renderSpecialeActiviteitenTable()
      default:
        return renderOverigeTable()
    }
  }

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6 pt-16 md:pt-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-[#111418] dark:text-white">Kostenoverzicht</h2>
          <p className="text-sm text-[#617589] dark:text-gray-400">
            Beheer alle kampkosten per categorie.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={loadAllData}
            className="flex items-center gap-1 rounded-lg border border-[#dbe0e6] dark:border-gray-700 px-3 py-2 text-sm font-semibold text-[#111418] dark:text-white hover:bg-gray-100 dark:hover:bg-white/10"
          >
            <span className="material-symbols-outlined text-base">refresh</span>
            <span>Vernieuw</span>
          </button>
          {selectedCategory === 'Verblijf' ? (
            <button
              onClick={handleAddVerblijfItem}
              className="flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
            >
              <span className="material-symbols-outlined text-base">add</span>
              <span>Nieuw verblijf</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setAddModalPrijsType('per_persoon')
                setAddModalAantalType('getal')
                setShowAddModal(true)
              }}
              className="flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
            >
              <span className="material-symbols-outlined text-base">add</span>
              <span>Nieuw item</span>
            </button>
          )}
        </div>
      </div>

      <p
        className={`text-sm ${
          status.tone === 'success'
            ? 'text-green-500'
            : status.tone === 'error'
            ? 'text-red-500'
            : status.tone === 'warning'
            ? 'text-yellow-500'
            : 'text-[#617589] dark:text-gray-400'
        }`}
      >
        {status.message}
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Category List */}
        <nav className="lg:col-span-1 flex flex-col gap-2 rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-background-dark p-4 text-sm">
          <p className="text-xs uppercase tracking-[0.3em] text-[#617589] dark:text-gray-500">
            Categorieën
          </p>
          {CATEGORY_ORDER.map((cat) => {
            const count = kostenItems.filter((item) => item.categorie === cat).length
            const isActive = selectedCategory === cat
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                  isActive
                    ? 'bg-primary text-white shadow'
                    : 'text-[#617589] dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'
                }`}
              >
                <span>{cat}</span>
                <span className="text-xs uppercase tracking-[0.2em]">{count}</span>
              </button>
            )
          })}
        </nav>

        {/* Content Container */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-background-dark p-4">
            <div>
              <h3 className="text-xl font-semibold text-[#111418] dark:text-white">
                {selectedCategory}
              </h3>
              <p className="text-sm text-[#617589] dark:text-gray-400">
                {categoryItems.length} items
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-primary">{formatEuro(categoryTotals)}</p>
              <p className="text-xs text-[#617589] dark:text-gray-400 mt-1">Categorie totaal</p>
            </div>
          </div>

          {renderTable()}
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => e.target === e.currentTarget && setShowAddModal(false)}
        >
          <div className="w-full max-w-xl rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-background-dark shadow-xl">
            <div className="flex items-center justify-between border-b border-[#dbe0e6] dark:border-gray-700 px-5 py-3">
              <h3 className="text-lg font-semibold text-[#111418] dark:text-white">Nieuw kostitem</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[#617589] dark:text-gray-400 hover:text-[#111418] dark:hover:text-gray-200"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleAddItem} className="grid gap-4 px-5 py-4">
              <div className="grid gap-2">
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#617589] dark:text-gray-400">
                  Categorie
                </label>
                <select
                  name="categorie"
                  required
                  defaultValue={selectedCategory}
                  className="rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-background-light dark:bg-background-dark px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  {CATEGORY_ORDER.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#617589] dark:text-gray-400">
                  Titel
                </label>
                <input
                  type="text"
                  name="subcategorie"
                  required
                  placeholder="Bijv. Kajakken"
                  className="rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-background-light dark:bg-background-dark px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#617589] dark:text-gray-400">
                  Beschrijving
                </label>
                <textarea
                  name="beschrijving"
                  rows={2}
                  placeholder="Extra details"
                  className="rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-background-light dark:bg-background-dark px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#617589] dark:text-gray-400">
                  Prijs type
                </label>
                <select
                  value={addModalPrijsType}
                  onChange={(e) => setAddModalPrijsType(e.target.value as 'totaal' | 'per_persoon')}
                  className="rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-background-light dark:bg-background-dark px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="per_persoon">Per persoon</option>
                  <option value="totaal">Totaal bedrag</option>
                </select>
              </div>
              <div className="grid gap-2">
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#617589] dark:text-gray-400">
                  {addModalPrijsType === 'totaal' ? 'Totaal bedrag (€)' : 'Prijs per persoon (€)'}
                </label>
                <input
                  type="number"
                  name="prijs"
                  step="0.01"
                  className="rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-background-light dark:bg-background-dark px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
              {addModalPrijsType === 'per_persoon' && (
                <>
                  <div className="grid gap-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#617589] dark:text-gray-400">
                      Aantal / Voor wie?
                    </label>
                    <select
                      value={addModalAantalType}
                      onChange={(e) => setAddModalAantalType(e.target.value as 'getal' | 'iedereen' | 'gastjes' | 'leiders')}
                      className="rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-background-light dark:bg-background-dark px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    >
                      <option value="getal">Aantal (getal)</option>
                      <option value="iedereen">Iedereen (gastjes + leiders)</option>
                      <option value="gastjes">Alleen gastjes</option>
                      <option value="leiders">Alleen leiders</option>
                    </select>
                  </div>
                  {addModalAantalType === 'getal' && (
                    <div className="grid gap-2">
                      <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#617589] dark:text-gray-400">
                        Aantal
                      </label>
                      <input
                        type="number"
                        name="aantal_getal"
                        defaultValue={1}
                        min={1}
                        className="rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-background-light dark:bg-background-dark px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                      />
                    </div>
                  )}
                </>
              )}
              <div className="grid gap-2">
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#617589] dark:text-gray-400">
                  Opmerkingen
                </label>
                <textarea
                  name="opmerkingen"
                  rows={2}
                  className="rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-background-light dark:bg-background-dark px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
              {selectedCategory === 'Vervoer' && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="kost_van_bus"
                    id="kost_van_bus_add"
                    className="rounded border-[#dbe0e6] dark:border-gray-700 text-primary focus:ring-2 focus:ring-primary"
                  />
                  <label htmlFor="kost_van_bus_add" className="text-sm text-[#111418] dark:text-gray-100 cursor-pointer">
                    Kost van bus
                  </label>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-lg border border-[#dbe0e6] dark:border-gray-700 px-4 py-2 text-sm font-semibold text-[#617589] hover:bg-gray-100 dark:hover:bg-white/10"
                >
                  Annuleer
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
                >
                  Opslaan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => e.target === e.currentTarget && setEditingItem(null)}
        >
          <div className="w-full max-w-xl rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-background-dark shadow-xl">
            <div className="flex items-center justify-between border-b border-[#dbe0e6] dark:border-gray-700 px-5 py-3">
              <h3 className="text-lg font-semibold text-[#111418] dark:text-white">Item aanpassen</h3>
              <button
                onClick={() => setEditingItem(null)}
                className="text-[#617589] dark:text-gray-400 hover:text-[#111418] dark:hover:text-gray-200"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleUpdateItem} className="grid gap-4 px-5 py-4">
              <div className="grid gap-2">
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#617589] dark:text-gray-400">
                  Categorie
                </label>
                <select
                  name="categorie"
                  required
                  defaultValue={editingItem.categorie}
                  className="rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-background-light dark:bg-background-dark px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  {CATEGORY_ORDER.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#617589] dark:text-gray-400">
                  Titel
                </label>
                <input
                  type="text"
                  name="subcategorie"
                  required
                  defaultValue={editingItem.subcategorie}
                  placeholder="Bijv. Kajakken"
                  className="rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-background-light dark:bg-background-dark px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#617589] dark:text-gray-400">
                  Beschrijving
                </label>
                <textarea
                  name="beschrijving"
                  rows={2}
                  defaultValue={editingItem.beschrijving || ''}
                  placeholder="Extra details"
                  className="rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-background-light dark:bg-background-dark px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#617589] dark:text-gray-400">
                  Prijs type
                </label>
                <select
                  value={editModalPrijsType}
                  onChange={(e) => setEditModalPrijsType(e.target.value as 'totaal' | 'per_persoon')}
                  className="rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-background-light dark:bg-background-dark px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="per_persoon">Per persoon</option>
                  <option value="totaal">Totaal bedrag</option>
                </select>
              </div>
              <div className="grid gap-2">
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#617589] dark:text-gray-400">
                  {editModalPrijsType === 'totaal' ? 'Totaal bedrag (€)' : 'Prijs per persoon (€)'}
                </label>
                <input
                  type="number"
                  name="prijs"
                  step="0.01"
                  defaultValue={editModalPrijsType === 'totaal' ? (editingItem.totaal || '') : (editingItem.prijs_per_persoon || editingItem.prijs_per_persoon_gastjes || editingItem.prijs_per_persoon_leiders || '')}
                  className="rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-background-light dark:bg-background-dark px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
              {editModalPrijsType === 'per_persoon' && (
                <>
                  <div className="grid gap-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#617589] dark:text-gray-400">
                      Aantal / Voor wie?
                    </label>
                    <select
                      value={editModalAantalType}
                      onChange={(e) => setEditModalAantalType(e.target.value as 'getal' | 'iedereen' | 'gastjes' | 'leiders')}
                      className="rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-background-light dark:bg-background-dark px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    >
                      <option value="getal">Aantal (getal)</option>
                      <option value="iedereen">Iedereen (gastjes + leiders)</option>
                      <option value="gastjes">Alleen gastjes</option>
                      <option value="leiders">Alleen leiders</option>
                    </select>
                  </div>
                  {editModalAantalType === 'getal' && (
                    <div className="grid gap-2">
                      <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#617589] dark:text-gray-400">
                        Aantal
                      </label>
                      <input
                        type="number"
                        name="aantal_getal"
                        defaultValue={editingItem.aantal || 1}
                        min={1}
                        className="rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-background-light dark:bg-background-dark px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                      />
                    </div>
                  )}
                </>
              )}
              <div className="grid gap-2">
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#617589] dark:text-gray-400">
                  Opmerkingen
                </label>
                <textarea
                  name="opmerkingen"
                  rows={2}
                  defaultValue={editingItem.opmerkingen || ''}
                  className="rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-background-light dark:bg-background-dark px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
              {editingItem.categorie === 'Vervoer' && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="kost_van_bus"
                    id="kost_van_bus_edit"
                    defaultChecked={editingItem.kost_van_bus === true}
                    className="rounded border-[#dbe0e6] dark:border-gray-700 text-primary focus:ring-2 focus:ring-primary"
                  />
                  <label htmlFor="kost_van_bus_edit" className="text-sm text-[#111418] dark:text-gray-100 cursor-pointer">
                    Kost van bus
                  </label>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="rounded-lg border border-[#dbe0e6] dark:border-gray-700 px-4 py-2 text-sm font-semibold text-[#617589] hover:bg-gray-100 dark:hover:bg-white/10"
                >
                  Annuleer
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
                >
                  Opslaan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
