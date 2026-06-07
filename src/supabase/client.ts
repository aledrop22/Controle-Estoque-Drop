// supabase/client.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://lroxouwlciplbvitqzmh.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sbp_58daab3375aaac8be6accab257713a83030bba5d';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL e ANON_KEY são necessários');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
