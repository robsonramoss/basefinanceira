import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAccountFilter } from './use-account-filter';
import { useEffect } from 'react';
import { getOwnerUUID } from '@/lib/get-owner-uuid';

export interface BankAccount {
  id: string;
  usuario_id: string;
  nome: string;
  saldo_atual: number;
  is_default: boolean;
  is_archived: boolean;
  tipo_conta: 'pessoal' | 'pj';
  banco?: string;
  created_at: string;
  updated_at: string;
}

async function fetchAccountsFromDB(tipoConta: 'pessoal' | 'pj'): Promise<BankAccount[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('contas_bancarias')
    .select('*')
    .eq('tipo_conta', tipoConta)
    .eq('is_archived', false)
    .order('is_default', { ascending: false })
    .order('nome', { ascending: true });

  if (error) throw error;
  return data || [];
}

export function useAccounts(tipoConta: 'pessoal' | 'pj') {
  const { ready: filterReady } = useAccountFilter();
  const queryClient = useQueryClient();

  const queryKey = ['accounts', tipoConta];

  const query = useQuery({
    queryKey,
    queryFn: () => fetchAccountsFromDB(tipoConta),
    enabled: filterReady,
    staleTime: 30_000, // 30s — evita refetch desnecessário
  });

  useEffect(() => {
    const handleUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.refetchQueries({ queryKey: ['accounts'] });
    };
    window.addEventListener('accountsChanged', handleUpdate);
    return () => window.removeEventListener('accountsChanged', handleUpdate);
  }, [queryClient]);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
    queryClient.refetchQueries({ queryKey: ['accounts'] });
  }, [queryClient]);

  const createAccount = async (data: Omit<BankAccount, 'id' | 'usuario_id' | 'created_at' | 'updated_at' | 'is_archived' | 'tipo_conta'>) => {
    const supabase = createClient();
    const ownerUUID = await getOwnerUUID();
    if (!ownerUUID) throw new Error('Usuário não autenticado');

    if (data.is_default) {
      await supabase
        .from('contas_bancarias')
        .update({ is_default: false })
        .eq('usuario_id', ownerUUID)
        .eq('tipo_conta', tipoConta);
    }

    const { error } = await supabase
      .from('contas_bancarias')
      .insert({
        ...data,
        usuario_id: ownerUUID,
        tipo_conta: tipoConta,
        is_archived: false
      });

    if (error) throw error;
    invalidate();
    return true;
  };

  const updateAccount = async (id: string, data: Partial<Omit<BankAccount, 'id' | 'usuario_id' | 'created_at' | 'updated_at'>>) => {
    const supabase = createClient();
    const ownerUUID = await getOwnerUUID();
    if (!ownerUUID) throw new Error('Usuário não autenticado');

    if (data.is_default) {
      await supabase
        .from('contas_bancarias')
        .update({ is_default: false })
        .eq('usuario_id', ownerUUID)
        .eq('tipo_conta', tipoConta)
        .neq('id', id);
    }

    const { error } = await supabase
      .from('contas_bancarias')
      .update(data)
      .eq('id', id)
      .eq('usuario_id', ownerUUID);

    if (error) throw error;
    invalidate();
    return true;
  };

  const archiveAccount = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('contas_bancarias')
      .update({ is_archived: true })
      .eq('id', id);
    if (error) throw error;
    invalidate();
    return true;
  };

  const deleteAccount = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('contas_bancarias')
      .delete()
      .eq('id', id);
    if (error) throw error;
    invalidate();
    return true;
  };

  return {
    accounts: query.data || [],
    loading: query.isLoading,
    // Compatibilidade retroativa com código que chama fetchAccounts()
    fetchAccounts: invalidate,
    createAccount,
    updateAccount,
    archiveAccount,
    deleteAccount
  };
}
