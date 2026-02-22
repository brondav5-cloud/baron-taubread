/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Force Supabase config into client bundle (Vercel env vars unreliable)
  env: {
    NEXT_PUBLIC_SUPABASE_URL: "https://wxkauqhlaiyxpiebmvkb.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4a2F1cWhsYWl5eHBpZWJtdmtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxOTg0NzIsImV4cCI6MjA4NTc3NDQ3Mn0.qrbVO80ZUCjoc9YfVeWjB6AFgPUY5R9LtnSiQooyb-U",
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
    ],
  },
  // Ensure proper handling of Firebase
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

module.exports = nextConfig;
