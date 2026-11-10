import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://jfbfjmozxxlopguuiehe.supabase.co'
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmYmZqbW96eHhsb3BndXVpZWhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NDg3NTEsImV4cCI6MjEwMjUyNDc1MX0.M-25GTq_zSuv7Q-toqn55anP-nSPZF0M0nXa4XjJ1WM'

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
