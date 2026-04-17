import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getOwnerUUID } from '@/lib/get-owner-uuid';
import type { PortfolioSummary, TipoConta, PortfolioStats, AssetType } from '@/types/investments';

export function useInvestmentSummary(tipoConta: TipoConta) {
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [stats, setStats] = useState<PortfolioStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      // Limpar estados anteriores ao trocar tipo_conta
      setSummary(null);
      setStats(null);

      const supabase = createClient();

      // Usar getOwnerUUID para garantir que dependentes usem o UUID do principal
      // (mesmo padrão que transações, contas, cartões etc.)
      const ownerUUID = await getOwnerUUID();
      if (!ownerUUID) return;

      // Buscar resumo da view
      const { data: summaryData, error: summaryError } = await supabase
        .from('v_portfolio_summary')
        .select('*')
        .eq('usuario_id', ownerUUID)
        .eq('tipo_conta', tipoConta)
        .single();

      if (summaryError && summaryError.code !== 'PGRST116') {
        // PGRST116 = no rows returned (não é erro)
        throw summaryError;
      }

      setSummary(summaryData || null);

      // Buscar detalhes por tipo de ativo
      const { data: positionsData, error: positionsError } = await supabase
        .from('v_positions_detailed')
        .select('*')
        .eq('usuario_id', ownerUUID)
        .eq('tipo_conta', tipoConta);

      if (positionsError) throw positionsError;

      // Calcular stats por tipo
      const byType: PortfolioStats['byType'] = [];
      const typeMap = new Map<AssetType, { count: number; invested: number; currentValue: number }>();

      positionsData?.forEach(pos => {
        const current = typeMap.get(pos.asset_type) || { count: 0, invested: 0, currentValue: 0 };
        typeMap.set(pos.asset_type, {
          count: current.count + 1,
          invested: current.invested + pos.valor_investido,
          currentValue: current.currentValue + pos.valor_atual,
        });
      });

      const totalValue = summaryData?.valor_atual || 0;

      typeMap.forEach((value, type) => {
        byType.push({
          type,
          count: value.count,
          invested: value.invested,
          currentValue: value.currentValue,
          percentage: totalValue > 0 ? (value.currentValue / totalValue) * 100 : 0,
        });
      });

      // Buscar total de dividendos
      const { data: dividendsData, error: dividendsError } = await supabase
        .from('v_dividends_summary')
        .select('valor_total_proventos')
        .eq('usuario_id', ownerUUID)
        .eq('tipo_conta', tipoConta);

      if (dividendsError) {
      }

      const totalDividends = dividendsData?.reduce((sum, d) => sum + (d.valor_total_proventos || 0), 0) || 0;

      setStats({
        totalAssets: summaryData?.total_ativos || 0,
        totalInvested: summaryData?.valor_investido || 0,
        currentValue: summaryData?.valor_atual || 0,
        profitLoss: summaryData?.lucro_prejuizo || 0,
        profitLossPercentage: summaryData?.rentabilidade_percentual || 0,
        totalDividends,
        byType: byType.sort((a, b) => b.currentValue - a.currentValue),
      });

    } catch (error) {
    } finally {
      setLoading(false);
    }
  }, [tipoConta]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Escutar eventos de mudança nos investimentos para atualizar em tempo real
  useEffect(() => {
    const handleInvestmentsChanged = () => {
      fetchSummary();
    };
    window.addEventListener('investmentsChanged', handleInvestmentsChanged);
    return () => {
      window.removeEventListener('investmentsChanged', handleInvestmentsChanged);
    };
  }, [fetchSummary]);

  return {
    summary,
    stats,
    byType: stats?.byType || [],
    totalDividends: stats?.totalDividends || 0,
    loading,
    fetchSummary,
  };
}
