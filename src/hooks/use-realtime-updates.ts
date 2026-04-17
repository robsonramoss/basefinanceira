"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Hook que escuta mudanças no Supabase em tempo real via WebSocket.
 * Quando o n8n (ou qualquer fonte externa) escreve no banco,
 * este hook detecta e dispara os eventos locais para atualizar o app.
 */
export function useRealtimeUpdates() {
  const { profile } = useUser();
  const queryClient = useQueryClient();
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!profile?.id) return;

    const supabase = createClient();
    const userId = profile.id;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`realtime-updates-${userId}`)

      // ✅ transacoes → cards de stats, gráficos, saldo de contas, metas
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transacoes', filter: `usuario_id=eq.${userId}` },
        () => {
          window.dispatchEvent(new CustomEvent('transactionsChanged'));
          window.dispatchEvent(new CustomEvent('accountsChanged'));
        }
      )

      // ✅ lancamentos_futuros → programados, cards "A Pagar/A Receber"
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lancamentos_futuros', filter: `usuario_id=eq.${userId}` },
        () => {
          window.dispatchEvent(new CustomEvent('futureTransactionsChanged'));
        }
      )

      // ✅ contas_bancarias → visão patrimonial, saldos
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contas_bancarias', filter: `usuario_id=eq.${userId}` },
        () => {
          window.dispatchEvent(new CustomEvent('accountsChanged'));
        }
      )

      // ✅ cartoes_credito → visão patrimonial, faturas
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cartoes_credito', filter: `usuario_id=eq.${userId}` },
        () => {
          window.dispatchEvent(new CustomEvent('creditCardsChanged'));
        }
      )

      // ✅ investment_positions → portfólio, carteira
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'investment_positions', filter: `usuario_id=eq.${userId}` },
        () => {
          window.dispatchEvent(new CustomEvent('investmentsChanged'));
        }
      )

      // ✅ investment_assets → preços dos ativos (tabela compartilhada)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'investment_assets' },
        () => {
          window.dispatchEvent(new CustomEvent('investmentsChanged'));
        }
      )

      // ✅ metas_orcamento → página de metas, progresso
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'metas_orcamento', filter: `usuario_id=eq.${userId}` },
        () => {
          window.dispatchEvent(new CustomEvent('transactionsChanged'));
        }
      )

      // ✅ lembretes → página de compromissos
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lembretes', filter: `usuario_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['lembretes'] });
        }
      )

      // ✅ categoria_trasacoes → selects de categoria nos modais
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categoria_trasacoes', filter: `usuario_id=eq.${userId}` },
        () => {
          window.dispatchEvent(new CustomEvent('categoriesChanged'));
        }
      )

      .subscribe((status) => {
        if (process.env.NODE_ENV === 'development') {
          console.log('[Realtime] Status:', status);
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [profile?.id, queryClient]);
}
