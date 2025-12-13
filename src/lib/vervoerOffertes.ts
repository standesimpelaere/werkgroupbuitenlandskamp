import { VersionId } from '../types'

export type VervoerScenario = 'berekening' | 'reisvogel' | 'coachpartners'

export const vervoerOffertes: Record<
  Exclude<VervoerScenario, 'berekening'>,
  {
    title: string
    totaal: number
    sections: { title: string; items: string[] }[]
    note?: string
  }
> = {
  reisvogel: {
    title: 'Autocars "De Reisvogel"',
    totaal: 15000,
    sections: [
      {
        title: 'Prijs bus (algemeen)',
        items: ['1 x 60 zitplaatsen: € 13.253,13'],
      },
      {
        title: 'Belastingen per land',
        items: [
          '6,00 % BTW (op € 2.553,52): € 153,21',
          '9,00 % Nederlandse belasting (op € 112,39): € 10,12',
          '19,00 % Duitse belasting (op € 6.545,64): € 1.243,67',
          '10,00 % Oostenrijkse belasting (op € 3.398,70): € 339,87',
          '% Tsjechische belasting (op € 395,62): € 0,00',
        ],
      },
      {
        title: 'Extra’s volgens offerte',
        items: ['Extra km’s: + € 1,5 euro / km'],
      },
    ],
  },
  coachpartners: {
    title: 'Coach Partners West-Vlaanderen NV',
    totaal: 14875,
    sections: [
      {
        title: 'Prijs binneland',
        items: ['AUTOCAR BINNENLAND (1): € 1.955,00', '6,00 % BTW toegepast'],
      },
      {
        title: 'Prijs buitenland',
        items: [
          'AUTOCAR BUITENLAND (1): € 11.120,00',
          '0,00 % BTW',
          'Km’s buitenland niet onderworpen aan BE BTW',
          'Art. 21 bis §3.2° wbtw',
        ],
      },
      {
        title: 'Extra’s volgens offerte',
        items: ['Aanhangwagen voor alle bagage: € 1.800,00'],
      },
      {
        title: 'Totaalbedragen',
        items: ['Totaal te voldoen (offerte): € 13.075,00', 'Totaal incl. aanhangwagen: € 14.875,00'],
      },
    ],
    note: 'Inclusief aanhangwagen in totaalbedrag.',
  },
}

export const getVervoerScenarioStorageKey = (version: VersionId) => `vervoer_scenario_${version}`


