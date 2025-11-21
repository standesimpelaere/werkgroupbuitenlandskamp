export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      kosten: {
        Row: {
          aantal: number | null
          automatisch: boolean | null
          beschrijving: string | null
          categorie: string
          created_at: string | null
          eenheid: string | null
          hoog: number | null
          id: string
          laag: number | null
          opmerkingen: string | null
          prijs_per_persoon: number | null
          prijs_per_persoon_gastjes: number | null
          prijs_per_persoon_leiders: number | null
          splitsing: string | null
          subcategorie: string
          totaal: number | null
          updated_at: string | null
        }
        Insert: {
          aantal?: number | null
          automatisch?: boolean | null
          beschrijving?: string | null
          categorie: string
          created_at?: string | null
          eenheid?: string | null
          hoog?: number | null
          id?: string
          laag?: number | null
          opmerkingen?: string | null
          prijs_per_persoon?: number | null
          prijs_per_persoon_gastjes?: number | null
          prijs_per_persoon_leiders?: number | null
          splitsing?: string | null
          subcategorie: string
          totaal?: number | null
          updated_at?: string | null
        }
        Update: {
          aantal?: number | null
          automatisch?: boolean | null
          beschrijving?: string | null
          categorie?: string
          created_at?: string | null
          eenheid?: string | null
          hoog?: number | null
          id?: string
          laag?: number | null
          opmerkingen?: string | null
          prijs_per_persoon?: number | null
          prijs_per_persoon_gastjes?: number | null
          prijs_per_persoon_leiders?: number | null
          splitsing?: string | null
          subcategorie?: string
          totaal?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      parameters: {
        Row: {
          aantal_dagen_eten: number | null
          aantal_gastjes: number | null
          aantal_leiders: number | null
          auto_afstand: number | null
          auto_brandstof: number | null
          buffer_percentage: number | null
          bus_daglimiet: number | null
          bus_dagprijs: number | null
          bus_extra_km: number | null
          created_at: string | null
          eten_prijs_per_dag: number | null
          id: string
          updated_at: string | null
          vraagprijs_gastje: number | null
          vraagprijs_leider: number | null
        }
        Insert: {
          aantal_dagen_eten?: number | null
          aantal_gastjes?: number | null
          aantal_leiders?: number | null
          auto_afstand?: number | null
          auto_brandstof?: number | null
          buffer_percentage?: number | null
          bus_daglimiet?: number | null
          bus_dagprijs?: number | null
          bus_extra_km?: number | null
          created_at?: string | null
          eten_prijs_per_dag?: number | null
          id?: string
          updated_at?: string | null
          vraagprijs_gastje?: number | null
          vraagprijs_leider?: number | null
        }
        Update: {
          aantal_dagen_eten?: number | null
          aantal_gastjes?: number | null
          aantal_leiders?: number | null
          auto_afstand?: number | null
          auto_brandstof?: number | null
          buffer_percentage?: number | null
          bus_daglimiet?: number | null
          bus_dagprijs?: number | null
          bus_extra_km?: number | null
          created_at?: string | null
          eten_prijs_per_dag?: number | null
          id?: string
          updated_at?: string | null
          vraagprijs_gastje?: number | null
          vraagprijs_leider?: number | null
        }
        Relationships: []
      }
      planning: {
        Row: {
          activiteit: string | null
          bus_kosten: number | null
          created_at: string | null
          dag: number
          id: string
          km: number
          overnachting: string
          route: string
          updated_at: string | null
        }
        Insert: {
          activiteit?: string | null
          bus_kosten?: number | null
          created_at?: string | null
          dag: number
          id?: string
          km: number
          overnachting: string
          route: string
          updated_at?: string | null
        }
        Update: {
          activiteit?: string | null
          bus_kosten?: number | null
          created_at?: string | null
          dag?: number
          id?: string
          km?: number
          overnachting?: string
          route?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

