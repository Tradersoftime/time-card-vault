// src/integrations/supabase/client.ts
import { createClient } from '@supabase/supabase-js';

// ❗ Use ONLY the anon public key here (never the service_role key)
const SUPABASE_URL = https://hjrfosdprublctmasoiw.supabase.co;
const SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqcmZvc2RwcnVibGN0bWFzb2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3MTA5MjcsImV4cCI6MjA3MTI4NjkyN30.VdI6S0WAsfNE5wlbPkCi7vZoM4zOsdAspURInUeVaPM;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
