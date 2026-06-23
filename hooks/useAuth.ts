// Placeholder — bude implementováno se Supabase auth
// import { useEffect, useState } from 'react';
// import { supabase } from '@/lib/supabase';
// import type { Session } from '@supabase/supabase-js';

export function useAuth() {
  // TODO: subscribe to supabase.auth.onAuthStateChange
  return {
    session: null,
    user: null,
    loading: false,
    signOut: async () => {},
  };
}
