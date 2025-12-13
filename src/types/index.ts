// Types for Supabase database tables

export interface KostenItem {
  id: string
  categorie: string
  subcategorie: string
  beschrijving?: string | null
  eenheid?: string | null
  splitsing?: 'iedereen' | 'gastjes_leiders' | null
  prijs_per_persoon?: number | null
  prijs_per_persoon_gastjes?: number | null
  prijs_per_persoon_leiders?: number | null
  aantal?: number | null
  totaal?: number | null
  opmerkingen?: string | null
  automatisch?: boolean | null
  kost_van_bus?: boolean | null
  laag?: number | null
  hoog?: number | null
  created_at?: string
  updated_at?: string
}

export interface PlanningDag {
  id: string
  dag: number
  route: string
  km: number
  overnachting: string
  activiteit?: string | null
  bus_kosten?: number | null
  created_at?: string
  updated_at?: string
}

export type VervoerScenario = 'berekening' | 'reisvogel' | 'coachpartners'

export interface Parameters {
  id: string
  aantal_gastjes?: number | null
  aantal_leiders?: number | null
  vraagprijs_gastje?: number | null
  vraagprijs_leider?: number | null
  buffer_percentage?: number | null
  bus_dagprijs?: number | null
  bus_daglimiet?: number | null
  bus_extra_km?: number | null
  auto_brandstof?: number | null
  auto_afstand?: number | null
  eten_prijs_per_dag?: number | null
  aantal_dagen_eten?: number | null
  created_at?: string
  updated_at?: string
}

export interface ScheduleItem {
  id?: string
  date: string
  day: string
  time: string
  activity: string
  created_at?: string
  updated_at?: string
}

export interface ChangeLog {
  id: string
  version: 'concrete' | 'sandbox' | 'sandbox2'
  table_name: string
  record_id: string
  field_name?: string | null
  old_value?: string | null
  new_value?: string | null
  changed_by: string
  changed_at: string
}

export interface UserSession {
  id: string
  user_name: string
  last_active: string
}

export type VersionId = 'concrete' | 'sandbox' | 'sandbox2'

// Database type helpers
export type Database = {
  public: {
    Tables: {
      kosten_concrete: {
        Row: KostenItem
        Insert: Omit<KostenItem, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<KostenItem, 'id' | 'created_at' | 'updated_at'>>
      }
      kosten_sandbox: {
        Row: KostenItem
        Insert: Omit<KostenItem, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<KostenItem, 'id' | 'created_at' | 'updated_at'>>
      }
      kosten_sandbox2: {
        Row: KostenItem
        Insert: Omit<KostenItem, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<KostenItem, 'id' | 'created_at' | 'updated_at'>>
      }
      planning_concrete: {
        Row: PlanningDag
        Insert: Omit<PlanningDag, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<PlanningDag, 'id' | 'created_at' | 'updated_at'>>
      }
      planning_sandbox: {
        Row: PlanningDag
        Insert: Omit<PlanningDag, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<PlanningDag, 'id' | 'created_at' | 'updated_at'>>
      }
      planning_sandbox2: {
        Row: PlanningDag
        Insert: Omit<PlanningDag, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<PlanningDag, 'id' | 'created_at' | 'updated_at'>>
      }
      parameters_concrete: {
        Row: Parameters
        Insert: Omit<Parameters, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Parameters, 'id' | 'created_at' | 'updated_at'>>
      }
      parameters_sandbox: {
        Row: Parameters
        Insert: Omit<Parameters, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Parameters, 'id' | 'created_at' | 'updated_at'>>
      }
      parameters_sandbox2: {
        Row: Parameters
        Insert: Omit<Parameters, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Parameters, 'id' | 'created_at' | 'updated_at'>>
      }
      planning_schedule_concrete: {
        Row: ScheduleItem
        Insert: Omit<ScheduleItem, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<ScheduleItem, 'id' | 'created_at' | 'updated_at'>>
      }
      planning_schedule_sandbox: {
        Row: ScheduleItem
        Insert: Omit<ScheduleItem, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<ScheduleItem, 'id' | 'created_at' | 'updated_at'>>
      }
      planning_schedule_sandbox2: {
        Row: ScheduleItem
        Insert: Omit<ScheduleItem, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<ScheduleItem, 'id' | 'created_at' | 'updated_at'>>
      }
      change_log: {
        Row: ChangeLog
        Insert: Omit<ChangeLog, 'id' | 'changed_at'>
        Update: Partial<Omit<ChangeLog, 'id' | 'changed_at'>>
      }
      user_sessions: {
        Row: UserSession
        Insert: Omit<UserSession, 'id'>
        Update: Partial<Omit<UserSession, 'id'>>
      }
    }
  }
}

