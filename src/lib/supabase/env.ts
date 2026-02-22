/**
 * Supabase config with fallbacks for when Vercel env vars are not available at build/runtime.
 * Uses process.env first, falls back to project defaults.
 */
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://wxkauqhlaiyxpiebmvkb.supabase.co";

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4a2F1cWhsYWl5eHBpZWJtdmtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxOTg0NzIsImV4cCI6MjA4NTc3NDQ3Mn0.qrbVO80ZUCjoc9YfVeWjB6AFgPUY5R9LtnSiQooyb-U";

export const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4a2F1cWhsYWl5eHBpZWJtdmtiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDE5ODQ3MiwiZXhwIjoyMDg1Nzc0NDcyfQ.4FifmjqQ6vQVN-kzOhrueKsS-BVQ3ga4TTckYnd9IOc";
