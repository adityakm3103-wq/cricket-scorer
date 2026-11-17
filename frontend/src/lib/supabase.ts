import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types.js';

const supabaseUrl =
  (import.meta as any).env?.VITE_SUPABASE_URL ||
  'https://jiqaodflicbjnmviocjx.supabase.co';
const supabaseKey =
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
  (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppcWFvZGZsaWNiam5tdmlvY2p4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ3NDEyOTMsImV4cCI6MjExMDMxNzI5M30.7mUZ7cxg6KlI5ayzgHJMw1bbLuGVldQkmWSfVz12Q8A';

export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
