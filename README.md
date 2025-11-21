# KSA Buitenlands Kamp - Kostenraming

Een moderne web applicatie voor het beheren van kampkosten, planning, gastjes en werkgroep taken. Gebouwd met React, TypeScript, Tailwind CSS en Supabase.

## Tech Stack

- **Vite** - Build tool en dev server
- **React 18** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **React Router** - Routing
- **Supabase** - Backend database (PostgreSQL)

## Setup

1. Installeer dependencies:
```bash
npm install
```

2. Configureer Supabase (optioneel, defaults zijn al ingesteld):
```bash
cp .env.example .env
# Pas VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY aan indien nodig
```

3. Start de development server:
```bash
npm run dev
```

## Project Structuur

```
src/
├── components/          # Herbruikbare componenten
│   ├── Layout.tsx
│   ├── Sidebar.tsx
│   └── VersionSelector.tsx
├── context/             # React context providers
│   └── VersionContext.tsx
├── lib/                 # Utilities en configuratie
│   ├── supabase.ts
│   └── changeLogger.ts
├── pages/               # Page componenten
│   ├── Dashboard.tsx
│   ├── Kosten.tsx
│   ├── Planning.tsx
│   ├── Gastjes.tsx
│   └── Werkgroep.tsx
├── types/               # TypeScript types
│   ├── index.ts
│   └── database.types.ts
├── App.tsx              # Hoofd app component
└── main.tsx             # Entry point
```

## Database Schema

De applicatie gebruikt Supabase (PostgreSQL) met de volgende tabellen:

### Versie-afhankelijke tabellen
Deze tabellen hebben een suffix per versie (`_concrete`, `_sandbox`, `_sandbox2`):

- **`kosten_{version}`** - Kostitems met categorieën, prijzen en berekeningen
- **`planning_{version}`** - Planning data per dag (route, overnachting, km, activiteit)
- **`parameters_{version}`** - Configuratie parameters (aantal gastjes/leiders, vraagprijzen, etc.)
- **`planning_schedule_{version}`** - Gedetailleerde activiteitenschema's (datum, dag, tijd, activiteit)

### Gedeelde tabellen
Deze tabellen zijn gedeeld over alle versies:

- **`gastjes`** - Lijst van alle gastjes met ban, status en notities
- **`werkgroep_tasks`** - Takenlijst voor de werkgroep
- **`werkgroep_accommodation_locations`** - Accommodatie locaties
- **`werkgroep_accommodation_options`** - Accommodatie opties per locatie
- **`werkgroep_member_spaces`** - Persoonlijke notities per teamlid
- **`werkgroep_member_files`** - Bestanden en links per teamlid
- **`change_log`** - Audit log van alle wijzigingen
- **`user_sessions`** - Gebruikerssessies (optioneel)

### Database beheer

De database schema is aangemaakt via Supabase MCP migrations. Je kunt de database beheren via:
- Supabase Dashboard
- Supabase MCP tools (in Cursor)
- Direct SQL queries via `mcp_supabase_execute_sql`

## Versie Systeem

De applicatie ondersteunt 3 versies:

1. **Concrete** (`concrete`) - Officiële, definitieve versie
2. **Sandbox** (`sandbox`) - Werkversie (aanbevolen voor dagelijks gebruik)
3. **Sandbox2** (`sandbox2`) - Tweede experimentele versie

Elke versie heeft zijn eigen set tabellen voor kosten, planning en parameters. Gastjes en werkgroep data zijn gedeeld over alle versies.

De actieve versie wordt opgeslagen in `localStorage` als `app_active_version` en kan worden gewijzigd via de versie-selector op het Dashboard.

## Features

- **Dashboard** - Overzicht van kosten, parameters en statistieken
- **Kosten** - Beheer van kostitems met categorieën en berekeningen
- **Planning** - Dagelijkse planning met routes, overnachtingen en activiteiten
- **Gastjes** - Beheer van deelnemers met ban, status en notities
- **Werkgroep** - Takenlijst, accommodatie opties en persoonlijke dossiers
- **Change Log** - Audit trail van alle wijzigingen
- **Versie Management** - Schakelen tussen verschillende versies

## Development

```bash
npm run dev      # Start development server
npm run build    # Build voor productie
npm run preview  # Preview productie build
```

## Notities

- Data wordt opgeslagen in Supabase (niet meer in localStorage)
- Automatische seeding van initial data bij eerste gebruik
- Race condition protection voorkomt dubbele data
- Alle wijzigingen worden gelogd in `change_log` tabel
