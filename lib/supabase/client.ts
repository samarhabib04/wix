'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://sehzakutrlropprdcewu.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlaHpha3V0cmxyb3BwcmRjZXd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5MjA4OTEsImV4cCI6MjA2MTQ5Njg5MX0.Ufbtalt1Uw_YRbeev_3KKQ8AuxNCrmzuMPOQC9hko6Q";

/**
 * Browser client must use @supabase/ssr createBrowserClient (cookie storage), not plain
 * createClient + localStorage. Middleware only sees cookies — localStorage-only sessions
 * caused: sign-in OK in UI, then full navigation to /admin-dashboard → middleware has no
 * user → redirect to /auth/login?next=… → stuck with blank login body.
 */
export const supabase = createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
