import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // Persiste sessão mesmo após refresh
        persistSession: true,
        // Auto-refresh token antes de expirar
        autoRefreshToken: true,
        // PKCE flow para autenticação normal (login, signup, etc)
        flowType: 'pkce',
      },
      global: {
        headers: {
          'x-client-info': 'granazap-web',
        },
      },
    }
  )
}
