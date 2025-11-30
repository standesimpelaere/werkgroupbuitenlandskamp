import { Link, useLocation } from 'react-router-dom'
import { useVersion, VERSIONS } from '../context/VersionContext'
import { useState } from 'react'

interface SidebarProps {
  onClose?: () => void
}

export default function Sidebar({ onClose }: SidebarProps) {
  const location = useLocation()
  const { currentVersion, pushSandboxToConcrete, pushSandbox2ToSandbox, getKostenItems, getParameters, openVersionSelector } = useVersion()
  const [showPushConfirm, setShowPushConfirm] = useState(false)
  const [showHandleiding, setShowHandleiding] = useState(false)

  const topNavItems = [
    { path: '/', icon: 'dashboard', label: 'Dashboard' },
    { path: '/werkgroep', icon: 'group', label: 'To-do Werkgroep' },
    { path: '/prioriteiten', icon: 'priority_high', label: "Huidige Priority's uit Vergadering" },
    { path: '/notities', icon: 'note', label: 'Notities' },
  ]

  const mainNavItems = [
    { path: '/kosten', icon: 'receipt_long', label: 'Kosten' },
    { path: '/accommodaties', icon: 'hotel', label: 'Accommodaties' },
    { path: '/planning', icon: 'event', label: 'Planning' },
    { path: '/gastjes', icon: 'groups', label: 'Gastjes' },
  ]

  const bottomNavItems = [
    { path: '/formules', icon: 'functions', label: 'Formules' },
  ]

  const isActive = (path: string) => location.pathname === path

  const getVersionName = () => {
    if (currentVersion === 'concrete') return VERSIONS.CONCRETE.name
    if (currentVersion === 'sandbox') return VERSIONS.SANDBOX.name
    if (currentVersion === 'sandbox2') return VERSIONS.SANDBOX2.name
    return currentVersion
  }

  const getVersionIcon = () => {
    if (currentVersion === 'concrete') return 'verified'
    if (currentVersion === 'sandbox') return 'construction'
    if (currentVersion === 'sandbox2') return 'science'
    return 'construction'
  }

  const handlePushClick = () => {
    setShowPushConfirm(true)
  }

  const handleConfirmPush = async () => {
    try {
      if (currentVersion === 'sandbox') {
        await pushSandboxToConcrete()
      } else if (currentVersion === 'sandbox2') {
        await pushSandbox2ToSandbox()
      }
      setShowPushConfirm(false)
      alert('✅ Succesvol doorgevoerd!')
    } catch (error) {
      console.error('Error pushing data:', error)
      alert('Fout bij doorvoeren van data')
    }
  }

  const handleDownloadSpreadsheet = async () => {
    try {
      // Get all data
      const kostenItems = await getKostenItems()
      const parameters = await getParameters()

      // Helper function to calculate item total
      const calculateItemTotal = (item: any): number => {
        if (item.totaal) return Number(item.totaal)

        const params = parameters as any
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

      // Calculate totals per category with proper calculation
      const categoryTotals: { [key: string]: number } = {}
      kostenItems.forEach((item: any) => {
        const categorie = item.categorie || 'Overige'
        const totaal = calculateItemTotal(item)
        categoryTotals[categorie] = (categoryTotals[categorie] || 0) + totaal
      })
      const totaleKosten = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0)

      // Create CSV content
      let csvContent = ''

      // Sheet 1: Samenvatting
      csvContent += '=== SAMENVATTING ===\n'
      csvContent += 'Item,Waarde\n'
      if (parameters && typeof parameters === 'object') {
        const params = parameters as any
        csvContent += `"Aantal gastjes","${params.aantal_gastjes || ''}"\n`
        csvContent += `"Aantal leiders","${params.aantal_leiders || ''}"\n`
        csvContent += `"Vraagprijs gastje (€)","${params.vraagprijs_gastje || ''}"\n`
        csvContent += `"Vraagprijs leider (€)","${params.vraagprijs_leider || ''}"\n`
        const totaleOpbrengst = (params.aantal_gastjes || 0) * (params.vraagprijs_gastje || 0) + (params.aantal_leiders || 0) * (params.vraagprijs_leider || 0)
        csvContent += `"Totale opbrengst (€)","${totaleOpbrengst.toFixed(2)}"\n`
      }
      csvContent += `"Totale kosten (€)","${totaleKosten.toFixed(2)}"\n`
      if (parameters && typeof parameters === 'object') {
        const params = parameters as any
        const totaleOpbrengst = (params.aantal_gastjes || 0) * (params.vraagprijs_gastje || 0) + (params.aantal_leiders || 0) * (params.vraagprijs_leider || 0)
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
      kostenItems.forEach((item: any) => {
        const escapeCSV = (val: any) => {
          if (val === null || val === undefined) return ''
          const str = String(val)
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`
          }
          return str
        }
        const berekendTotaal = calculateItemTotal(item)
        csvContent += `${escapeCSV(item.categorie)},${escapeCSV(item.subcategorie)},${escapeCSV(item.beschrijving)},${escapeCSV(item.eenheid)},${escapeCSV(item.splitsing)},${escapeCSV(item.prijs_per_persoon)},${escapeCSV(item.prijs_per_persoon_gastjes)},${escapeCSV(item.prijs_per_persoon_leiders)},${escapeCSV(item.aantal)},${berekendTotaal.toFixed(2)},${escapeCSV(item.opmerkingen)},${item.automatisch ? 'Ja' : 'Nee'}\n`
      })
      csvContent += '\n'

      // Sheet 4: Parameters
      csvContent += '=== PARAMETERS ===\n'
      csvContent += 'Parameter,Waarde\n'
      if (parameters && typeof parameters === 'object') {
        const params = parameters as any
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
        Object.entries(params).forEach(([key, value]) => {
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

  return (
    <aside className="flex w-64 flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-background-dark p-4 h-full overflow-y-auto">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <img 
            src="/logo.svg" 
            alt="KSA Logo" 
            className="w-10 h-10 rounded-full object-contain"
          />
          <div className="flex flex-col">
            <h1 className="text-[#111418] dark:text-gray-100 text-base font-medium leading-normal">
              KSA Buitenlands Kamp
            </h1>
            <p className="text-[#617589] dark:text-gray-400 text-sm font-normal leading-normal">
              Kostenraming 2025
            </p>
          </div>
        </div>
        
        {/* Versie indicator - subtiel zoals paginatitel */}
        <div className="flex flex-col gap-1 pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-[#617589] dark:text-gray-400">
              {getVersionIcon()}
            </span>
            <p className="text-xs text-[#617589] dark:text-gray-400 font-medium">
              {getVersionName()}
            </p>
          </div>
          <button
            onClick={openVersionSelector}
            className="text-xs text-[#617589] dark:text-gray-400 hover:text-[#111418] dark:hover:text-gray-200 underline mt-1 text-left"
          >
            Wijzig versie
          </button>
        </div>
        {/* Top Navigation Group */}
        <div className="flex flex-col gap-2">
          {topNavItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => onClose?.()}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 ${
                isActive(item.path)
                  ? 'bg-primary/10 text-primary'
                  : 'text-[#111418] dark:text-gray-300'
              }`}
            >
              <span className="material-symbols-outlined text-base">{item.icon}</span>
              <p className="text-sm font-medium leading-normal">{item.label}</p>
            </Link>
          ))}
        </div>

        {/* Main Navigation */}
        <div className="flex flex-col gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          {mainNavItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => onClose?.()}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 ${
                isActive(item.path)
                  ? 'bg-primary/10 text-primary'
                  : 'text-[#111418] dark:text-gray-300'
              }`}
            >
              <span className="material-symbols-outlined text-base">{item.icon}</span>
              <p className="text-sm font-medium leading-normal">{item.label}</p>
            </Link>
          ))}
        </div>

        {/* Bottom Navigation */}
        <div className="flex flex-col gap-2 pt-2 border-t border-gray-200 dark:border-gray-700 mt-auto">
          {bottomNavItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => onClose?.()}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 ${
                isActive(item.path)
                  ? 'bg-primary/10 text-primary'
                  : 'text-[#111418] dark:text-gray-300'
              }`}
            >
              <span className="material-symbols-outlined text-base">{item.icon}</span>
              <p className="text-sm font-medium leading-normal">{item.label}</p>
            </Link>
          ))}
        </div>
      </div>
      <div className="mt-auto flex flex-col gap-4">
        <button 
          onClick={handleDownloadSpreadsheet}
          className="flex min-w-[84px] w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-primary/90"
        >
          <span className="truncate">Download Spreadsheet</span>
        </button>
        <div className="flex flex-col gap-1">
          <button
            onClick={() => setShowHandleiding(true)}
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-left"
          >
            <span className="material-symbols-outlined text-[#111418] dark:text-gray-300">help</span>
            <p className="text-sm font-medium leading-normal">Handleiding</p>
          </button>
          {currentVersion === 'sandbox' && (
            <button
              onClick={handlePushClick}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-left mt-2 border-t border-gray-200 dark:border-gray-700 pt-2"
            >
              <span className="material-symbols-outlined text-[#111418] dark:text-gray-300">publish</span>
              <p className="text-sm font-medium leading-normal">Push naar Concrete</p>
            </button>
          )}
          {currentVersion === 'sandbox2' && (
            <button
              onClick={handlePushClick}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-left mt-2 border-t border-gray-200 dark:border-gray-700 pt-2"
            >
              <span className="material-symbols-outlined text-[#111418] dark:text-gray-300">publish</span>
              <p className="text-sm font-medium leading-normal">Push naar Sandbox</p>
            </button>
          )}
        </div>
      </div>

      {/* Push Confirmation Modal */}
      {showPushConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#111418] rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-red-600 text-2xl">warning</span>
              <h3 className="text-lg font-semibold text-[#111418] dark:text-white">
                {currentVersion === 'sandbox' ? 'Bevestig Push naar Concrete' : 'Bevestig Push naar Sandbox'}
              </h3>
            </div>
            <div className="space-y-2 text-sm text-[#617589] dark:text-gray-400">
              <p>
                {currentVersion === 'sandbox' 
                  ? 'Je staat op het punt om alle data uit de Sleutelversie te kopiëren naar de Concrete Versie.'
                  : 'Je staat op het punt om alle data uit Sleutelversie 2 te kopiëren naar Sleutelversie.'}
              </p>
              <p className="font-medium text-[#111418] dark:text-white">
                Dit overschrijft alle bestaande data in de doelversie.
              </p>
              <p>Deze actie kan niet ongedaan gemaakt worden.</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowPushConfirm(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-[#111418] dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Annuleren
              </button>
              <button
                onClick={handleConfirmPush}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold"
              >
                Bevestigen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Handleiding Modal */}
      {showHandleiding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#111418] rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#111418] dark:text-white">Handleiding</h3>
              <button
                onClick={() => setShowHandleiding(false)}
                className="text-[#617589] dark:text-gray-400 hover:text-[#111418] dark:hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="space-y-4 text-sm text-[#111418] dark:text-gray-300">
              <div>
                <h4 className="font-semibold mb-2">Versies</h4>
                <p className="text-[#617589] dark:text-gray-400">Werk in de Sleutelversie voor normale aanpassingen. Gebruik persoonlijke versies alleen voor experimenten.</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Kosten</h4>
                <p className="text-[#617589] dark:text-gray-400">Voeg kosten toe per categorie. Gebruik splitsing om te bepalen wie betaalt (gastjes, leiders, of iedereen).</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Planning</h4>
                <p className="text-[#617589] dark:text-gray-400">Bewerk activiteiten door te klikken op tijd of activiteit. Route en kilometers worden gebruikt voor buskosten.</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Push naar Concrete</h4>
                <p className="text-[#617589] dark:text-gray-400">Kopieer data van Sleutelversie naar Concrete Versie. Overschrijft alle bestaande data.</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Download Spreadsheet</h4>
                <p className="text-[#617589] dark:text-gray-400">Exporteer alle data (kosten, parameters, planning) naar CSV voor gebruik in Excel of Google Sheets.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}

