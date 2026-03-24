import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL     = 'https://downwkygtsdmjayfkmxb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvd253a3lndHNkbWpheWZrbXhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMTM4NjgsImV4cCI6MjA4OTg4OTg2OH0.G6hsrz5vnCXtUEDjLqdn_3opTnSkBN3EHamW6LmHWwI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
