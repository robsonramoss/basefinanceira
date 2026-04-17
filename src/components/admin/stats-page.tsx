"use client";

import { useEffect, useState } from "react";
import { BarChart3, Users, CreditCard, DollarSign, TrendingUp, Activity } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Stats {
  total_usuarios: number;
  usuarios_ativos: number;
  usuarios_ativos_validos: number;
  usuarios_plano_vencido: number;
  usuarios_inativos: number;
  usuarios_com_senha: number;
  usuarios_free: number;
  usuarios_pagos: number;
  taxa_conversao: number;
  total_planos: number;
  planos_ativos: number;
  receita_mensal_estimada: number;
  receita_anual_estimada: number;
  usuarios_por_plano: { plano: string; count: number }[];
}

export function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Usar RPC para buscar estatísticas (bypassa RLS com SECURITY DEFINER)
      const { data: statsRpc, error: statsError } = await supabase.rpc('admin_get_system_stats');
      
      if (statsError) {
        // Error handled - early return below
        return;
      }
      
      if (statsRpc) {
        setStats(statsRpc);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-[var(--text-primary)]">Carregando estatísticas...</div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="mb-6 lg:mb-8">
        <div className="flex items-center gap-2 lg:gap-3 mb-2">
          <BarChart3 className="w-6 h-6 lg:w-8 lg:h-8 text-[#22C55E]" />
          <h1 className="text-2xl lg:text-3xl font-bold text-[var(--text-primary)]">Estatísticas do Sistema</h1>
        </div>
        <p className="text-sm lg:text-base text-[var(--text-secondary)]">Visão geral dos dados da plataforma</p>
      </div>

      {/* Cards de Estatísticas - Linha 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-4 lg:mb-6">
        {/* Total de Usuários */}
        <div className="bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-xl p-4 lg:p-6">
          <div className="flex items-center justify-between mb-4">
            <Users className="w-8 h-8 text-blue-400" />
            <div className="text-3xl font-bold text-[var(--text-primary)]">{stats?.total_usuarios || 0}</div>
          </div>
          <div className="text-sm text-[var(--text-secondary)]">Total de Usuários</div>
        </div>

        {/* Usuários Ativos */}
        <div className="bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-xl p-4 lg:p-6">
          <div className="flex items-center justify-between mb-4">
            <Activity className="w-8 h-8 text-green-400" />
            <div className="text-3xl font-bold text-[var(--text-primary)]">{stats?.usuarios_ativos_validos || 0}</div>
          </div>
          <div className="text-sm text-[var(--text-secondary)]">Usuários Ativos (Plano Válido)</div>
          {(stats?.usuarios_plano_vencido ?? 0) > 0 && (
            <div className="text-xs text-orange-400 mt-1">
              ⚠️ {stats?.usuarios_plano_vencido} com plano vencido
            </div>
          )}
        </div>

        {/* Usuários Pagos */}
        <div className="bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-xl p-4 lg:p-6">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="w-8 h-8 text-emerald-400" />
            <div className="text-3xl font-bold text-[var(--text-primary)]">{stats?.usuarios_pagos || 0}</div>
          </div>
          <div className="text-sm text-[var(--text-secondary)]">Usuários Pagos</div>
          <div className="text-xs text-emerald-400 mt-1">
            {stats?.taxa_conversao?.toFixed(1) || 0}% de conversão
          </div>
        </div>

        {/* Total de Planos */}
        <div className="bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-xl p-4 lg:p-6">
          <div className="flex items-center justify-between mb-4">
            <CreditCard className="w-8 h-8 text-purple-400" />
            <div className="text-3xl font-bold text-[var(--text-primary)]">{stats?.total_planos || 0}</div>
          </div>
          <div className="text-sm text-[var(--text-secondary)]">Planos Cadastrados</div>
        </div>
      </div>

      {/* Cards de Estatísticas - Linha 2 (Receitas) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 mb-6 lg:mb-8">
        {/* Receita Mensal Estimada */}
        <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border border-yellow-500/20 rounded-xl p-4 lg:p-6">
          <div className="flex items-center justify-between mb-4">
            <DollarSign className="w-8 h-8 text-yellow-400" />
            <div className="text-xl lg:text-2xl font-bold text-[var(--text-primary)]">
              {formatCurrency(stats?.receita_mensal_estimada || 0)}
            </div>
          </div>
          <div className="text-sm text-[var(--text-secondary)]">Receita Mensal Estimada</div>
          <div className="text-xs text-yellow-400 mt-1">
            Baseado em {stats?.usuarios_pagos || 0} usuários pagos
          </div>
        </div>

        {/* Receita Anual Estimada */}
        <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-xl p-4 lg:p-6">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="w-8 h-8 text-green-400" />
            <div className="text-xl lg:text-2xl font-bold text-[var(--text-primary)]">
              {formatCurrency(stats?.receita_anual_estimada || 0)}
            </div>
          </div>
          <div className="text-sm text-[var(--text-secondary)]">Receita Anual Estimada</div>
          <div className="text-xs text-green-400 mt-1">
            Projeção anual (12 meses)
          </div>
        </div>
      </div>

      {/* Detalhes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Usuários por Status */}
        <div className="bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-xl p-4 lg:p-6">
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">Usuários por Status</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-[var(--text-secondary)]">Ativos (Plano Válido)</span>
              </div>
              <span className="text-[var(--text-primary)] font-bold">{stats?.usuarios_ativos_validos || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                <span className="text-[var(--text-secondary)]">Plano Vencido</span>
              </div>
              <span className="text-[var(--text-primary)] font-bold">{stats?.usuarios_plano_vencido || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-[var(--text-secondary)]">Inativos</span>
              </div>
              <span className="text-[var(--text-primary)] font-bold">{stats?.usuarios_inativos || 0}</span>
            </div>
            <div className="flex items-center justify-between border-t border-[var(--border-medium)] pt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span className="text-[var(--text-secondary)]">Plano Pago</span>
              </div>
              <span className="text-[var(--text-primary)] font-bold">{stats?.usuarios_pagos || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                <span className="text-[var(--text-secondary)]">Plano Free</span>
              </div>
              <span className="text-[var(--text-primary)] font-bold">{stats?.usuarios_free || 0}</span>
            </div>
          </div>
        </div>

        {/* Usuários por Plano */}
        <div className="bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-xl p-4 lg:p-6">
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">Usuários por Plano</h2>
          <div className="space-y-4">
            {stats?.usuarios_por_plano.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-[var(--text-secondary)]">{item.plano}</span>
                <span className="text-[var(--text-primary)] font-bold">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
