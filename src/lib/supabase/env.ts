/**
 * Supabase config. Uses env vars if set, otherwise project defaults.
 * Note: ?? doesn't catch empty string - Vercel may pass "" for missing vars.
 */
const FALLBACK_URL = "https://wxkauqhlaiyxpiebmvkb.supabase.co";
const FALLBACK_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4a2F1cWhsYWl5eHBpZWJtdmtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxOTg0NzIsImV4cCI6MjA4NTc3NDQ3Mn0.qrbVO80ZUCjoc9YfVeWjB6AFgPUY5R9LtnSiQooyb-U";
const FALLBACK_SERVICE =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4a2F1cWhsYWl5eHBpZWJtdmtiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDE5ODQ3MiwiZXhwIjoyMDg1Nzc0NDcyfQ.4FifmjqQ6vQVN-kzOhrueKsS-BVQ3ga4TTckYnd9IOc";

export const SUPABASE_URL =
  (typeof process !== "undefined" &&
    process.env?.NEXT_PUBLIC_SUPABASE_URL?.trim()) ||
  FALLBACK_URL;

export const SUPABASE_ANON_KEY =
  (typeof process !== "undefined" &&
    process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()) ||
  FALLBACK_ANON;

export const SUPABASE_SERVICE_ROLE_KEY =
  (typeof process !== "undefined" &&
    process.env?.SUPABASE_SERVICE_ROLE_KEY?.trim()) ||
  FALLBACK_SERVICE;
