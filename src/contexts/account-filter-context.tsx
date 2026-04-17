"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type AccountFilter = "pessoal" | "pj";

interface AccountFilterContextType {
  filter: AccountFilter;
  changeFilter: (filter: AccountFilter) => void;
  isPessoal: boolean;
  isPJ: boolean;
  ready: boolean;
}

const AccountFilterContext = createContext<AccountFilterContextType | undefined>(undefined);

export function AccountFilterProvider({ children }: { children: React.ReactNode }) {
  const [filter, setFilter] = useState<AccountFilter>("pessoal");
  const [ready, setReady] = useState(false);

  // Restaurar filtro do localStorage após montagem para evitar hydration mismatch
  useEffect(() => {
    const saved = localStorage.getItem('account_filter') as AccountFilter;
    if (saved && ['pessoal', 'pj'].includes(saved)) {
      setFilter(saved);
    }
    setReady(true);
  }, []);

  // Forçar filtro correto baseado nas permissões do dependente
  // Isso roda assim que o profile é carregado e garante que
  // o filtro esteja num valor válido para o tipo de conta permitido
  useEffect(() => {
    if (!ready) return;
    // Ler perfil do cache do localStorage (disponível antes do hook useUser)
    try {
      const cached = localStorage.getItem('user_profile_cache');
      if (!cached) return;
      const parsed = JSON.parse(cached);
      const profile = parsed?.profile;
      if (!profile?.is_dependente) return;

      const tiposPermitidos: string[] = profile.tipos_conta_permitidos || ['pessoal', 'pj'];
      const podeVerPessoal = tiposPermitidos.includes('pessoal');
      const podeVerPJ = tiposPermitidos.includes('pj');

      if (filter === 'pessoal' && !podeVerPessoal && podeVerPJ) {
        setFilter('pj');
        localStorage.setItem('account_filter', 'pj');
      } else if (filter === 'pj' && !podeVerPJ && podeVerPessoal) {
        setFilter('pessoal');
        localStorage.setItem('account_filter', 'pessoal');
      }
    } catch (e) {
      // Ignorar erros de parsing
    }
  }, [ready, filter]);

  const changeFilter = (newFilter: AccountFilter) => {
    setFilter(newFilter);
    localStorage.setItem('account_filter', newFilter);

    // Disparar evento para compatibilidade com código legado que possa ouvir o evento
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('accountFilterChange', { detail: newFilter }));
    }
  };

  return (
    <AccountFilterContext.Provider
      value={{
        filter,
        changeFilter,
        isPessoal: filter === "pessoal",
        isPJ: filter === "pj",
        ready
      }}
    >
      {children}
    </AccountFilterContext.Provider>
  );
}

export function useAccountFilterContext() {
  const context = useContext(AccountFilterContext);
  if (context === undefined) {
    throw new Error("useAccountFilterContext must be used within a AccountFilterProvider");
  }
  return context;
}

