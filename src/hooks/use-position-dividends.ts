import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface PositionDividend {
  id: string;
  position_id: string;
  tipo: 'dividendo' | 'jcp' | 'rendimento' | 'amortizacao';
  valor_por_ativo: number;
  data_com: string | null;
  data_pagamento: string;
  observacao: string | null;
  created_at: string;
}

export function usePositionDividends(positionId: string) {
  const [dividends, setDividends] = useState<PositionDividend[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalDividends, setTotalDividends] = useState(0);

  const fetchDividends = useCallback(async () => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { data, error } = await supabase
        .from('investment_dividends')
        .select('*')
        .eq('position_id', positionId)
        .order('data_pagamento', { ascending: false });

      if (error) throw error;

      setDividends(data || []);
      
      // Calcular total de proventos
      const total = (data || []).reduce((sum, d) => sum + Number(d.valor_por_ativo), 0);
      setTotalDividends(total);
    } catch (error) {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  }, [positionId]);

  useEffect(() => {
    if (positionId) {
      fetchDividends();
    }
  }, [positionId, fetchDividends]);

  return {
    dividends,
    totalDividends,
    loading,
    refetch: fetchDividends,
  };
}
