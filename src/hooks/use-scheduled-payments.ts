"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./use-user";
import { useAccountFilter } from "./use-account-filter";

interface ScheduledPayment {
  id: number;
  descricao: string;
  valor: number;
  data_prevista: string;
  status: 'pendente' | 'pago' | 'cancelado';
  tipo: 'entrada' | 'saida';
  tipo_conta: 'pessoal' | 'pj';
  categoria?: {
    descricao: string;
  };
}

export function useScheduledPayments() {
  const { profile } = useUser();
  const { filter } = useAccountFilter();
  const [payments, setPayments] = useState<ScheduledPayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;

    const fetchPayments = async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        const formatLocalDate = (date: Date) => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };
        const today = formatLocalDate(new Date());
        const next30Days = new Date();
        next30Days.setDate(next30Days.getDate() + 30);

        // Buscar lançamentos futuros pendentes
        const { data, error } = await supabase
          .from('lancamentos_futuros')
          .select(`
            *,
            categoria:categoria_trasacoes(descricao)
          `)
          .eq('usuario_id', profile.id)
          .eq('tipo_conta', filter)
          .eq('status', 'pendente')
          .gte('data_prevista', today)
          .lte('data_prevista', formatLocalDate(next30Days))
          .order('data_prevista', { ascending: true })
          .limit(10);

        if (error) {
          return;
        }

        setPayments(data || []);
      } catch (error) {
        // Erro ao buscar pagamentos
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();

    // Listener para mudanças no filtro
    const handleFilterChange = () => {
      fetchPayments();
    };

    window.addEventListener('accountFilterChange', handleFilterChange);

    return () => {
      window.removeEventListener('accountFilterChange', handleFilterChange);
    };
  }, [profile, filter]);

  return {
    payments,
    loading,
  };
}
