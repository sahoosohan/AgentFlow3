// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';
import { appConfig } from '../config';

const supabaseUrl = appConfig.supabaseUrl;
const supabaseAnonKey = appConfig.supabaseAnonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables. ' +
    'Copy .env.example to .env and fill in your Supabase credentials.'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);
