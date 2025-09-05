import { createClient } from '@supabase/supabase-js'

// Usar variáveis de ambiente ou fallback para desenvolvimento
export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://kjsionbgfvhjwefdqoat.supabase.co'
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtqc2lvbmJnZnZoandlZmRxb2F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxNjQ5OTcsImV4cCI6MjA3MTc0MDk5N30.EsR7eee7aMJLHNgoT3RtaSsIwdWaFqb699GveoSP5BQ'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Função utilitária para verificar se o Supabase está configurado
export const isSupabaseConfigured = () => {
  return true // Supabase está configurado
}