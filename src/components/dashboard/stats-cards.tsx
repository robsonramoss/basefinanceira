"use client";

import { Wallet, TrendingUp, TrendingDown, PiggyBank, CalendarClock, CalendarCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTransactionsQuery } from "@/hooks/use-transactions-query";
import { useFutureTransactionsQuery } from "@/hooks/use-future-transactions-query";
import { useLanguage } from "@/contexts/language-context";
import { useCurrency } from "@/contexts/currency-context";
import { usePeriodFilter } from "@/hooks/use-period-filter";
import { useMemo } from "react";
import { useRouter } from "next/navigation";

interface StatCard {
  title: string;
  value: string;
  change: string;
  changeType: "positive" | "negative";
  icon: React.ElementType;
  iconColor: string;
  count?: string;
  href?: string;
}

export function StatsCards() {
  const { t } = useLanguage();
  const { formatCurrency } = useCurrency();
  const { period, customRange } = usePeriodFilter();
  const router = useRouter();
  const { stats, loading } = useTransactionsQuery(period, customRange);
  const { transactions: futureTransactions, loading: loadingFuture } = useFutureTransactionsQuery();

  // Calcular período anterior para comparação
  const previousPeriodRange = useMemo(() => {
    const now = new Date();
    let currentStart = new Date();
    let currentEnd = new Date();
    let previousStart = new Date();
    let previousEnd = new Date();

    if (period === 'custom' && customRange) {
      // Para período customizado, calcular período anterior com mesma duração
      // Parse as local date to avoid timezone issues
      const [sy, sm, sd] = customRange.start.split('-').map(Number);
      const [ey, em, ed] = customRange.end.split('-').map(Number);
      currentStart = new Date(sy, sm - 1, sd);
      currentEnd = new Date(ey, em - 1, ed, 23, 59, 59, 999);
      const duration = currentEnd.getTime() - currentStart.getTime();
      previousEnd = new Date(currentStart.getTime() - 1); // 1 dia antes do início atual
      previousStart = new Date(previousEnd.getTime() - duration);
    } else {
      switch (period) {
        case 'day':
          currentStart.setHours(0, 0, 0, 0);
          currentEnd.setHours(23, 59, 59, 999);
          previousStart = new Date(currentStart);
          previousStart.setDate(previousStart.getDate() - 1);
          previousEnd = new Date(previousStart);
          previousEnd.setHours(23, 59, 59, 999);
          break;
        case 'week':
          const dayOfWeek = now.getDay();
          currentStart.setDate(now.getDate() - dayOfWeek);
          currentStart.setHours(0, 0, 0, 0);
          currentEnd.setDate(currentStart.getDate() + 6);
          currentEnd.setHours(23, 59, 59, 999);
          previousStart = new Date(currentStart);
          previousStart.setDate(previousStart.getDate() - 7);
          previousEnd = new Date(currentEnd);
          previousEnd.setDate(previousEnd.getDate() - 7);
          break;
        case 'month':
          currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
          currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
          previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          previousEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
          break;
        case 'year':
          currentStart = new Date(now.getFullYear(), 0, 1);
          currentEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
          previousStart = new Date(now.getFullYear() - 1, 0, 1);
          previousEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
          break;
      }
    }

    return {
      start: previousStart.toISOString().split('T')[0],
      end: previousEnd.toISOString().split('T')[0]
    };
  }, [period, customRange]);

  // Buscar dados do período anterior
  const { stats: previousStats } = useTransactionsQuery(
    'custom' as any,
    previousPeriodRange
  );

  // Função para calcular variação percentual
  const calculateVariation = (current: number, previous: number): string => {
    // Se ambos são zero, não há variação
    if (previous === 0 && current === 0) return "0%";

    // Se período anterior é zero mas atual tem valor (primeiro período com dados)
    if (previous === 0) {
      return current > 0 ? "+100%" : "-100%";
    }

    // Cálculo normal de variação percentual
    const variation = ((current - previous) / Math.abs(previous)) * 100;

    // Se não houve variação
    if (variation === 0) return "0%";

    // Formatar com sinal e uma casa decimal
    const sign = variation > 0 ? "+" : "";
    return `${sign}${variation.toFixed(1)}%`;
  };

  // Calcular contas a pagar e receber (baseado no período selecionado)
  const payableReceivable = useMemo(() => {
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    // Calcular intervalo baseado no período
    switch (period) {
      case 'day':
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'week':
        startDate.setDate(now.getDate() - now.getDay()); // Início da semana
        startDate.setHours(0, 0, 0, 0);
        endDate.setDate(startDate.getDate() + 6); // Fim da semana
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
      default:
        // Para custom ou outros, usar próximos 30 dias
        startDate = now;
        endDate.setDate(now.getDate() + 30);
    }

    const formatLocalDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const startStr = formatLocalDate(startDate);
    const endStr = formatLocalDate(endDate);

    const pending = futureTransactions.filter(t => {
      const tDate = t.data_prevista.split('T')[0];
      return t.status === 'pendente' && tDate >= startStr && tDate <= endStr;
    });

    const payable = pending
      .filter(t => t.tipo === 'saida')
      .reduce((sum, t) => sum + Number(t.valor), 0);

    const receivable = pending
      .filter(t => t.tipo === 'entrada')
      .reduce((sum, t) => sum + Number(t.valor), 0);

    const payableCount = pending.filter(t => t.tipo === 'saida').length;
    const receivableCount = pending.filter(t => t.tipo === 'entrada').length;

    return { payable, receivable, payableCount, receivableCount };
  }, [futureTransactions, period]);

  if (loading || loadingFuture) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-6 animate-pulse">
            <div className="h-20" />
          </div>
        ))}
      </div>
    );
  }

  // Determinar label do período para os cards de A Pagar/Receber
  const getPeriodLabel = () => {
    switch (period) {
      case 'day':
        return t('dashboard.period.today');
      case 'week':
        return t('dashboard.period.week');
      case 'month':
        return t('dashboard.period.month');
      case 'year':
        return t('dashboard.period.year');
      default:
        return '30d';
    }
  };

  const mainStatsCards: StatCard[] = [
    {
      title: t('dashboard.stats.balance'),
      value: formatCurrency(stats.balance),
      change: calculateVariation(stats.balance, previousStats.balance),
      changeType: stats.balance >= previousStats.balance ? "positive" : "negative",
      icon: Wallet,
      iconColor: "text-blue-400",
    },
    {
      title: t('dashboard.stats.income'),
      value: formatCurrency(stats.income),
      change: calculateVariation(stats.income, previousStats.income),
      changeType: stats.income >= previousStats.income ? "positive" : "negative",
      icon: TrendingUp,
      iconColor: "text-[#22C55E]",
      count: `${stats.incomeCount} ${t('dashboard.stats.transactions')}`,
      href: '/dashboard/receitas',
    },
    {
      title: t('dashboard.stats.expenses'),
      value: formatCurrency(stats.expenses),
      change: calculateVariation(stats.expenses, previousStats.expenses),
      changeType: stats.expenses <= previousStats.expenses ? "positive" : "negative",
      icon: TrendingDown,
      iconColor: "text-[#EF4444]",
      count: `${stats.expensesCount} ${t('dashboard.stats.transactions')}`,
      href: '/dashboard/despesas',
    },
    {
      title: `${t('dashboard.stats.toReceive')} (${getPeriodLabel()})`,
      value: formatCurrency(payableReceivable.receivable),
      change: "+100%",
      changeType: "positive",
      icon: CalendarCheck,
      iconColor: "text-[#22C55E]",
      count: `${payableReceivable.receivableCount} ${t('dashboard.stats.pending')}`,
      href: '/dashboard/agendados?status=pendente&tipo=entrada',
    },
    {
      title: `${t('dashboard.stats.toPay')} (${getPeriodLabel()})`,
      value: formatCurrency(payableReceivable.payable),
      change: "-100%",
      changeType: "negative",
      icon: CalendarClock,
      iconColor: "text-[#EF4444]",
      count: `${payableReceivable.payableCount} ${t('dashboard.stats.pending')}`,
      href: '/dashboard/agendados?status=pendente&tipo=saida',
    },
  ];

  const savingsCard: StatCard = {
    title: t('dashboard.stats.savings'),
    value: `${stats.savingsRate.toFixed(1)}%`,
    change: calculateVariation(stats.savingsRate, previousStats.savingsRate),
    changeType: stats.savingsRate >= previousStats.savingsRate ? "positive" : "negative",
    icon: PiggyBank,
    iconColor: "text-[#F59E0B]",
  };

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Main Stats Cards - 5 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 md:gap-4">
        {mainStatsCards.map((stat, index) => (
          <div
            key={index}
            onClick={stat.href ? () => router.push(stat.href!) : undefined}
            className={cn(
              "bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-4 md:p-6 transition-colors",
              stat.href ? "cursor-pointer hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)] active:scale-[0.98] transition-all" : "hover:border-[var(--border-medium)]"
            )}
          >
            {/* Icon & Change */}
            <div className="flex items-start justify-between mb-3 md:mb-4">
              <div className={cn("p-2 rounded-lg bg-[var(--bg-hover)]", stat.iconColor)}>
                <stat.icon className="w-4 h-4 md:w-5 md:h-5" />
              </div>
              <span
                className={cn(
                  "text-xs md:text-sm font-medium",
                  stat.changeType === "positive" ? "text-[#22C55E]" : "text-[#EF4444]"
                )}
              >
                {stat.change}
              </span>
            </div>

            {/* Title */}
            <p className="text-xs md:text-sm text-[var(--text-secondary)] mb-2 line-clamp-2">{stat.title}</p>

            {/* Value */}
            <p className="text-base md:text-lg xl:text-xl font-bold font-mono mb-1 whitespace-nowrap overflow-hidden text-ellipsis">{stat.value}</p>

            {/* Count */}
            {stat.count && (
              <p className="text-[10px] md:text-xs text-[var(--text-tertiary)]">{stat.count}</p>
            )}

          </div>
        ))}
      </div>

      {/* Savings Card - Full width horizontal banner */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-4 md:p-6 hover:border-[var(--border-medium)] transition-colors">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Left side - Icon, Title, Value */}
          <div className="flex items-center gap-4">
            <div className={cn("p-3 rounded-lg bg-[var(--bg-hover)]", savingsCard.iconColor)}>
              <savingsCard.icon className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-[var(--text-secondary)] mb-1">{savingsCard.title}</p>
              <p className="text-xl md:text-2xl font-bold font-mono">{savingsCard.value}</p>
            </div>
          </div>

          {/* Right side - Progress bar */}
          <div className="flex-1 sm:max-w-md w-full">
            <div className="flex items-center justify-end mb-2">
              <span
                className={cn(
                  "text-xs md:text-sm font-medium",
                  savingsCard.changeType === "positive" ? "text-[#22C55E]" : "text-[#EF4444]"
                )}
              >
                {savingsCard.change}
              </span>
            </div>
            <div className="h-3 md:h-4 bg-[var(--bg-hover)] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] rounded-full transition-all duration-500"
                style={{ width: savingsCard.value }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
