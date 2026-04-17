"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useScheduledPayments } from "@/hooks/use-scheduled-payments";
import { useLanguage } from "@/contexts/language-context";
import { useCurrency } from "@/contexts/currency-context";
import { useUser } from "@/hooks/use-user";

export function UpcomingPayments() {
  const { t, language } = useLanguage();
  const { formatCurrency: formatCurrencyFromContext } = useCurrency();
  const { payments, loading } = useScheduledPayments();
  const { profile } = useUser();

  // Se for dependente sem permissão de ver dados do admin, esconder pagamentos do principal
  const isDependente = profile?.is_dependente || false;
  const permissoes = isDependente ? (profile?.permissoes as any) : null;
  const podeVerAdmin = !isDependente || (permissoes?.pode_ver_dados_admin !== false);

  // Filtrar pagamentos: dependentes sem permissão veem lista vazia
  const visiblePayments = podeVerAdmin ? payments : [];

  const locales = {
    pt: 'pt-BR',
    en: 'en-US',
    es: 'es-ES'
  };

  // Calcular dias até o vencimento
  const getDaysUntil = (dateString: string) => {
    const today = new Date();
    const dueDate = new Date(dateString);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Determinar urgência baseado nos dias
  const getUrgency = (daysUntil: number): "high" | "medium" | "low" => {
    if (daysUntil <= 5) return "high";
    if (daysUntil <= 15) return "medium";
    return "low";
  };

  // Formatar data
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const daysUntil = getDaysUntil(dateString);
    const formattedDate = date.toLocaleDateString(locales[language], { day: '2-digit', month: 'short' });
    return `${formattedDate} • ${daysUntil} ${t('dashboard.upcoming.days')}`;
  };

  // Formatar valor
  const formatCurrency = formatCurrencyFromContext;

  const urgencyColors = {
    high: "bg-[#EF4444]",
    medium: "bg-[#F59E0B]",
    low: "bg-[#22C55E]",
  };

  if (loading) {
    return (
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-4 md:p-6">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <h3 className="text-base md:text-lg font-semibold">{t('dashboard.upcoming.title')}</h3>
        </div>
        <div className="space-y-2 md:space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-[var(--bg-hover)] rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <h3 className="text-base md:text-lg font-semibold">{t('dashboard.upcoming.title')}</h3>
        <Link
          href="/dashboard/agendados"
          className="text-xs md:text-sm text-[#22C55E] hover:text-[#16A34A] font-medium transition-colors"
        >
          {t('dashboard.upcoming.manage')}
        </Link>
      </div>

      {/* Payments List */}
      <div className="space-y-2 md:space-y-3">
        {visiblePayments.length === 0 ? (
          <p className="text-center text-[var(--text-tertiary)] py-8 text-sm">{t('dashboard.upcoming.empty')}</p>
        ) : (
          visiblePayments.map((payment) => {
            const daysUntil = getDaysUntil(payment.data_prevista);
            const urgency = getUrgency(daysUntil);

            return (
              <div
                key={payment.id}
                className="flex items-center gap-3 md:gap-4 p-3 rounded-lg hover:bg-[var(--bg-hover)] active:bg-[var(--bg-active)] transition-colors cursor-pointer min-h-[60px]"
              >
                {/* Urgency Indicator */}
                <div className={cn(
                  "w-2 h-2 rounded-full flex-shrink-0",
                  urgencyColors[urgency]
                )} />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{payment.descricao}</p>
                  <p className="text-[10px] md:text-xs text-[var(--text-tertiary)] mt-1">{formatDate(payment.data_prevista)}</p>
                </div>

                {/* Amount */}
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold font-mono text-[var(--text-primary)]">
                    {formatCurrency(Number(payment.valor))}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Summary */}
      {visiblePayments.length > 0 && (
        <div className="mt-4 md:mt-6 pt-3 md:pt-4 border-t border-[var(--border-default)]">
          <div className="flex items-center justify-between">
            <span className="text-xs md:text-sm text-[var(--text-secondary)]">{t('dashboard.upcoming.total30days')}</span>
            <span className="text-base md:text-lg font-bold font-mono text-[var(--text-primary)]">
              {formatCurrency(visiblePayments.reduce((acc, p) => acc + Number(p.valor), 0))}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
