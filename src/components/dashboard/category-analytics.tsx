"use client";

import { useMemo } from "react";
import { useTransactionsQuery } from "@/hooks/use-transactions-query";
import { useLanguage } from "@/contexts/language-context";
import { useCurrency } from "@/contexts/currency-context";
import { usePeriodFilter } from "@/hooks/use-period-filter";
import { TrendingUp, TrendingDown } from "lucide-react";

export function CategoryAnalytics() {
  const { t } = useLanguage();
  const { formatCurrency } = useCurrency();
  const { period, customRange } = usePeriodFilter();
  const { transactions, loading } = useTransactionsQuery(period, customRange);

  const categoryData = useMemo(() => {
    const expenseMap = new Map<string, number>();
    const incomeMap = new Map<string, number>();

    transactions.forEach(transaction => {
      const categoryName = transaction.categoria?.descricao || 'Sem Categoria';
      const value = Number(transaction.valor);

      if (transaction.tipo === 'saida') {
        const current = expenseMap.get(categoryName) || 0;
        expenseMap.set(categoryName, current + value);
      } else {
        const current = incomeMap.get(categoryName) || 0;
        incomeMap.set(categoryName, current + value);
      }
    });

    const expenseTotal = Array.from(expenseMap.values()).reduce((sum, val) => sum + val, 0);
    const incomeTotal = Array.from(incomeMap.values()).reduce((sum, val) => sum + val, 0);

    const expenses = Array.from(expenseMap.entries())
      .map(([name, value]) => ({
        name,
        value,
        percentage: expenseTotal > 0 ? ((value / expenseTotal) * 100).toFixed(1) : "0",
      }))
      .sort((a, b) => b.value - a.value);

    const incomes = Array.from(incomeMap.entries())
      .map(([name, value]) => ({
        name,
        value,
        percentage: incomeTotal > 0 ? ((value / incomeTotal) * 100).toFixed(1) : "0",
      }))
      .sort((a, b) => b.value - a.value);

    return { expenses, incomes, expenseTotal, incomeTotal };
  }, [transactions]);

  if (loading) {
    return (
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-4 md:p-6 animate-pulse">
        <div className="h-80" />
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-4 md:p-6">
      <h3 className="text-base md:text-lg font-semibold mb-4 md:mb-6">{t('dashboard.categoryAnalysis.title')}</h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Despesas por Categoria */}
        <div>
          <div className="flex items-center gap-2 mb-3 md:mb-4">
            <TrendingDown className="w-4 h-4 md:w-5 md:h-5 text-red-400" />
            <h4 className="text-xs md:text-sm font-semibold text-red-400">{t('dashboard.categoryAnalysis.expenses')}</h4>
            <span className="ml-auto text-xs md:text-sm font-mono text-[var(--text-secondary)]">
              {formatCurrency(categoryData.expenseTotal)}
            </span>
          </div>

          <div className="space-y-2 md:space-y-3">
            {categoryData.expenses.length === 0 ? (
              <p className="text-center text-[var(--text-tertiary)] py-4 text-xs md:text-sm">
                {t('dashboard.categoryAnalysis.noExpenses')}
              </p>
            ) : (
              categoryData.expenses.map((cat, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--text-secondary)]">{cat.name}</span>
                    <div className="text-right">
                      <p className="text-sm font-semibold font-mono text-[var(--text-primary)]">
                        {formatCurrency(cat.value)}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">{cat.percentage}%</p>
                    </div>
                  </div>
                  <div className="h-2 bg-[var(--bg-hover)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full"
                      style={{ width: `${cat.percentage}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Receitas por Categoria */}
        <div>
          <div className="flex items-center gap-2 mb-3 md:mb-4">
            <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-green-400" />
            <h4 className="text-xs md:text-sm font-semibold text-green-400">{t('dashboard.categoryAnalysis.income')}</h4>
            <span className="ml-auto text-xs md:text-sm font-mono text-[var(--text-secondary)]">
              {formatCurrency(categoryData.incomeTotal)}
            </span>
          </div>

          <div className="space-y-2 md:space-y-3">
            {categoryData.incomes.length === 0 ? (
              <p className="text-center text-[var(--text-tertiary)] py-4 text-xs md:text-sm">
                {t('dashboard.categoryAnalysis.noIncome')}
              </p>
            ) : (
              categoryData.incomes.map((cat, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs md:text-sm text-[var(--text-secondary)] truncate max-w-[150px]">{cat.name}</span>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs md:text-sm font-semibold font-mono text-[var(--text-primary)]">
                        {formatCurrency(cat.value)}
                      </p>
                      <p className="text-[10px] md:text-xs text-[var(--text-muted)]">{cat.percentage}%</p>
                    </div>
                  </div>
                  <div className="h-1.5 md:h-2 bg-[var(--bg-hover)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full"
                      style={{ width: `${cat.percentage}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
