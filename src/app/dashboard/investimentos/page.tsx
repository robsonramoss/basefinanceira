"use client";

import { useState } from "react";
import { TrendingUp, Plus, PieChart, DollarSign, Wallet, Lock } from "lucide-react";
import { useInvestmentSummary } from "@/hooks/use-investment-summary";
import { useInvestments } from "@/hooks/use-investments";
import { useAccountFilter } from "@/hooks/use-account-filter";
import { useCurrency } from "@/contexts/currency-context";
import { useLanguage } from "@/contexts/language-context";
import { useUserPlan } from "@/hooks/use-user-plan";
import { AddPositionModal } from "@/components/dashboard/investments/add-position-modal";
import { EditPositionModal } from "@/components/dashboard/investments/edit-position-modal";
import { DeletePositionModal } from "@/components/dashboard/investments/delete-position-modal";
import { AddDividendModal } from "@/components/dashboard/investments/add-dividend-modal";
import { InvestmentSuccessModal } from "@/components/dashboard/investments/success-modal";
import { InvestmentErrorModal } from "@/components/dashboard/investments/error-modal";
import { PositionCard } from "@/components/dashboard/investments/position-card";
import type { PositionDetailed } from "@/types/investments";

const ASSET_TYPE_COLORS: Record<string, string> = {
  acao: "bg-blue-500",
  fii: "bg-green-500",
  etf: "bg-purple-500",
  renda_fixa: "bg-yellow-500",
  cripto: "bg-orange-500",
  bdr: "bg-cyan-500",
};

export default function InvestimentosPage() {
  const { filter: accountFilter } = useAccountFilter();
  const { formatCurrency } = useCurrency();
  const { t } = useLanguage();
  const { permiteInvestimentos, loading: loadingPlan } = useUserPlan();
  const { summary, byType, totalDividends, loading: loadingSummary } = useInvestmentSummary(accountFilter);
  const { positions, loading: loadingPositions, refetch } = useInvestments(accountFilter);

  // Function to get asset type label from translations
  const getAssetTypeLabel = (type: string): string => {
    const typeMap: Record<string, string> = {
      acao: t('investments.assetTypes.stock'),
      fii: t('investments.assetTypes.fii'),
      etf: t('investments.assetTypes.etf'),
      renda_fixa: t('investments.assetTypes.fixedIncome'),
      cripto: t('investments.assetTypes.crypto'),
      bdr: t('investments.assetTypes.bdr'),
    };
    return typeMap[type] || type.replace('_', ' ');
  };

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [dividendModalOpen, setDividendModalOpen] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [errorModalOpen, setErrorModalOpen] = useState(false);

  const [selectedPosition, setSelectedPosition] = useState<PositionDetailed | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Novos estados para filtro e ordenação
  const [assetTypeFilter, setAssetTypeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "value" | "profit">("name");

  const handleAddSuccess = () => {
    setAddModalOpen(false);
    setSuccessMessage(t('investments.success.added'));
    setSuccessModalOpen(true);
    refetch();
  };

  const handleEditClick = (position: PositionDetailed) => {
    setSelectedPosition(position);
    setEditModalOpen(true);
  };

  const handleEditSuccess = () => {
    setEditModalOpen(false);
    setSuccessMessage(t('investments.success.updated'));
    setSuccessModalOpen(true);
    refetch();
  };

  const handleDeleteClick = (position: PositionDetailed) => {
    setSelectedPosition(position);
    setDeleteModalOpen(true);
  };

  const handleDeleteSuccess = () => {
    setDeleteModalOpen(false);
    setSuccessMessage(t('investments.success.deleted'));
    setSuccessModalOpen(true);
    refetch();
  };

  const handleDividendClick = (position: PositionDetailed) => {
    setSelectedPosition(position);
    setDividendModalOpen(true);
  };

  const handleDividendSuccess = () => {
    setDividendModalOpen(false);
    setSuccessMessage(t('investments.success.dividendAdded'));
    setSuccessModalOpen(true);
    refetch();
  };

  const handleError = (message: string) => {
    setErrorMessage(message);
    setErrorModalOpen(true);
  };

  // Filtrar e ordenar posições
  const filteredPositions = positions.filter((position) => {
    if (assetTypeFilter === "all") return true;
    return position.asset_type === assetTypeFilter;
  });

  const sortedPositions = [...filteredPositions].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.ticker.localeCompare(b.ticker);
      case "value":
        return b.valor_atual - a.valor_atual;
      case "profit":
        return b.lucro_prejuizo - a.lucro_prejuizo;
      default:
        return 0;
    }
  });

  const loading = loadingSummary || loadingPositions;

  // Verificar se o plano permite investimentos
  if (!loadingPlan && !permiteInvestimentos) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl p-8 md:p-12 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8 text-amber-500" />
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-[var(--text-primary)] mb-3">
            Módulo de Investimentos
          </h2>
          <p className="text-sm md:text-base text-[var(--text-secondary)] mb-6">
            O módulo de investimentos está disponível nos planos Plus e Anual Plus. Faça upgrade para acompanhar seus ativos, rendimentos e dividendos.
          </p>
          <a
            href="/plans"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium rounded-lg transition-all shadow-lg shadow-amber-500/20"
          >
            <TrendingUp className="w-4 h-4" />
            Ver Planos Disponíveis
          </a>
        </div>
      </div>
    );
  }

  if (loading || loadingPlan) {
    return (
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="h-8 w-48 bg-[var(--bg-active)] rounded animate-pulse" />
          <div className="h-10 w-40 bg-[var(--bg-active)] rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-4 md:p-6 animate-pulse">
              <div className="h-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const hasPositions = positions.length > 0;
  const hasFilteredPositions = sortedPositions.length > 0;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <h1 className="text-xl md:text-2xl font-bold text-[var(--text-primary)]">{t('investments.title')}</h1>
            <span className={`px-2 md:px-3 py-1 rounded-lg text-xs md:text-sm font-medium ${accountFilter === "pj"
              ? "bg-purple-500/10 text-purple-500 border border-purple-500/20"
              : "bg-blue-500/10 text-blue-500 border border-blue-500/20"
              }`}>
              {accountFilter === "pj" ? t('investments.accountPJ') : t('investments.accountPersonal')}
            </span>
          </div>
          <p className="text-xs md:text-sm text-[var(--text-secondary)] mt-1">
            {t('investments.subtitle')}
          </p>
          <p className="text-[10px] md:text-xs text-[var(--text-tertiary)] mt-1">
            {t('investments.priceUpdate')}
          </p>
        </div>
        <button
          onClick={() => setAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 min-h-[44px] bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-lg transition-all text-sm"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">{t('investments.newPosition')}</span>
          <span className="sm:hidden">{t('investments.new')}</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {/* Valor Investido */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-4 md:p-6">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Wallet className="w-4 h-4 md:w-5 md:h-5 text-blue-500" />
            </div>
          </div>
          <p className="text-xs md:text-sm text-[var(--text-secondary)] mb-1">{t('investments.summary.investedValue')}</p>
          <p className="text-xl md:text-2xl font-bold text-[var(--text-primary)]">
            {formatCurrency(summary?.valor_investido || 0)}
          </p>
        </div>

        {/* Valor Atual */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-4 md:p-6">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <DollarSign className="w-4 h-4 md:w-5 md:h-5 text-green-500" />
            </div>
          </div>
          <p className="text-xs md:text-sm text-[var(--text-secondary)] mb-1">{t('investments.summary.currentValue')}</p>
          <p className="text-xl md:text-2xl font-bold text-[var(--text-primary)]">
            {formatCurrency(summary?.valor_atual || 0)}
          </p>
        </div>

        {/* Lucro/Prejuízo */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-4 md:p-6">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <div className={`p-2 rounded-lg ${(summary?.lucro_prejuizo || 0) >= 0
              ? 'bg-green-500/10'
              : 'bg-red-500/10'
              }`}>
              <TrendingUp className={`w-4 h-4 md:w-5 md:h-5 ${(summary?.lucro_prejuizo || 0) >= 0
                ? 'text-green-500'
                : 'text-red-500'
                }`} />
            </div>
          </div>
          <p className="text-xs md:text-sm text-[var(--text-secondary)] mb-1">{t('investments.summary.profitLoss')}</p>
          <p className={`text-xl md:text-2xl font-bold ${(summary?.lucro_prejuizo || 0) >= 0
            ? 'text-green-500'
            : 'text-red-500'
            }`}>
            {formatCurrency(summary?.lucro_prejuizo || 0)}
          </p>
          <p className={`text-sm mt-1 ${(summary?.rentabilidade_percentual || 0) >= 0
            ? 'text-green-500'
            : 'text-red-500'
            }`}>
            {(summary?.rentabilidade_percentual || 0) >= 0 ? '+' : ''}
            {(summary?.rentabilidade_percentual || 0).toFixed(2)}%
          </p>
        </div>

        {/* Total Ativos */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <PieChart className="w-5 h-5 text-purple-500" />
            </div>
          </div>
          <p className="text-sm text-[var(--text-secondary)] mb-1">{t('investments.summary.totalAssets')}</p>
          <p className="text-2xl font-bold text-[var(--text-primary)]">
            {summary?.total_ativos || 0}
          </p>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {t('investments.summary.dividends')}: {formatCurrency(totalDividends)}
          </p>
        </div>
      </div>

      {/* Distribuição por Tipo */}
      {byType.length > 0 && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            {t('investments.distribution.title')}
          </h2>
          <div className="space-y-3">
            {byType.map((item: any) => (
              <div key={item.type} className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-[var(--text-primary)] font-medium">
                      {getAssetTypeLabel(item.type)}
                    </span>
                    <span className="text-sm text-[var(--text-secondary)]">
                      {item.count} {item.count === 1 ? t('investments.distribution.asset') : t('investments.distribution.assets')}
                    </span>
                  </div>
                  <div className="w-full bg-[var(--bg-active)] rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${ASSET_TYPE_COLORS[item.type] || 'bg-blue-500'}`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {formatCurrency(item.currentValue)}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {item.percentage.toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Posições */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            {t('investments.positions.title')}
          </h2>

          {/* Ordenação */}
          {hasPositions && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-tertiary)]">{t('investments.positions.sortBy')}</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "name" | "value" | "profit")}
                className="px-3 py-1.5 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg text-sm text-[var(--input-text)] focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="name">{t('investments.positions.sortName')}</option>
                <option value="value">{t('investments.positions.sortValue')}</option>
                <option value="profit">{t('investments.positions.sortProfit')}</option>
              </select>
            </div>
          )}
        </div>

        {/* Filtros por tipo */}
        {hasPositions && (
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setAssetTypeFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${assetTypeFilter === "all"
                ? "bg-blue-600 text-white"
                : "bg-[var(--bg-active)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                }`}
            >
              {t('investments.positions.all')} ({positions.length})
            </button>
            {["acao", "fii", "etf", "renda_fixa", "cripto", "bdr"].map((type) => {
              const count = positions.filter((p) => p.asset_type === type).length;
              if (count === 0) return null;
              return (
                <button
                  key={type}
                  onClick={() => setAssetTypeFilter(type)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${assetTypeFilter === type
                    ? "bg-blue-600 text-white"
                    : "bg-[var(--bg-active)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                    }`}
                >
                  {getAssetTypeLabel(type)} ({count})
                </button>
              );
            })}
          </div>
        )}

        {hasFilteredPositions ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedPositions.map((position) => (
              <PositionCard
                key={position.id}
                position={position}
                onEdit={handleEditClick}
                onDelete={handleDeleteClick}
                onAddDividend={handleDividendClick}
              />
            ))}
          </div>
        ) : hasPositions && !hasFilteredPositions ? (
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-12 text-center">
            <p className="text-[var(--text-secondary)]">
              {t('investments.emptyStates.noFilteredPositions')} <strong>{getAssetTypeLabel(assetTypeFilter)}</strong>.
            </p>
            <button
              onClick={() => setAssetTypeFilter("all")}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              {t('investments.emptyStates.viewAll')}
            </button>
          </div>
        ) : (
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-12 text-center">
            <div className="max-w-lg mx-auto">
              <div className="w-16 h-16 bg-[var(--bg-active)] rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-[var(--text-tertiary)]" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                {t('investments.emptyStates.noPositions')}
              </h3>
              <p className="text-sm text-[var(--text-secondary)] mb-4">
                {t('investments.emptyStates.subtitle')}
              </p>

              {/* Onboarding Tips */}
              <div className="bg-[var(--bg-card-inner)] border border-[var(--border-medium)] rounded-lg p-4 mb-6 text-left">
                <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                  {t('investments.emptyStates.whatToAdd')}
                </h4>
                <ul className="text-xs text-[var(--text-secondary)] space-y-2">
                  <li>📈 <strong>{t('investments.assetDescriptions.stock')}</strong> {t('investments.assetDescriptions.stockExamples')}</li>
                  <li>🏢 <strong>{t('investments.assetDescriptions.fii')}</strong> {t('investments.assetDescriptions.fiiExamples')}</li>
                  <li>💰 <strong>{t('investments.assetDescriptions.fixedIncome')}</strong> {t('investments.assetDescriptions.fixedIncomeExamples')}</li>
                  <li>₿ <strong>{t('investments.assetDescriptions.crypto')}</strong> {t('investments.assetDescriptions.cryptoExamples')}</li>
                  <li>📊 <strong>{t('investments.assetDescriptions.etf')}</strong> {t('investments.assetDescriptions.etfExamples')}</li>
                  <li>🌎 <strong>{t('investments.assetDescriptions.bdr')}</strong> {t('investments.assetDescriptions.bdrExamples')}</li>
                </ul>
              </div>

              <button
                onClick={() => setAddModalOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                {t('investments.emptyStates.addFirst')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AddPositionModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={handleAddSuccess}
        onError={handleError}
      />

      {selectedPosition && (
        <>
          <EditPositionModal
            isOpen={editModalOpen}
            onClose={() => {
              setEditModalOpen(false);
              setSelectedPosition(null);
            }}
            position={selectedPosition}
            onSuccess={handleEditSuccess}
            onError={handleError}
          />

          <DeletePositionModal
            isOpen={deleteModalOpen}
            onClose={() => {
              setDeleteModalOpen(false);
              setSelectedPosition(null);
            }}
            position={selectedPosition}
            onSuccess={handleDeleteSuccess}
            onError={handleError}
          />

          <AddDividendModal
            isOpen={dividendModalOpen}
            onClose={() => {
              setDividendModalOpen(false);
              setSelectedPosition(null);
            }}
            position={selectedPosition}
            onSuccess={handleDividendSuccess}
            onError={handleError}
          />
        </>
      )}

      <InvestmentSuccessModal
        isOpen={successModalOpen}
        onClose={() => setSuccessModalOpen(false)}
        message={successMessage}
      />

      <InvestmentErrorModal
        isOpen={errorModalOpen}
        onClose={() => setErrorModalOpen(false)}
        message={errorMessage}
      />
    </div>
  );
}
