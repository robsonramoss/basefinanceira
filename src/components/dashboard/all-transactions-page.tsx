"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Filter, Pencil, Trash2, Loader2, Calendar, X, Wallet, Download } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAllTransactions } from "@/hooks/use-all-transactions";
import { useAccountFilter } from "@/hooks/use-account-filter";
import { useAccounts } from "@/hooks/use-accounts";
import { usePeriodFilter } from "@/hooks/use-period-filter";
import { useCategories } from "@/hooks/use-categories";
import { cn } from "@/lib/utils";
import { AllTransactionsModal } from "./all-transactions-modal";
import { DeleteTransactionModal } from "./delete-transaction-modal";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/contexts/language-context";
import { useCurrency } from "@/contexts/currency-context";
import { InfoCard } from "@/components/ui/info-card";
import { EmptyStateEducational } from "@/components/ui/empty-state-educational";
import { ExportTransactionsModal } from "@/components/ui/export-transactions-modal";
import { useExportTransactions } from "@/hooks/use-export-transactions";
import { format } from "date-fns";
import { ptBR, es, enUS } from "date-fns/locale";

export function AllTransactionsPage() {
  const { t, language } = useLanguage();
  const { formatCurrency } = useCurrency();
  const router = useRouter();
  const searchParams = useSearchParams();
  const contaIdParam = searchParams.get('conta_id');

  const { period, customRange, setCustomDateRange } = usePeriodFilter();
  const { transactions, loading, refetch } = useAllTransactions(period as any, customRange);
  const { filter: accountFilter } = useAccountFilter();
  const { accounts } = useAccounts(accountFilter);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const { categories } = useCategories();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { exportToCSV, exportToPDF } = useExportTransactions();
  const [transactionToEdit, setTransactionToEdit] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<'all' | 'normal' | 'income' | 'expense' | 'transfers'>('normal');
  const itemsPerPage = 10;

  const locales = {
    pt: 'pt-BR',
    en: 'en-US',
    es: 'es-ES'
  };

  // Encontrar nome da conta filtrada
  const filteredAccount = accounts.find(a => a.id === contaIdParam);

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.categoria?.descricao.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAccount = contaIdParam ? t.conta_id === contaIdParam : true;

    // Filtro de tipo (apenas visual, não afeta dashboard/relatórios)
    const matchesType = typeFilter === 'all' ? true :
      typeFilter === 'transfers' ? (t.is_transferencia === true) :
      typeFilter === 'income' ? (t.tipo === 'entrada' && (t.is_transferencia === false || t.is_transferencia === null)) :
      typeFilter === 'expense' ? (t.tipo === 'saida' && (t.is_transferencia === false || t.is_transferencia === null)) :
        (t.is_transferencia === false || t.is_transferencia === null);

    const matchesCategory = !selectedCategoryId || t.categoria_id === selectedCategoryId;

    return matchesSearch && matchesAccount && matchesType && matchesCategory;
  });

  const clearAccountFilter = () => {
    router.push('/dashboard/transacoes');
  };

  const totalIncome = filteredTransactions.filter(t => t.tipo === 'entrada').reduce((acc, t) => acc + Number(t.valor), 0);
  const totalExpense = filteredTransactions.filter(t => t.tipo === 'saida').reduce((acc, t) => acc + Number(t.valor), 0);
  const balance = totalIncome - totalExpense;

  // Paginação
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

  const handleEdit = (transaction: any) => {
    setTransactionToEdit(transaction);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (transaction: any) => {
    setTransactionToDelete(transaction);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!transactionToDelete) return;

    try {
      setDeletingId(transactionToDelete.id);
      const supabase = createClient();
      const { error } = await supabase
        .from('transacoes')
        .delete()
        .eq('id', transactionToDelete.id);

      if (error) throw error;

      // Disparar eventos para atualizar todos os hooks (React Query + legado)
      window.dispatchEvent(new CustomEvent('transactionsChanged'));
      window.dispatchEvent(new CustomEvent('accountsChanged'));

      refetch();
      setIsDeleteModalOpen(false);
      setTransactionToDelete(null);
    } catch (error) {
      alert(t('validation.errorDeleting'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleSuccess = () => {
    // Disparar eventos para atualizar todos os hooks (React Query + legado)
    window.dispatchEvent(new CustomEvent('transactionsChanged'));
    window.dispatchEvent(new CustomEvent('accountsChanged'));
    refetch();
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTransactionToEdit(null);
  };

  const handleApplyFilters = () => {
    if (startDate && endDate) {
      setCustomDateRange({ start: startDate, end: endDate });
      setShowFilters(false);
    }
  };

  const handleClearFilters = () => {
    setStartDate("");
    setEndDate("");
    setSelectedCategoryId(null);
    setTypeFilter('normal');
    setShowFilters(false);
    window.dispatchEvent(new CustomEvent('periodFilterChange', { detail: 'month' }));
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <h1 className="text-xl md:text-2xl font-bold text-[var(--text-primary)]">{t('sidebar.transactions')}</h1>
            <span className={cn(
              "px-2 md:px-3 py-1 rounded-full text-xs font-semibold",
              accountFilter === 'pessoal'
                ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
            )}>
              {accountFilter === 'pessoal' ? `👤 ${t('sidebar.personal')}` : `🏢 ${t('sidebar.pj')}`}
            </span>
          </div>
          <p className="text-[var(--text-secondary)] text-xs md:text-sm mt-1">
            {t('transactions.manageIncome')} & {t('transactions.manageExpenses')}
          </p>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          {filteredTransactions.length > 0 && (
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="flex items-center gap-2 px-3 md:px-4 py-2 min-h-[44px] bg-[var(--bg-card)] border border-[var(--border-medium)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] rounded-lg transition-colors text-xs md:text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">{t('common.export')}</span>
            </button>
          )}
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-3 md:px-4 py-2 min-h-[44px] bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors text-xs md:text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{t('header.new')}</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-4 md:p-6">
          <p className="text-xs md:text-sm text-[var(--text-secondary)] mb-2">{t('transactions.income')}</p>
          <p className="text-xl md:text-2xl font-bold font-mono text-primary">
            {formatCurrency(totalIncome)}
          </p>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-4 md:p-6">
          <p className="text-xs md:text-sm text-[var(--text-secondary)] mb-2">{t('transactions.expenses')}</p>
          <p className="text-xl md:text-2xl font-bold font-mono text-red-500">
            {formatCurrency(totalExpense)}
          </p>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-4 md:p-6 sm:col-span-2 lg:col-span-1">
          <p className="text-xs md:text-sm text-[var(--text-secondary)] mb-2">{t('dashboard.stats.balance')}</p>
          <p className={cn(
            "text-xl md:text-2xl font-bold font-mono",
            balance >= 0 ? "text-primary" : "text-red-500"
          )}>
            {formatCurrency(Math.abs(balance))}
          </p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
            <input
              type="text"
              placeholder={t('common.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg pl-10 pr-4 py-2 text-sm text-[var(--input-text)] placeholder:text-[var(--input-placeholder)] focus:outline-none focus:border-primary"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors border text-sm font-medium",
              showFilters
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-[var(--input-bg)] text-[var(--text-secondary)] border-[var(--input-border)] hover:bg-[var(--bg-hover)]"
            )}
          >
            <Filter className="w-4 h-4" />
            <span>{t('common.filters')}</span>
          </button>
        </div>

        {/* Active Filters Badges */}
        {filteredAccount && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--text-secondary)]">Filtrando por:</span>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full">
              <Wallet className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-sm font-medium text-blue-400">{filteredAccount.nome}</span>
              <button
                onClick={clearAccountFilter}
                className="ml-1 text-blue-400/60 hover:text-blue-400 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Info Card - Dica sobre Transações */}
        {transactions.length > 0 && !contaIdParam && (
          <InfoCard
            title={t('allTransactions.infoCardTitle')}
            description={t('allTransactions.infoCardDescription')}
            tips={[
              t('allTransactions.infoCardTip1'),
              t('allTransactions.infoCardTip2'),
              t('allTransactions.infoCardTip3'),
              t('allTransactions.infoCardTip4'),
            ]}
            storageKey="transactions-tip"
          />
        )}

        {/* Advanced Filters Panel */}
        {showFilters && (
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                {t('filters.advanced')}
              </h3>
              <button
                onClick={handleClearFilters}
                className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                {t('filters.clear')}
              </button>
            </div>

            {/* Transaction Type Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--text-secondary)]">{t('form.type')}</label>
              <div className="flex flex-wrap items-center gap-2 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg p-1">
                <button
                  onClick={() => { setTypeFilter('all'); setCurrentPage(1); }}
                  className={cn(
                    "flex-1 min-w-[80px] px-3 py-2 rounded-md text-xs font-medium transition-all",
                    typeFilter === 'all'
                      ? "bg-blue-600 text-white shadow-lg"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                  )}
                >
                  📊 {t('common.all')}
                </button>
                <button
                  onClick={() => { setTypeFilter('normal'); setCurrentPage(1); }}
                  className={cn(
                    "flex-1 min-w-[80px] px-3 py-2 rounded-md text-xs font-medium transition-all",
                    typeFilter === 'normal'
                      ? "bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-lg"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                  )}
                >
                  💰 {t('transactions.income')}/{t('transactions.expenses')}
                </button>
                <button
                  onClick={() => { setTypeFilter('income'); setCurrentPage(1); }}
                  className={cn(
                    "flex-1 min-w-[80px] px-3 py-2 rounded-md text-xs font-medium transition-all",
                    typeFilter === 'income'
                      ? "bg-green-600 text-white shadow-lg"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                  )}
                >
                  ↗️ {t('transactions.income')}
                </button>
                <button
                  onClick={() => { setTypeFilter('expense'); setCurrentPage(1); }}
                  className={cn(
                    "flex-1 min-w-[80px] px-3 py-2 rounded-md text-xs font-medium transition-all",
                    typeFilter === 'expense'
                      ? "bg-red-600 text-white shadow-lg"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                  )}
                >
                  📉 {t('transactions.expenses')}
                </button>
                <button
                  onClick={() => { setTypeFilter('transfers'); setCurrentPage(1); }}
                  className={cn(
                    "flex-1 min-w-[80px] px-3 py-2 rounded-md text-xs font-medium transition-all",
                    typeFilter === 'transfers'
                      ? "bg-purple-600 text-white shadow-lg"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                  )}
                >
                  🔄 {t('transactions.transfers')}
                </button>
              </div>
            </div>

            {/* Filtro de Categoria */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--text-secondary)]">Categoria</label>
              <select
                value={selectedCategoryId || ''}
                onChange={(e) => setSelectedCategoryId(e.target.value ? Number(e.target.value) : null)}
                className="w-full h-10 px-4 rounded-lg bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] focus:outline-none focus:border-primary"
              >
                <option value="">Todas as categorias</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon_key && `${cat.icon_key} `}{cat.descricao}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--text-secondary)]">{t('filters.startDate')}</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full h-10 px-4 rounded-lg bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] focus:outline-none focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--text-secondary)]">{t('filters.endDate')}</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full h-10 px-4 rounded-lg bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-default)]">
              <button
                onClick={handleClearFilters}
                className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleApplyFilters}
                disabled={!startDate || !endDate}
                className={cn(
                  "px-4 py-2 text-sm text-primary-foreground rounded-lg transition-colors font-medium bg-primary hover:bg-primary/90",
                  (!startDate || !endDate) && "opacity-50 cursor-not-allowed"
                )}
              >
                {t('filters.apply')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border-default)] bg-[var(--bg-card-inner)]">
                <th className="text-left py-4 px-6 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">{t('form.type')}</th>
                <th className="text-left py-4 px-6 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">{t('table.description')}</th>
                <th className="text-left py-4 px-6 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">{t('table.category')}</th>
                <th className="text-left py-4 px-6 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">{t('table.date')}</th>
                <th className="text-right py-4 px-6 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">{t('table.amount')}</th>
                <th className="text-center py-4 px-6 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">{t('table.status')}</th>
                <th className="text-right py-4 px-6 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">{t('table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-default)]">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 px-6"><div className="h-4 bg-[var(--skeleton-pulse)] rounded w-16" /></td>
                    <td className="py-4 px-6"><div className="h-4 bg-[var(--skeleton-pulse)] rounded w-32" /></td>
                    <td className="py-4 px-6"><div className="h-4 bg-[var(--skeleton-pulse)] rounded w-24" /></td>
                    <td className="py-4 px-6"><div className="h-4 bg-[var(--skeleton-pulse)] rounded w-24" /></td>
                    <td className="py-4 px-6"><div className="h-4 bg-[var(--skeleton-pulse)] rounded w-20 ml-auto" /></td>
                    <td className="py-4 px-6"><div className="h-4 bg-[var(--skeleton-pulse)] rounded w-16 mx-auto" /></td>
                    <td className="py-4 px-6"><div className="h-4 bg-[var(--skeleton-pulse)] rounded w-8 ml-auto" /></td>
                  </tr>
                ))
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16">
                    {searchTerm || contaIdParam ? (
                      <div className="text-center text-[var(--text-tertiary)]">
                        <Calendar className="w-12 h-12 mx-auto mb-3 text-[var(--text-muted)]" />
                        <p>{t('common.noTransactions')}</p>
                      </div>
                    ) : (
                      <EmptyStateEducational
                        icon={Wallet}
                        title="Nenhuma Transação Registrada"
                        description="Comece a registrar suas receitas e despesas para ter controle total das suas finanças!"
                        whatIs="Transações são todas as movimentações financeiras que já aconteceram: dinheiro que entrou (receitas) ou saiu (despesas). Cada transação afeta o saldo da sua conta automaticamente."
                        howToUse={[
                          { step: 1, text: 'Clique em "+ Nova Transação" no canto superior direito' },
                          { step: 2, text: 'Escolha o tipo: Receita (dinheiro que entrou) ou Despesa (dinheiro que saiu)' },
                          { step: 3, text: 'Preencha descrição, valor, categoria e data' },
                          { step: 4, text: 'Selecione a conta bancária afetada' },
                          { step: 5, text: 'O saldo da conta é atualizado automaticamente!' }
                        ]}
                        example='Exemplo: Você recebeu salário de R$ 3.000 dia 05/01. Crie uma Receita "Salário", valor R$ 3.000, categoria "Salário", conta "Nubank". O saldo da conta Nubank aumenta R$ 3.000 automaticamente!'
                        actionButton={{
                          label: '+ Registrar Primeira Transação',
                          onClick: () => setIsModalOpen(true)
                        }}
                      />
                    )}
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                    <td className="py-4 px-6">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                        transaction.tipo === 'entrada'
                          ? "bg-[#22C55E]/10 text-[#22C55E]"
                          : "bg-red-500/10 text-red-500"
                      )}>
                        {transaction.tipo === 'entrada' ? t('transactions.income') : t('transactions.expenses')}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm text-[var(--text-primary)] font-medium">
                      {transaction.descricao}
                    </td>
                    <td className="py-4 px-6 text-sm text-[var(--text-secondary)]">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[var(--border-medium)]" />
                        {transaction.categoria?.descricao || t('dashboard.recent.noCategory')}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-[var(--text-secondary)]">
                      {(() => {
                        const dateStr = transaction.data.split('T')[0];
                        const [year, month, day] = dateStr.split('-');
                        const date = new Date(Number(year), Number(month) - 1, Number(day));
                        return date.toLocaleDateString(locales[language]);
                      })()}
                    </td>
                    <td className={cn(
                      "py-4 px-6 text-sm font-medium font-mono text-right",
                      transaction.tipo === 'entrada' ? "text-[#22C55E]" : "text-red-500"
                    )}>
                      {formatCurrency(transaction.valor)}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                        transaction.tipo === 'entrada'
                          ? "bg-[#22C55E]/10 text-[#22C55E]"
                          : "bg-red-500/10 text-red-500"
                      )}>
                        {transaction.tipo === 'entrada' ? t('status.received') : t('status.paid')}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(transaction)}
                          className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
                          title={t('common.edit')}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(transaction)}
                          className="p-2 text-[var(--text-secondary)] hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                          title={t('common.delete')}
                          disabled={deletingId === transaction.id}
                        >
                          {deletingId === transaction.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--border-default)]">
            <div className="text-sm text-[var(--text-secondary)]">
              {t('pagination.showing')} {startIndex + 1} {t('pagination.to')} {Math.min(endIndex, filteredTransactions.length)} {t('pagination.of')} {filteredTransactions.length} {t('pagination.transactions')}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={cn(
                  "px-3 py-1 rounded-lg text-sm font-medium transition-colors",
                  currentPage === 1
                    ? "bg-[var(--bg-hover)] text-[var(--text-muted)] cursor-not-allowed"
                    : "bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-active)]"
                )}
              >
                {t('pagination.previous')}
              </button>

              <div className="flex items-center gap-1">
                {[...Array(totalPages)].map((_, i) => {
                  const page = i + 1;
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={cn(
                          "w-8 h-8 rounded-lg text-sm font-medium transition-colors",
                          currentPage === page
                            ? "bg-[#22C55E] text-white"
                            : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-active)] hover:text-[var(--text-primary)]"
                        )}
                      >
                        {page}
                      </button>
                    );
                  } else if (page === currentPage - 2 || page === currentPage + 2) {
                    return <span key={page} className="text-[var(--text-muted)]">...</span>;
                  }
                  return null;
                })}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className={cn(
                  "px-3 py-1 rounded-lg text-sm font-medium transition-colors",
                  currentPage === totalPages
                    ? "bg-[var(--bg-hover)] text-[var(--text-muted)] cursor-not-allowed"
                    : "bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-active)]"
                )}
              >
                {t('pagination.next')}
              </button>
            </div>
          </div>
        )}
      </div>

      <AllTransactionsModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleSuccess}
        transactionToEdit={transactionToEdit}
      />

      <DeleteTransactionModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setTransactionToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        transaction={transactionToDelete}
        isDeleting={deletingId !== null}
      />

      <ExportTransactionsModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        transactionCount={filteredTransactions.length}
        isExporting={isExporting}
        onExportCSV={() => {
          setIsExporting(true);
          try {
            const dateLocales = { pt: ptBR, es: es, en: enUS } as const;
            const periodLabel = period === 'custom' && customRange
              ? `${format(new Date(customRange.start + 'T12:00:00'), 'dd/MM/yyyy')} - ${format(new Date(customRange.end + 'T12:00:00'), 'dd/MM/yyyy')}`
              : period === 'month'
              ? format(new Date(), 'MMMM yyyy', { locale: dateLocales[language as keyof typeof dateLocales] })
              : period === 'year'
              ? format(new Date(), 'yyyy')
              : format(new Date(), 'dd/MM/yyyy');
            exportToCSV({ transactions: filteredTransactions, accountFilter, periodLabel, typeFilter });
            setIsExportModalOpen(false);
          } finally {
            setIsExporting(false);
          }
        }}
        onExportPDF={() => {
          setIsExporting(true);
          try {
            const dateLocales = { pt: ptBR, es: es, en: enUS } as const;
            const periodLabel = period === 'custom' && customRange
              ? `${format(new Date(customRange.start + 'T12:00:00'), 'dd/MM/yyyy')} - ${format(new Date(customRange.end + 'T12:00:00'), 'dd/MM/yyyy')}`
              : period === 'month'
              ? format(new Date(), 'MMMM yyyy', { locale: dateLocales[language as keyof typeof dateLocales] })
              : period === 'year'
              ? format(new Date(), 'yyyy')
              : format(new Date(), 'dd/MM/yyyy');
            exportToPDF({ transactions: filteredTransactions, accountFilter, periodLabel, typeFilter });
            setIsExportModalOpen(false);
          } finally {
            setIsExporting(false);
          }
        }}
      />
    </div>
  );
}
