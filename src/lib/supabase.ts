import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dmwudyzbllwxrpaookdg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtd3VkeXpibGx3eHJwYW9la2RnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczMTEwOTIsImV4cCI6MjEwMjg4NzA5Mn0.cTLkLqkhinQ_YPyBdw7BkOny7_7HcUN2VYPQJx5cT8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
