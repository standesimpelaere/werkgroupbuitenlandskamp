import { createClient } from '@supabase/supabase-js'

// Get from environment variables or use defaults
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jitrnfvkfvarqxllhycf.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppdHJuZnZrZnZhcnF4bGxoeWNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1MDIxNTksImV4cCI6MjA3OTA3ODE1OX0.2EVYBeKXDegFFpoSsdXFmfjPR3XAiF8eKHvtfHMs--o'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default supabase

