// src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://hjrfosdprublctmasoiw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqcmZvc2RwcnVibGN0bWFzb2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3MTA5MjcsImV4cCI6MjA3MTI4NjkyN30.VdI6S0WAsfNE5wlbPkCi7vZoM4zOsdAspURInUeVaPM'
);