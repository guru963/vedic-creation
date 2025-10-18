

import { createClient } from '@supabase/supabase-js'

// In Vite, env variables must be prefixed with VITE_
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase URL or Key is missing in environment variables.')
}

const supabase = createClient(supabaseUrl, supabaseKey)

export default supabase
