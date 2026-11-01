import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mfjqpootzcasngujyedd.supabase.co';

const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1manFwb290emNhc25ndWp5ZWRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1MTU3MjgsImV4cCI6MjEwOTA5MTcyOH0.PWyHhqz8SQNHI0YmtNx2uxuPWfm1A6By4Ss5YR-tdXM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

