
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://lvrvryneibnirjsphkud.supabase.co"
const supabaseAnonKey = "sb_publishable_7z-BTM5F54165vsR5Lu83w_qm2s1Ndc"

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Missing Supabase URL or Anon Key')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
