export default function Formulas() {
  return (
    <div className="min-h-screen bg-[#f6f8f6] dark:bg-[#101815]">
      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6 md:space-y-8 pt-16 md:pt-8">
        
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-black text-[#111418] dark:text-white tracking-tight">
            Formules & Berekeningen
          </h1>
          <p className="text-[#617589] dark:text-gray-400">
            Overzicht van alle formules die gebruikt worden voor de kostenberekeningen
          </p>
        </div>

        {/* Formula Sections */}
        <div className="space-y-6">
          
          {/* Basis Berekening Kostitem */}
          <section className="bg-white dark:bg-[#1a2c1a] rounded-xl border border-[#dbe0e6] dark:border-[#304030] p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-[#111418] dark:text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">calculate</span>
              Berekening Kostitem Totaal
            </h2>
            <p className="text-[#617589] dark:text-gray-400 mb-4">
              De basisformule voor het berekenen van het totaalbedrag van een kostitem, afhankelijk van de splitsing en eenheid.
            </p>
            
            <div className="space-y-4">
              <div className="bg-[#f6f8f6] dark:bg-[#102210] rounded-lg p-4 border border-[#dbe0e6] dark:border-[#304030]">
                <h3 className="font-bold text-[#111418] dark:text-white mb-2">Splitsing: Iedereen</h3>
                <div className="space-y-2 text-sm">
                  <div className="font-mono bg-white dark:bg-[#1a2c1a] p-3 rounded border">
                    <div className="text-[#617589] dark:text-gray-400 mb-1">Eenheid = "persoon":</div>
                    <div className="text-[#111418] dark:text-white">
                      Totaal = prijs_per_persoon × aantal_personen
                    </div>
                  </div>
                  <div className="font-mono bg-white dark:bg-[#1a2c1a] p-3 rounded border">
                    <div className="text-[#617589] dark:text-gray-400 mb-1">Eenheid = "groep" of andere:</div>
                    <div className="text-[#111418] dark:text-white">
                      Totaal = prijs_per_persoon × aantal_personen × aantal
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#f6f8f6] dark:bg-[#102210] rounded-lg p-4 border border-[#dbe0e6] dark:border-[#304030]">
                <h3 className="font-bold text-[#111418] dark:text-white mb-2">Splitsing: Gastjes & Leiders</h3>
                <div className="font-mono bg-white dark:bg-[#1a2c1a] p-3 rounded border text-sm">
                  <div className="text-[#111418] dark:text-white">
                    Totaal = (prijs_per_persoon_gastjes × aantal_gastjes × aantal) +<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                    (prijs_per_persoon_leiders × aantal_leiders × aantal)
                  </div>
                </div>
              </div>

              <div className="bg-[#f6f8f6] dark:bg-[#102210] rounded-lg p-4 border border-[#dbe0e6] dark:border-[#304030]">
                <h3 className="font-bold text-[#111418] dark:text-white mb-2">Splitsing: Alleen Gastjes</h3>
                <div className="space-y-2 text-sm">
                  <div className="font-mono bg-white dark:bg-[#1a2c1a] p-3 rounded border">
                    <div className="text-[#617589] dark:text-gray-400 mb-1">Eenheid = "persoon":</div>
                    <div className="text-[#111418] dark:text-white">
                      Totaal = prijs_per_persoon_gastjes × aantal_gastjes
                    </div>
                  </div>
                  <div className="font-mono bg-white dark:bg-[#1a2c1a] p-3 rounded border">
                    <div className="text-[#617589] dark:text-gray-400 mb-1">Eenheid ≠ "persoon":</div>
                    <div className="text-[#111418] dark:text-white">
                      Totaal = prijs_per_persoon_gastjes × aantal_gastjes × aantal
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#f6f8f6] dark:bg-[#102210] rounded-lg p-4 border border-[#dbe0e6] dark:border-[#304030]">
                <h3 className="font-bold text-[#111418] dark:text-white mb-2">Splitsing: Alleen Leiders</h3>
                <div className="space-y-2 text-sm">
                  <div className="font-mono bg-white dark:bg-[#1a2c1a] p-3 rounded border">
                    <div className="text-[#617589] dark:text-gray-400 mb-1">Eenheid = "persoon":</div>
                    <div className="text-[#111418] dark:text-white">
                      Totaal = prijs_per_persoon_leiders × aantal_leiders
                    </div>
                  </div>
                  <div className="font-mono bg-white dark:bg-[#1a2c1a] p-3 rounded border">
                    <div className="text-[#617589] dark:text-gray-400 mb-1">Eenheid ≠ "persoon":</div>
                    <div className="text-[#111418] dark:text-white">
                      Totaal = prijs_per_persoon_leiders × aantal_leiders × aantal
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Let op:</strong> Als een item een handmatig ingevuld "totaal" heeft, wordt dat bedrag gebruikt in plaats van de berekening.
                </p>
              </div>
            </div>
          </section>

          {/* Automatische Berekeningen */}
          <section className="bg-white dark:bg-[#1a2c1a] rounded-xl border border-[#dbe0e6] dark:border-[#304030] p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-[#111418] dark:text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">auto_awesome</span>
              Automatische Berekeningen
            </h2>
            
            <div className="space-y-4">
              <div className="bg-[#f6f8f6] dark:bg-[#102210] rounded-lg p-4 border border-[#dbe0e6] dark:border-[#304030]">
                <h3 className="font-bold text-[#111418] dark:text-white mb-2">Maaltijden</h3>
                <div className="font-mono bg-white dark:bg-[#1a2c1a] p-3 rounded border text-sm">
                  <div className="text-[#111418] dark:text-white">
                    Totaal = eten_prijs_per_dag × aantal_dagen_eten × aantal_personen
                  </div>
                </div>
                <p className="text-xs text-[#617589] dark:text-gray-400 mt-2">
                  Wordt automatisch berekend op basis van de parameters in het systeem.
                </p>
              </div>

              <div className="bg-[#f6f8f6] dark:bg-[#102210] rounded-lg p-4 border border-[#dbe0e6] dark:border-[#304030]">
                <h3 className="font-bold text-[#111418] dark:text-white mb-2">Bus Huur</h3>
                <div className="font-mono bg-white dark:bg-[#1a2c1a] p-3 rounded border text-sm">
                  <div className="text-[#111418] dark:text-white">
                    Totaal = bus_dagprijs × aantal_busdagen +<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                    max(0, (totaal_km - bus_daglimiet × aantal_busdagen)) × bus_extra_km
                  </div>
                </div>
                <p className="text-xs text-[#617589] dark:text-gray-400 mt-2">
                  Basisprijs per dag + extra kosten voor kilometers boven de daglimiet.
                </p>
              </div>

              <div className="bg-[#f6f8f6] dark:bg-[#102210] rounded-lg p-4 border border-[#dbe0e6] dark:border-[#304030]">
                <h3 className="font-bold text-[#111418] dark:text-white mb-2">Auto Koks</h3>
                <div className="font-mono bg-white dark:bg-[#1a2c1a] p-3 rounded border text-sm">
                  <div className="text-[#111418] dark:text-white">
                    Totaal = auto_afstand × auto_brandstof × 2
                  </div>
                </div>
                <p className="text-xs text-[#617589] dark:text-gray-400 mt-2">
                  Brandstofkosten voor heen- en terugreis (× 2).
                </p>
              </div>
            </div>
          </section>

          {/* Totale Kosten */}
          <section className="bg-white dark:bg-[#1a2c1a] rounded-xl border border-[#dbe0e6] dark:border-[#304030] p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-[#111418] dark:text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">summarize</span>
              Totale Kosten Berekening
            </h2>
            
            <div className="space-y-4">
              <div className="bg-[#f6f8f6] dark:bg-[#102210] rounded-lg p-4 border border-[#dbe0e6] dark:border-[#304030]">
                <h3 className="font-bold text-[#111418] dark:text-white mb-2">Vaste Kosten</h3>
                <div className="font-mono bg-white dark:bg-[#1a2c1a] p-3 rounded border text-sm">
                  <div className="text-[#111418] dark:text-white">
                    Vaste Kosten = Σ (items met eenheid = "groep") +<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                    Σ (automatische bus/auto kosten)
                  </div>
                </div>
                <p className="text-xs text-[#617589] dark:text-gray-400 mt-2">
                  Kosten die niet afhankelijk zijn van het aantal personen.
                </p>
              </div>

              <div className="bg-[#f6f8f6] dark:bg-[#102210] rounded-lg p-4 border border-[#dbe0e6] dark:border-[#304030]">
                <h3 className="font-bold text-[#111418] dark:text-white mb-2">Variabele Kosten Gastjes</h3>
                <div className="font-mono bg-white dark:bg-[#1a2c1a] p-3 rounded border text-sm">
                  <div className="text-[#111418] dark:text-white">
                    Variabele Kosten Gastjes = Σ (kosten die gastjes betalen)
                  </div>
                </div>
                <p className="text-xs text-[#617589] dark:text-gray-400 mt-2">
                  Alle kosten waar gastjes voor betalen, berekend volgens de splitsing regels.
                </p>
              </div>

              <div className="bg-[#f6f8f6] dark:bg-[#102210] rounded-lg p-4 border border-[#dbe0e6] dark:border-[#304030]">
                <h3 className="font-bold text-[#111418] dark:text-white mb-2">Variabele Kosten Leiders</h3>
                <div className="font-mono bg-white dark:bg-[#1a2c1a] p-3 rounded border text-sm">
                  <div className="text-[#111418] dark:text-white">
                    Variabele Kosten Leiders = Σ (kosten die leiders betalen)
                  </div>
                </div>
                <p className="text-xs text-[#617589] dark:text-gray-400 mt-2">
                  Alle kosten waar leiders voor betalen, berekend volgens de splitsing regels.
                </p>
              </div>

              <div className="bg-[#f6f8f6] dark:bg-[#102210] rounded-lg p-4 border border-[#dbe0e6] dark:border-[#304030]">
                <h3 className="font-bold text-[#111418] dark:text-white mb-2">Totale Kosten</h3>
                <div className="font-mono bg-white dark:bg-[#1a2c1a] p-3 rounded border text-sm">
                  <div className="text-[#111418] dark:text-white">
                    Totale Kosten = Vaste Kosten +<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                    Variabele Kosten Gastjes +<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                    Variabele Kosten Leiders
                  </div>
                </div>
              </div>

              <div className="bg-[#f6f8f6] dark:bg-[#102210] rounded-lg p-4 border border-[#dbe0e6] dark:border-[#304030]">
                <h3 className="font-bold text-[#111418] dark:text-white mb-2">Verdeling Vaste Kosten</h3>
                <div className="font-mono bg-white dark:bg-[#1a2c1a] p-3 rounded border text-sm space-y-2">
                  <div className="text-[#111418] dark:text-white">
                    Percentage Gastjes = aantal_gastjes / (aantal_gastjes + aantal_leiders)
                  </div>
                  <div className="text-[#111418] dark:text-white">
                    Vaste Kosten Gastjes = Vaste Kosten × Percentage Gastjes
                  </div>
                  <div className="text-[#111418] dark:text-white">
                    Vaste Kosten Leiders = Vaste Kosten × Percentage Leiders
                  </div>
                </div>
                <p className="text-xs text-[#617589] dark:text-gray-400 mt-2">
                  Vaste kosten worden proportioneel verdeeld op basis van het aantal personen.
                </p>
              </div>
            </div>
          </section>

          {/* Kosten per Persoon */}
          <section className="bg-white dark:bg-[#1a2c1a] rounded-xl border border-[#dbe0e6] dark:border-[#304030] p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-[#111418] dark:text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">person</span>
              Kosten per Persoon
            </h2>
            
            <div className="space-y-4">
              <div className="bg-[#f6f8f6] dark:bg-[#102210] rounded-lg p-4 border border-[#dbe0e6] dark:border-[#304030]">
                <h3 className="font-bold text-[#111418] dark:text-white mb-2">Kost per Gastje</h3>
                <div className="font-mono bg-white dark:bg-[#1a2c1a] p-3 rounded border text-sm">
                  <div className="text-[#111418] dark:text-white">
                    Kost per Gastje = (Variabele Kosten Gastjes + Vaste Kosten Gastjes) / aantal_gastjes
                  </div>
                </div>
                <p className="text-xs text-[#617589] dark:text-gray-400 mt-2">
                  Totale kosten voor gastjes gedeeld door het aantal gastjes.
                </p>
              </div>

              <div className="bg-[#f6f8f6] dark:bg-[#102210] rounded-lg p-4 border border-[#dbe0e6] dark:border-[#304030]">
                <h3 className="font-bold text-[#111418] dark:text-white mb-2">Kost per Leider</h3>
                <div className="font-mono bg-white dark:bg-[#1a2c1a] p-3 rounded border text-sm">
                  <div className="text-[#111418] dark:text-white">
                    Kost per Leider = (Variabele Kosten Leiders + Vaste Kosten Leiders) / aantal_leiders
                  </div>
                </div>
                <p className="text-xs text-[#617589] dark:text-gray-400 mt-2">
                  Totale kosten voor leiders gedeeld door het aantal leiders.
                </p>
              </div>

              <div className="bg-[#f6f8f6] dark:bg-[#102210] rounded-lg p-4 border border-[#dbe0e6] dark:border-[#304030]">
                <h3 className="font-bold text-[#111418] dark:text-white mb-2">Kostprijs per Reiziger</h3>
                <div className="font-mono bg-white dark:bg-[#1a2c1a] p-3 rounded border text-sm">
                  <div className="text-[#111418] dark:text-white">
                    Kostprijs per Reiziger = Totale Kosten / (aantal_gastjes + aantal_leiders)
                  </div>
                </div>
                <p className="text-xs text-[#617589] dark:text-gray-400 mt-2">
                  Gemiddelde kost per persoon (gastjes + leiders samen).
                </p>
              </div>

              <div className="bg-[#f6f8f6] dark:bg-[#102210] rounded-lg p-4 border border-[#dbe0e6] dark:border-[#304030]">
                <h3 className="font-bold text-[#111418] dark:text-white mb-2">Kostprijs per Gastje na Bijdrage Leiders</h3>
                <div className="font-mono bg-white dark:bg-[#1a2c1a] p-3 rounded border text-sm">
                  <div className="text-[#111418] dark:text-white">
                    Kostprijs per Gastje na Bijdrage =<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                    (Totale Kosten - Bijdrage Leiders) / aantal_gastjes<br/>
                    <br/>
                    Waar: Bijdrage Leiders = vraagprijs_leider × aantal_leiders
                  </div>
                </div>
                <p className="text-xs text-[#617589] dark:text-gray-400 mt-2">
                  De kost per gastje nadat de bijdrage van leiders is afgetrokken.
                </p>
              </div>
            </div>
          </section>

          {/* Winst/Verlies */}
          <section className="bg-white dark:bg-[#1a2c1a] rounded-xl border border-[#dbe0e6] dark:border-[#304030] p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-[#111418] dark:text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">trending_up</span>
              Winst/Verlies Berekening
            </h2>
            
            <div className="space-y-4">
              <div className="bg-[#f6f8f6] dark:bg-[#102210] rounded-lg p-4 border border-[#dbe0e6] dark:border-[#304030]">
                <h3 className="font-bold text-[#111418] dark:text-white mb-2">Totale Opbrengst</h3>
                <div className="font-mono bg-white dark:bg-[#1a2c1a] p-3 rounded border text-sm">
                  <div className="text-[#111418] dark:text-white">
                    Totale Opbrengst = (vraagprijs_gastje × aantal_gastjes) +<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                    (vraagprijs_leider × aantal_leiders)
                  </div>
                </div>
              </div>

              <div className="bg-[#f6f8f6] dark:bg-[#102210] rounded-lg p-4 border border-[#dbe0e6] dark:border-[#304030]">
                <h3 className="font-bold text-[#111418] dark:text-white mb-2">Winst/Verlies</h3>
                <div className="font-mono bg-white dark:bg-[#1a2c1a] p-3 rounded border text-sm">
                  <div className="text-[#111418] dark:text-white">
                    Winst/Verlies = Totale Opbrengst - Totale Kosten
                  </div>
                </div>
                <p className="text-xs text-[#617589] dark:text-gray-400 mt-2">
                  Positief = winst, Negatief = verlies
                </p>
              </div>

              <div className="bg-[#f6f8f6] dark:bg-[#102210] rounded-lg p-4 border border-[#dbe0e6] dark:border-[#304030]">
                <h3 className="font-bold text-[#111418] dark:text-white mb-2">Marge Percentage</h3>
                <div className="font-mono bg-white dark:bg-[#1a2c1a] p-3 rounded border text-sm">
                  <div className="text-[#111418] dark:text-white">
                    Marge % = (Winst/Verlies / Totale Opbrengst) × 100
                  </div>
                </div>
              </div>

              <div className="bg-[#f6f8f6] dark:bg-[#102210] rounded-lg p-4 border border-[#dbe0e6] dark:border-[#304030]">
                <h3 className="font-bold text-[#111418] dark:text-white mb-2">Verlies per Gastje</h3>
                <div className="font-mono bg-white dark:bg-[#1a2c1a] p-3 rounded border text-sm">
                  <div className="text-[#111418] dark:text-white">
                    Verlies per Gastje = |Winst/Verlies| / aantal_gastjes
                  </div>
                </div>
                <p className="text-xs text-[#617589] dark:text-gray-400 mt-2">
                  Alleen berekend als er verlies is (negatieve winst/verlies).
                </p>
              </div>
            </div>
          </section>

          {/* Marginale Kost */}
          <section className="bg-white dark:bg-[#1a2c1a] rounded-xl border border-[#dbe0e6] dark:border-[#304030] p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-[#111418] dark:text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">show_chart</span>
              Marginale Kost
            </h2>
            
            <div className="bg-[#f6f8f6] dark:bg-[#102210] rounded-lg p-4 border border-[#dbe0e6] dark:border-[#304030]">
              <p className="text-[#617589] dark:text-gray-400 mb-4">
                De marginale kost is de extra kost voor één extra gastje. Dit helpt om te bepalen hoeveel het kost om één extra persoon toe te voegen.
              </p>
              <div className="font-mono bg-white dark:bg-[#1a2c1a] p-3 rounded border text-sm">
                <div className="text-[#111418] dark:text-white">
                  Marginale Kost = Variabele Kosten (aantal_gastjes + 1) -<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                  Variabele Kosten (aantal_gastjes)
                </div>
              </div>
              <p className="text-xs text-[#617589] dark:text-gray-400 mt-2">
                Alleen variabele kosten worden meegenomen, vaste kosten blijven hetzelfde.
              </p>
            </div>
          </section>

          {/* Buffer */}
          <section className="bg-white dark:bg-[#1a2c1a] rounded-xl border border-[#dbe0e6] dark:border-[#304030] p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-[#111418] dark:text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">shield</span>
              Buffer Berekening
            </h2>
            
            <div className="bg-[#f6f8f6] dark:bg-[#102210] rounded-lg p-4 border border-[#dbe0e6] dark:border-[#304030]">
              <p className="text-[#617589] dark:text-gray-400 mb-4">
                Een buffer percentage kan worden toegevoegd om onvoorziene kosten op te vangen.
              </p>
              <div className="font-mono bg-white dark:bg-[#1a2c1a] p-3 rounded border text-sm">
                <div className="text-[#111418] dark:text-white">
                  Totale Kosten met Buffer = Totale Kosten × (1 + buffer_percentage / 100)
                </div>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-[#617589] dark:text-gray-400">Laag (zonder buffer):</span>
                  <span className="font-bold text-[#111418] dark:text-white">Totale Kosten</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#617589] dark:text-gray-400">Hoog (met buffer):</span>
                  <span className="font-bold text-[#111418] dark:text-white">Totale Kosten × (1 + buffer%)</span>
                </div>
              </div>
            </div>
          </section>

        </div>

      </div>
    </div>
  )
}


