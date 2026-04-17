import { createClient } from '@/lib/supabase/client';

/**
 * Retorna o UUID do proprietário dos dados:
 * - Se for usuário principal: retorna seu próprio auth.uid()
 * - Se for dependente: retorna o auth_user do principal
 * 
 * Usa a RPC obter_uuid_proprietario() com SECURITY DEFINER para evitar
 * problemas de RLS ao tentar fazer join na tabela usuarios.
 * 
 * Esta é a mesma função usada pelas RLS policies dos investimentos:
 * `obter_uuid_proprietario() = usuario_id`
 */
export async function getOwnerUUID(): Promise<string | null> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Usar RPC SECURITY DEFINER que já existe no banco
  // Evita o erro 406 do join usuarios!inner(auth_user) bloqueado por RLS
  const { data, error } = await supabase.rpc('obter_uuid_proprietario');

  if (error || data == null) {
    // Fallback: retornar próprio UUID (funciona para principais, falha silenciosamente para dependentes)
    return user.id;
  }

  return data as string;
}
