"use client";

import { create } from 'zustand';
import { useUser } from './use-user';

interface UserFilterState {
  filter: 'todos' | 'principal' | number; // 'todos', 'principal', ou dependente_id
  setFilter: (filter: 'todos' | 'principal' | number) => void;
}

export const useUserFilterStore = create<UserFilterState>((set) => ({
  filter: 'todos',
  setFilter: (filter) => set({ filter }),
}));

export function useUserFilter() {
  const { profile } = useUser();
  const { filter, setFilter } = useUserFilterStore();

  const isDependente = profile?.is_dependente || false;
  const dependenteId = profile?.dependente_id;

  // Ler permissões do dependente direto do profile (já vem preenchido em use-user.ts)
  const permissoes = isDependente ? (profile?.permissoes as any) : null;

  // Verificar permissões diretamente: se campo não existe, default é true (permissivo)
  const podeVerAdmin = !isDependente || (permissoes?.pode_ver_dados_admin !== false);
  const podeVerOutros = !isDependente || (permissoes?.pode_ver_outros_membros !== false);

  // Calcular filtro efetivo respeitando as permissões
  let effectiveFilter: 'todos' | 'principal' | number = filter;

  if (isDependente) {
    if (!podeVerAdmin && !podeVerOutros) {
      // Não pode ver nada além dos próprios: forçar sempre para o próprio dependente_id
      effectiveFilter = dependenteId || 0;
    } else if (!podeVerAdmin && (filter === 'todos' || filter === 'principal')) {
      // Pode ver outros membros mas não o admin:
      // 'todos' = tudo exceto admin, mas como não temos esse filtro granular, usa só seus dados
      // 'principal' = bloqueado → forçar para seus próprios dados
      effectiveFilter = dependenteId || 0;
    }
    // Se podeVerAdmin = true → sem restrição no filtro
  }

  return {
    filter: effectiveFilter,
    setFilter,
    canFilter: true,
    isDependente,
    dependenteId,
    podeVerAdmin,
    podeVerOutros,
  };
}
