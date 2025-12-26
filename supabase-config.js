/**
 * Supabase Configuration for RSVP Storage
 * 
 * To enable RSVP storage:
 * 1. Create a free Supabase account at https://supabase.com
 * 2. Create a new project
 * 3. Run the SQL in migrations/001_create_rsvps_table.sql
 * 4. Replace the placeholder values below with your actual credentials
 * 5. Uncomment the script tag in index.html to load this file
 */

// Replace with your Supabase project URL
const SUPABASE_URL = 'YOUR_SUPABASE_URL';

// Replace with your Supabase anon/public key
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

// Initialize Supabase client (requires Supabase JS library)
// Add this script to your HTML before this file:
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

let supabase;

if (SUPABASE_URL !== 'YOUR_SUPABASE_URL' && SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY') {
    if (typeof window !== 'undefined' && window.supabase) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase client initialized');
    }
}

