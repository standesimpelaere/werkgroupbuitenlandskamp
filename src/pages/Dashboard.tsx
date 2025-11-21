import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { KostenItem, Parameters, VersionId, PlanningDag } from '../types'
import { useVersion, VERSIONS } from '../context/VersionContext'
import { logChange, getCurrentUserName } from '../lib/changeLogger'

interface CategoryTotal {
  categorie: string
  totaal: number
}

export default function Dashboard() {
  const { currentVersion, getKostenItems, getParameters, getPlanningData, openVersionSelector } = useVersion()
  const [loading, setLoading] = useState(true)
  const [kostenItems, setKostenItems] = useState<KostenItem[]>([])
  const [parameters, setParameters] = useState<Parameters | null>(null)
  const [planningData, setPlanningData] = useState<PlanningDag[]>([])
  const [categoryTotals, setCategoryTotals] = useState<CategoryTotal[]>([])

  useEffect(() => {
    loadAllData()
  }, [currentVersion])

  const loadAllData = async () => {
    try {
      const [loadedKosten, loadedParams, loadedPlanning] = await Promise.all([
        getKostenItems(),
        getParameters(),
        getPlanningData(),
      ])
      setKostenItems(loadedKosten)
      setParameters(loadedParams)
      setPlanningData(loadedPlanning)
      
      // Calculate totals
      const totals: { [key: string]: number } = {}
      loadedKosten.forEach((item) => {
        const categorie = item.categorie
        const totaal = Number(item.totaal) || calculateItemTotal(item, loadedParams)
        totals[categorie] = (totals[categorie] || 0) + totaal
      })
      const categoryArray = Object.entries(totals).map(([categorie, totaal]) => ({
        categorie,
        totaal,
      }))
      setCategoryTotals(categoryArray)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateItemTotal = (item: KostenItem, params: Parameters | null): number => {
    if (item.totaal) return Number(item.totaal)

    const gastjes = params?.aantal_gastjes || 0
    const leiders = params?.aantal_leiders || 0
    const aantal = item.aantal || 1

    if (item.splitsing === 'gastjes_leiders') {
      const totaalGastjes = (Number(item.prijs_per_persoon_gastjes) || 0) * gastjes * aantal
      const totaalLeiders = (Number(item.prijs_per_persoon_leiders) || 0) * leiders * aantal
      return totaalGastjes + totaalLeiders
    } else if (item.splitsing === 'gastjes') {
      if (item.eenheid === 'persoon') {
        return (Number(item.prijs_per_persoon_gastjes) || 0) * gastjes
      } else {
        return (Number(item.prijs_per_persoon_gastjes) || 0) * gastjes * aantal
      }
    } else if (item.splitsing === 'leiders') {
      if (item.eenheid === 'persoon') {
        return (Number(item.prijs_per_persoon_leiders) || 0) * leiders
      } else {
        return (Number(item.prijs_per_persoon_leiders) || 0) * leiders * aantal
      }
    } else {
      const totaalPersonen = gastjes + leiders
      if (item.eenheid === 'persoon') {
        return (Number(item.prijs_per_persoon) || 0) * totaalPersonen
      } else if (item.eenheid === 'groep') {
        return Number(item.totaal) || Number(item.prijs_per_persoon) || 0
      } else {
        return (Number(item.prijs_per_persoon) || 0) * totaalPersonen * aantal
      }
    }
  }
  
  const handleDownloadSpreadsheet = async () => {
    try {
      // Get all data
      const loadedKosten = await getKostenItems()
      const loadedParams = await getParameters()

      // Calculate totals per category
      const categoryTotals: { [key: string]: number } = {}
      loadedKosten.forEach((item) => {
        const categorie = item.categorie || 'Overige'
        const totaal = calculateItemTotal(item, loadedParams)
        categoryTotals[categorie] = (categoryTotals[categorie] || 0) + totaal
      })
      const totaleKosten = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0)

      // Create CSV content
      let csvContent = ''

      // Sheet 1: Samenvatting
      csvContent += '=== SAMENVATTING ===\n'
      csvContent += 'Item,Waarde\n'
      if (loadedParams) {
        csvContent += `"Aantal gastjes","${loadedParams.aantal_gastjes || ''}"\n`
        csvContent += `"Aantal leiders","${loadedParams.aantal_leiders || ''}"\n`
        csvContent += `"Vraagprijs gastje (€)","${loadedParams.vraagprijs_gastje || ''}"\n`
        csvContent += `"Vraagprijs leider (€)","${loadedParams.vraagprijs_leider || ''}"\n`
        const totaleOpbrengst = (loadedParams.aantal_gastjes || 0) * (loadedParams.vraagprijs_gastje || 0) + (loadedParams.aantal_leiders || 0) * (loadedParams.vraagprijs_leider || 0)
        csvContent += `"Totale opbrengst (€)","${totaleOpbrengst.toFixed(2)}"\n`
      }
      csvContent += `"Totale kosten (€)","${totaleKosten.toFixed(2)}"\n`
      if (loadedParams) {
        const totaleOpbrengst = (loadedParams.aantal_gastjes || 0) * (loadedParams.vraagprijs_gastje || 0) + (loadedParams.aantal_leiders || 0) * (loadedParams.vraagprijs_leider || 0)
        const winstVerlies = totaleOpbrengst - totaleKosten
        csvContent += `"Winst/Verlies (€)","${winstVerlies.toFixed(2)}"\n`
      }
      csvContent += '\n'

      // Sheet 2: Kosten per categorie
      csvContent += '=== KOSTEN PER CATEGORIE ===\n'
      csvContent += 'Categorie,Totaal (€)\n'
      Object.entries(categoryTotals)
        .sort(([, a], [, b]) => b - a)
        .forEach(([categorie, totaal]) => {
          csvContent += `"${categorie}","${totaal.toFixed(2)}"\n`
        })
      csvContent += '\n'

      // Sheet 3: Kosten details
      csvContent += '=== KOSTEN DETAILS ===\n'
      csvContent += 'Categorie,Subcategorie,Beschrijving,Eenheid,Splitsing,Prijs per persoon,Prijs per persoon (gastjes),Prijs per persoon (leiders),Aantal,Berekend totaal (€),Opmerkingen,Automatisch\n'
      loadedKosten.forEach((item) => {
        const escapeCSV = (val: any) => {
          if (val === null || val === undefined) return ''
          const str = String(val)
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`
          }
          return str
        }
        const berekendTotaal = calculateItemTotal(item, loadedParams)
        csvContent += `${escapeCSV(item.categorie)},${escapeCSV(item.subcategorie)},${escapeCSV(item.beschrijving)},${escapeCSV(item.eenheid)},${escapeCSV(item.splitsing)},${escapeCSV(item.prijs_per_persoon)},${escapeCSV(item.prijs_per_persoon_gastjes)},${escapeCSV(item.prijs_per_persoon_leiders)},${escapeCSV(item.aantal)},${berekendTotaal.toFixed(2)},${escapeCSV(item.opmerkingen)},${item.automatisch ? 'Ja' : 'Nee'}\n`
      })
      csvContent += '\n'

      // Sheet 4: Parameters
      csvContent += '=== PARAMETERS ===\n'
      csvContent += 'Parameter,Waarde\n'
      if (loadedParams) {
        const paramMap: { [key: string]: string } = {
          aantal_gastjes: 'Aantal gastjes',
          aantal_leiders: 'Aantal leiders',
          vraagprijs_gastje: 'Vraagprijs gastje (€)',
          vraagprijs_leider: 'Vraagprijs leider (€)',
          buffer_percentage: 'Bufferpercentage (%)',
          bus_dagprijs: 'Bus dagprijs (€)',
          bus_daglimiet: 'Bus daglimiet (km)',
          bus_extra_km: 'Bus extra per km (€)',
          auto_brandstof: 'Auto brandstofprijs (€/L)',
          auto_afstand: 'Auto afstand (km)',
          eten_prijs_per_dag: 'Eten prijs per dag (€)',
          aantal_dagen_eten: 'Aantal dagen eten',
        }
        Object.entries(loadedParams).forEach(([key, value]) => {
          if (key !== 'id' && key !== 'created_at' && key !== 'updated_at' && value !== null && value !== undefined) {
            const label = paramMap[key] || key
            csvContent += `"${label}","${value}"\n`
          }
        })
      }

      // Download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      const dateStr = new Date().toISOString().split('T')[0]
      link.setAttribute('download', `kamp_data_${dateStr}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Error exporting spreadsheet:', error)
      alert('Fout bij exporteren van spreadsheet')
    }
  }

  const updateParameter = async (field: string, value: number | null) => {
    if (!parameters) return

    try {
      const tableName = `parameters_${currentVersion}`
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
      
      // Recalculate totals
      const totals: { [key: string]: number } = {}
      kostenItems.forEach((item) => {
        const categorie = item.categorie
        const totaal = Number(item.totaal) || calculateItemTotal(item, updatedParams)
        totals[categorie] = (totals[categorie] || 0) + totaal
      })
      const categoryArray = Object.entries(totals).map(([categorie, totaal]) => ({
        categorie,
        totaal,
      }))
      setCategoryTotals(categoryArray)
    } catch (error) {
      console.error('Error updating parameter:', error)
    }
  }

  useEffect(() => {
    loadAllData()
  }, [currentVersion])

  return (
    <div className="p-8 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="uppercase text-xs font-semibold tracking-[0.25em] text-primary">
            Kostenraming
          </p>
          <h1 className="text-[#111418] dark:text-white text-4xl font-black leading-tight tracking-[-0.033em]">
            KSA Buitenlands Kamp
          </h1>
          <p className="text-[#617589] dark:text-gray-400 text-sm max-w-2xl">
            Interactief overzicht voor kampkosten. Gebruik de tabbladen om dashboards, kosten,
            planning, parameters en formules te bekijken.
          </p>
        </div>
        <button 
          onClick={openVersionSelector}
          className="flex items-center gap-2 rounded-lg bg-primary text-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          <span className="material-symbols-outlined text-white text-lg">
            {currentVersion === 'concrete' ? 'verified' : currentVersion === 'sandbox' ? 'construction' : 'science'}
          </span>
          <span>
            {currentVersion === 'concrete' ? VERSIONS.CONCRETE.name : currentVersion === 'sandbox' ? VERSIONS.SANDBOX.name : VERSIONS.SANDBOX2.name}
          </span>
        </button>
      </div>


      {loading ? (
        <div className="text-center py-12">
          <p className="text-[#617589] dark:text-gray-400">Data laden...</p>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <StatsCards
            kostenItems={kostenItems}
            parameters={parameters}
            calculateItemTotal={calculateItemTotal}
          />

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Parameters Section - Verplaatst naar hier */}
            <div className="rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-background-dark p-6">
              <h2 className="text-lg font-semibold text-[#111418] dark:text-white mb-4">Aanpassingen</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Rij 1: Aantal gastjes + Vraagprijs gastje */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#617589] dark:text-gray-400">
                    Aantal gastjes
                  </label>
                  <input
                    className="mt-2 w-full rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-background-light dark:bg-background-dark px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    type="number"
                    value={parameters?.aantal_gastjes || 37}
                    onChange={(e) => updateParameter('aantal_gastjes', e.target.value ? Number(e.target.value) : null)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#617589] dark:text-gray-400">
                    Vraagprijs gastje (€)
                  </label>
                  <input
                    className="mt-2 w-full rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-background-light dark:bg-background-dark px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    type="number"
                    step="0.01"
                    value={parameters?.vraagprijs_gastje || 350}
                    onChange={(e) => updateParameter('vraagprijs_gastje', e.target.value ? Number(e.target.value) : null)}
                  />
                </div>
                {/* Rij 2: Aantal leiders + Vraagprijs leider */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#617589] dark:text-gray-400">
                    Aantal leiders
                  </label>
                  <input
                    className="mt-2 w-full rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-background-light dark:bg-background-dark px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    type="number"
                    value={parameters?.aantal_leiders || 7}
                    onChange={(e) => updateParameter('aantal_leiders', e.target.value ? Number(e.target.value) : null)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#617589] dark:text-gray-400">
                    Vraagprijs leider (€)
                  </label>
                  <input
                    className="mt-2 w-full rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-background-light dark:bg-background-dark px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    type="number"
                    step="0.01"
                    value={parameters?.vraagprijs_leider || 150}
                    onChange={(e) => updateParameter('vraagprijs_leider', e.target.value ? Number(e.target.value) : null)}
                  />
                </div>
                {/* Rij 3: Bufferpercentage */}
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#617589] dark:text-gray-400">
                    Bufferpercentage (%)
                  </label>
                  <input
                    className="mt-2 w-full rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-background-light dark:bg-background-dark px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    type="number"
                    step="0.1"
                    value={parameters?.buffer_percentage || 5}
                    onChange={(e) => updateParameter('buffer_percentage', e.target.value ? Number(e.target.value) : null)}
                  />
                </div>
              </div>
            </div>

            {/* Kostenverdeling per categorie - Staafdiagram */}
            <div className="rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-background-dark p-6">
              <h2 className="text-lg font-semibold text-[#111418] dark:text-white mb-4">
                Kosten per categorie
              </h2>
              <CategoryBarChart categoryTotals={categoryTotals} />
            </div>
          </div>

          {/* Kostenanalyse per aantal gastjes */}
          <div className="rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-background-dark p-6">
            <h2 className="text-lg font-semibold text-[#111418] dark:text-white mb-4">
              Kostenanalyse per aantal gastjes
            </h2>
            <div className="flex gap-6">
              <CostAnalysisChart
                kostenItems={kostenItems}
                parameters={parameters}
                planningData={planningData}
                calculateItemTotal={calculateItemTotal}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// Stats Cards Component
function StatsCards({
  kostenItems,
  parameters,
  calculateItemTotal,
}: {
  kostenItems: KostenItem[]
  parameters: Parameters | null
  calculateItemTotal: (item: KostenItem, params: Parameters | null) => number
}) {
  const formatEuro = (value: number, withSymbol = true): string => {
    const formatted = Math.round(value).toLocaleString('nl-BE')
    return withSymbol ? `€${formatted}` : formatted
  }

  const aantalGastjes = parameters?.aantal_gastjes || 0
  const aantalLeiders = parameters?.aantal_leiders || 0
  const totaalPersonen = aantalGastjes + aantalLeiders

  // Calculate fixed costs (groep items, bus, auto)
  const fixedCosts = kostenItems.reduce((sum, item) => {
    if (item.eenheid === 'groep') {
      return sum + (Number(item.prijs_per_persoon) || 0)
    }
    if (item.automatisch && (item.subcategorie === 'Bus huur' || item.subcategorie === 'Auto koks')) {
      return sum + (Number(item.totaal) || 0)
    }
    return sum
  }, 0)

  // Calculate variable costs per person type (using same logic as calculateItemTotal)
  const variableCostsGastjes = kostenItems.reduce((sum, item) => {
    if (item.eenheid === 'groep') return sum
    if (item.automatisch && (item.subcategorie === 'Bus huur' || item.subcategorie === 'Auto koks')) return sum
    
    const aantal = item.aantal || 1
    
    if (item.splitsing === 'gastjes_leiders') {
      return sum + (Number(item.prijs_per_persoon_gastjes) || 0) * aantalGastjes * aantal
    } else if (item.splitsing === 'gastjes') {
      // Alleen gastjes betalen
      if (item.totaal) {
        return sum + Number(item.totaal)
      }
      if (item.eenheid === 'persoon') {
        return sum + (Number(item.prijs_per_persoon_gastjes) || 0) * aantalGastjes
      } else {
        return sum + (Number(item.prijs_per_persoon_gastjes) || 0) * aantalGastjes * aantal
      }
    } else if (item.splitsing === 'leiders') {
      // Leiders betalen, gastjes niet
      return sum
    } else {
      // iedereen
      if (item.prijs_per_persoon_gastjes && !item.prijs_per_persoon) {
        // Items like Speciale Activiteiten where only gastjes pay
        return sum + (Number(item.prijs_per_persoon_gastjes) || 0) * aantalGastjes * aantal
      }
      if (item.eenheid === 'persoon') {
        return sum + (Number(item.prijs_per_persoon) || 0) * aantalGastjes
      } else {
        // For automatic maaltijden, use parameters
        if (item.automatisch && item.subcategorie === 'Maaltijden' && parameters?.eten_prijs_per_dag && parameters?.aantal_dagen_eten) {
          return sum + parameters.eten_prijs_per_dag * parameters.aantal_dagen_eten * aantalGastjes
        }
        // For other items with eenheid != 'persoon' and != 'groep', use same logic as calculateItemTotal
        // But only count gastjes, not leiders
        return sum + (Number(item.prijs_per_persoon) || 0) * aantalGastjes * aantal
      }
    }
  }, 0)

  const variableCostsLeiders = kostenItems.reduce((sum, item) => {
    if (item.eenheid === 'groep') return sum
    if (item.automatisch && (item.subcategorie === 'Bus huur' || item.subcategorie === 'Auto koks')) return sum
    
    const aantal = item.aantal || 1
    
    if (item.splitsing === 'gastjes_leiders') {
      return sum + (Number(item.prijs_per_persoon_leiders) || 0) * aantalLeiders * aantal
    } else if (item.splitsing === 'gastjes') {
      // Alleen gastjes betalen, leiders niet
      return sum
    } else if (item.splitsing === 'leiders') {
      // Alleen leiders betalen
      if (item.totaal) {
        return sum + Number(item.totaal)
      }
      if (item.eenheid === 'persoon') {
        return sum + (Number(item.prijs_per_persoon_leiders) || 0) * aantalLeiders
      } else {
        return sum + (Number(item.prijs_per_persoon_leiders) || 0) * aantalLeiders * aantal
      }
    } else {
      // iedereen
      if (item.prijs_per_persoon_gastjes && !item.prijs_per_persoon) {
        // Leiders betalen niet voor deze items
        return sum
      }
      if (item.eenheid === 'persoon') {
        return sum + (Number(item.prijs_per_persoon) || 0) * aantalLeiders
      } else {
        // For automatic maaltijden, use parameters
        if (item.automatisch && item.subcategorie === 'Maaltijden' && parameters?.eten_prijs_per_dag && parameters?.aantal_dagen_eten) {
          return sum + parameters.eten_prijs_per_dag * parameters.aantal_dagen_eten * aantalLeiders
        }
        // For other items with eenheid != 'persoon' and != 'groep', use same logic as calculateItemTotal
        // But only count leiders
        return sum + (Number(item.prijs_per_persoon) || 0) * aantalLeiders * aantal
      }
    }
  }, 0)

  // Distribute fixed costs based on percentage of group
  const percentageGastjes = totaalPersonen > 0 ? aantalGastjes / totaalPersonen : 0
  const percentageLeiders = totaalPersonen > 0 ? aantalLeiders / totaalPersonen : 0
  
  const fixedCostsGastjes = fixedCosts * percentageGastjes
  const fixedCostsLeiders = fixedCosts * percentageLeiders

  // Total costs per person type
  const totaleKostenGastjes = variableCostsGastjes + fixedCostsGastjes
  const totaleKostenLeiders = variableCostsLeiders + fixedCostsLeiders

  // Total costs (should equal fixedCosts + variableCostsGastjes + variableCostsLeiders)
  const totaleKosten = fixedCosts + variableCostsGastjes + variableCostsLeiders

  // Cost per person type (with proportional fixed costs + variable costs)
  const kostPerGastje = aantalGastjes > 0 ? totaleKostenGastjes / aantalGastjes : 0
  const kostPerLeider = aantalLeiders > 0 ? totaleKostenLeiders / aantalLeiders : 0

  // Kostprijs per reiziger (totaalprijs gedeeld door aantal reizigers)
  const kostprijsPerReiziger = totaalPersonen > 0 ? totaleKosten / totaalPersonen : 0

  const vraagprijsGastje = Number(parameters?.vraagprijs_gastje) || 0
  const vraagprijsLeider = Number(parameters?.vraagprijs_leider) || 0
  const totaleOpbrengst = vraagprijsGastje * aantalGastjes + vraagprijsLeider * aantalLeiders

  const winstVerlies = totaleOpbrengst - totaleKosten
  const margePercentage = totaleOpbrengst > 0 ? (winstVerlies / totaleOpbrengst) * 100 : 0
  const verliesPerGastje = aantalGastjes > 0 ? Math.abs(winstVerlies) / aantalGastjes : 0
  
  // Kostprijs per gastje na bijdrage leiders = (totale kosten - totale bijdrage leiders) / aantal gastjes
  const totaleBijdrageLeiders = vraagprijsLeider * aantalLeiders
  const kostprijsPerGastjeNaBijdrage = aantalGastjes > 0 ? (totaleKosten - totaleBijdrageLeiders) / aantalGastjes : 0
  
  // Marginale kost per gastje (extra kost voor één extra gastje)
  // Bereken variabele kosten voor huidig aantal + 1 gastje
  const variableCostsNext = kostenItems.reduce((sum, item) => {
    if (item.eenheid === 'groep') return sum
    if (item.automatisch && (item.subcategorie === 'Bus huur' || item.subcategorie === 'Auto koks')) return sum
    
    const aantal = item.aantal || 1
    const totaalPersonenNext = (aantalGastjes + 1) + aantalLeiders
    
    if (item.splitsing === 'gastjes_leiders') {
      const totaalGastjes = (Number(item.prijs_per_persoon_gastjes) || 0) * (aantalGastjes + 1) * aantal
      const totaalLeiders = (Number(item.prijs_per_persoon_leiders) || 0) * aantalLeiders * aantal
      return sum + totaalGastjes + totaalLeiders
    } else {
      if (item.prijs_per_persoon_gastjes && !item.prijs_per_persoon) {
        return sum + (Number(item.prijs_per_persoon_gastjes) || 0) * (aantalGastjes + 1) * aantal
      }
      if (item.eenheid === 'persoon') {
        return sum + (Number(item.prijs_per_persoon) || 0) * totaalPersonenNext
      } else {
        if (item.automatisch && item.subcategorie === 'Maaltijden' && parameters?.eten_prijs_per_dag && parameters?.aantal_dagen_eten) {
          return sum + parameters.eten_prijs_per_dag * parameters.aantal_dagen_eten * totaalPersonenNext
        }
        return sum + (Number(item.prijs_per_persoon) || 0) * totaalPersonenNext * aantal
      }
    }
  }, 0)
  const marginaleKost = variableCostsNext - (variableCostsGastjes + variableCostsLeiders)

  // Calculate low/high estimates (simplified - using buffer)
  const bufferPercentage = Number(parameters?.buffer_percentage) || 0
  const laag = totaleKosten
  const hoog = totaleKosten * (1 + bufferPercentage / 100)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
      <div className="rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-background-dark p-6">
        <p className="text-sm font-medium text-[#617589] dark:text-gray-400 uppercase tracking-[0.1em]">
          Totale kosten
        </p>
        <p className="mt-2 text-2xl font-bold text-[#111418] dark:text-white">{formatEuro(totaleKosten)}</p>
        <p className="text-xs text-[#617589] dark:text-gray-500 mt-1">
          Laag: {formatEuro(laag)} | Hoog: {formatEuro(hoog)}
        </p>
      </div>
      <div className="rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-background-dark p-6">
        <p className="text-sm font-medium text-[#617589] dark:text-gray-400 uppercase tracking-[0.1em]">
          Kostprijs per reiziger
        </p>
        <p className="mt-2 text-2xl font-bold text-[#111418] dark:text-white">{formatEuro(kostprijsPerReiziger)}</p>
        <p className="text-xs text-[#617589] dark:text-gray-500 mt-1">Gemiddelde kost per persoon</p>
      </div>
      <div className="rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-background-dark p-6">
        <p className="text-sm font-medium text-[#617589] dark:text-gray-400 uppercase tracking-[0.1em]">
          Totale opbrengst
        </p>
        <p className="mt-2 text-2xl font-bold text-[#111418] dark:text-white">{formatEuro(totaleOpbrengst)}</p>
        <p className="text-xs text-[#617589] dark:text-gray-500 mt-1">Inkomsten uit vraagprijzen</p>
      </div>
      <div className="rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-background-dark p-6">
        <p className="text-sm font-medium text-[#617589] dark:text-gray-400 uppercase tracking-[0.1em]">
          Winst / verlies
        </p>
        <p
          className={`mt-2 text-2xl font-bold ${
            winstVerlies >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          }`}
        >
          {formatEuro(winstVerlies)}
        </p>
        <p className="text-xs text-[#617589] dark:text-gray-500 mt-1">
          {margePercentage >= 0 ? '+' : ''}
          {margePercentage.toFixed(1)}% marge
        </p>
      </div>
      <div className="rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-background-dark p-6">
        <p className="text-sm font-medium text-[#617589] dark:text-gray-400 uppercase tracking-[0.1em]">
          Per gastje
        </p>
        <div className="mt-2 space-y-3">
          <div>
            <span className="text-xs text-[#617589] dark:text-gray-400 block mb-0.5">Kostprijs na bijdrage leiders:</span>
            <p className="text-xl font-bold text-[#111418] dark:text-white">{formatEuro(kostprijsPerGastjeNaBijdrage)}</p>
          </div>
          <div className="flex justify-between items-baseline">
            <div>
              <span className="text-xs text-[#617589] dark:text-gray-400 block mb-0.5">Marginale kost:</span>
              <p className="text-lg font-bold text-[#8b5cf6] dark:text-purple-400">{formatEuro(marginaleKost)}</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-[#617589] dark:text-gray-400 block mb-0.5">Verlies:</span>
              <p className="text-lg font-semibold text-red-600 dark:text-red-400">{formatEuro(verliesPerGastje)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Pie Chart Component
function CategoryPieChart({ categoryTotals }: { categoryTotals: CategoryTotal[] }) {
  const colors = ['#137fec', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4']
  const total = categoryTotals.reduce((sum, item) => sum + item.totaal, 0)

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-[#617589] dark:text-gray-400">
        Geen data beschikbaar
      </div>
    )
  }

  let currentAngle = -90 // Start at top
  const size = 200
  const radius = size / 2
  const center = size / 2

  return (
    <div className="flex flex-col items-center gap-6">
      <svg width={size} height={size} className="transform -rotate-90">
        {categoryTotals.map((item, index) => {
          const percentage = (item.totaal / total) * 100
          const angle = (percentage / 100) * 360
          const startAngle = currentAngle
          const endAngle = currentAngle + angle
          currentAngle = endAngle

          const x1 = center + radius * Math.cos((startAngle * Math.PI) / 180)
          const y1 = center + radius * Math.sin((startAngle * Math.PI) / 180)
          const x2 = center + radius * Math.cos((endAngle * Math.PI) / 180)
          const y2 = center + radius * Math.sin((endAngle * Math.PI) / 180)
          const largeArcFlag = angle > 180 ? 1 : 0

          return (
            <path
              key={item.categorie}
              d={`M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
              fill={colors[index % colors.length]}
              className="hover:opacity-80 transition-opacity"
            />
          )
        })}
      </svg>
      <div className="grid grid-cols-2 gap-3 w-full">
        {categoryTotals.map((item, index) => {
          const percentage = (item.totaal / total) * 100
          return (
            <div key={item.categorie} className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: colors[index % colors.length] }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#111418] dark:text-white truncate">
                  {item.categorie}
                </p>
                <p className="text-xs text-[#617589] dark:text-gray-400">
                  {percentage.toFixed(1)}% • €{Math.round(item.totaal).toLocaleString('nl-BE')}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Bar Chart Component
function CategoryBarChart({ categoryTotals }: { categoryTotals: CategoryTotal[] }) {
  const colors = ['#137fec', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4']
  const maxValue = Math.max(...categoryTotals.map((item) => item.totaal), 1)
  const barHeight = 40
  const chartHeight = categoryTotals.length * (barHeight + 12)

  if (categoryTotals.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-[#617589] dark:text-gray-400">
        Geen data beschikbaar
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {categoryTotals
        .sort((a, b) => b.totaal - a.totaal)
        .map((item, index) => {
          const width = (item.totaal / maxValue) * 100
          return (
            <div key={item.categorie} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-[#111418] dark:text-white">{item.categorie}</span>
                <span className="text-[#617589] dark:text-gray-400">
                  €{Math.round(item.totaal).toLocaleString('nl-BE')}
                </span>
              </div>
              <div className="relative h-3 rounded-full bg-background-light dark:bg-gray-800 overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${width}%`,
                    backgroundColor: colors[index % colors.length],
                  }}
                />
              </div>
            </div>
          )
        })}
    </div>
  )
}

// Cost Analysis Chart Component
function CostAnalysisChart({
  kostenItems,
  parameters,
  planningData,
  calculateItemTotal,
}: {
  kostenItems: KostenItem[]
  parameters: Parameters | null
  planningData: PlanningDag[]
  calculateItemTotal: (item: KostenItem, params: Parameters | null) => number
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [selectedGastjes, setSelectedGastjes] = useState<number>(parameters?.aantal_gastjes || 37)

  // Calculate costs for each number of gastjes (0-37)
  const dataPoints: any[] = []
  const aantalLeiders = parameters?.aantal_leiders || 7
  const aantalBusdagen = planningData.length
  const totaalKm = planningData.reduce((sum, dag) => sum + (dag.km || 0), 0)

  // Calculate base costs that don't depend on aantal_gastjes (fixed costs)
  const calculateFixedCosts = (items: KostenItem[], params: Parameters | null): number => {
    return items.reduce((sum, item) => {
      // Fixed costs: groep eenheid, automatische bus/auto
      if (item.eenheid === 'groep') {
        return sum + (Number(item.prijs_per_persoon) || 0)
      }
      
      // Bus and auto are fixed costs (don't depend on aantal_gastjes)
      if (item.automatisch && (item.subcategorie === 'Bus huur' || item.subcategorie === 'Auto koks')) {
        if (item.subcategorie === 'Bus huur' && params?.bus_dagprijs && params?.bus_daglimiet && params?.bus_extra_km) {
          let busKosten = params.bus_dagprijs * aantalBusdagen
          const maxKmZonderExtra = params.bus_daglimiet * aantalBusdagen
          if (totaalKm > maxKmZonderExtra) {
            const extraKm = totaalKm - maxKmZonderExtra
            busKosten += extraKm * params.bus_extra_km
          }
          return sum + busKosten
        }
        if (item.subcategorie === 'Auto koks' && params?.auto_brandstof && params?.auto_afstand) {
          return sum + params.auto_afstand * params.auto_brandstof
        }
      }
      
      return sum
    }, 0)
  }

  // Calculate variable costs that depend on aantal_gastjes
  const calculateVariableCosts = (items: KostenItem[], aantalGastjes: number, params: Parameters | null): number => {
    const totaalPersonen = aantalGastjes + aantalLeiders
    
    return items.reduce((sum, item) => {
      // Skip fixed costs
      if (item.eenheid === 'groep') return sum
      if (item.automatisch && (item.subcategorie === 'Bus huur' || item.subcategorie === 'Auto koks')) {
        return sum
      }

      // Variable costs based on aantal personen
      if (item.splitsing === 'gastjes_leiders') {
        const totaalGastjes = (Number(item.prijs_per_persoon_gastjes) || 0) * aantalGastjes * (item.aantal || 1)
        const totaalLeiders = (Number(item.prijs_per_persoon_leiders) || 0) * aantalLeiders * (item.aantal || 1)
        return sum + totaalGastjes + totaalLeiders
      } else if (item.splitsing === 'gastjes') {
        // Alleen gastjes betalen
        if (item.totaal) {
          return sum + Number(item.totaal)
        }
        if (item.eenheid === 'persoon') {
          return sum + (Number(item.prijs_per_persoon_gastjes) || 0) * aantalGastjes
        } else {
          return sum + (Number(item.prijs_per_persoon_gastjes) || 0) * aantalGastjes * (item.aantal || 1)
        }
      } else if (item.splitsing === 'leiders') {
        // Alleen leiders betalen
        if (item.totaal) {
          return sum + Number(item.totaal)
        }
        if (item.eenheid === 'persoon') {
          return sum + (Number(item.prijs_per_persoon_leiders) || 0) * aantalLeiders
        } else {
          return sum + (Number(item.prijs_per_persoon_leiders) || 0) * aantalLeiders * (item.aantal || 1)
        }
      } else {
        // iedereen
        // Check if item has prijs_per_persoon_gastjes but no prijs_per_persoon (like Speciale Activiteiten)
        if (item.prijs_per_persoon_gastjes && !item.prijs_per_persoon) {
          // Only gastjes pay for this, leiders don't
          return sum + (Number(item.prijs_per_persoon_gastjes) || 0) * aantalGastjes * (item.aantal || 1)
        }
        
        if (item.eenheid === 'persoon') {
          return sum + (Number(item.prijs_per_persoon) || 0) * totaalPersonen
        } else {
          // For automatic maaltijden
          if (item.automatisch && item.subcategorie === 'Maaltijden' && params?.eten_prijs_per_dag && params?.aantal_dagen_eten) {
            return sum + params.eten_prijs_per_dag * params.aantal_dagen_eten * totaalPersonen
          }
          return sum + (Number(item.prijs_per_persoon) || 0) * totaalPersonen * (item.aantal || 1)
        }
      }
    }, 0)
  }

  // Calculate fixed costs once (same for all aantal_gastjes)
  const fixedCosts = calculateFixedCosts(kostenItems, parameters)
  const vraagprijsGastje = Number(parameters?.vraagprijs_gastje) || 0
  const vraagprijsLeider = Number(parameters?.vraagprijs_leider) || 0

  for (let aantalGastjes = 0; aantalGastjes <= 37; aantalGastjes++) {
    // Variable costs depend on aantal_gastjes
    const variableCosts = calculateVariableCosts(kostenItems, aantalGastjes, parameters)
    const totaleKosten = fixedCosts + variableCosts

    // Calculate revenue and loss
    const totaleOpbrengst = vraagprijsGastje * aantalGastjes + vraagprijsLeider * aantalLeiders
    const totaalVerlies = totaleKosten - totaleOpbrengst // Positief = verlies, negatief = winst

    // Kostprijs per gastje na bijdrage leiders
    const totaleBijdrageLeiders = vraagprijsLeider * aantalLeiders
    // Bij 0 gastjes: weergave 0 of totale kosten (voor grafiek continuïteit misschien beter 0 of null, maar hier houden we het simpel)
    const kostPerGastje = aantalGastjes > 0 ? (totaleKosten - totaleBijdrageLeiders) / aantalGastjes : 0

    // Calculate marginal cost (extra cost for one more gastje)
    // This is the difference in variable costs between current and next gastje
    let marginaleKost = 0
    if (aantalGastjes < 37) {
      const variableCostsNext = calculateVariableCosts(kostenItems, aantalGastjes + 1, parameters)
      marginaleKost = variableCostsNext - variableCosts
    } else {
      // For last gastje, use same calculation as previous
      const variableCostsPrev = calculateVariableCosts(kostenItems, aantalGastjes - 1, parameters)
      marginaleKost = variableCosts - variableCostsPrev
    }

    dataPoints.push({
      aantalGastjes,
      totaleKosten,
      kostPerGastje,
      totaleOpbrengst,
      totaalVerlies, // Nu positief = verlies
      marginaleKost,
    })
  }

  // Find max values for scaling
  const maxKosten = Math.max(...dataPoints.map((d) => d.totaleKosten), 1)
  const maxKostPerGastje = Math.max(...dataPoints.map((d) => d.kostPerGastje), 1)
  const maxVerlies = Math.max(...dataPoints.map((d) => d.totaalVerlies), 1) // Verlies is nu altijd positief
  const maxMarginaleKost = Math.max(...dataPoints.map((d) => d.marginaleKost), 1)
  
  // Fixed cap at 13k as requested
  const maxForChart = 13000
  const minForChart = 0 
  const rangeForChart = maxForChart - minForChart
  
  const chartWidth = 800
  const chartHeight = 400
  const padding = { top: 20, right: 40, bottom: 40, left: 60 }
  const graphWidth = chartWidth - padding.left - padding.right
  const graphHeight = chartHeight - padding.top - padding.bottom

  // Generate path for a line (handles negative values)
  const generatePath = (data: typeof dataPoints, valueKey: keyof typeof dataPoints[0]) => {
    const points = data.map((point, index) => {
      const x = padding.left + (index / (data.length - 1)) * graphWidth
      const value = Number(point[valueKey]) || 0
      // Normalize value to 0-1 range
      const normalizedValue = (value - minForChart) / rangeForChart
      const y = padding.top + graphHeight - normalizedValue * graphHeight
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
    })
    return points.join(' ')
  }

  const totaleKostenPath = generatePath(dataPoints, 'totaleKosten')
  const kostPerGastjePath = generatePath(dataPoints, 'kostPerGastje')
  const totaalVerliesPath = generatePath(dataPoints, 'totaalVerlies')
  const marginaleKostPath = generatePath(dataPoints, 'marginaleKost')

  // Y-axis labels (every 2000)
  const yAxisLabels = []
  for (let val = 0; val <= maxForChart; val += 2000) {
    yAxisLabels.push(val)
  }

  // X-axis labels (show every 5th value)
  const xAxisLabels = []
  for (let i = 0; i <= 37; i += 5) {
    xAxisLabels.push(i)
  }

  return (
    <div className="flex gap-6">
      <div className="relative flex-1">
        <svg width={chartWidth} height={chartHeight} className="overflow-visible">
        <defs>
          <clipPath id="chart-area">
            <rect x={padding.left} y={padding.top} width={graphWidth} height={graphHeight} />
          </clipPath>
        </defs>

        {/* Grid lines */}
        {yAxisLabels.map((value, index) => {
          const normalizedValue = (value - minForChart) / rangeForChart
          const y = padding.top + graphHeight - normalizedValue * graphHeight
          return (
            <g key={index}>
              <line
                x1={padding.left}
                y1={y}
                x2={padding.left + graphWidth}
                y2={y}
                stroke="#e5e7eb"
                strokeWidth={1}
                strokeDasharray="2,2"
                className="dark:stroke-gray-700"
              />
              <text
                x={padding.left - 10}
                y={y + 4}
                textAnchor="end"
                className="text-xs fill-[#617589] dark:fill-gray-400"
              >
                €{Math.round(value).toLocaleString('nl-BE')}
              </text>
            </g>
          )
        })}

        {/* X-axis labels */}
        {xAxisLabels.map((value) => {
          const x = padding.left + (value / 37) * graphWidth
          return (
            <text
              key={value}
              x={x}
              y={chartHeight - padding.bottom + 20}
              textAnchor="middle"
              className="text-xs fill-[#617589] dark:fill-gray-400"
            >
              {value}
            </text>
          )
        })}

        {/* Axes */}
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={padding.top + graphHeight}
          stroke="#dbe0e6"
          strokeWidth={2}
          className="dark:stroke-gray-700"
        />
        <line
          x1={padding.left}
          y1={padding.top + graphHeight}
          x2={padding.left + graphWidth}
          y2={padding.top + graphHeight}
          stroke="#dbe0e6"
          strokeWidth={2}
          className="dark:stroke-gray-700"
        />

        {/* Axis labels */}
        <text
          x={chartWidth / 2}
          y={chartHeight - 5}
          textAnchor="middle"
          className="text-sm font-medium fill-[#617589] dark:fill-gray-400"
        >
          Aantal gastjes
        </text>
        <text
          x={15}
          y={chartHeight / 2}
          textAnchor="middle"
          transform={`rotate(-90, 15, ${chartHeight / 2})`}
          className="text-sm font-medium fill-[#617589] dark:fill-gray-400"
        >
          Kosten (€)
        </text>

        {/* Totale kosten line */}
        <path
          d={totaleKostenPath}
          fill="none"
          stroke="#137fec"
          strokeWidth={2}
          className="hover:stroke-[#0f6bc7]"
          clipPath="url(#chart-area)"
        />

        {/* Kost per gastje line */}
        <path
          d={kostPerGastjePath}
          fill="none"
          stroke="#10b981"
          strokeWidth={2}
          strokeDasharray="5,5"
          className="hover:stroke-[#0d9668]"
          clipPath="url(#chart-area)"
        />

        {/* Totaal verlies line */}
        <path
          d={totaalVerliesPath}
          fill="none"
          stroke="#ef4444"
          strokeWidth={2}
          strokeDasharray="3,3"
          className="hover:stroke-[#dc2626]"
          clipPath="url(#chart-area)"
        />

        {/* Marginale kost line */}
        <path
          d={marginaleKostPath}
          fill="none"
          stroke="#8b5cf6"
          strokeWidth={2}
          strokeDasharray="2,2"
          className="hover:stroke-[#7c3aed]"
          clipPath="url(#chart-area)"
        />

        {/* Hover indicator */}
        {hoveredIndex !== null && (
          <g>
            <line
              x1={padding.left + (hoveredIndex / 37) * graphWidth}
              y1={padding.top}
              x2={padding.left + (hoveredIndex / 37) * graphWidth}
              y2={padding.top + graphHeight}
              stroke="#ef4444"
              strokeWidth={1}
              strokeDasharray="3,3"
            />
            <circle
              cx={padding.left + (hoveredIndex / 37) * graphWidth}
              cy={
                padding.top +
                graphHeight -
                ((dataPoints[hoveredIndex].totaleKosten - minForChart) / rangeForChart) * graphHeight
              }
              r={4}
              fill="#137fec"
            />
            <circle
              cx={padding.left + (hoveredIndex / 37) * graphWidth}
              cy={
                padding.top +
                graphHeight -
                ((dataPoints[hoveredIndex].kostPerGastje - minForChart) / rangeForChart) * graphHeight
              }
              r={4}
              fill="#10b981"
            />
            <circle
              cx={padding.left + (hoveredIndex / 37) * graphWidth}
              cy={
                padding.top +
                graphHeight -
                ((dataPoints[hoveredIndex].totaalVerlies - minForChart) / rangeForChart) * graphHeight
              }
              r={4}
              fill="#ef4444"
            />
            <circle
              cx={padding.left + (hoveredIndex / 37) * graphWidth}
              cy={
                padding.top +
                graphHeight -
                ((dataPoints[hoveredIndex].marginaleKost - minForChart) / rangeForChart) * graphHeight
              }
              r={4}
              fill="#8b5cf6"
            />
            {/* Tooltip */}
            <rect
              x={padding.left + (hoveredIndex / 37) * graphWidth + 10}
              y={padding.top + 10}
              width={200}
              height={140}
              fill="white"
              stroke="#dbe0e6"
              strokeWidth={1}
              rx={4}
              className="dark:fill-background-dark dark:stroke-gray-700"
            />
            <text
              x={padding.left + (hoveredIndex / 37) * graphWidth + 20}
              y={padding.top + 30}
              className="text-xs font-semibold fill-[#111418] dark:fill-white"
            >
              {dataPoints[hoveredIndex].aantalGastjes} gastjes
            </text>
            <text
              x={padding.left + (hoveredIndex / 37) * graphWidth + 20}
              y={padding.top + 50}
              className="text-xs fill-[#617589] dark:fill-gray-400"
            >
              Totaal kosten: €{Math.round(dataPoints[hoveredIndex].totaleKosten).toLocaleString('nl-BE')}
            </text>
            <text
              x={padding.left + (hoveredIndex / 37) * graphWidth + 20}
              y={padding.top + 70}
              className="text-xs fill-[#617589] dark:fill-gray-400"
            >
              Per gastje: €{Math.round(dataPoints[hoveredIndex].kostPerGastje).toLocaleString('nl-BE')}
            </text>
            <text
              x={padding.left + (hoveredIndex / 37) * graphWidth + 20}
              y={padding.top + 90}
              className="text-xs fill-red-600 dark:fill-red-400"
            >
              Verlies: €{Math.round(dataPoints[hoveredIndex].totaalVerlies).toLocaleString('nl-BE')}
            </text>
            <text
              x={padding.left + (hoveredIndex / 37) * graphWidth + 20}
              y={padding.top + 110}
              className="text-xs fill-[#617589] dark:fill-gray-400"
            >
              Opbrengst: €{Math.round(dataPoints[hoveredIndex].totaleOpbrengst).toLocaleString('nl-BE')}
            </text>
            <text
              x={padding.left + (hoveredIndex / 37) * graphWidth + 20}
              y={padding.top + 130}
              className="text-xs fill-[#8b5cf6] dark:fill-purple-400"
            >
              Marginale kost: €{Math.round(dataPoints[hoveredIndex].marginaleKost).toLocaleString('nl-BE')}
            </text>
          </g>
        )}

        {/* Invisible hover area */}
        {dataPoints.map((_, index) => {
          const x = padding.left + (index / (dataPoints.length - 1)) * graphWidth
          const width = graphWidth / (dataPoints.length - 1)
          return (
            <rect
              key={index}
              x={x - width / 2}
              y={padding.top}
              width={width}
              height={graphHeight}
              fill="transparent"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              style={{ cursor: 'crosshair' }}
            />
          )
        })}
      </svg>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-[#137fec]"></div>
            <span className="text-xs text-[#617589] dark:text-gray-400">Totale kosten</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-[#10b981] border-dashed border-t-2"></div>
            <span className="text-xs text-[#617589] dark:text-gray-400">Kostprijs per gastje na bijdrage leiders</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-[#ef4444] border-dashed border-t-2" style={{ borderDashArray: '3,3' }}></div>
            <span className="text-xs text-[#617589] dark:text-gray-400">Totaal verlies/winst</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-[#8b5cf6] border-dashed border-t-2" style={{ borderDashArray: '2,2' }}></div>
            <span className="text-xs text-[#617589] dark:text-gray-400">Marginale kost per gastje</span>
          </div>
        </div>
      </div>
      
      {/* Widget */}
      <CostAnalysisWidget
        dataPoints={dataPoints}
        selectedGastjes={selectedGastjes}
        setSelectedGastjes={setSelectedGastjes}
        parameters={parameters}
      />
    </div>
  )
}

// Interactive Widget Component
function CostAnalysisWidget({
  dataPoints,
  selectedGastjes,
  setSelectedGastjes,
  parameters,
}: {
  dataPoints: Array<{
    aantalGastjes: number
    totaleKosten: number
    kostPerGastje: number
    totaleOpbrengst: number
    totaalVerlies: number
    marginaleKost: number
  }>
  selectedGastjes: number
  setSelectedGastjes: (value: number) => void
  parameters: Parameters | null
}) {
  const formatEuro = (value: number): string => {
    return `€${Math.round(value).toLocaleString('nl-BE')}`
  }

  const selectedData = dataPoints.find((d) => d.aantalGastjes === selectedGastjes) || dataPoints[0]

  return (
    <div className="w-80 rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-background-dark p-6">
      <h3 className="text-sm font-semibold text-[#111418] dark:text-white mb-4">Aantal gastjes</h3>
      
      {/* Slider */}
      <div className="mb-6">
        <input
          type="range"
          min="0"
          max="37"
          value={selectedGastjes}
          onChange={(e) => setSelectedGastjes(Number(e.target.value))}
          className="w-full h-2 bg-background-light dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
        />
        <div className="flex justify-between text-xs text-[#617589] dark:text-gray-400 mt-1">
          <span>0</span>
          <span className="font-semibold text-primary">{selectedGastjes}</span>
          <span>37</span>
        </div>
      </div>

      {/* Statistics */}
      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#617589] dark:text-gray-400 mb-1">
            Marginale kost per gastje
          </p>
          <p className="text-xl font-bold text-[#8b5cf6] dark:text-purple-400">
            {formatEuro(selectedData.marginaleKost)}
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#617589] dark:text-gray-400 mb-1">
            Totale kosten
          </p>
          <p className="text-xl font-bold text-[#111418] dark:text-white">
            {formatEuro(selectedData.totaleKosten)}
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#617589] dark:text-gray-400 mb-1">
            Kostprijs per gastje na bijdrage leiders
          </p>
          <p className="text-xl font-bold text-[#111418] dark:text-white">
            {formatEuro(selectedData.kostPerGastje)}
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#617589] dark:text-gray-400 mb-1">
            Totale opbrengst
          </p>
          <p className="text-xl font-bold text-[#111418] dark:text-white">
            {formatEuro(selectedData.totaleOpbrengst)}
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#617589] dark:text-gray-400 mb-1">
            Totaal verlies
          </p>
          <p className="text-xl font-bold text-red-600 dark:text-red-400">
            {formatEuro(selectedData.totaalVerlies)}
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#617589] dark:text-gray-400 mb-1">
            Verlies per gastje
          </p>
          <p className="text-lg font-semibold text-red-600 dark:text-red-400">
            {selectedGastjes > 0 ? formatEuro(selectedData.totaalVerlies / selectedGastjes) : '—'}
          </p>
        </div>
      </div>
    </div>
  )
}

