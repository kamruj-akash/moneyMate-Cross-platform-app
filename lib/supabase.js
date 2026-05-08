import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Pulled from a .env file at the project root (see .env.example). Expo
// inlines any process.env.EXPO_PUBLIC_* vars into the client bundle at
// build time. These are *publishable* values — same as what ships in the
// final APK — so they aren't real secrets, but keeping them out of source
// control lets contributors point at their own Supabase project when
// forking the repo.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Hard fail early with a clear hint rather than letting createClient
  // crash with an opaque error deep inside the auth subsystem.
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
    'Copy .env.example to .env and fill in your Supabase project values.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
