"use client";

import { useState } from "react";
import { Plus, TrendingDown, TrendingUp, Menu, Calendar, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { usePeriodFilter, type PeriodFilter } from "@/hooks/use-period-filter";
import { useLanguage } from "@/contexts/language-context";
import { TransactionModal } from "@/components/dashboard/transaction-modal";
import { UserFilter } from "@/components/dashboard/user-filter";
import { PeriodFilterDropdown } from "@/components/dashboard/period-filter";
import { useSidebar } from "@/contexts/sidebar-context";

export function DashboardHeader() {
  const { period, customRange, changePeriod, setCustomDateRange } = usePeriodFilter();
  const { profile } = useUser();
  const { t, language } = useLanguage();
  const { toggle } = useSidebar();
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<'receita' | 'despesa'>('despesa');
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const locales = {
    pt: 'pt-BR',
    en: 'en-US',
    es: 'es-ES'
  };

  // Pegar primeiro nome do usuário
  const userName = profile?.nome ? profile.nome.split(' ')[0] : "Usuário";
  const currentMonth = new Date().toLocaleDateString(locales[language], { month: 'long', year: 'numeric' });

  return (
    <header className="border-b border-[var(--border-default)] bg-[var(--bg-card)] px-4 md:px-6 py-3 md:py-4">
      <div className="flex items-center justify-between gap-3">
        {/* Mobile: Hamburger Menu */}
        <button
          onClick={toggle}
          className="md:hidden p-3 hover:bg-[var(--bg-hover)] rounded-lg transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center relative z-10"
          aria-label="Menu"
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Left: Greeting */}
        <div className="flex-1 min-w-0">
          <h1 className="text-lg md:text-2xl font-bold flex items-center gap-2 truncate">
            <span className="hidden sm:inline">{t('header.hello')}, </span>{userName}! 👋
          </h1>
          <p className="text-xs md:text-sm text-[var(--text-secondary)] mt-1 capitalize hidden sm:block">{currentMonth}</p>
        </div>

        {/* Center: Filters - Hidden on mobile */}
        <div className="hidden lg:flex items-center gap-3">
          {/* User Filter */}
          <UserFilter />
          
          {/* Period Selector */}
          <div className="flex gap-2 p-1 bg-[var(--bg-card-inner)] rounded-lg">
            {(["day", "week", "month", "year"] as PeriodFilter[]).map((p) => (
              <button
                key={p}
                onClick={() => changePeriod(p)}
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize",
                  period === p
                    ? "bg-primary text-primary-foreground"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
              >
                {p === "day" && t('header.period.day')}
                {p === "week" && t('header.period.week')}
                {p === "month" && t('header.period.month')}
                {p === "year" && t('header.period.year')}
              </button>
            ))}
            <div className="w-px h-4 bg-[var(--border-medium)] mx-1 self-center" />
            <button
              onClick={() => setShowCustomModal(true)}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2",
                period === 'custom'
                  ? "bg-primary text-primary-foreground"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              <Calendar className="w-4 h-4" />
              {t('header.period.custom')}
            </button>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 md:gap-3">

          {/* New Transaction */}
          <div className="relative">
            <Button 
              onClick={() => setShowQuickMenu(!showQuickMenu)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground h-9 md:h-10"
              size="sm"
            >
              <Plus className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">{t('header.new')}</span>
            </Button>

            {/* Quick Menu Dropdown */}
            {showQuickMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowQuickMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-[var(--bg-tooltip)] border border-[var(--border-medium)] rounded-lg shadow-xl z-50 overflow-hidden">
                  <button
                    onClick={() => {
                      setTransactionType('despesa');
                      setTransactionModalOpen(true);
                      setShowQuickMenu(false);
                    }}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-[var(--bg-hover)] transition-colors text-left"
                  >
                    <div className="p-2 bg-red-500/10 rounded-lg">
                      <TrendingDown className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <div className="font-medium text-[var(--text-primary)]">{t('modal.newExpense')}</div>
                      <div className="text-xs text-[var(--text-secondary)]">{t('header.quickAddExpense')}</div>
                    </div>
                  </button>
                  
                  <div className="h-px bg-[var(--border-default)]" />
                  
                  <button
                    onClick={() => {
                      setTransactionType('receita');
                      setTransactionModalOpen(true);
                      setShowQuickMenu(false);
                    }}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-[var(--bg-hover)] transition-colors text-left"
                  >
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium text-[var(--text-primary)]">{t('modal.newIncome')}</div>
                      <div className="text-xs text-[var(--text-secondary)]">{t('header.quickAddIncome')}</div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filters - Show below header on small screens */}
      <div className="lg:hidden flex items-center gap-2 mt-3 pb-1">
        <PeriodFilterDropdown />
        <UserFilter />
      </div>

      {/* Custom Date Range Modal (Desktop) */}
      {showCustomModal && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-50" 
            onClick={() => setShowCustomModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-[var(--bg-card)] border border-[var(--border-medium)] rounded-xl p-6 w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                  {t('header.period.custom')}
                </h3>
                <button
                  onClick={() => setShowCustomModal(false)}
                  className="p-1 hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-[var(--text-secondary)]" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    {t('reports.startDate')}
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] focus:outline-none focus:border-primary"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    {t('reports.endDate')}
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] focus:outline-none focus:border-primary"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowCustomModal(false)}
                    className="flex-1 px-4 py-2 rounded-lg border border-[var(--border-medium)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={() => {
                      if (startDate && endDate) {
                        setCustomDateRange({ start: startDate, end: endDate });
                        setShowCustomModal(false);
                        setStartDate("");
                        setEndDate("");
                      }
                    }}
                    disabled={!startDate || !endDate}
                    className="flex-1 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {t('reports.apply')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={transactionModalOpen}
        onClose={() => setTransactionModalOpen(false)}
        type={transactionType}
        onSuccess={() => {
          setTransactionModalOpen(false);
          // Disparar evento para atualizar dados
          window.dispatchEvent(new CustomEvent('transactionsChanged'));
        }}
      />
    </header>
  );
}
