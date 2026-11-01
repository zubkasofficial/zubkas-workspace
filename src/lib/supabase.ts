import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zdjgahbbllbusntrakza.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkamdhaGJibGxidXNudHJha3phIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwMjMxMTcsImV4cCI6MjEwNjU5OTExN30.C05q84DU-TA32MX-RJV1WFU_FO1CBDSUUYlV3M17X_0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
