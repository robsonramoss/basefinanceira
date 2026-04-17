"use client";

import { useMemo, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  Target,
  X,
  CreditCard,
  Wallet,
  Receipt,
  ShoppingBag,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/language-context";
import { useCurrency } from "@/contexts/currency-context";
import { useAccountFilter } from "@/hooks/use-account-filter";
import { useUser } from "@/hooks/use-user";
import { useUserFilter } from "@/hooks/use-user-filter";
import { createClient } from "@/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";

const COLORS = ['#22C55E', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#06B6D4', '#A855F7'];

interface MonthlyCategory {
  month: string;
  monthLabel: string;
  categories: Record<string, number>;
  total: number;
}

interface MonthDetail {
  categoryName: string;
  monthKey: string;
  monthLabel: string;
  color: string;
}

interface MonthDetailData {
  transactions: any[];
  cardEntries: any[];
  byCard: { name: string; total: number; entries: any[] }[];
  totalTrans: number;
  totalCard: number;
  total: number;
}

async function fetchMonthlyExpenses(
  userId: number,
  accountFilter: 'pessoal' | 'pj',
  months: number,
  userFilter?: 'todos' | 'principal' | number | null
) {
  const supabase = createClient();
  const now = new Date();

  const startDate = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  let query = supabase
    .from('transacoes')
    .select(`
      data, valor, tipo,
      categoria:categoria_trasacoes!inner(descricao)
    `)
    .eq('usuario_id', userId)
    .eq('tipo_conta', accountFilter)
    .eq('tipo', 'saida')
    .gte('data', formatLocalDate(startDate))
    .lte('data', formatLocalDate(endDate))
    .or('is_transferencia.is.null,is_transferencia.eq.false');

  if (userFilter === 'principal') {
    query = query.is('dependente_id', null);
  } else if (typeof userFilter === 'number' && userFilter > 0) {
    query = query.eq('dependente_id', userFilter);
  }

  const { data, error } = await query.order('data', { ascending: true });
  if (error) throw error;

  const filtered = (data || []).filter(
    (t: any) => !t.descricao?.toLowerCase().includes('pagamento fatura')
  );

  let futureQuery = supabase
    .from('lancamentos_futuros')
    .select(`
      data_prevista, valor, tipo, status, cartao_id,
      categoria:categoria_trasacoes!inner(descricao)
    `)
    .eq('usuario_id', userId)
    .eq('tipo_conta', accountFilter)
    .eq('tipo', 'saida')
    .not('cartao_id', 'is', null)
    .gte('data_prevista', formatLocalDate(startDate))
    .lte('data_prevista', formatLocalDate(endDate));

  const { data: futureData } = await futureQuery;

  const monthlyMap = new Map<string, MonthlyCategory>();

  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1) + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = format(d, 'MMM/yy', { locale: ptBR });
    monthlyMap.set(key, { month: key, monthLabel: label, categories: {}, total: 0 });
  }

  filtered.forEach((t: any) => {
    const date = new Date(t.data + 'T12:00:00');
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const entry = monthlyMap.get(key);
    if (entry) {
      const catName = t.categoria?.descricao || 'Outros';
      entry.categories[catName] = (entry.categories[catName] || 0) + Number(t.valor);
      entry.total += Number(t.valor);
    }
  });

  (futureData || []).forEach((t: any) => {
    if (t.status === 'cancelado') return;
    const date = new Date(t.data_prevista + 'T12:00:00');
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const entry = monthlyMap.get(key);
    if (entry) {
      const catName = t.categoria?.descricao || 'Outros';
      entry.categories[catName] = (entry.categories[catName] || 0) + Number(t.valor);
      entry.total += Number(t.valor);
    }
  });

  return Array.from(monthlyMap.values());
}

async function fetchCategoryMonthDetail(
  userId: number,
  accountFilter: 'pessoal' | 'pj',
  categoryName: string,
  monthKey: string,
  userFilter?: 'todos' | 'principal' | number | null
): Promise<MonthDetailData> {
  const supabase = createClient();
  const [yearStr, monthStr] = monthKey.split('-');
  const year = parseInt(yearStr);
  const month = parseInt(monthStr);
  const startDate = `${yearStr}-${monthStr}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${yearStr}-${monthStr}-${String(lastDay).padStart(2, '0')}`;

  // NOTA: categoria_trasacoes tem RLS ativo sem políticas SELECT para authenticated.
  // Evitamos query direta nessa tabela. Usamos !inner join igual ao fetchMonthlyExpenses,
  // que resolve o join no nível do DB (não passa pelo RLS do cliente).
  // Filtramos pelo nome da categoria client-side após buscar os dados.

  // Passo 1: buscar transações efetivadas com join na categoria
  let transQuery = supabase
    .from('transacoes')
    .select(`
      id, data, descricao, valor,
      categoria:categoria_trasacoes!inner(descricao)
    `)
    .eq('usuario_id', userId)
    .eq('tipo_conta', accountFilter)
    .eq('tipo', 'saida')
    .gte('data', startDate)
    .lte('data', endDate)
    .or('is_transferencia.is.null,is_transferencia.eq.false');

  if (userFilter === 'principal') {
    transQuery = transQuery.is('dependente_id', null);
  } else if (typeof userFilter === 'number' && userFilter > 0) {
    transQuery = transQuery.eq('dependente_id', userFilter);
  }

  const { data: transData } = await transQuery.order('data', { ascending: false });

  // Filtrar client-side pelo nome da categoria (evita RLS do direct query)
  const filteredTrans = (transData || []).filter((t: any) =>
    t.categoria?.descricao === categoryName &&
    !t.descricao?.toLowerCase().includes('pagamento fatura')
  );

  // Passo 2: buscar lançamentos de cartão com join na categoria
  const { data: futureData } = await supabase
    .from('lancamentos_futuros')
    .select(`
      id, data_prevista, descricao, valor, status, cartao_id,
      cartao:cartoes_credito(nome, dia_vencimento),
      categoria:categoria_trasacoes!inner(descricao)
    `)
    .eq('usuario_id', userId)
    .eq('tipo_conta', accountFilter)
    .eq('tipo', 'saida')
    .not('cartao_id', 'is', null)
    .gte('data_prevista', startDate)
    .lte('data_prevista', endDate)
    .neq('status', 'cancelado');

  // Filtrar client-side pelo nome da categoria
  const filteredFuture = (futureData || []).filter((t: any) =>
    t.categoria?.descricao === categoryName
  );

  const byCardMap = new Map<string, { name: string; total: number; entries: any[] }>();
  filteredFuture.forEach((t: any) => {
    const key = t.cartao_id;
    const cardName = t.cartao?.nome || 'Cartão';
    if (!byCardMap.has(key)) {
      byCardMap.set(key, { name: cardName, total: 0, entries: [] });
    }
    const card = byCardMap.get(key)!;
    card.total += Number(t.valor);
    card.entries.push(t);
  });

  const totalTrans = filteredTrans.reduce((s: number, t: any) => s + Number(t.valor), 0);
  const totalCard = filteredFuture.reduce((s: number, t: any) => s + Number(t.valor), 0);

  return {
    transactions: filteredTrans,
    cardEntries: filteredFuture,
    byCard: Array.from(byCardMap.values()).sort((a, b) => b.total - a.total),
    totalTrans,
    totalCard,
    total: totalTrans + totalCard,
  };
}


interface CategorySpendingAnalysisProps {
  className?: string;
}

// Sub-component to avoid TypeScript narrowing issues with nullable state
function CategoryDetailModal({
  detail,
  monthData,
  isLoading,
  onClose,
  formatCurrency,
}: {
  detail: MonthDetail;
  monthData: MonthDetailData | undefined;
  isLoading: boolean;
  onClose: () => void;
  formatCurrency: (v: number) => string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative w-full sm:max-w-md bg-[var(--bg-card)] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{
          maxHeight: '88vh',
          borderTop: `3px solid ${detail.color}`,
          border: `1px solid ${detail.color}40`,
          borderTopWidth: '3px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-[var(--border-medium)]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-[var(--border-default)]">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: detail.color + '20', border: `1.5px solid ${detail.color}50` }}
            >
              <ShoppingBag className="w-4 h-4" style={{ color: detail.color }} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)] leading-tight">{detail.categoryName}</h3>
              <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider mt-0.5">{detail.monthLabel}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-4 sm:px-5 py-4 space-y-4 custom-scrollbar">
          {isLoading ? (
            <div className="space-y-3 py-2">
              <div className="h-20 bg-[var(--bg-hover)] rounded-xl animate-pulse" />
              <div className="grid grid-cols-2 gap-2">
                <div className="h-16 bg-[var(--bg-hover)] rounded-xl animate-pulse" />
                <div className="h-16 bg-[var(--bg-hover)] rounded-xl animate-pulse" />
              </div>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 bg-[var(--bg-hover)] rounded-lg animate-pulse" />
              ))}
            </div>
          ) : monthData ? (
            <>
              {/* Total highlight */}
              <div
                className="rounded-xl p-4 text-center"
                style={{ backgroundColor: detail.color + '12', border: `1px solid ${detail.color}25` }}
              >
                <p className="text-2xl sm:text-3xl font-bold font-mono" style={{ color: detail.color }}>
                  {formatCurrency(monthData.total)}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {monthData.cardEntries.length + monthData.transactions.length} lançamento
                  {monthData.cardEntries.length + monthData.transactions.length !== 1 ? 's' : ''} em {detail.monthLabel}
                </p>
              </div>

              {/* Resumo por origem (cartões + débito) */}
              {(monthData.byCard.length > 0 || monthData.totalTrans > 0) && (
                <div className={cn(
                  "grid gap-2",
                  monthData.byCard.length + (monthData.totalTrans > 0 ? 1 : 0) === 1 ? 'grid-cols-1' : 'grid-cols-2'
                )}>
                  {monthData.byCard.map((card) => (
                    <div key={card.name} className="bg-[var(--bg-hover)] rounded-xl p-3 border border-[var(--border-default)]">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <CreditCard className="w-3 h-3 text-[var(--text-muted)] flex-shrink-0" />
                        <p className="text-[10px] text-[var(--text-muted)] truncate font-medium">{card.name}</p>
                      </div>
                      <p className="text-sm font-bold font-mono text-[var(--text-primary)]">{formatCurrency(card.total)}</p>
                      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                        {card.entries.length} lançamento{card.entries.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  ))}
                  {monthData.totalTrans > 0 && (
                    <div className="bg-[var(--bg-hover)] rounded-xl p-3 border border-[var(--border-default)]">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Wallet className="w-3 h-3 text-[var(--text-muted)] flex-shrink-0" />
                        <p className="text-[10px] text-[var(--text-muted)] font-medium">Débito / Pix</p>
                      </div>
                      <p className="text-sm font-bold font-mono text-[var(--text-primary)]">{formatCurrency(monthData.totalTrans)}</p>
                      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                        {monthData.transactions.length} lançamento{monthData.transactions.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Lançamentos por cartão */}
              {monthData.byCard.map((card) => (
                <div key={card.name}>
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="w-3.5 h-3.5 text-[var(--text-muted)] flex-shrink-0" />
                    <h4 className="text-xs font-semibold text-[var(--text-secondary)]">{card.name}</h4>
                    <div className="flex-1 h-px bg-[var(--border-default)]" />
                    <span className="text-xs font-mono font-medium text-[var(--text-primary)]">{formatCurrency(card.total)}</span>
                  </div>
                  <div className="space-y-1.5">
                    {card.entries
                      .slice()
                      .sort((a: any, b: any) => Number(b.valor) - Number(a.valor))
                      .map((entry: any) => (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between py-2 px-3 rounded-lg bg-[var(--bg-hover)] border border-[var(--border-default)] gap-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: detail.color }}
                            />
                            <span className="text-xs text-[var(--text-primary)] truncate">{entry.descricao}</span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {entry.status === 'pendente' && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 hidden sm:inline">
                                pendente
                              </span>
                            )}
                            <span className="text-xs font-mono font-semibold text-[var(--text-primary)]">
                              {formatCurrency(Number(entry.valor))}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}

              {/* Lançamentos efetivados (débito/pix) */}
              {monthData.transactions.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet className="w-3.5 h-3.5 text-[var(--text-muted)] flex-shrink-0" />
                    <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Débito / Pix</h4>
                    <div className="flex-1 h-px bg-[var(--border-default)]" />
                    <span className="text-xs font-mono font-medium text-[var(--text-primary)]">{formatCurrency(monthData.totalTrans)}</span>
                  </div>
                  <div className="space-y-1.5">
                    {monthData.transactions.map((t: any) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between py-2 px-3 rounded-lg bg-[var(--bg-hover)] border border-[var(--border-default)] gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: detail.color }}
                          />
                          <div className="min-w-0">
                            <p className="text-xs text-[var(--text-primary)] truncate">{t.descricao}</p>
                            {t.data && (
                              <p className="text-[10px] text-[var(--text-muted)]">
                                {format(new Date(t.data + 'T12:00:00'), 'dd/MM', { locale: ptBR })}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="text-xs font-mono font-semibold text-[var(--text-primary)] flex-shrink-0">
                          {formatCurrency(Number(t.valor))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {monthData.total === 0 && (
                <div className="text-center py-10 text-[var(--text-tertiary)]">
                  <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Nenhum lançamento encontrado</p>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function CategorySpendingAnalysis({ className }: CategorySpendingAnalysisProps) {
  const { t, language } = useLanguage();
  const { formatCurrency, getCurrencySymbol } = useCurrency();
  const { filter: accountFilter } = useAccountFilter();
  const { profile } = useUser();
  const { filter: userFilter } = useUserFilter();
  const [selectedMonths, setSelectedMonths] = useState(6);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [selectedMonthDetail, setSelectedMonthDetail] = useState<MonthDetail | null>(null);

  const { data: monthlyData, isLoading } = useQuery({
    queryKey: ['categorySpending', profile?.id, accountFilter, selectedMonths, userFilter],
    queryFn: () => {
      if (!profile) throw new Error('Not authenticated');
      return fetchMonthlyExpenses(profile.id, accountFilter, selectedMonths, userFilter);
    },
    enabled: !!profile,
  });

  const { data: monthDetailData, isLoading: isDetailLoading } = useQuery({
    queryKey: ['categoryMonthDetail', profile?.id, accountFilter, selectedMonthDetail?.categoryName, selectedMonthDetail?.monthKey, userFilter],
    queryFn: () => {
      if (!profile || !selectedMonthDetail) throw new Error('No selection');
      return fetchCategoryMonthDetail(
        profile.id,
        accountFilter,
        selectedMonthDetail.categoryName,
        selectedMonthDetail.monthKey,
        userFilter
      );
    },
    enabled: !!profile && !!selectedMonthDetail,
  });

  const categoryRanking = useMemo(() => {
    if (!monthlyData || monthlyData.length === 0) return [];

    const categoryTotals = new Map<string, { months: number[]; total: number }>();

    monthlyData.forEach((month, idx) => {
      Object.entries(month.categories).forEach(([cat, val]) => {
        if (!categoryTotals.has(cat)) {
          categoryTotals.set(cat, { months: new Array(monthlyData.length).fill(0), total: 0 });
        }
        const entry = categoryTotals.get(cat)!;
        entry.months[idx] = val;
        entry.total += val;
      });
    });

    const grandTotal = Array.from(categoryTotals.values()).reduce((s, c) => s + c.total, 0);

    return Array.from(categoryTotals.entries())
      .map(([name, data], index) => {
        const monthsWithData = data.months.filter(v => v > 0).length;
        const average = monthsWithData > 0 ? data.total / monthsWithData : 0;
        const percentage = grandTotal > 0 ? (data.total / grandTotal) * 100 : 0;

        const lastMonth = data.months[data.months.length - 1] || 0;
        const prevMonth = data.months[data.months.length - 2] || 0;
        let trend: 'up' | 'down' | 'stable' = 'stable';
        let trendPercent = 0;
        if (prevMonth > 0) {
          trendPercent = ((lastMonth - prevMonth) / prevMonth) * 100;
          if (trendPercent > 5) trend = 'up';
          else if (trendPercent < -5) trend = 'down';
        }

        return {
          name,
          total: data.total,
          average,
          percentage,
          monthsWithData,
          months: data.months,
          trend,
          trendPercent,
          color: COLORS[index % COLORS.length],
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [monthlyData]);

  const grandTotal = categoryRanking.reduce((s, c) => s + c.total, 0);

  if (isLoading) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-6 h-96 animate-pulse" />
      </div>
    );
  }

  if (!monthlyData || monthlyData.length === 0) return null;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 bg-amber-500/10 rounded-lg">
            <Target className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-base sm:text-xl font-bold text-[var(--text-primary)]">Análise de Gastos por Categoria</h2>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)]">Acompanhe seus gastos e identifique onde economizar</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {[3, 6, 12].map((m) => (
            <button
              key={m}
              onClick={() => setSelectedMonths(m)}
              className={cn(
                "px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition-colors",
                selectedMonths === m
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  : "bg-[var(--bg-hover)] text-[var(--text-secondary)] border border-[var(--border-default)] hover:text-[var(--text-primary)] hover:border-[var(--border-medium)]"
              )}
            >
              {m}m
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-3 sm:p-4">
          <p className="text-[10px] sm:text-xs text-[var(--text-muted)] mb-1">Total no período</p>
          <p className="text-base sm:text-xl font-bold font-mono text-[var(--text-primary)] truncate">{formatCurrency(grandTotal)}</p>
          <p className="text-[10px] sm:text-xs text-[var(--text-muted)] mt-1">{selectedMonths} meses</p>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-3 sm:p-4">
          <p className="text-[10px] sm:text-xs text-[var(--text-muted)] mb-1">Média mensal</p>
          <p className="text-base sm:text-xl font-bold font-mono text-amber-400 truncate">
            {formatCurrency(monthlyData.length > 0 ? grandTotal / monthlyData.length : 0)}
          </p>
          <p className="text-[10px] sm:text-xs text-[var(--text-muted)] mt-1">por mês</p>
        </div>
        <div className="col-span-2 sm:col-span-1 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-3 sm:p-4">
          <p className="text-[10px] sm:text-xs text-[var(--text-muted)] mb-1">Categorias ativas</p>
          <p className="text-base sm:text-xl font-bold font-mono text-[var(--text-primary)]">{categoryRanking.length}</p>
          <p className="text-[10px] sm:text-xs text-[var(--text-muted)] mt-1">com gastos no período</p>
        </div>
      </div>

      {/* Ranking de categorias */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-3 sm:p-6">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h3 className="text-sm sm:text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Target className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--text-tertiary)]" />
            Ranking de Categorias
          </h3>
          <span className="text-[10px] sm:text-xs text-[var(--text-muted)]">{categoryRanking.length} categorias</span>
        </div>

        <div className="space-y-2 sm:space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
          {categoryRanking.map((cat, idx) => (
            <div key={cat.name} className="group">
              {/* Main row */}
              <button
                onClick={() => setExpandedCategory(expandedCategory === cat.name ? null : cat.name)}
                className="w-full text-left"
              >
                <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-[var(--bg-hover)] hover:bg-[var(--bg-active)] transition-colors border border-[var(--border-default)]">
                  {/* Rank */}
                  <div className={cn(
                    "w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center text-[10px] sm:text-xs font-bold flex-shrink-0",
                    idx === 0 ? "bg-amber-500/20 text-amber-400" :
                      idx === 1 ? "bg-[var(--border-medium)] text-[var(--text-secondary)]" :
                        idx === 2 ? "bg-orange-600/20 text-orange-400" :
                          "bg-[var(--bg-hover)] text-[var(--text-muted)]"
                  )}>
                    {idx + 1}
                  </div>

                  {/* Color dot + Name */}
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="text-xs sm:text-sm font-medium text-[var(--text-primary)] truncate">{cat.name}</span>
                  </div>

                  {/* Trend */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {cat.trend === 'up' && (
                      <div className="flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20">
                        <TrendingUp className="w-3 h-3 text-red-400" />
                        <span className="text-[9px] sm:text-[10px] text-red-400 font-medium hidden sm:inline">+{cat.trendPercent.toFixed(0)}%</span>
                      </div>
                    )}
                    {cat.trend === 'down' && (
                      <div className="flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">
                        <TrendingDown className="w-3 h-3 text-green-400" />
                        <span className="text-[9px] sm:text-[10px] text-green-400 font-medium hidden sm:inline">{cat.trendPercent.toFixed(0)}%</span>
                      </div>
                    )}
                    {cat.trend === 'stable' && (
                      <div className="flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded-full bg-[var(--bg-hover)] border border-[var(--border-default)]">
                        <Minus className="w-3 h-3 text-[var(--text-tertiary)]" />
                        <span className="text-[9px] sm:text-[10px] text-[var(--text-tertiary)] font-medium hidden sm:inline">estável</span>
                      </div>
                    )}
                  </div>

                  {/* Average */}
                  <div className="text-right flex-shrink-0 hidden sm:block">
                    <p className="text-xs text-[var(--text-muted)]">média/mês</p>
                    <p className="text-sm font-mono font-medium text-[var(--text-secondary)]">{formatCurrency(cat.average)}</p>
                  </div>

                  {/* Total */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-[10px] sm:text-xs text-[var(--text-muted)]">{cat.percentage.toFixed(1)}%</p>
                    <p className="text-xs sm:text-sm font-mono font-bold text-[var(--text-primary)]">{formatCurrency(cat.total)}</p>
                  </div>

                  <ChevronDown className={cn(
                    "w-3.5 h-3.5 sm:w-4 sm:h-4 text-[var(--text-tertiary)] transition-transform flex-shrink-0",
                    expandedCategory === cat.name && "rotate-180"
                  )} />
                </div>
              </button>

              {/* Progress bar */}
              <div className="mx-3 mt-1">
                <div className="h-1 bg-[var(--bg-hover)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }}
                  />
                </div>
              </div>

              {/* Expanded: monthly breakdown */}
              {expandedCategory === cat.name && (
                <div className="mx-1 sm:mx-3 mt-2 p-2 sm:p-3 rounded-lg bg-[var(--bg-card-inner)] border border-[var(--border-default)]">
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5 sm:gap-2">
                    {cat.months.map((val, mIdx) => {
                      const monthData = monthlyData[mIdx];
                      if (!monthData) return null;
                      const positiveVals = cat.months.filter(v => v > 0);
                      const isMax = val > 0 && val === Math.max(...positiveVals);
                      const isMin = val > 0 && val === Math.min(...positiveVals);
                      return (
                        <button
                          key={mIdx}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (val > 0) {
                              setSelectedMonthDetail({
                                categoryName: cat.name,
                                monthKey: monthData.month,
                                monthLabel: monthData.monthLabel,
                                color: cat.color,
                              });
                            }
                          }}
                          disabled={val === 0}
                          className={cn(
                            "w-full p-2 rounded-lg text-center border transition-all",
                            isMax ? "bg-red-500/10 border-red-500/20" :
                              isMin ? "bg-green-500/10 border-green-500/20" :
                                val > 0 ? "bg-[var(--bg-hover)] border-[var(--border-default)]" :
                                  "bg-transparent border-[var(--border-default)] opacity-40",
                            val > 0 && "hover:scale-[1.04] hover:shadow-md hover:border-amber-500/40 active:scale-[0.98] cursor-pointer"
                          )}
                        >
                          <p className="text-[10px] text-[var(--text-muted)] uppercase">{monthData.monthLabel}</p>
                          <p className={cn(
                            "text-xs font-mono font-medium mt-0.5",
                            val > 0 ? "text-[var(--text-primary)]" : "text-[var(--text-disabled)]"
                          )}>
                            {val > 0 ? formatCurrency(val) : '—'}
                          </p>
                          {isMax && <p className="text-[9px] text-red-400 mt-0.5">maior</p>}
                          {isMin && <p className="text-[9px] text-green-400 mt-0.5">menor</p>}
                          {val > 0 && !isMax && !isMin && (
                            <p className="text-[9px] text-[var(--text-muted)] mt-0.5 opacity-0 group-hover:opacity-60 transition-opacity">
                              ver
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 mt-2 sm:mt-3 pt-2 border-t border-[var(--border-default)]">
                    <span className="text-[10px] sm:text-xs text-[var(--text-muted)]">Presente em {cat.monthsWithData} de {selectedMonths} meses</span>
                    <span className="text-[10px] sm:text-xs text-[var(--text-secondary)] font-mono">Média: {formatCurrency(cat.average)}/mês</span>
                  </div>
                </div>
              )}
            </div>
          ))}

          {categoryRanking.length === 0 && (
            <div className="text-center py-8 text-[var(--text-tertiary)]">
              <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum gasto encontrado no período</p>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedMonthDetail && (
        <CategoryDetailModal
          detail={selectedMonthDetail}
          monthData={monthDetailData}
          isLoading={isDetailLoading}
          onClose={() => setSelectedMonthDetail(null)}
          formatCurrency={formatCurrency}
        />
      )}
    </div>
  );
}
