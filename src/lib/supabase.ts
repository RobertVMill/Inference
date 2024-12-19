import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient | null = null;

// Only initialize on the client side
if (typeof window !== 'undefined') {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl) {
      throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL');
    }
    if (!supabaseAnonKey) {
      throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY');
    }

    // Validate URL format
    try {
      new URL(supabaseUrl);
    } catch (error) {
      console.error('Invalid NEXT_PUBLIC_SUPABASE_URL format:', error);
      throw new Error('Invalid NEXT_PUBLIC_SUPABASE_URL format');
    }

    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  } catch (error) {
    console.error('Error initializing Supabase client:', error);
    // Provide a fallback client that will be replaced on the client side
    supabase = null;
  }
}

export { supabase };

export interface Report {
  id: string;
  title: string;
  content: string;
  source_url?: string;
  event_date?: string;
  created_at: string;
  summary: string;
  key_points: string[];
  entities: Array<{ name: string; type: string }>;
} 