"use client";

import { useRealtimeUpdates } from "@/hooks/use-realtime-updates";

/**
 * Componente que ativa as atualizações em tempo real do Supabase.
 * Deve ser inserido dentro do layout do dashboard (autenticado),
 * pois depende do usuário logado para filtrar os dados corretamente.
 * 
 * Não renderiza nada visualmente — apenas hooks internos.
 */
export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  useRealtimeUpdates();
  return <>{children}</>;
}
