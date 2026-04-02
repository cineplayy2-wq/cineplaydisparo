import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://koqebrijfmnuppycbleb.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_TSwdIbT2olahwSyvPH9KKg_Meqd_s7U'

export const supabase = createClient(supabaseUrl, supabaseKey)
