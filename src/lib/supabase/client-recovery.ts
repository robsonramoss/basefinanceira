import { createClient } from '@supabase/supabase-js'

// Client específico para recuperação de senha
// Usa @supabase/supabase-js diretamente (não SSR) para forçar implicit flow
// Isso garante que o email terá token_hash ao invés de pkce_code
export function createRecoveryClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // Força implicit flow (token_hash) ao invés de PKCE
        // Isso permite que o link funcione em qualquer dispositivo/navegador
        flowType: 'implicit',
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    }
  )
}
