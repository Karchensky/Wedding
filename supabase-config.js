/**
 * Supabase client configuration
 * Public anon key - safe for browser use, restricted by RLS policies
 */

const SUPABASE_URL = 'https://dutvixuprybiwxsdvzdf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1dHZpeHVwcnliaXd4c2R2emRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMjU4OTAsImV4cCI6MjA4MjYwMTg5MH0.pVXr3FHAO7gPYBU6vwKlyuRQZOmVlFgwP7HyDoCWUbY';

let supabase = null;

// Debug: Check what's available
console.log('Supabase CDN check:', {
    windowSupabase: typeof window.supabase,
    hasCreateClient: window.supabase && typeof window.supabase.createClient
});

// Initialize client
if (window.supabase && typeof window.supabase.createClient === 'function') {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('Supabase client created successfully');
} else {
    console.error('Failed to initialize Supabase - library not loaded');
}
