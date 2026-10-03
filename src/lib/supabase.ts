import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yjmzhwxdsnmhhjqklhk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqbXpod3hkc25taGhqcWtsaGsiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc4NzMxMTA5MiwiZXhwIjoyMTAyODg3MDkyfQ.BZQfrRnJW0g57Vck7MQ_Jl20g5uRlXExipzin_M2iQ4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
