"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./use-user";

export interface InvoiceItem {
  id: number;
  descricao: string;
  valor: number;
  data_prevista: string;
  categoria_id: number;
  status: 'pendente' | 'pago' | 'cancelado';
  data_efetivacao?: string | null;
  created_at?: string | null;
  parcela_info: {
    numero: number;
    total: number;
    valor_original: number;
  } | string | null;
  parcela_atual?: number | null;
  numero_parcelas?: number | null;
  parcelamento?: string | null;
}

export interface InvoiceSummary {
  total: number;
  items: InvoiceItem[];
  limite_usado: number;
  limite_disponivel: number;
  isPaid: boolean;
  totalPaid: number;
  dataPagamento: string | null;
  pendingCount: number;
  paidCount: number;
}

async function fetchCardInvoice(
  userId: number,
  cardId: string,
  month: string // formato: YYYY-MM
): Promise<InvoiceSummary> {
  const supabase = createClient();

  // Buscar informações do cartão (incluindo dia_fechamento para calcular ciclo)
  const { data: card, error: cardError } = await supabase
    .from('cartoes_credito')
    .select('limite_total, dia_fechamento')
    .eq('id', cardId)
    .single();

  if (cardError) throw cardError;

  // Buscar lançamentos futuros do mês (pendentes E pagos para histórico)
  // Adicionar timestamp para evitar cache
  const { data: items, error: itemsError } = await supabase
    .from('lancamentos_futuros')
    .select('*, categoria:categoria_trasacoes(descricao)')
    .eq('usuario_id', userId)
    .eq('cartao_id', cardId)
    .in('status', ['pendente', 'pago'])
    .eq('mes_previsto', month)
    .order('created_at', { ascending: false }); // Ordenar por data de criação (mais recente primeiro)

  if (itemsError) throw itemsError;

  // Total apenas dos pendentes (para o valor da fatura)
  const total = items?.filter(item => item.status === 'pendente')
    .reduce((sum, item) => sum + Number(item.valor), 0) || 0;

  // Calcular mês do ciclo atual de fatura
  const hoje = new Date();
  const diaHoje = hoje.getDate();
  let mesAtual = hoje.getMonth() + 1;
  let anoAtual = hoje.getFullYear();
  
  // Se já passou do fechamento, o ciclo atual é para o próximo mês
  if (diaHoje >= card.dia_fechamento) {
    mesAtual++;
    if (mesAtual > 12) {
      mesAtual = 1;
      anoAtual++;
    }
  }
  
  const mesCicloAtual = `${anoAtual}-${String(mesAtual).padStart(2, '0')}`;

  // Buscar TODOS os lançamentos pendentes do cartão
  const { data: allPending, error: pendingError } = await supabase
    .from('lancamentos_futuros')
    .select('valor, recorrente, mes_previsto')
    .eq('usuario_id', userId)
    .eq('cartao_id', cardId)
    .eq('status', 'pendente');

  if (pendingError) throw pendingError;

  // Calcular limite usado:
  // - Lançamentos NORMAIS e PARCELADOS: contam todos os pendentes (todas as faturas)
  // - Lançamentos RECORRENTES: contam apenas o do ciclo atual (fatura aberta)
  const limite_usado = allPending?.reduce((sum, item) => {
    if (item.recorrente) {
      // Recorrente: só conta se for do ciclo atual
      return item.mes_previsto === mesCicloAtual ? sum + Number(item.valor) : sum;
    } else {
      // Normal ou parcelado: conta sempre
      return sum + Number(item.valor);
    }
  }, 0) || 0;
  
  const limite_disponivel = Number(card.limite_total) - limite_usado;

  // Verificar se a fatura foi paga
  const paidItems = items?.filter(item => item.status === 'pago') || [];
  const isPaid = paidItems.length > 0 && items?.every(item => item.status === 'pago');
  const totalPaid = paidItems.reduce((sum, item) => sum + Number(item.valor), 0);
  const dataPagamento = paidItems[0]?.data_efetivacao || null;

  return {
    total,
    items: items || [],
    limite_usado,
    limite_disponivel,
    isPaid,
    totalPaid,
    dataPagamento,
    pendingCount: items?.filter(item => item.status === 'pendente').length || 0,
    paidCount: paidItems.length,
  };
}

export function useCardInvoice(cardId: string, month: string) {
  const { profile } = useUser();
  const queryClient = useQueryClient();

  const queryKey = ['card-invoice', profile?.id, cardId, month];

  const query = useQuery({
    queryKey,
    queryFn: () => {
      if (!profile) throw new Error('User not authenticated');
      return fetchCardInvoice(profile.id, cardId, month);
    },
    enabled: !!profile && !!cardId && !!month,
    staleTime: 0, // Sempre buscar dados frescos
    gcTime: 0, // Não manter cache
    refetchOnMount: 'always', // Sempre refetch ao montar
    refetchOnWindowFocus: true, // Refetch ao focar na janela
  });

  // Escutar eventos de atualização
  useEffect(() => {
    const handleUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['card-invoice'] });
      queryClient.refetchQueries({ queryKey: ['card-invoice'] });
    };

    window.addEventListener('creditCardsChanged', handleUpdate);
    window.addEventListener('futureTransactionsChanged', handleUpdate);
    
    return () => {
      window.removeEventListener('creditCardsChanged', handleUpdate);
      window.removeEventListener('futureTransactionsChanged', handleUpdate);
    };
  }, [queryClient]);

  return {
    invoice: query.data,
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
