import { createClient } from '@supabase/supabase-js';

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
  throw new Error('Invalid NEXT_PUBLIC_SUPABASE_URL format');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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