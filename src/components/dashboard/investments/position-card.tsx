"use client";

import { TrendingUp, TrendingDown, Edit, Trash2, DollarSign, ChevronDown, ChevronUp, Pencil } from "lucide-react";
import { useState } from "react";
import { useCurrency } from "@/contexts/currency-context";
import { useLanguage } from "@/contexts/language-context";
import type { PositionDetailed } from "@/types/investments";
import { calculateFixedIncomeTax, formatTaxRate } from "@/lib/tax-calculator";
import { usePositionDividends, type PositionDividend } from "@/hooks/use-position-dividends";
import { EditDividendModal } from "./edit-dividend-modal";
import { DeleteDividendModal } from "./delete-dividend-modal";

interface PositionCardProps {
  position: PositionDetailed;
  onEdit: (position: PositionDetailed) => void;
  onDelete: (position: PositionDetailed) => void;
  onAddDividend: (position: PositionDetailed) => void;
}

const ASSET_TYPE_LABELS: Record<string, string> = {
  acao: "Ação",
  fii: "FII",
  etf: "ETF",
  renda_fixa: "Renda Fixa",
  cripto: "Cripto",
  bdr: "BDR",
};

const ASSET_TYPE_COLORS: Record<string, string> = {
  acao: "bg-blue-500/10 text-blue-500",
  fii: "bg-green-500/10 text-green-500",
  etf: "bg-purple-500/10 text-purple-500",
  renda_fixa: "bg-yellow-500/10 text-yellow-500",
  cripto: "bg-orange-500/10 text-orange-500",
  bdr: "bg-cyan-500/10 text-cyan-500",
};

export function PositionCard({ position, onEdit, onDelete, onAddDividend }: PositionCardProps) {
  const { formatCurrency } = useCurrency();
  const { t } = useLanguage();
  const { dividends, totalDividends, loading: loadingDividends, refetch } = usePositionDividends(position.id);
  const [showDividends, setShowDividends] = useState(false);
  const [editDividendModal, setEditDividendModal] = useState(false);
  const [deleteDividendModal, setDeleteDividendModal] = useState(false);
  const [selectedDividend, setSelectedDividend] = useState<PositionDividend | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const isProfit = position.lucro_prejuizo >= 0;
  const variationPercent = position.rentabilidade_percentual;
  const accountTypeBadge = position.tipo_conta === "pj" ? t('investments.accountPJ') : t('investments.accountPersonal');
  const accountTypeColor = position.tipo_conta === "pj" ? "bg-purple-500/10 text-purple-500" : "bg-blue-500/10 text-blue-500";
  
  // Calcular total de proventos recebidos (valor total, não por ativo)
  const totalDividendsReceived = dividends.reduce((sum, d) => {
    return sum + (Number(d.valor_por_ativo) * Number(position.quantidade));
  }, 0);

  const handleEditDividend = (dividend: PositionDividend) => {
    setSelectedDividend(dividend);
    setEditDividendModal(true);
  };

  const handleDeleteDividend = (dividend: PositionDividend) => {
    setSelectedDividend(dividend);
    setDeleteDividendModal(true);
  };

  const handleDividendSuccess = () => {
    refetch();
  };

  const handleDividendError = (message: string) => {
    setErrorMessage(message);
  };

  // Calcula impostos automaticamente para Renda Fixa
  const isRendaFixa = position.asset_type === "renda_fixa";
  
  // Usa impostos manuais se disponíveis, senão calcula automaticamente
  const taxCalc = isRendaFixa && position.data_compra
    ? (() => {
        // Se tem impostos manuais configurados, usa eles
        if ((position as any).use_manual_tax && ((position as any).manual_ir || (position as any).manual_iof)) {
          const manualIr = Number((position as any).manual_ir || 0);
          const manualIof = Number((position as any).manual_iof || 0);
          const totalTax = manualIr + manualIof;
          const grossProfit = position.valor_atual - position.valor_investido;
          
          const purchase = new Date(position.data_compra);
          const today = new Date();
          const diffTime = Math.abs(today.getTime() - purchase.getTime());
          const daysInvested = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
          
          return {
            ir: manualIr,
            iof: manualIof,
            totalTax,
            netProfit: grossProfit - totalTax,
            netValue: position.valor_atual - totalTax,
            irRate: grossProfit > 0 ? manualIr / grossProfit : 0,
            iofRate: grossProfit > 0 ? manualIof / grossProfit : 0,
            daysInvested,
          };
        }
        
        // Senão, calcula automaticamente
        return calculateFixedIncomeTax(position.valor_investido, position.valor_atual, position.data_compra);
      })()
    : null;

  // Formatar última atualização
  const formatLastUpdated = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return t('investments.card.updated');
    if (diffHours < 24) return `${t('investments.card.updated')} ${diffHours}h`;
    if (diffDays === 1) return t('investments.card.updated');
    if (diffDays < 7) return `${t('investments.card.updated')} ${diffDays}d`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-6 hover:border-[var(--border-medium)] transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="text-lg font-bold text-[var(--text-primary)]">{position.ticker}</h3>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
              ASSET_TYPE_COLORS[position.asset_type] || "bg-zinc-500/10 text-zinc-500"
            }`}>
              {ASSET_TYPE_LABELS[position.asset_type] || position.asset_type}
            </span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${accountTypeColor}`}>
              {accountTypeBadge}
            </span>
          </div>
          {position.asset_name && (
            <p className="text-sm text-[var(--text-secondary)] truncate">{position.asset_name}</p>
          )}
          {/* Indicador de última atualização */}
          {position.price_last_updated && position.current_price && position.current_price > 0 && (
            <p className="text-xs text-[var(--text-tertiary)] mt-1">
              🕒 {formatLastUpdated(position.price_last_updated)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(position)}
            className="p-2 hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
            title={t('investments.card.editPosition')}
          >
            <Edit className="w-4 h-4 text-[var(--text-secondary)]" />
          </button>
          <button
            onClick={() => onDelete(position)}
            className="p-2 hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
            title={t('investments.card.deletePosition')}
          >
            <Trash2 className="w-4 h-4 text-[var(--text-secondary)]" />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-[var(--text-tertiary)] mb-1">{t('investments.card.quantity')}</p>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {Number(position.quantidade).toLocaleString('pt-BR', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 8
            })}
          </p>
        </div>
        <div>
          <p className="text-xs text-[var(--text-tertiary)] mb-1">{t('investments.card.currentPrice')}</p>
          {position.calculated_price && position.calculated_price > 0 ? (
            <p className="text-sm font-semibold text-blue-400">
              {formatCurrency(position.calculated_price)}
            </p>
          ) : (
            <div className="group relative">
              <p className="text-sm font-medium text-yellow-500 cursor-help flex items-center gap-1">
                ⏳ {t('investments.card.waiting')}
              </p>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-[var(--bg-tooltip)] border border-[var(--border-medium)] rounded-lg text-xs text-[var(--text-primary)] w-48 text-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
                {t('investments.card.priceUpdateTooltip')}
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-zinc-700"></div>
              </div>
            </div>
          )}
        </div>
        <div>
          <p className="text-xs text-[var(--text-tertiary)] mb-1">{t('investments.card.avgPrice')}</p>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {formatCurrency(position.preco_medio)}
          </p>
        </div>
        <div>
          <p className="text-xs text-[var(--text-tertiary)] mb-1">{t('investments.card.investedValue')}</p>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {formatCurrency(position.valor_investido)}
          </p>
        </div>
        <div className="col-span-2">
          <p className="text-xs text-[var(--text-tertiary)] mb-1">{t('investments.card.currentValueGross')}</p>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {formatCurrency(position.valor_atual)}
          </p>
        </div>
      </div>

      {/* Yield Information for Renda Fixa */}
      {isRendaFixa && position.yield_percentage && (
        <div className="mb-3 p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-xs text-blue-400">
            📈 {t('investments.card.yield')}: <strong>{position.yield_percentage}% do CDI</strong>
          </p>
        </div>
      )}

      {/* Tax Information for Renda Fixa */}
      {taxCalc && taxCalc.totalTax > 0 && (
        <div className="mb-4 p-3 bg-[var(--bg-card-inner)] border border-[var(--border-medium)] rounded-lg">
          <p className="text-xs font-semibold text-[var(--text-secondary)] mb-2">
            📊 {t('investments.card.taxInfo')} ({taxCalc.daysInvested} {t('investments.card.daysInvested')})
          </p>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-[var(--text-tertiary)]">
                IR ({formatTaxRate(taxCalc.irRate)}):
              </span>
              <span className="text-red-400">-{formatCurrency(taxCalc.ir)}</span>
            </div>
            {taxCalc.iof > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-[var(--text-tertiary)]">
                  IOF ({formatTaxRate(taxCalc.iofRate)}):
                </span>
                <span className="text-red-400">-{formatCurrency(taxCalc.iof)}</span>
              </div>
            )}
            <div className="flex justify-between text-xs font-semibold pt-1 border-t border-[var(--border-medium)]">
              <span className="text-[var(--text-secondary)]">{t('investments.card.totalTaxes')}:</span>
              <span className="text-red-400">-{formatCurrency(taxCalc.totalTax)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Net Value for Renda Fixa */}
      {taxCalc && (
        <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
          <p className="text-xs text-[var(--text-tertiary)] mb-1">💰 {t('investments.card.netValue')}</p>
          <p className="text-xl font-bold text-green-500">
            {formatCurrency(taxCalc.netValue)}
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            {t('investments.card.netProfit')}: {formatCurrency(taxCalc.netProfit)}
          </p>
        </div>
      )}

      {/* Profit/Loss */}
      <div className={`rounded-lg p-3 mb-3 ${
        isProfit ? 'bg-green-500/10' : 'bg-red-500/10'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isProfit ? (
              <TrendingUp className="w-4 h-4 text-green-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-500" />
            )}
            <span className={`text-sm font-medium ${
              isProfit ? 'text-green-500' : 'text-red-500'
            }`}>
              {isProfit ? t('investments.card.profit') : t('investments.card.loss')}
            </span>
          </div>
          <div className="text-right">
            <p className={`text-sm font-bold ${
              isProfit ? 'text-green-500' : 'text-red-500'
            }`}>
              {formatCurrency(Math.abs(position.lucro_prejuizo))}
            </p>
            <p className={`text-xs ${
              isProfit ? 'text-green-500' : 'text-red-500'
            }`}>
              {isProfit ? '+' : ''}{variationPercent.toFixed(2)}%
            </p>
          </div>
        </div>
      </div>

      {/* Dividends Section */}
      {dividends.length > 0 && (
        <div className="mb-3 p-3 bg-[var(--bg-card-inner)] border border-[var(--border-medium)] rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-xs text-[var(--text-secondary)]">💰 Proventos Recebidos</p>
              <p className="text-lg font-bold text-[var(--text-primary)]">
                {formatCurrency(totalDividendsReceived)}
              </p>
              <p className="text-xs text-[var(--text-tertiary)]">
                {dividends.length} {dividends.length === 1 ? 'pagamento' : 'pagamentos'}
              </p>
            </div>
            <button
              onClick={() => setShowDividends(!showDividends)}
              className="p-2 hover:bg-green-500/10 rounded-lg transition-colors"
            >
              {showDividends ? (
                <ChevronUp className="w-4 h-4 text-green-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-green-500" />
              )}
            </button>
          </div>

          {/* Dividend List */}
          {showDividends && (
            <div className="mt-3 pt-3 border-t border-green-500/20 space-y-2">
              {dividends.map((dividend) => {
                const totalValue = Number(dividend.valor_por_ativo) * Number(position.quantidade);
                const typeLabels = {
                  dividendo: 'Dividendo',
                  jcp: 'JCP',
                  rendimento: 'Rendimento',
                  amortizacao: 'Amortização'
                };
                
                return (
                  <div key={dividend.id} className="flex items-center justify-between gap-2 p-2 hover:bg-green-500/5 rounded-lg transition-colors">
                    <div className="flex-1">
                      <p className="text-[var(--text-primary)] font-medium text-xs">
                        {typeLabels[dividend.tipo]}
                      </p>
                      <p className="text-[var(--text-tertiary)] text-xs">
                        {dividend.data_pagamento.split('T')[0].split('-').reverse().join('/')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-green-400 font-semibold text-xs">
                        {formatCurrency(totalValue)}
                      </p>
                      <p className="text-[var(--text-tertiary)] text-xs">
                        {formatCurrency(dividend.valor_por_ativo)}/ativo
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEditDividend(dividend)}
                        className="p-1.5 hover:bg-blue-500/10 rounded transition-colors"
                        title="Editar provento"
                      >
                        <Pencil className="w-3.5 h-3.5 text-blue-400" />
                      </button>
                      <button
                        onClick={() => handleDeleteDividend(dividend)}
                        className="p-1.5 hover:bg-red-500/10 rounded transition-colors"
                        title="Excluir provento"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add Dividend Button */}
      <button
        onClick={() => onAddDividend(position)}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[var(--bg-card-inner)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border-default)] rounded-lg transition-colors text-sm"
      >
        <DollarSign className="w-4 h-4" />
        {t('investments.card.addDividend')}
      </button>

      {/* Observação */}
      {position.observacao && (
        <div className="mt-3 pt-3 border-t border-[var(--border-default)]">
          <p className="text-xs text-[var(--text-tertiary)] italic">
            {position.observacao}
          </p>
        </div>
      )}

      {/* Modals */}
      {selectedDividend && (
        <>
          <EditDividendModal
            isOpen={editDividendModal}
            onClose={() => {
              setEditDividendModal(false);
              setSelectedDividend(null);
            }}
            dividend={selectedDividend}
            quantidade={position.quantidade}
            ticker={position.ticker}
            onSuccess={handleDividendSuccess}
            onError={handleDividendError}
          />

          <DeleteDividendModal
            isOpen={deleteDividendModal}
            onClose={() => {
              setDeleteDividendModal(false);
              setSelectedDividend(null);
            }}
            dividend={selectedDividend}
            quantidade={position.quantidade}
            ticker={position.ticker}
            onSuccess={handleDividendSuccess}
            onError={handleDividendError}
          />
        </>
      )}
    </div>
  );
}
