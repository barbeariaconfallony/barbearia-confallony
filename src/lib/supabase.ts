import { createClient } from '@supabase/supabase-js'

export const supabaseUrl = 'https://vxfofymcvcycfttzhftf.supabase.co'
export const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4Zm9meW1jdmN5Y2Z0dHpoZnRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyNTgxNTYsImV4cCI6MjA3MTgzNDE1Nn0.0cy7z0cjbGBelTlFQRCTzIMDPP2rWByAjVf7Gpv332E'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Função utilitária para verificar se o Supabase está configurado
export const isSupabaseConfigured = () => {
  return true // Supabase está configurado
}