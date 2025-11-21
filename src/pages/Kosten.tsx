import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { KostenItem, PlanningDag, Parameters, VersionId } from '../types'
import { useVersion } from '../context/VersionContext'
import { logChange, getCurrentUserName } from '../lib/changeLogger'

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
  const [editingField, setEditingField] = useState<{ id: string; field: string } | null>(null)
  const [addModalPrijsType, setAddModalPrijsType] = useState<'totaal' | 'per_persoon'>('per_persoon')
  const [addModalAantalType, setAddModalAantalType] = useState<'getal' | 'iedereen' | 'gastjes' | 'leiders'>('getal')

  useEffect(() => {
    loadAllData()
  }, [currentVersion])

  const loadAllData = async () => {
    try {
      setStatus({ message: 'Data laden...', tone: 'info' })

      const [loadedKosten, loadedPlanning, params] = await Promise.all([
        getKostenItems(),
        getPlanningData(),
        getParameters(),
      ])

      setKostenItems(loadedKosten)
      setPlanningData(loadedPlanning)
      setParameters(params)
      setStatus({
        message: `${loadedKosten.length} kostitems geladen.`,
        tone: 'success',
      })

      if (params && loadedPlanning.length > 0 && loadedKosten.length > 0) {
        setTimeout(() => calculateAutomaticItemsWithParams(params, loadedKosten, loadedPlanning), 300)
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
    const aantalBusdagen = planning.length
    const totaalKm = planning.reduce((sum, dag) => sum + (dag.km || 0), 0)

    const updates: { id: string; totaal: number; aantal?: number }[] = []

    // Update bus kosten
    const busItem = items.find((item) => item.subcategorie === 'Bus huur' && item.automatisch)
    if (busItem && params.bus_dagprijs && params.bus_daglimiet && params.bus_extra_km) {
      let busKosten = params.bus_dagprijs * aantalBusdagen
      const maxKmZonderExtra = params.bus_daglimiet * aantalBusdagen
      if (totaalKm > maxKmZonderExtra) {
        const extraKm = totaalKm - maxKmZonderExtra
        busKosten += extraKm * params.bus_extra_km
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

  const handleUpdateField = async (id: string, field: string, value: number | string) => {
    try {
      const tableName = getTableName('kosten', currentVersion)
      const userName = getCurrentUserName()
      const oldItem = kostenItems.find(item => item.id === id)
      const oldValue = oldItem ? (oldItem as any)[field] : null
      
      const { error } = await supabase
        .from(tableName)
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error

      // Log change
      await logChange(currentVersion, tableName, id, field, oldValue, value, userName)

      const updatedItems = kostenItems.map((item) => (item.id === id ? { ...item, [field]: value } : item))
      setKostenItems(updatedItems)
      
      setEditingField(null)
      setStatus({ message: 'Item bijgewerkt.', tone: 'success' })
    } catch (error) {
      console.error('Error updating field:', error)
      setStatus({
        message: `Fout bij bijwerken: ${error instanceof Error ? error.message : 'Onbekende fout'}`,
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

  const renderVervoerTable = () => {
    const busItem = categoryItems.find((item) => item.subcategorie === 'Bus huur' && item.automatisch)
    const autoItem = categoryItems.find((item) => item.subcategorie === 'Auto koks' && item.automatisch)
    const totaalKm = planningData.reduce((sum, dag) => sum + (dag.km || 0), 0)
    const aantalBusdagen = planningData.length

    return (
      <div className="space-y-3">
        {/* Bus Item */}
        {busItem && (
          <div className="rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-background-dark p-3">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-lg font-semibold text-[#111418] dark:text-white">Bus huur</h4>
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                    Auto
                  </span>
                </div>
                {busItem.beschrijving && (
                  <p className="text-sm text-[#617589] dark:text-gray-400 mt-0.5">{busItem.beschrijving}</p>
                )}
              </div>
              <div className="text-right ml-4">
                <p className="text-2xl font-bold text-primary">{formatEuro(busItem.totaal || 0)}</p>
                <p className="text-xs text-[#617589] dark:text-gray-400 mt-0.5">Totaal</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#617589] dark:text-gray-400">
                  Dagprijs (€)
                </label>
                <input
                  type="number"
                  value={parameters?.bus_dagprijs || ''}
                  onChange={(e) => updateParameter('bus_dagprijs', e.target.value ? Number(e.target.value) : null)}
                  className="mt-0.5 w-full rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-background-light dark:bg-background-dark px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#617589] dark:text-gray-400">
                  Daglimiet (km)
                </label>
                <input
                  type="number"
                  value={parameters?.bus_daglimiet || ''}
                  onChange={(e) => updateParameter('bus_daglimiet', e.target.value ? Number(e.target.value) : null)}
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
                  value={parameters?.bus_extra_km || ''}
                  onChange={(e) => updateParameter('bus_extra_km', e.target.value ? Number(e.target.value) : null)}
                  className="mt-0.5 w-full rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-background-light dark:bg-background-dark px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
            </div>

            {/* Kilometers tabel */}
            <div className="mt-3 rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-background-light dark:bg-background-dark p-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#617589] dark:text-gray-400 mb-2">
                Kilometers per dag
              </p>
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="px-2 py-1 text-left border-b border-[#dbe0e6] dark:border-gray-700 text-[#617589] dark:text-gray-400 font-semibold">
                      Dag
                    </th>
                    {planningData.map((dag) => (
                      <th
                        key={dag.id}
                        className="px-2 py-1 text-center border-b border-[#dbe0e6] dark:border-gray-700 text-[#617589] dark:text-gray-400 font-semibold"
                      >
                        {dag.dag}
                      </th>
                    ))}
                    <th className="px-2 py-1 text-center border-b border-[#dbe0e6] dark:border-gray-700 text-[#617589] dark:text-gray-400 font-semibold">
                      Totaal
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-2 py-1 text-left border-b border-[#dbe0e6] dark:border-gray-700 text-[#617589] dark:text-gray-400 font-semibold">
                      Afstand
                    </td>
                    {planningData.map((dag) => (
                      <td
                        key={dag.id}
                        className="px-2 py-1 text-center border-b border-[#dbe0e6] dark:border-gray-700 text-[#111418] dark:text-gray-200 font-medium"
                      >
                        {dag.km}
                      </td>
                    ))}
                    <td className="px-2 py-1 text-center border-b border-[#dbe0e6] dark:border-gray-700 text-primary font-semibold">
                      {totaalKm}
                    </td>
                  </tr>
                </tbody>
              </table>
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
                  value={parameters?.auto_brandstof || ''}
                  onChange={(e) => updateParameter('auto_brandstof', e.target.value ? Number(e.target.value) : null)}
                  className="mt-0.5 w-full rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-background-light dark:bg-background-dark px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#617589] dark:text-gray-400">
                  Afstand (km)
                </label>
                <input
                  type="number"
                  value={parameters?.auto_afstand || ''}
                  onChange={(e) => updateParameter('auto_afstand', e.target.value ? Number(e.target.value) : null)}
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
                  <th className="px-4 py-2 text-left">Subcategorie</th>
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
                    return (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                        <td className="px-4 py-2 font-medium text-[#111418] dark:text-gray-100">
                          {item.subcategorie}
                        </td>
                        <td className="px-4 py-2 text-[#617589] dark:text-gray-400">
                          {item.beschrijving || '—'}
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
                  value={parameters?.eten_prijs_per_dag || ''}
                  onChange={(e) => updateParameter('eten_prijs_per_dag', e.target.value ? Number(e.target.value) : null)}
                  className="mt-0.5 w-full rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-background-light dark:bg-background-dark px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#617589] dark:text-gray-400">
                  Aantal dagen
                </label>
                <input
                  type="number"
                  value={parameters?.aantal_dagen_eten || ''}
                  onChange={(e) => updateParameter('aantal_dagen_eten', e.target.value ? Number(e.target.value) : null)}
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
                  <th className="px-4 py-2 text-left">Subcategorie</th>
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
                    return (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                        <td className="px-4 py-2 font-medium text-[#111418] dark:text-gray-100">
                          {item.subcategorie}
                        </td>
                        <td className="px-4 py-2 text-[#617589] dark:text-gray-400">
                          {item.beschrijving || '—'}
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
              <th className="px-4 py-2 text-right">Totaal</th>
              <th className="px-4 py-2 text-left">Opmerkingen</th>
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
                  <td className="px-4 py-2 text-right">
                    {editingField?.id === item.id && editingField?.field === 'prijs_per_persoon' ? (
                      <input
                        type="number"
                        step="0.01"
                        defaultValue={prijsPerPersoon}
                        onBlur={(e) => {
                          handleUpdateField(item.id, 'prijs_per_persoon', Number(e.target.value))
                          setEditingField(null)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleUpdateField(item.id, 'prijs_per_persoon', Number(e.currentTarget.value))
                            setEditingField(null)
                          }
                          if (e.key === 'Escape') setEditingField(null)
                        }}
                        autoFocus
                        className="w-20 rounded border border-gray-300 px-2 py-1 text-sm"
                      />
                    ) : (
                      <span
                        onClick={() => setEditingField({ id: item.id, field: 'prijs_per_persoon' })}
                        className="cursor-pointer hover:underline text-[#111418] dark:text-gray-100"
                      >
                        {formatEuro(prijsPerPersoon)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {editingField?.id === item.id && editingField?.field === 'aantal' ? (
                      <input
                        type="number"
                        defaultValue={aantalPersonen}
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
                        className="w-20 rounded border border-gray-300 px-2 py-1 text-sm"
                      />
                    ) : (
                      <span
                        onClick={() => setEditingField({ id: item.id, field: 'aantal' })}
                        className="cursor-pointer hover:underline text-[#111418] dark:text-gray-100"
                      >
                        {aantalPersonen}
                      </span>
                    )}
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
    <div className="p-8 space-y-6">
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
                  Subcategorie
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
    </div>
  )
}
